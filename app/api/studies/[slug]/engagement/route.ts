import { NextResponse } from "next/server";
import { STUDY_SLUGS } from "@/content/work";
import { readEngagement, readMyReaction } from "@/lib/engagementStore";

/**
 * A study's reactions and comments, read on mount.
 *
 * A route handler rather than a Server Action, and the split is deliberate:
 * a Server Action is a POST with no cache semantics and no status codes worth
 * the name, which is right for a write and wrong for a read. This is a GET
 * that can 404 an unknown slug and say plainly how it may be cached.
 *
 * Reading here rather than at build time is what keeps `/work/<slug>` static.
 * The page prerenders with no engagement in it at all and the block fills in
 * a moment later; baking counts into the HTML would turn three static pages
 * into three dynamic ones to show a number that is stale by the time it is
 * read anyway.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  /* Only the slugs that exist. Without this the endpoint is a write-free but
     unbounded key namespace — anyone could ask for `?slug=<anything>` and
     Redis would happily answer for a study that has never existed. */
  if (!STUDY_SLUGS.includes(slug)) {
    return NextResponse.json({ error: "Unknown study" }, { status: 404 });
  }

  const [engagement, mine] = await Promise.all([
    readEngagement(slug),
    readMyReaction(slug),
  ]);

  return NextResponse.json(
    { ...engagement, mine },
    {
      headers: {
        /* Uncacheable, and it has to be: `mine` is this visitor's own
           reaction, so a shared cache would hand one person's vote to
           everyone behind the same CDN node. Folding the counts into a
           cacheable response and fetching `mine` separately would save a
           round trip on a request that happens once per study view — not a
           trade worth making for the bug it invites. */
        "Cache-Control": "no-store",
      },
    },
  );
}
