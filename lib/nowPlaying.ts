import "server-only";

import { accentFor } from "@/lib/artColor";
import { searchTrack, tinyArt } from "@/lib/itunes";
import { readRecent, type Scrobble } from "@/lib/lastfm";
import { QUEUE_MAX, RECENT_ASK, trackKey, type Queue, type Track } from "@/lib/music";
import { redis, redisReady } from "@/lib/upstash";

/* ===========================================================================
   Assembling the card.

   Last.fm knows what was played. iTunes knows what it sounds like and what it
   looks like. Neither is reliable enough on its own to put in front of a
   visitor, so this is the file that decides what the card actually says.

   FOUR CACHES, IN ORDER, AND EACH ONE EXISTS FOR A DIFFERENT FAILURE.

     memory   A module Map. Free, per-instance, and the only one fast enough
              to matter inside a single render.
     Redis    `sy:m:it:<key>`, a week. Shared between instances, which is the
              one that stops a deploy or a scale-out from re-resolving the
              same six songs from scratch on every cold lambda.
     fetch    Next's own, a day, keyed by URL. Collapses duplicate calls
              inside one render — the same song twice in the recent list.
     budget   A token bucket in `lib/itunes.ts`. Not a cache: the thing that
              decides to serve a stale answer rather than a rate-limited one.

   AND ONE LADDER FOR WHEN IT ALL FAILS.

     live -> `sy:m:q:last` -> nothing.

   `sy:m:q:last` has no expiry on purpose. When Last.fm is down, the honest
   thing to show is the last record he actually played, which is still true and
   only older than it looks. The floor below that is an empty queue and a card
   that says so — never a plausible hard-coded song, which would be a fourth
   place this site quietly disagrees with itself.
   =========================================================================== */

const LAST_GOOD = "sy:m:q:last";

/** A week. What a song is called does not change; the preview URL it carries
 *  does, rarely, and that is what stops this being a month. */
const RESOLVED_TTL = 604_800;

/** A day. Long enough to stop a stubbornly unmatchable track being searched
 *  for every five minutes forever, short enough that a song Apple adds to the
 *  storefront on Tuesday appears on the card on Wednesday. */
const MISS_TTL = 86_400;

const MEMORY_TTL_MS = 600_000;

/** How many scrobbles are worth trying. More than `QUEUE_MAX` because some
 *  will not resolve, and fewer than everything Last.fm returned because each
 *  attempt is a request against a small minute budget. */
const ATTEMPTS = QUEUE_MAX * 2;

/** Resolved in waves rather than all at once: a wave is bounded work against
 *  the rate limiter, and the second one only runs if the first left the queue
 *  short. */
const WAVE = 3;

type Resolved = Omit<Track, "key">;

const memory = new Map<string, { at: number; value: Resolved | null }>();

/* --- Pure ------------------------------------------------------------------- */

/**
 * Collapse a run of the same song into one entry.
 *
 * Consecutive only, and that is the whole point: playing a song, then another,
 * then the first again is three things worth showing, whereas a song on repeat
 * for an hour is one. Last.fm scrobbles every play, so without this a bad
 * afternoon fills the entire card with one track.
 */
export function dedupeScrobbles(rows: readonly Scrobble[]): Scrobble[] {
  const out: Scrobble[] = [];
  let last = "";
  for (const row of rows) {
    const k = trackKey(row.artist, row.title);
    if (k === last) continue;
    last = k;
    out.push(row);
  }
  return out;
}

/**
 * The queue as the card receives it.
 *
 * Unresolved entries are dropped rather than rendered as a row without audio.
 * The card is a player: a row you cannot play is a dead button, and one dead
 * button in a three-button transport is worse than a shorter list. Dropping
 * here is also what lets `Track.preview` be non-nullable, so nothing
 * downstream carries a "what if there is no audio" branch.
 *
 * The second dedupe is not redundant with `dedupeScrobbles`. That one collapses
 * repeats; this one catches two *differently spelled* scrobbles that resolved
 * to the same recording — a remaster and an original, which arrive as separate
 * rows from Last.fm and as one song from Apple.
 */
export function buildQueue(entries: readonly (Track | null)[]): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  for (const track of entries) {
    if (!track) continue;
    if (seen.has(track.key)) continue;
    seen.add(track.key);
    out.push(track);
    if (out.length >= QUEUE_MAX) break;
  }
  return out;
}

/* --- Resolving one track ----------------------------------------------------- */

async function fromRedis(key: string): Promise<Resolved | null | undefined> {
  if (!redisReady()) return undefined;
  try {
    const [raw] = await redis(["GET", `sy:m:it:${key}`]);
    if (typeof raw !== "string") return undefined;
    /* A stored empty object is the recorded *absence* of a match, which is a
       different answer from "nothing stored" and has to survive the round
       trip — otherwise an unmatchable track is searched for again every time. */
    const parsed = JSON.parse(raw) as Resolved | Record<string, never>;
    return "preview" in parsed ? (parsed as Resolved) : null;
  } catch {
    return undefined;
  }
}

async function toRedis(key: string, value: Resolved | null): Promise<void> {
  if (!redisReady()) return;
  try {
    await redis([
      "SET",
      `sy:m:it:${key}`,
      JSON.stringify(value ?? {}),
      "EX",
      value ? RESOLVED_TTL : MISS_TTL,
    ]);
  } catch {
    // A cache that could not be written is a slower next render, nothing more.
  }
}

async function resolve(row: Scrobble): Promise<Track | null> {
  const key = trackKey(row.artist, row.title);

  const held = memory.get(key);
  if (held && Date.now() - held.at < MEMORY_TTL_MS) {
    return held.value ? { key, ...held.value } : null;
  }

  const stored = await fromRedis(key);
  if (stored !== undefined) {
    memory.set(key, { at: Date.now(), value: stored });
    return stored ? { key, ...stored } : null;
  }

  const match = await searchTrack({
    artist: row.artist,
    title: row.title,
    album: row.album,
  });
  if (!match) {
    memory.set(key, { at: Date.now(), value: null });
    await toRedis(key, null);
    return null;
  }

  /* The colour is a nice-to-have and is treated as one: a sleeve that will not
     decode costs the card its accent, not its track. */
  const accent = await accentFor(tinyArt(match.cover));

  const value: Resolved = {
    title: match.title,
    artist: match.artist,
    /* Last.fm's album name is what the player reported and is often the
       edition ("Californication (Deluxe Edition)"); Apple's is the release the
       artwork actually belongs to. Prefer Apple's, fall back to the scrobble. */
    album: match.album ?? row.album,
    cover: match.cover,
    preview: match.preview,
    lengthMs: match.lengthMs,
    href: match.href,
    accent: accent?.accent ?? null,
    accentDark: accent?.accentDark ?? null,
  };

  memory.set(key, { at: Date.now(), value });
  await toRedis(key, value);
  return { key, ...value };
}

/* --- The last queue that worked ---------------------------------------------- */

async function lastGood(): Promise<Track[] | null> {
  if (!redisReady()) return null;
  try {
    const [raw] = await redis(["GET", LAST_GOOD]);
    if (typeof raw !== "string") return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Track[]) : null;
  } catch {
    return null;
  }
}

async function remember(tracks: readonly Track[]): Promise<void> {
  if (!redisReady() || tracks.length === 0) return;
  try {
    /* No TTL. This is the floor the card stands on when Last.fm is down, and
       a floor that expires is not one. */
    await redis(["SET", LAST_GOOD, JSON.stringify(tracks)]);
  } catch {
    // Nothing to do. The next successful render writes it again.
  }
}

/** The keys the reactions route is willing to answer for — the dynamic
 *  analogue of `STUDY_SLUGS`, so a stranger cannot mint like counts for
 *  arbitrary strings by inventing track names. */
export async function knownKeys(): Promise<Set<string>> {
  const tracks = await lastGood();
  return new Set((tracks ?? []).map((t) => t.key));
}

/* --- The card's one call ------------------------------------------------------ */

export async function readNowPlaying(): Promise<Queue> {
  const recent = await readRecent(RECENT_ASK);

  if (recent && recent.length > 0) {
    const candidates = dedupeScrobbles(recent).slice(0, ATTEMPTS);
    const found: (Track | null)[] = [];

    for (let i = 0; i < candidates.length; i += WAVE) {
      found.push(
        ...(await Promise.all(candidates.slice(i, i + WAVE).map(resolve))),
      );
      /* Enough to fill the card — stop asking. Every further attempt is a
         request against a budget that a burst of traffic will want. */
      if (found.filter(Boolean).length >= QUEUE_MAX) break;
    }

    const tracks = buildQueue(found);
    if (tracks.length > 0) {
      await remember(tracks);
      return { tracks, source: "live" };
    }
  }

  const cached = await lastGood();
  if (cached) return { tracks: cached.slice(0, QUEUE_MAX), source: "cached" };

  return { tracks: [], source: "fallback" };
}
