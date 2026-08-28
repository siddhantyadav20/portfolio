import { NextResponse } from "next/server";
import { STUDY_SLUGS } from "@/content/work";
import { COMMENT_PAGE, readNumber } from "@/lib/engagement";
import { readEngagement } from "@/lib/engagementStore";

/**
 * A study's likes and one page of its comments.
 *
 * Read on mount, and again for every press of "Load More" — `?from` is how
 * far into the thread to start and `?count` is how much to take. Both are
 * clamped in the store rather than trusted here.
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
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  /* Only the slugs that exist. Without this the endpoint is a write-free but
     unbounded key namespace — anyone could ask for `?slug=<anything>` and
     Redis would happily answer for a study that has never existed. */
  if (!STUDY_SLUGS.includes(slug)) {
    return NextResponse.json({ error: "Unknown study" }, { status: 404 });
  }

  const params_ = new URL(request.url).searchParams;
  const engagement = await readEngagement(
    slug,
    readNumber(params_.get("from"), 0),
    readNumber(params_.get("count"), COMMENT_PAGE),
  );

  return NextResponse.json(engagement, {
    headers: {
      /* Uncacheable, and it has to be: `liked` is this visitor's own answer,
         so a shared cache would hand one person's like to everyone behind the
         same CDN node. Folding the counts into a cacheable response and
         fetching `liked` separately would save a round trip on a request that
         happens once per study view — not a trade worth making for the bug it
         invites. */
      "Cache-Control": "no-store",
    },
  });
}
