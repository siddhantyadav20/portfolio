import "server-only";

import { asCount, overLimit, redis, redisReady } from "@/lib/upstash";
import { visitorId } from "@/lib/visitorId";
import {
  EMPTY_REACTIONS,
  type Reaction,
  type ReactionKind,
  type Reactions,
} from "@/lib/music";

/* ===========================================================================
   Two thumbs, per track, across everybody.

   Sets, not counters — the same shape and the same argument as the study likes
   in `lib/engagementStore.ts`. A press is one `SADD` of one visitor id, which
   is idempotent, so a double click, a retried request and a refresh all mean
   the same thing. The number is `SCARD`: derived, never written, and therefore
   unable to drift away from the thing it counts. A counter would need a second
   structure to remember who had already pressed, and the two would eventually
   disagree with no way to tell which was right.

   Up and down are two sets rather than one signed value, which makes changing
   your mind a `SADD` on one and a `SREM` on the other in a single pipeline,
   and makes "pressed neither" genuinely distinct from "pressed both ways once".
   =========================================================================== */

const key = {
  up: (track: string) => `sy:m:up:${track}`,
  down: (track: string) => `sy:m:dn:${track}`,
  rate: (who: string) => `sy:m:rate:${who}`,
};

/** Generous for a person, useless for a script: pressing a thumb is one click
 *  and nobody legitimately does thirty in a minute. */
const PRESS_MAX = 30;
const PRESS_WINDOW = 60;

/**
 * Every track's tally, and which one this visitor pressed.
 *
 * One round trip for the whole queue: three commands per track, pipelined.
 * The alternative — a request per track — is six round trips to draw one card.
 */
export async function readReactions(
  keys: readonly string[],
): Promise<Reactions> {
  if (!redisReady() || keys.length === 0) {
    return keys.length === 0
      ? { configured: redisReady(), of: {} }
      : EMPTY_REACTIONS;
  }

  try {
    const who = await visitorId();
    const results = await redis(
      ...keys.flatMap((k) => [
        ["SCARD", key.up(k)] as const,
        ["SCARD", key.down(k)] as const,
        ["SISMEMBER", key.up(k), who] as const,
        ["SISMEMBER", key.down(k), who] as const,
      ]),
    );

    const of: Record<string, Reaction> = {};
    keys.forEach((k, i) => {
      const mineUp = asCount(results[i * 4 + 2]) === 1;
      const mineDown = asCount(results[i * 4 + 3]) === 1;
      of[k] = {
        up: asCount(results[i * 4]),
        down: asCount(results[i * 4 + 1]),
        /* Both should be impossible — the toggle removes one as it adds the
           other. If it ever happens, the up wins rather than the read
           throwing, and the next press cleans it up. */
        mine: mineUp ? "up" : mineDown ? "down" : null,
      };
    });

    return { configured: true, of };
  } catch (err) {
    console.error("[music] reactions read failed", err);
    return EMPTY_REACTIONS;
  }
}

export type ReactResult =
  | { ok: true; up: number; down: number; mine: ReactionKind | null }
  | { ok: false; reason: "unavailable" | "throttled" | "failed" };

/**
 * Press a thumb, or take it back.
 *
 * Pressing the one you already pressed withdraws it — the same rule the study
 * like follows, and the only one that makes a two-state control honest: if
 * the press cannot be undone, the count is a record of curiosity rather than
 * of opinion.
 */
export async function toggleReaction(
  track: string,
  kind: ReactionKind,
): Promise<ReactResult> {
  if (!redisReady()) return { ok: false, reason: "unavailable" };

  try {
    const who = await visitorId();
    const { over } = await overLimit(key.rate(who), PRESS_MAX, PRESS_WINDOW);
    if (over) return { ok: false, reason: "throttled" };

    const mineKey = kind === "up" ? key.up(track) : key.down(track);
    const otherKey = kind === "up" ? key.down(track) : key.up(track);

    const [already] = await redis(["SISMEMBER", mineKey, who]);
    const withdrawing = asCount(already) === 1;

    /* One pipeline either way, and the counts come back from the same round
       trip that changed them — so the number the visitor sees is the number
       that is stored, not an optimistic guess the client had to reconcile. */
    const [, , up, down] = withdrawing
      ? await redis(
          ["SREM", mineKey, who],
          ["SREM", otherKey, who],
          ["SCARD", key.up(track)],
          ["SCARD", key.down(track)],
        )
      : await redis(
          ["SADD", mineKey, who],
          /* Changing your mind, in the same trip. Without this, pressing down
             after up leaves the up standing and the track is liked and
             disliked by one person. */
          ["SREM", otherKey, who],
          ["SCARD", key.up(track)],
          ["SCARD", key.down(track)],
        );

    return {
      ok: true,
      up: asCount(up),
      down: asCount(down),
      mine: withdrawing ? null : kind,
    };
  } catch (err) {
    console.error("[music] reaction failed", err);
    return { ok: false, reason: "failed" };
  }
}
