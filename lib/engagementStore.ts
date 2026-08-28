import "server-only";

import { randomUUID } from "node:crypto";
import {
  COMMENT_CAP,
  COMMENT_MAX_PAGE,
  COMMENT_PAGE,
  EMPTY_ENGAGEMENT,
  readComment,
  type CommentDraft,
  type CommentError,
  type Engagement,
  type StudyComment,
  type ThreadComment,
} from "@/lib/engagement";
import { asCount, redis, redisReady } from "@/lib/upstash";
import { visitorId } from "@/lib/visitorId";

/* ===========================================================================
   Where a study's likes and comments actually live.

   Two keys per study, namespaced so this store can share a Redis database
   with anything else without a collision:

     sy:s:<slug>:likes         set of voter ids
     sy:s:<slug>:comments      list of JSON, newest first, capped
     sy:s:<slug>:c:<id>:likes  set of voter ids, one per comment

   THE LIKE IS A SET, NOT A COUNTER, and that is the whole design. The count
   is `SCARD` of the set — derived, never tracked — so it cannot drift from
   the membership it is supposed to describe. `SADD` answers 1 or 0 depending
   on whether the caller was already in it, which makes a press idempotent and
   a second press a withdrawal, and every one of those is a single atomic
   command.

   The version this replaces kept two counters and a hash of who had voted
   which way, and had to read the hash before writing the counters. It said so
   itself: "two requests from the same person landing in the same millisecond
   could leave a counter one out". There is no such window here. That was the
   argument for the change; the redesign asking for one reaction instead of
   two was the occasion for it.

   LEGACY. Those keys still exist on a database that has been live:

     sy:s:<slug>:up / :down   counters
     sy:s:<slug>:voters       hash of voter -> "up" | "down"

   `migrateLikes` moves the up-voters into the set, once, the first time a
   study is read after the change. See it below. Nothing deletes the old keys
   — they cost a few bytes and they are the only copy of the down-votes, which
   the redesign has nowhere to show but which were still real answers.
   =========================================================================== */

const key = {
  likes: (slug: string) => `sy:s:${slug}:likes`,
  comments: (slug: string) => `sy:s:${slug}:comments`,

  /* One set per comment, on the same argument as the study's own like: the
     count is `SCARD` of it, so it cannot drift from who is in it.

     A comment trimmed off the end of the list by `COMMENT_CAP` leaves its set
     behind. That is a few hundred bytes per study at the very worst, and the
     alternative — a TTL — would quietly delete the likes on a comment that is
     still on the page. Left, and written down. */
  commentLikes: (slug: string, id: string) => `sy:s:${slug}:c:${id}:likes`,
  /* Per study, not per person across the site. It used to be
     `sy:rl:<action>:<who>`, so commenting once on each of the three studies
     spent the whole budget and the fourth comment anywhere was refused —
     somebody reading the site properly is exactly the person that hit it. */
  rate: (action: string, slug: string, who: string) =>
    `sy:rl:${action}:${slug}:${who}`,

  /** Written by the version before this one. Read once, then never again. */
  legacyUp: (slug: string) => `sy:s:${slug}:up`,
  legacyVoters: (slug: string) => `sy:s:${slug}:voters`,
};

/* Who is asking now lives in `lib/visitorId.ts`: the footer's live count needs
   the same answer this does, and two copies of a salted hash are two
   populations waiting to disagree. Same salt, same inputs, same digest — every
   voter already in the set is still the same voter. */

/* --- Rate limiting ----------------------------------------------------------
   In Redis rather than in process memory, unlike the waitlist's — that one is
   best-effort by its own admission and resets on every deploy, which is
   tolerable for a form that mails one person and is not tolerable for an open
   write endpoint. A counter with an expiry is the whole implementation.
   --------------------------------------------------------------------------- */

type Limit = {
  over: boolean;
  /** Seconds until the window resets. Only meaningful when `over`. */
  retryAfter: number;
};

async function overLimit(
  action: string,
  slug: string,
  who: string,
  max: number,
  windowSeconds: number,
): Promise<Limit> {
  const k = key.rate(action, slug, who);

  const [hits, , ttl] = await redis(
    ["INCR", k],
    ["EXPIRE", k, windowSeconds, "NX"],
    ["TTL", k],
  );

  const over = asCount(hits) > max;
  const left = Number(ttl);

  /* `TTL` answers -1 for a key with no expiry, which should be impossible one
     command after an `EXPIRE` — but the pipeline swallows a failed command as
     `null` rather than throwing, so an `EXPIRE` that did not land would leave
     a counter that never resets and a visitor locked out permanently. Repair
     it rather than trusting it. */
  if (Number.isFinite(left) && left < 0) {
    await redis(["EXPIRE", k, windowSeconds]);
    return { over, retryAfter: windowSeconds };
  }

  return { over, retryAfter: over ? Math.max(1, left) : 0 };
}

/* --- Reading ---------------------------------------------------------------- */

/**
 * Everything the block needs, in one round trip.
 *
 * A missing store is not an error here. `configured: false` travels all the
 * way to the UI, which says so rather than drawing zeroes — a study that has
 * never been liked and a study whose database is unplugged look identical
 * otherwise, and only one of them is worth a visitor's attention.
 *
 * `from` and `count` page the thread. The stats row wants the size of the
 * whole thread and the thread itself wants one page of it, so `LLEN` is asked
 * for alongside the `LRANGE` rather than the page's length being passed off as
 * the total.
 */
export async function readEngagement(
  slug: string,
  from = 0,
  count = COMMENT_PAGE,
): Promise<Engagement> {
  if (!redisReady()) return EMPTY_ENGAGEMENT;

  const start = Math.max(0, Math.floor(from));
  const size = Math.min(Math.max(1, Math.floor(count)), COMMENT_MAX_PAGE);

  try {
    const who = await visitorId();

    const [likes, liked, total, raw, legacyVoters] = await redis(
      ["SCARD", key.likes(slug)],
      ["SISMEMBER", key.likes(slug), who],
      ["LLEN", key.comments(slug)],
      ["LRANGE", key.comments(slug), start, start + size - 1],
      // The legacy probe — one command, and it stops being interesting the
      // moment the set has anything in it. See `migrateLikes`.
      ["HLEN", key.legacyVoters(slug)],
    );

    if (asCount(likes) === 0 && asCount(legacyVoters) > 0) {
      const moved = await migrateLikes(slug, who);
      if (moved) {
        return {
          ...moved,
          total: asCount(total),
          comments: await withLikes(slug, parseComments(raw), who),
          from: start,
        };
      }
    }

    return {
      configured: true,
      likes: asCount(likes),
      liked: asCount(liked) === 1,
      total: asCount(total),
      comments: await withLikes(slug, parseComments(raw), who),
      from: start,
    };
  } catch (err) {
    console.error("[engagement] read failed", err);
    // Configured but unreachable. Same message to the visitor either way.
    return EMPTY_ENGAGEMENT;
  }
}

/**
 * How each comment on this page stands with the person asking.
 *
 * A second round trip, and it has to be: the ids only exist once the `LRANGE`
 * has come back, so there is nothing to ask about until then. It is one
 * request for the whole page rather than one per comment — two commands each,
 * pipelined — so a page of four costs eight commands in one call.
 */
async function withLikes(
  slug: string,
  comments: readonly StudyComment[],
  who: string,
): Promise<readonly ThreadComment[]> {
  if (comments.length === 0) return [];

  try {
    const results = await redis(
      ...comments.flatMap((c) => [
        ["SCARD", key.commentLikes(slug, c.id)],
        ["SISMEMBER", key.commentLikes(slug, c.id), who],
      ]),
    );

    return comments.map((c, i) => ({
      ...c,
      likes: asCount(results[i * 2]),
      liked: asCount(results[i * 2 + 1]) === 1,
    }));
  } catch (err) {
    console.error("[engagement] comment likes failed", err);
    // The thread is worth more than the counts on it.
    return comments.map((c) => ({ ...c, likes: 0, liked: false }));
  }
}

/**
 * Move the old up-voters into the set, once.
 *
 * Runs at most once per study: it is guarded on the set being empty, and it
 * leaves the set non-empty. A study whose only reactions were down-votes has
 * an empty result and will probe again on the next read — one `HLEN` against
 * a hash that will never grow, which is a cheaper thing to carry than a
 * marker key to remember it by.
 */
async function migrateLikes(
  slug: string,
  who: string,
): Promise<Pick<Engagement, "configured" | "likes" | "liked"> | null> {
  try {
    const [entries] = await redis(["HGETALL", key.legacyVoters(slug)]);
    const ups = upVoters(entries);
    if (ups.length === 0) return null;

    const [, likes, liked] = await redis(
      ["SADD", key.likes(slug), ...ups],
      ["SCARD", key.likes(slug)],
      ["SISMEMBER", key.likes(slug), who],
    );

    console.info(`[engagement] migrated ${ups.length} likes for ${slug}`);
    return { configured: true, likes: asCount(likes), liked: asCount(liked) === 1 };
  } catch (err) {
    console.error("[engagement] migration failed", err);
    return null;
  }
}

/**
 * The voters who said yes, out of `HGETALL`.
 *
 * Upstash answers a hash as a flat array — key, value, key, value — rather
 * than as an object, so this walks it in pairs.
 */
function upVoters(entries: unknown): string[] {
  if (!Array.isArray(entries)) return [];

  const out: string[] = [];
  for (let i = 0; i + 1 < entries.length; i += 2) {
    if (entries[i + 1] === "up" && typeof entries[i] === "string") {
      out.push(entries[i] as string);
    }
  }
  return out;
}

function parseComments(raw: unknown): readonly StudyComment[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): StudyComment[] => {
    if (typeof entry !== "string") return [];
    try {
      const c = JSON.parse(entry) as Partial<StudyComment>;
      if (typeof c.id !== "string" || typeof c.body !== "string") return [];
      return [
        {
          id: c.id,
          name: typeof c.name === "string" ? c.name : "",
          body: c.body,
          at: typeof c.at === "number" ? c.at : 0,
        },
      ];
    } catch {
      // One malformed row should cost one comment, not the whole thread.
      return [];
    }
  });
}

/* --- Writing ---------------------------------------------------------------- */

export type LikeResult =
  | { ok: true; likes: number; liked: boolean }
  | { ok: false; reason: "unavailable" | "throttled" | "failed" };

/**
 * Like a study, or take it back.
 *
 * Pressing the button you already pressed withdraws the like, which is what
 * every control shaped like this does and what someone will try first when
 * they change their mind.
 *
 * `SADD` does the deciding: it answers 1 when the caller was not already in
 * the set and 0 when they were, so the press and the question "had they
 * pressed it before?" are the same atomic command rather than a read and then
 * a write. The unlike costs a second round trip, which is the rarer half.
 */
export async function toggleLike(slug: string): Promise<LikeResult> {
  if (!redisReady()) return { ok: false, reason: "unavailable" };

  try {
    const who = await visitorId();

    // Generous: this only has to stop a held-down key, because the set
    // already stops the count from moving on a repeat press.
    const limit = await overLimit("like", slug, who, 30, 60);
    if (limit.over) return { ok: false, reason: "throttled" };

    const [added, likes] = await redis(
      ["SADD", key.likes(slug), who],
      ["SCARD", key.likes(slug)],
    );

    if (asCount(added) === 1) {
      return { ok: true, likes: asCount(likes), liked: true };
    }

    const [, after] = await redis(
      ["SREM", key.likes(slug), who],
      ["SCARD", key.likes(slug)],
    );

    return { ok: true, likes: asCount(after), liked: false };
  } catch (err) {
    console.error("[engagement] like failed", err);
    return { ok: false, reason: "failed" };
  }
}

/**
 * Like a comment, or take it back.
 *
 * The study's own like and this are the same mechanism at two scopes, so they
 * share the rate limit: someone holding a key down is doing the same thing to
 * the store whichever button is under it.
 */
export async function toggleCommentLike(
  slug: string,
  id: string,
): Promise<LikeResult> {
  if (!redisReady()) return { ok: false, reason: "unavailable" };

  try {
    const who = await visitorId();

    const limit = await overLimit("like", slug, who, 30, 60);
    if (limit.over) return { ok: false, reason: "throttled" };

    const k = key.commentLikes(slug, id);
    const [added, likes] = await redis(["SADD", k, who], ["SCARD", k]);

    if (asCount(added) === 1) {
      return { ok: true, likes: asCount(likes), liked: true };
    }

    const [, after] = await redis(["SREM", k, who], ["SCARD", k]);
    return { ok: true, likes: asCount(after), liked: false };
  } catch (err) {
    console.error("[engagement] comment like failed", err);
    return { ok: false, reason: "failed" };
  }
}

export type CommentResult =
  | { ok: true; comment: ThreadComment }
  /** `retryAfter` is seconds, and only travels with `throttled` — the message
   *  is useless without it, which is what the old one proved. */
  | { ok: false; reason: CommentError; retryAfter?: number };

/** Add a comment to a study's thread. */
export async function addComment(
  slug: string,
  draft: CommentDraft,
): Promise<CommentResult> {
  if (!redisReady()) return { ok: false, reason: "unavailable" };

  // The same check the client ran before sending. It runs again because the
  // client's copy of it is a convenience, not a gate.
  const checked = readComment(draft);
  if (!checked.ok) return checked;

  try {
    const who = await visitorId();

    /* Five in five minutes, on this study. It was three in ten across the
       whole site, which is a rule aimed at a spammer that only a reader ever
       met: three thoughtful comments is a good afternoon on a portfolio, not
       an attack. This still stops anything automated dead and no person
       writing in good faith will ever see it. */
    const limit = await overLimit("comment", slug, who, 5, 300);
    if (limit.over) {
      return { ok: false, reason: "throttled", retryAfter: limit.retryAfter };
    }

    const comment: StudyComment = {
      id: randomUUID(),
      name: checked.value.name,
      body: checked.value.body,
      at: Date.now(),
    };

    await redis(
      ["LPUSH", key.comments(slug), JSON.stringify(comment)],
      // Newest first, so trimming from the tail drops the oldest.
      ["LTRIM", key.comments(slug), 0, COMMENT_CAP - 1],
    );

    // Nobody has liked it yet, by definition — it did not exist a moment ago.
    return { ok: true, comment: { ...comment, likes: 0, liked: false } };
  } catch (err) {
    console.error("[engagement] comment failed", err);
    return { ok: false, reason: "failed" };
  }
}
