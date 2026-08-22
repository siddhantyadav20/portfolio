/* ===========================================================================
   What a palette row is.

   Shapes only — no data, no matching, no imports from the rest of the site.
   Split out of one 1,000-line `content/palette.ts` for the same reason
   `content/work` has a `types.ts`: three files read these (the index that
   builds rows, the search that ranks them, the panel that draws them) and a
   type file that imports nothing is the one place all three can agree without
   any of them depending on each other.
   =========================================================================== */

import type { Cluster } from "@/content/canvas";
import type { Mark } from "@/lib/match";

export type PaletteDestination =
  /** A case study, optionally at one of its sections. */
  | { readonly kind: "study"; readonly slug: string; readonly section?: string }
  /** A route on this site. */
  | { readonly kind: "route"; readonly href: string }
  /** Somewhere else. Opens in a new tab. */
  | { readonly kind: "external"; readonly href: string }
  /** Scroll the homepage to a card, and let it play. */
  | { readonly kind: "card"; readonly card: string }
  /** Fly the canvas. Opens it first if it is not already open. */
  | {
      readonly kind: "canvas";
      readonly widget?: string;
      readonly cluster?: Cluster;
    }
  /** Compose an answer inside the palette. No navigation. */
  | { readonly kind: "answer"; readonly answer: AnswerId }
  /** Do something. */
  | { readonly kind: "action"; readonly action: ActionId };

export type AnswerId =
  | "shipped"
  | "build"
  | "available"
  | "tour"
  | "shortcuts";

export type ActionId =
  | "copy-email"
  | "resume"
  | "linkedin"
  | "theme"
  | "copy-link";

/**
 * The groups, in the order the empty state offers them.
 *
 * `start` is first because it is the answer to the question a recruiter
 * actually arrived with, and every other group is a way of not answering it
 * yet.
 */
export const GROUPS = [
  "recent",
  "start",
  "work",
  "evidence",
  "career",
  "board",
  "listen",
  "do",
] as const;

export type PaletteGroup = (typeof GROUPS)[number];

export const GROUP_LABELS: Record<PaletteGroup, string> = {
  recent: "Where you left off",
  start: "Start here",
  work: "Work",
  evidence: "Evidence",
  career: "Career",
  board: "On the canvas",
  listen: "Listening to",
  do: "Do",
};

/**
 * What the panel shows beside a highlighted row.
 *
 * The palette began as a list of places, which is what every palette is. This
 * is the part that makes it something else: arrow onto "281 Reusable Tokens"
 * and the tile appears in its own colour; arrow onto a study and its hero
 * does; arrow onto a book and you get the cover and the line Siddhant wrote
 * about it. Nothing has to be opened to be seen.
 *
 * That matters more here than it would in a text editor's palette. A recruiter
 * is not trying to *navigate* — they are trying to look at the work, and every
 * navigation is a chance to lose them. This is the version where they never
 * have to leave the box they are already typing in.
 *
 * Every field is optional and every field is derived. A row with nothing worth
 * showing renders no preview at all rather than an empty frame.
 */
export type PalettePreview = {
  readonly title: string;
  readonly subtitle?: string;
  readonly image?: { readonly src: string; readonly alt: string };
  /** The big-number treatment, for an outcome. */
  readonly figure?: {
    readonly value: string;
    readonly label: string;
    readonly note?: string;
  };
  /** Which of the study washes this carries. */
  readonly tint?: "amber" | "teal" | "violet";
  /** Small label/value pairs under the image. */
  readonly facts?: readonly (readonly [string, string])[];
  /** A paragraph. Kept short by whatever built it. */
  readonly body?: string;
};

export type PaletteEntry = {
  readonly id: string;
  readonly group: PaletteGroup;
  /** The line you read. Always a string that exists somewhere on the site. */
  readonly label: string;
  /** The quiet line beside it — usually where the label lives. */
  readonly hint?: string;
  /** Matched but never shown. Synonyms only; see the header. */
  readonly keywords?: string;
  readonly to: PaletteDestination;
  /** Shown in the empty state, before anything is typed. */
  readonly featured?: boolean;
  /** What to draw beside this row when it is highlighted. */
  readonly preview?: PalettePreview;
  /**
   * The study this belongs to, if any.
   *
   * Read only by the context boost in `searchPalette`: standing on a study and
   * searching should surface *that* study's sections before another one's.
   */
  readonly study?: string;
};

/**
 * A row the palette can draw.
 *
 * `marks` are offsets into `entry.label` and nothing else, which is why the
 * quiet fields are matched unmarked: highlighting a hit the reader cannot see
 * would put the underline on the wrong letters.
 */
export type PaletteHit = {
  readonly entry: PaletteEntry;
  readonly marks: readonly Mark[];
  /** True when nothing in the visible label matched — see `matchFields`. */
  readonly viaKeywords: boolean;
  /**
   * The heading to draw this under.
   *
   * Usually the entry's own group, and separate from it so the empty state can
   * file a row under "Where you left off" without pretending the thing itself
   * changed kind.
   */
  readonly group: PaletteGroup;
};

/**
 * Where the reader is standing.
 *
 * Supplied by the palette from the address bar rather than threaded through
 * props: the panel is mounted once in the root layout and has no idea which
 * page is underneath it, and the URL is the one thing that always knows.
 */
export type PaletteContext = {
  /** The study currently open, as a modal or as a route. */
  readonly study?: string;
};
