import { NextResponse } from "next/server";
import { countVisitor, readVisitors } from "@/lib/visitorStore";

/**
 * The footer's visitor total: say which browser you are, and be told how many
 * there have ever been.
 *
 * A POST, because it writes. Announcing a browser is the whole mechanism, and
 * a GET that mutates the number it reports is the kind of endpoint a
 * prefetcher, a link scanner or a preview bot quietly inflates — this site has
 * an OpenGraph card and a sitemap, so those visit. It is the mirror of the
 * engagement route next door, which is a GET precisely because reading a
 * thread changes nothing.
 *
 * A GET here answers the total without counting the asker, which is what a
 * crawler should get and costs one command.
 */
export async function POST(request: Request) {
  let id: unknown;

  try {
    const body: unknown = await request.json();
    id = (body as { id?: unknown } | null)?.id;
  } catch {
    // No body, or not JSON. Answer the total; count nobody.
  }

  return json(await countVisitor(id));
}

export async function GET() {
  return json(await readVisitors());
}

function json(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      /* Uncacheable. The write must reach the store rather than a CDN node,
         and a cached total is a total that stops moving. */
      "Cache-Control": "no-store",
    },
  });
}
