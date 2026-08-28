"use server";

import { STUDY_SLUGS } from "@/content/work";
import type { CommentDraft } from "@/lib/engagement";
import {
  addComment,
  toggleCommentLike,
  toggleLike,
  type CommentResult,
  type LikeResult,
} from "@/lib/engagementStore";

/* ===========================================================================
   The two writes.

   Server Actions rather than route handlers, matching the waitlist: a write
   triggered by a button in a client component is exactly what they are for,
   and it keeps the site's public HTTP surface to the one GET next door.

   Both are public POST endpoints — that is what a Server Action is, and the
   Next docs are explicit about it — so neither trusts a single thing the
   caller sends. The slug is checked against the registry, the payload is
   re-validated against the same rules the client ran, and the rate limits
   live in Redis where a deploy cannot reset them. See `lib/engagementStore`.

   Neither takes a "which reaction" any more: there is one, and a caller that
   could name it could also name one the store has never heard of.
   =========================================================================== */

export async function likeStudy(slug: unknown): Promise<LikeResult> {
  if (typeof slug !== "string" || !STUDY_SLUGS.includes(slug)) {
    return { ok: false, reason: "failed" };
  }

  return toggleLike(slug);
}

/**
 * Like one comment in a study's thread.
 *
 * The id is not checked against the thread, and that is deliberate rather than
 * an omission: a set keyed on an id nobody has ever posted is a set nobody
 * will ever read, and validating it would mean scanning up to five hundred
 * comments on every press to prevent a stranger writing a key that costs
 * nothing and does nothing. The rate limit is the thing standing between this
 * and abuse, and it is the same one the study's own like uses.
 */
export async function likeStudyComment(
  slug: unknown,
  id: unknown,
): Promise<LikeResult> {
  if (typeof slug !== "string" || !STUDY_SLUGS.includes(slug)) {
    return { ok: false, reason: "failed" };
  }
  // Long enough for a UUID and nothing like long enough to be a payload.
  if (typeof id !== "string" || id.length === 0 || id.length > 64) {
    return { ok: false, reason: "failed" };
  }

  return toggleCommentLike(slug, id);
}

export async function commentOnStudy(
  slug: unknown,
  draft: unknown,
): Promise<CommentResult> {
  if (typeof slug !== "string" || !STUDY_SLUGS.includes(slug)) {
    return { ok: false, reason: "failed" };
  }

  const raw = (draft ?? {}) as Partial<CommentDraft>;
  return addComment(slug, {
    name: typeof raw.name === "string" ? raw.name : "",
    body: typeof raw.body === "string" ? raw.body : "",
  });
}
