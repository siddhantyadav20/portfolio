/* ===========================================================================
   The shape of a study's engagement, shared by the server that stores it and
   the client that draws it.

   Types and limits only — no Redis, no `server-only`. The client imports this
   to check a comment before sending it and the server imports the same file to
   check it again on arrival, so the two can never disagree about what counts
   as too long. The button is not a security boundary; this is the rule both
   sides read.
   =========================================================================== */

export type Reaction = "up" | "down";

export type StudyComment = {
  readonly id: string;
  /** Empty where the author didn't give one — rendered as "Anonymous". */
  readonly name: string;
  readonly body: string;
  /** Epoch milliseconds. */
  readonly at: number;
};

export type Engagement = {
  /**
   * `false` when the store isn't wired up (no Upstash credentials). Both
   * surfaces then render the block as explicitly unavailable rather than
   * showing zeroes, which would read as "nobody has ever reacted".
   */
  readonly configured: boolean;
  readonly up: number;
  readonly down: number;
  readonly comments: readonly StudyComment[];
};

export const EMPTY_ENGAGEMENT: Engagement = {
  configured: false,
  up: 0,
  down: 0,
  comments: [],
};

/** How many comments a study keeps, and how many it hands out at once. */
export const COMMENT_CAP = 500;
export const COMMENT_PAGE = 50;

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

/** "3 minutes ago", for a comment's timestamp. Absolute past a week. */
export function relativeTime(at: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d ago`;

  /* Past a week "37d ago" stops being easier to read than the date itself.
     `UTC` rather than the reader's zone: this renders on the client only, but
     pinning it means two people in different places quoting the same comment
     are quoting the same date. */
  return new Date(at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
