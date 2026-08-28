import "server-only";

import { asCount, redis, redisReady } from "@/lib/upstash";
import { isVisitorId, NO_VISITORS, type Visitors } from "@/lib/visitors";
import { visitorId } from "@/lib/visitorId";

/* ===========================================================================
   Where the visitor count lives.

   Two keys:

     sy:visitors            set of browser ids, one per distinct browser
     sy:rl:new:<address>    how many new ids one address has introduced lately

   A SET, NOT A COUNTER, which is the same argument the like and the comment
   thread make: the number is `SCARD` of the membership, derived and never
   tracked, so it cannot drift from what it claims to describe. It also makes
   the write idempotent — a returning visitor is already a member, `SADD` says
   so, and nothing moves. A counter would need somebody to know whether this
   browser had ever been here before, which is the question the set is.

   WHY THE ID COMES FROM THE BROWSER. Everything else on this site identifies a
   visitor by a salted hash of their address and user agent — see
   `lib/visitorId.ts` — and for a like, or for who is on the site this minute,
   that is the right trade: it needs to be stable for as long as a session, it
   needs no storage on anybody's machine, and it is thrown away.

   It is the wrong trade for a total that runs for years. An address is not a
   person over that span: the same reader on a train, on their home wifi and in
   the office is three addresses, a new phone is a fourth, and a carrier
   reassigning a block turns a stranger into a returning visitor. Counted that
   way the total would drift upward forever and mean nothing. So the browser
   mints a UUID on its first visit, keeps it, and sends it back — which is what
   every analytics tool does, and is the only thing that makes "how many
   people" a question this can answer.

   WHAT IT ACTUALLY MEASURES, precisely, because a number in a footer invites
   more belief than it has earned: distinct browsers that have loaded a page
   with storage available since this shipped. Clearing site data makes someone
   new. A private window is new every time. One person on a phone and a laptop
   is two. It is the same definition every analytics dashboard quietly uses,
   and it is an over-count of people rather than an exact one.

   IT STARTS AT ZERO. There is no history to import — nothing has ever counted
   a visit to this site — so the first number it shows is the first visitor,
   and that is the honest place to start.
   =========================================================================== */

const KEY = "sy:visitors";

/** How many new ids one address may introduce per window, and how long the
 *  window is. Generous enough for a household, an office or a conference wifi
 *  where a dozen genuinely new people share one address in an afternoon;
 *  small enough that a loop cannot run the total up. */
const NEW_PER_WINDOW = 12;
const WINDOW_SECONDS = 3600;

const rateKey = (who: string) => `sy:rl:new:${who}`;

/**
 * Count this browser if it is new, and report the total either way.
 *
 * The returning case is the common one and costs two commands: ask whether the
 * set already holds this id, and read its size. Only a genuinely new id pays
 * for the limiter, which is the right way round — a rate limit that charges
 * every reader for the existence of an abuser is a rate limit that has picked
 * the wrong target.
 *
 * A refused id is not an error and the visitor is never told. They still get
 * the real total; the only thing that did not happen is the increment. Saying
 * "you have been rate limited" to somebody who has done nothing but arrive
 * would be both alarming and useless.
 */
export async function countVisitor(id: unknown): Promise<Visitors> {
  if (!redisReady()) return NO_VISITORS;
  // Shape-checked here as well as at the route: this is the function that
  // writes, so this is where the guarantee has to hold.
  if (!isVisitorId(id)) return readVisitors();

  try {
    const [known, total] = await redis(
      ["SISMEMBER", KEY, id],
      ["SCARD", KEY],
    );

    if (asCount(known) === 1) {
      return { configured: true, total: asCount(total) };
    }

    if (await overNewLimit()) {
      return { configured: true, total: asCount(total) };
    }

    const [, after] = await redis(["SADD", KEY, id], ["SCARD", KEY]);
    return { configured: true, total: asCount(after) };
  } catch (err) {
    console.error("[visitors] count failed", err);
    return NO_VISITORS;
  }
}

/** The total, without claiming to be anybody. */
export async function readVisitors(): Promise<Visitors> {
  if (!redisReady()) return NO_VISITORS;

  try {
    const [total] = await redis(["SCARD", KEY]);
    return { configured: true, total: asCount(total) };
  } catch (err) {
    console.error("[visitors] read failed", err);
    return NO_VISITORS;
  }
}

/**
 * Has this address introduced too many new browsers lately?
 *
 * The same `INCR` + `EXPIRE NX` + `TTL` shape the engagement store's limiter
 * uses, including its repair: `TTL` answering -1 one command after an `EXPIRE`
 * should be impossible, but the pipeline turns a failed command into `null`
 * rather than throwing, and a counter that never expires would quietly stop
 * counting new visitors from that address forever.
 */
async function overNewLimit(): Promise<boolean> {
  const key = rateKey(await visitorId());

  const [hits, , ttl] = await redis(
    ["INCR", key],
    ["EXPIRE", key, WINDOW_SECONDS, "NX"],
    ["TTL", key],
  );

  const left = Number(ttl);
  if (Number.isFinite(left) && left < 0) await redis(["EXPIRE", key, WINDOW_SECONDS]);

  return asCount(hits) > NEW_PER_WINDOW;
}
