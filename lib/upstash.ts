import "server-only";

/* ===========================================================================
   Upstash Redis, over its REST API and nothing else.

   No SDK, for the same reason `StoreWaitlist/submit.ts` talks to Resend with
   a bare `fetch`: this is three HTTP calls in a portfolio, and a dependency
   that has to be kept current is a worse trade than twenty lines here.

   A URL and a token, and there are two names in circulation for each.

   Adding the database through the Vercel Marketplace injects the variables
   into the project automatically — which is the whole reason to do it that
   way, since nobody then has to copy a token anywhere — but which pair of
   names arrives depends on how it was added:

     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
       The Upstash console's own names, and what you get pasting them in by
       hand or using the Upstash integration.

     KV_REST_API_URL / KV_REST_API_TOKEN
       What Vercel KV injected, and what some marketplace flows still inject
       for a Redis database, because KV was Upstash underneath.

   Reading both is four lines and removes an entire class of "it is configured
   and the site says it isn't". They are the same two values either way.

   With none of them set the site still builds and every study still renders —
   the engagement block reports itself unavailable rather than inventing a
   number. That is the same rule the rest of this codebase follows for content
   that does not exist yet: an obvious gap beats a plausible fake.
   =========================================================================== */

const URL_ =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

/**
 * Whether there is a store to talk to at all. Checked before every call, and
 * reported to the browser as `configured` — which is the one diagnostic worth
 * having from outside the server, and says nothing a token would.
 */
export function redisReady(): boolean {
  return Boolean(URL_ && TOKEN);
}

type Command = readonly (string | number)[];

/**
 * Run one or more commands in a single round trip.
 *
 * Always the pipeline endpoint, even for a single command — one code path is
 * easier to reason about than two, and Upstash charges per request rather than
 * per command, so batching is also the cheaper shape.
 *
 * Returns one result per command, in order. A command that errored comes back
 * as `null` rather than throwing the whole batch away: a failed `INCR` on a
 * reaction should not also lose the comments that were read beside it.
 */
export async function redis(
  ...commands: readonly Command[]
): Promise<readonly unknown[]> {
  if (!redisReady()) throw new Error("Upstash is not configured");

  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    /* Never cached. Next fetches are cached by default in some contexts, and
       a cached like count is a like count that stops moving. */
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as { result?: unknown; error?: string }[];
  return body.map((entry) => {
    if (entry.error) {
      console.error("[upstash] command failed", entry.error);
      return null;
    }
    return entry.result ?? null;
  });
}

/** Upstash returns integers as numbers or as strings depending on the command. */
export function asCount(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
