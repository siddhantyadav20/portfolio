"use server";

import type { ReactionKind } from "@/lib/music";
import { knownKeys } from "@/lib/nowPlaying";
import { toggleReaction, type ReactResult } from "@/lib/trackReactions";

/* ===========================================================================
   The card's one write.

   A Server Action rather than a route handler, matching `StudyEnd/actions.ts`:
   a write triggered by a button in a client component is what they are for,
   and it keeps the site's public HTTP surface to the two GETs next door.

   It is still a public POST endpoint — that is what a Server Action is — so
   nothing the caller sends is trusted. The key is checked against the queue
   that has actually been on the card and the kind against the two that exist,
   and the rate limit lives in Redis where a deploy cannot reset it.
   =========================================================================== */

export async function reactToTrack(
  key: unknown,
  kind: unknown,
): Promise<ReactResult> {
  if (kind !== "up" && kind !== "down") return { ok: false, reason: "failed" };
  if (typeof key !== "string" || key.length === 0 || key.length > 140) {
    return { ok: false, reason: "failed" };
  }

  /* Unlike a study slug, the set of valid keys is not a constant — it is
     whatever was last playing. Checked against the same stored queue the
     reactions route reads, so the two cannot disagree about what a track is. */
  const known = await knownKeys();
  if (!known.has(key)) return { ok: false, reason: "failed" };

  return toggleReaction(key, kind as ReactionKind);
}
