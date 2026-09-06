import { NextResponse } from "next/server";
import { EMPTY_REACTIONS, QUEUE_MAX } from "@/lib/music";
import { knownKeys } from "@/lib/nowPlaying";
import { readReactions } from "@/lib/trackReactions";

/**
 * How many thumbs each track has, and which one you pressed.
 *
 * Fetched on mount rather than server-rendered into the card, and that is the
 * whole reason this route exists: `mine` comes from `visitorId()`, which reads
 * request headers, and reading those anywhere on the homepage's server path
 * would opt the entire page out of static rendering to draw two small numbers.
 * `StudyEnd/Comments.tsx` solved this first and its docblock says the same.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("keys") ?? "";
  const asked = raw.split(",").map((k) => k.trim()).filter(Boolean);

  /* A queue is at most `QUEUE_MAX` long, so a longer list is not a card asking
     a question — it is somebody seeing how many `SCARD`s one request can buy. */
  if (asked.length === 0 || asked.length > QUEUE_MAX) {
    return NextResponse.json(EMPTY_REACTIONS, {
      status: asked.length > QUEUE_MAX ? 400 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  /* The dynamic analogue of checking a slug against `STUDY_SLUGS`: only keys
     that have actually been on the card. Without it this is an unbounded key
     namespace anyone can write into by inventing song titles.

     Unknown keys are dropped from the answer rather than 404ing the request.
     The queue moves — a track can roll off the recent list between the render
     and this fetch — and one stale key should not cost the other five their
     counts. */
  const known = await knownKeys();
  const keys = asked.filter((k) => known.has(k));

  const reactions = await readReactions(keys);

  return NextResponse.json(reactions, {
    headers: {
      /* `mine` is this visitor's own answer. A shared cache would hand one
         person's thumb to everyone behind the same CDN node. */
      "Cache-Control": "no-store",
    },
  });
}
