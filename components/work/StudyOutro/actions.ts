"use server";

import { STUDY_SLUGS } from "@/content/work";
import type { CommentDraft } from "@/lib/engagement";
import {
  addComment,
  setReaction,
  type CommentResult,
  type ReactResult,
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
   =========================================================================== */

export async function reactToStudy(
  slug: unknown,
  kind: unknown,
): Promise<ReactResult> {
  if (typeof slug !== "string" || !STUDY_SLUGS.includes(slug)) {
    return { ok: false, reason: "failed" };
  }
  if (kind !== "up" && kind !== "down") {
    return { ok: false, reason: "failed" };
  }

  return setReaction(slug, kind);
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
