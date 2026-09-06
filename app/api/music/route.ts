import { NextResponse } from "next/server";
import { lastfmReady, unsetVars } from "@/lib/lastfm";
import type { QueueReport } from "@/lib/music";
import { readNowPlaying } from "@/lib/nowPlaying";

/**
 * The queue, as JSON.
 *
 * The homepage does not call this — the card is a server component and already
 * has the queue in its HTML. This exists for the three things that cannot: a
 * client that wants to refresh without a reload, a person checking what the
 * matcher actually chose (the one audit that matters here — see the header of
 * `lib/itunes.ts`), and telling an empty card apart from an unconfigured one.
 *
 * That last one is why `configured` and `missing` are on the wire. A deploy
 * came up in the fallback state with `LASTFM_API_KEY` set and `LASTFM_USER`
 * forgotten, and from outside that is indistinguishable from Last.fm being
 * down. Variable names only, never values — which is not a secret, and is the
 * whole answer when it is the problem.
 */
export async function GET() {
  const queue = await readNowPlaying();
  const report: QueueReport = {
    ...queue,
    configured: lastfmReady(),
    missing: unsetVars(),
  };

  return NextResponse.json(report, {
    headers: {
      /* Cacheable, and this is the opposite call from the engagement route
         next door — for the opposite reason. Nothing in this response depends
         on who is asking, so a shared cache is exactly right: five minutes
         matching the card's own revalidate, then a day of serving the last
         answer while a new one is fetched behind it. */
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
