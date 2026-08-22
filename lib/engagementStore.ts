import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import {
  COMMENT_CAP,
  COMMENT_PAGE,
  EMPTY_ENGAGEMENT,
  readComment,
  type CommentDraft,
  type CommentError,
  type Engagement,
  type Reaction,
  type StudyComment,
} from "@/lib/engagement";
import { asCount, redis, redisReady } from "@/lib/upstash";

/* ===========================================================================
   Where a study's reactions and comments actually live.

   Four keys per study, all namespaced so this store can share a Redis
   database with anything else without a collision:

     sy:s:<slug>:up        a counter
     sy:s:<slug>:down      a counter
     sy:s:<slug>:voters    hash of voter -> "up" | "down"
     sy:s:<slug>:comments  list of JSON, newest first, capped

   The voters hash is what makes a reaction idempotent. Without it the two
   counters are just a pair of numbers anybody can drive to a million by
   holding down a key, and with it a second press means "change my mind" or
   "take it back" rather than "add another".

   Not transactional, and worth saying so plainly: switching a vote is a read
   followed by two writes, so two requests from the same person landing in the
   same millisecond could leave a counter one out. The fix is a Lua script,
   the cost of the bug is a like count off by one on a portfolio, and the
   honest trade is to leave it and write it down.
   =========================================================================== */

const key = {
  up: (slug: string) => `sy:s:${slug}:up`,
  down: (slug: string) => `sy:s:${slug}:down`,
  voters: (slug: string) => `sy:s:${slug}:voters`,
  comments: (slug: string) => `sy:s:${slug}:comments`,
  rate: (action: string, who: string) => `sy:rl:${action}:${who}`,
};

/* --- Who is asking ----------------------------------------------------------
   A stable-enough identity for one-person-one-reaction, derived and then
   thrown away: the raw address is hashed with a salt and only the digest is
   ever written down, so the store holds no IP addresses and nothing in it
   identifies a visitor to anyone who reads the database.

   It is a heuristic, not an identity. Two people behind one NAT share a vote;
   the same person on a phone and a laptop gets two. Both are fine for what
   this is measuring, and neither is worth a login to fix.
   --------------------------------------------------------------------------- */

const SALT = process.env.ENGAGEMENT_SALT ?? "sy-engagement";

async function voterId(): Promise<string> {
  const head = await headers();
  const ip =
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    head.get("x-real-ip") ||
    "unknown";
  const agent = head.get("user-agent") ?? "";

  return createHash("sha256")
    .update(`${SALT}:${ip}:${agent}`)
    .digest("base64url")
    .slice(0, 22);
}

/* --- Rate limiting ----------------------------------------------------------
   In Redis rather than in process memory, unlike the waitlist's — that one is
   best-effort by its own admission and resets on every deploy, which is
   tolerable for a form that mails one person and is not tolerable for an open
   write endpoint. A counter with an expiry is the whole implementation.
   --------------------------------------------------------------------------- */

async function overLimit(
  action: string,
  who: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const k = key.rate(action, who);
  const [hits] = await redis(["INCR", k], ["EXPIRE", k, windowSeconds, "NX"]);
  return asCount(hits) > max;
}

/* --- Reading ---------------------------------------------------------------- */

/**
 * Everything the engagement block needs, in one round trip.
 *
 * A missing store is not an error here. `configured: false` travels all the
 * way to the UI, which says so rather than drawing three zeroes — a study
 * that has never been reacted to and a study whose database is unplugged look
 * identical otherwise, and only one of them is worth a visitor's attention.
 */
export async function readEngagement(slug: string): Promise<Engagement> {
  if (!redisReady()) return EMPTY_ENGAGEMENT;

  try {
    const [up, down, raw] = await redis(
      ["GET", key.up(slug)],
      ["GET", key.down(slug)],
      ["LRANGE", key.comments(slug), 0, COMMENT_PAGE - 1],
    );

    return {
      configured: true,
      up: asCount(up),
      down: asCount(down),
      comments: parseComments(raw),
    };
  } catch (err) {
    console.error("[engagement] read failed", err);
    // Configured but unreachable. Same message to the visitor either way.
    return EMPTY_ENGAGEMENT;
  }
}

/** What this visitor has already reacted, so the UI opens in the right state. */
export async function readMyReaction(slug: string): Promise<Reaction | null> {
  if (!redisReady()) return null;

  try {
    const [vote] = await redis(["HGET", key.voters(slug), await voterId()]);
    return vote === "up" || vote === "down" ? vote : null;
  } catch {
    return null;
  }
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

export type ReactResult =
  | { ok: true; up: number; down: number; mine: Reaction | null }
  | { ok: false; reason: "unavailable" | "throttled" | "failed" };

/**
 * Cast, change or withdraw a reaction.
 *
 * Pressing the button you already pressed takes the vote back, which is what
 * every control shaped like this does and what someone will try first when
 * they change their mind.
 */
export async function setReaction(
  slug: string,
  next: Reaction,
): Promise<ReactResult> {
  if (!redisReady()) return { ok: false, reason: "unavailable" };

  try {
    const who = await voterId();

    // Generous: this only has to stop a held-down key, because the voters
    // hash already stops the count from moving on a repeat press.
    if (await overLimit("react", who, 30, 60)) {
      return { ok: false, reason: "throttled" };
    }

    const [previous] = await redis(["HGET", key.voters(slug), who]);
    const had: Reaction | null =
      previous === "up" || previous === "down" ? previous : null;

    const writes: (readonly (string | number)[])[] = [];
    let mine: Reaction | null;

    if (had === next) {
      writes.push(["HDEL", key.voters(slug), who], ["DECR", key[next](slug)]);
      mine = null;
    } else {
      writes.push(["HSET", key.voters(slug), who, next], ["INCR", key[next](slug)]);
      if (had) writes.push(["DECR", key[had](slug)]);
      mine = next;
    }

    writes.push(["GET", key.up(slug)], ["GET", key.down(slug)]);

    const results = await redis(...writes);
    const down = results[results.length - 1];
    const up = results[results.length - 2];

    return { ok: true, up: asCount(up), down: asCount(down), mine };
  } catch (err) {
    console.error("[engagement] reaction failed", err);
    return { ok: false, reason: "failed" };
  }
}

export type CommentResult =
  | { ok: true; comment: StudyComment }
  | { ok: false; reason: CommentError };

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
    const who = await voterId();
    if (await overLimit("comment", who, 3, 600)) {
      return { ok: false, reason: "throttled" };
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

    return { ok: true, comment };
  } catch (err) {
    console.error("[engagement] comment failed", err);
    return { ok: false, reason: "failed" };
  }
}
