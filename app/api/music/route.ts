import { NextResponse } from "next/server";
import { readNowPlaying } from "@/lib/nowPlaying";

/**
 * The queue, as JSON.
 *
 * The homepage does not call this — the card is a server component and already
 * has the queue in its HTML. This exists for the two things that cannot: a
 * client that wants to refresh without a reload, and a person checking what
 * the matcher actually chose, which is the one audit that matters here (see
 * the header of `lib/itunes.ts` for why).
 */
export async function GET() {
  const queue = await readNowPlaying();

  return NextResponse.json(queue, {
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
