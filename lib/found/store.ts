import "server-only";

import { asCount, overLimit, redis, redisReady } from "@/lib/upstash";
import { visitorId } from "@/lib/visitorId";
import { FOUND_EVENTS, isFoundEvent } from "./events";

/* ===========================================================================
   Where the pilot's funnel lives.

     found:ep1:<event>       a counter per allowlisted event
     found:ep1:times         the last 500 finish times, in seconds
     found:ep1:rl:<who>      how many events one address sent this hour

   Plain counters rather than a hash: one INCR per event, read back with a
   GET per allowlisted name, which works against the dev stand-in
   (lib/upstashDev) as well as Upstash. The allowlist is what bounds the
   keyspace; an unknown event name is dropped before it reaches the store.
   =========================================================================== */

const PREFIX = "found:ep1";
const TIMES = `${PREFIX}:times`;
const KEEP_TIMES = 500;

/** A whole playthrough sends perhaps 30 events. This leaves a household room. */
const PER_HOUR = 400;

export async function countEvent(event: unknown, seconds: unknown): Promise<boolean> {
  if (!redisReady() || !isFoundEvent(event)) return false;
  try {
    const limit = await overLimit(`${PREFIX}:rl:${await visitorId()}`, PER_HOUR, 3600);
    if (limit.over) return false;

    const commands: (string | number)[][] = [["INCR", `${PREFIX}:${event}`]];
    const s = Number(seconds);
    // A day is the ceiling: someone who left it on a tab for a week didn't
    // take a week to solve it, and one of those would drag the median.
    if (event === "end" && Number.isFinite(s) && s > 0 && s < 86_400)
      commands.push(["LPUSH", TIMES, Math.round(s)], ["LTRIM", TIMES, 0, KEEP_TIMES - 1]);

    await redis(...commands);
    return true;
  } catch (err) {
    console.error("[found] count failed", err);
    return false;
  }
}

export type Funnel = {
  configured: boolean;
  counts: Record<string, number>;
  finishes: number;
  /** Wall-clock from opening the envelope to the battery dying, breaks included. */
  medianSeconds: number | null;
};

export async function readFunnel(): Promise<Funnel> {
  if (!redisReady()) return { configured: false, counts: {}, finishes: 0, medianSeconds: null };
  const results = await redis(
    ...FOUND_EVENTS.map((e) => ["GET", `${PREFIX}:${e}`]),
    ["LRANGE", TIMES, 0, -1],
  );
  const counts = Object.fromEntries(FOUND_EVENTS.map((e, i) => [e, asCount(results[i])]));
  const raw = results[FOUND_EVENTS.length];
  const times = (Array.isArray(raw) ? raw : [])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    configured: true,
    counts,
    finishes: times.length,
    medianSeconds: times.length ? times[Math.floor(times.length / 2)] : null,
  };
}
