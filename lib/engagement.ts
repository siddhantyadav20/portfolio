/* ===========================================================================
   The shape of a study's engagement, shared by the server that stores it and
   the client that draws it.

   Types and limits only — no Redis, no `server-only`. The client imports this
   to check a comment before sending it and the server imports the same file to
   check it again on arrival, so the two can never disagree about what counts
   as too long. The button is not a security boundary; this is the rule both
   sides read.
   =========================================================================== */

/** A comment as it is stored — nothing here depends on who is reading. */
export type StudyComment = {
  readonly id: string;
  /** Empty where the author didn't give one — rendered as "Anonymous". */
  readonly name: string;
  readonly body: string;
  /** Epoch milliseconds. */
  readonly at: number;
};

/**
 * A comment as it is served: the stored record, plus how the person asking
 * stands with it.
 *
 * Kept apart from `StudyComment` rather than folded into it, because the two
 * differ in a way that matters — `liked` is true for one visitor and false for
 * the next, so it can never be written down. Anything that stores or validates
 * a comment takes the plain shape; only the read hands out this one.
 */
export type ThreadComment = StudyComment & {
  readonly likes: number;
  readonly liked: boolean;
};

export type Engagement = {
  /**
   * `false` when the store isn't wired up (no Upstash credentials). Both
   * surfaces then render the block as explicitly unavailable rather than
   * showing zeroes, which would read as "nobody has ever liked this".
   */
  readonly configured: boolean;

  /** How many people have liked this study. */
  readonly likes: number;
  /** Whether the person asking is one of them. */
  readonly liked: boolean;

  /**
   * How many comments the thread holds in total — not how many are in
   * `comments`. The stats row states the size of the thread and the thread
   * itself arrives a page at a time, so these are two different numbers and
   * conflating them made the count shrink to whatever had been fetched.
   */
  readonly total: number;

  /** One page of the thread, newest first. */
  readonly comments: readonly ThreadComment[];
  /** Where this page started, so the caller knows what to ask for next. */
  readonly from: number;
};

export const EMPTY_ENGAGEMENT: Engagement = {
  configured: false,
  likes: 0,
  liked: false,
  total: 0,
  comments: [],
  from: 0,
};

/** How many comments a study keeps. */
export const COMMENT_CAP = 500;

/** A page of the thread — Figma 798:900 draws four and then "Load More". */
export const COMMENT_PAGE = 4;

/** The most one request may ask for, however it asks. */
export const COMMENT_MAX_PAGE = 50;

export const NAME_MAX = 40;
export const BODY_MAX = 600;

export type CommentDraft = { name: string; body: string };

export type CommentError =
  | "empty"
  | "too-long"
  | "throttled"
  | "unavailable"
  | "failed";

/**
 * Clean and check a draft comment.
 *
 * Run on both sides. Control characters go — they are never typed on purpose,
 * and they are how one "line" becomes forty in somebody else's browser — and
 * runs of blank lines collapse to one. What survives is stored and rendered as
 * plain text: React escapes it and nothing turns a URL into a link, so there
 * is no reason to post link spam here in the first place.
 */
export function readComment(
  draft: CommentDraft,
): { ok: true; value: CommentDraft } | { ok: false; reason: CommentError } {
  const name = strip(draft.name).slice(0, NAME_MAX);
  const body = strip(draft.body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!body) return { ok: false, reason: "empty" };
  if (body.length > BODY_MAX) return { ok: false, reason: "too-long" };

  return { ok: true, value: { name, body } };
}

/**
 * A query parameter as a number, or the fallback.
 *
 * The absent case is checked before the conversion, and that is the whole
 * point of the function rather than a nicety: `Number(null)` is `0`, not
 * `NaN`, so a plain `Number.isFinite` guard accepts a missing parameter as a
 * perfectly good zero. It did — the thread's default page size came out as
 * `count=0`, which the store clamped to one, and every study served its first
 * comment and then a "Load More" button.
 *
 * Anything a caller sends that is not a number is not an error worth a status
 * code; it is a request for the default.
 */
export function readNumber(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Everything except a newline and a tab, which are the only two control
 * characters anyone types on purpose.
 *
 * Written as escapes rather than as literal characters: a regex containing
 * raw control bytes is invisible in a diff, in a code review, and in every
 * editor that renders it, which is exactly the wrong property for the line
 * that decides what a stranger is allowed to store on your site.
 */
const CARRIAGE = /\r\n?/g;
const CONTROL = /[\x00-\x08\x0B-\x1F\x7F]/g;

function strip(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(CARRIAGE, "\n").replace(CONTROL, "").trim();
}
