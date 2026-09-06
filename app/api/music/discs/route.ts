import { NextResponse } from "next/server";
import { widgets } from "@/content/canvas";
import { lookupTracks } from "@/lib/itunes";

/**
 * The six records on the board, resolved to a sleeve and a preview.
 *
 * One upstream request for all six — `lookup?id=a,b,c,...` — rather than six,
 * because the board wants them all at once or not at all, and because Apple's
 * minute budget is small enough to care.
 *
 * A route rather than server props: `CanvasSurface` is a client component and
 * imports the whole world from it, so nothing under `CanvasWorld` can await
 * anything. The board is drawn from CSS in the meantime and the artwork fades
 * in over it — see `components/canvas/widgets/Disc`.
 *
 * A widget whose id is missing from the answer keeps its drawn sleeve and
 * stays silent. That is also the permanent state with no network, which is why
 * the resting state had to be worth looking at rather than a grey box.
 */
export type DiscArt = {
  readonly cover: string;
  readonly preview: string;
  readonly album: string | null;
};

export async function GET() {
  const discs = widgets.filter((w) => w.kind === "disc");
  const found = await lookupTracks(discs.map((d) => d.itunesId));

  const out: Record<string, DiscArt> = {};
  for (const disc of discs) {
    const match = found.get(disc.itunesId);
    if (!match) continue;
    out[disc.id] = {
      cover: match.cover,
      preview: match.preview,
      album: match.album,
    };
  }

  return NextResponse.json(out, {
    headers: {
      /* Nothing here depends on who is asking and none of it changes: these
         are six fixed ids on a storefront. A day of freshness, a week of
         serving the last answer while a new one is fetched behind it. */
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
