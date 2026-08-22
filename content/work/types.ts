/**
 * The shape of a case study.
 *
 * One type, two surfaces: the modal that morphs out of a homepage card, and
 * the `/work/[slug]` route that the same content renders into for shared
 * links, crawlers and no-JS. Neither surface is allowed to know anything the
 * other doesn't — if a field only makes sense in one of them it belongs on the
 * component, not here.
 *
 * The `null` convention is the one `content/site.ts` already uses for
 * `MaybeHref`: a field that hasn't been written yet is `null`, and renders as
 * a visibly-marked placeholder. It is never a plausible-looking sentence,
 * because filler that reads as finished is worse than an obvious gap — it
 * makes the study look written when it isn't.
 */

/**
 * A row in the study's meta list (Role, Timeline, Skills…).
 *
 * `value: null` keeps the label visible while marking the value as unwritten,
 * so a half-filled study still shows its own scaffold instead of silently
 * dropping rows.
 *
 * Superseded, for a study that carries `helpers`, by that one line. The
 * Inspection redesign (Figma 62:3688) replaces the four-column list with
 * "SaaS · PropTech · Product Design · 2026 · 10 min read" above the title —
 * the same facts, at the size a reader actually wants them, and above the
 * fold rather than below the hero. The other two studies still use the list,
 * which is why both live here.
 */
export type StudyMeta = {
  readonly label: string;
  readonly value: string | null;
};

/**
 * A still inside the long-form body.
 *
 * Both surfaces reserve the box from `width`/`height` rather than measuring the
 * file, so a figure never lands by pushing the paragraph under it down the
 * page. `caption` is optional because some figures are self-evident and a
 * restated caption under one is noise.
 */
export type StudyMedia = {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly caption?: string;
};

/**
 * A running specimen inside the long-form body.
 *
 * A design system is the one subject where a screenshot argues against itself:
 * the claim is that the thing responds to a variable, and a picture of it
 * cannot. These are named rather than passed as components because
 * `content/work` is imported by a server route and must stay data — the
 * renderer maps the name to a client island. See `StudyLiveBlock`.
 */
export type StudyLive =
  | "theming-instrument"
  | "token-anatomy"
  | "remark-finder";

/**
 * A drawn exhibit inside a framed panel — Figma 529:11981.
 *
 * Same indirection as `StudyLive` and for the same reason, but a different
 * job: a specimen is something the reader operates, an exhibit is something
 * they read. The existing-workflow flowchart is a diagram of a *problem*, so
 * it is built from DOM rather than shipped as a flat export — it has to theme,
 * and its text has to be selectable and readable by a screen reader.
 */
export type StudyExhibit = "inspection-split-flow";

/**
 * The label under a figure — Figma 529:11967, and five more like it.
 *
 * Three parts, always in this order: a section-relative number, what the thing
 * is, and what kind of artefact it is. The number is authored rather than
 * counted, because it is `0.1` in the intro and `1.1` in the first section and
 * nothing in the render knows which section it is standing in.
 */
export type StudyCaption = {
  /** "0.1", "1.2" — the figure's number within its section. */
  readonly index: string;
  /** "The final flow". */
  readonly label: string;
  /** "PROTOTYPE", "IMAGE", "PROTOTYPE + FLOW ANALYSIS". Rendered uppercase. */
  readonly tag: string;
};

/**
 * A strip of text laid over a screenshot — Figma 529:12089 and 529:12091.
 *
 * The JIRA figure is a real board with two of its ticket titles replaced, so
 * the reader sees the tickets the story is about rather than whatever happened
 * to be in the sprint. Flattening that into the export would bake #222 text
 * into a PNG that has to survive a theme switch, and would make two sentences
 * of the argument unreadable to a screen reader and unfindable by search.
 *
 * Positions are fractions of the figure's own box (0–1), not pixels, because
 * the figure is fluid and the strips have to travel with it.
 */
export type StudyOverlay = {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * One of the three headline numbers under the hero — Figma 529:11825.
 *
 * `note` is what the number is *of*, and it is not optional: "52" and "89%"
 * are meaningless on their own, and a stat card that has to be believed on
 * trust is worse than no stat card.
 */
export type StudyOutcome = {
  /** "*35 minutes", "52", "89%". */
  readonly value: string;
  /** "LESS TIME". Rendered as authored. */
  readonly label: string;
  /** "to documenting observations". */
  readonly note: string;
  /** Which of the three washes this card carries. */
  readonly tint: "amber" | "teal" | "violet";
};

/**
 * A block in a section's body.
 *
 * The old model was `body: string[]` plus optional `media` and `live`, in that
 * fixed order. That covered the Design System study and nothing in the
 * Inspection redesign: an aside beside its column, a tinted insight panel, a
 * framed exhibit with its own caption. Rather than bolt three more optional
 * fields onto a section and fix their order in the renderer, a section is now
 * an ordered list of blocks — which is what it always was, with the order
 * hardcoded.
 *
 * `prose`, `figure` and `live` are exactly the three the old shape had, so
 * nothing that read well before reads differently now.
 */
export type StudyBlock =
  /** Paragraphs at the full measure. */
  | { readonly kind: "prose"; readonly body: readonly string[] }

  /**
   * A short lead in the left margin, paragraphs beside it — Figma 529:11824.
   * 240px of lead, 48px of gutter, and the rest. The lead is the sentence the
   * section would be reduced to; the body is the argument for it.
   */
  | {
      readonly kind: "aside";
      readonly lead: string;
      readonly body: readonly string[];
      /** A figure inside the right-hand column, under the prose.
       *  `StudyMedia`'s own prose caption is dropped rather than added to:
       *  this figure carries the indexed label row instead, and a figure with
       *  two captions under it has one too many. */
      readonly figure?: Omit<StudyMedia, "caption"> & {
        readonly caption: StudyCaption;
        readonly overlays?: readonly StudyOverlay[];
      };
    }

  /**
   * An eyebrow, a medium heading and prose — Figma 548:12177. A turn in the
   * argument rather than a new section: quieter than a section heading, and
   * set in the UI face rather than the display one.
   */
  | {
      readonly kind: "note";
      readonly eyebrow: string;
      readonly heading: string;
      readonly body: readonly string[];
    }

  /**
   * The tinted panel — Figma 548:12210. One per section at most: it is the
   * thing the section was written to arrive at, and two of them in a row is
   * two claims neither of which is the point.
   */
  | {
      readonly kind: "insight";
      readonly eyebrow: string;
      readonly heading: string;
      readonly body: readonly string[];
    }

  /** A framed exhibit with its own caption — Figma 529:11981. */
  | {
      readonly kind: "exhibit";
      readonly view: StudyExhibit;
      readonly caption: StudyCaption;
    }

  /** A still, at the reading column's full width. */
  | ({ readonly kind: "figure" } & StudyMedia)

  /** A specimen the reader can operate. */
  | { readonly kind: "live"; readonly view: StudyLive };

/**
 * A section of the long-form body.
 *
 * `id` is the fragment the quick-links rail scrolls to and the anchor a
 * deep link lands on, so it is content rather than derived: slugging the
 * heading would silently change every link the day a heading is reworded.
 *
 * `eyebrow` is the small blue line above the heading ("THE PROBLEM"), and
 * `label` is what the rail calls this section on hover — usually the same
 * words, occasionally shorter.
 */
export type StudySection = {
  readonly id: string;
  readonly eyebrow?: string;
  readonly heading: string;
  readonly label?: string;
  readonly blocks: readonly StudyBlock[];
};

/**
 * The artwork at the top of a study.
 *
 * `prototype` is the Inspection treatment: a photographic plate with a device
 * mockup composited over it, playing the real recording. It is the expensive
 * one and only earns its place where a recording exists.
 *
 * `image` is the ordinary case — a single still.
 *
 * `live` is a running specimen instead of artwork — the Design System study's
 * hero is the same instrument its card is, so the card does not cross-fade
 * into a photograph of itself on the way in; it grows.
 *
 * `null` means no artwork has been chosen yet; both surfaces skip the hero
 * block entirely rather than reserving an empty frame.
 */
/**
 * `view-transition-name` for this study's hero.
 *
 * Per-study, and that is the whole point: the name has to be unique across
 * everything live in the document. Two elements sharing one abort the
 * transition outright, so when a second card started carrying the hero name
 * the *first* card's morph broke too. Every name here also needs a matching
 * pair of rules in `globals.css` (the `::view-transition-group` z-index and
 * the `object-fit: cover` on old/new) or the snapshot stretches in flight.
 */
export type StudyMorphName =
  | "inspection-frame"
  | "design-system-frame"
  | "search-frame";

type HeroBox = {
  /** Intrinsic size. The `/work` route renders the hero through `next/image`,
   *  which needs it to reserve the box. */
  readonly width: number;
  readonly height: number;
  readonly morphName: StudyMorphName;
  /** The label under the frame. Figma 529:11967. */
  readonly caption?: StudyCaption;
};

export type StudyHero =
  | ({
      readonly kind: "prototype";
      /** The photographic backdrop the device sits on. */
      readonly plate: string;
      readonly plateAlt: string;
    } & HeroBox)
  | ({
      readonly kind: "image";
      readonly src: string;
      readonly alt: string;
    } & HeroBox)
  | ({
      readonly kind: "live";
      readonly view: StudyLive;
      /** Painted while the specimen is still an idea rather than a picture:
       *  the OG card and any surface that cannot run it fall back here. */
      readonly still: string;
      readonly alt: string;
    } & HeroBox)
  | null;

/**
 * The still that stands in for a hero.
 *
 * Three callers need the same answer and all three used to spell it out as a
 * ternary over `kind`: the route, which renders a plain `next/image`; the
 * modal hook, which decodes it before starting a view transition; and the OG
 * card. Adding a third hero kind broke all three at once, which is the usual
 * argument for putting the branch in one place.
 *
 * Every kind has one, including `live` — a specimen that has not run yet still
 * has to be *something* on a surface that cannot run it.
 */
export function heroStill(
  hero: NonNullable<StudyHero>,
): { readonly src: string; readonly alt: string } {
  switch (hero.kind) {
    case "prototype":
      return { src: hero.plate, alt: hero.plateAlt };
    case "image":
      return { src: hero.src, alt: hero.alt };
    case "live":
      return { src: hero.still, alt: hero.alt };
  }
}

export type CaseStudy = {
  /** Stable. It is in shared URLs (`/work/<slug>` and `?study=<slug>`), so
   *  renaming one breaks links that are already out in the world. */
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;

  /**
   * The line above the title — "SaaS · PropTech · Product Design · 2026 ·
   * 10 min read". Figma 328:10064. Where a study has one it stands in for
   * `meta`; the separators are drawn by the renderer, not authored.
   */
  readonly helpers?: readonly string[];

  /** The opening paragraph, under the hero on both surfaces. */
  readonly body: string | null;

  /** The three headline numbers, and the caveat under them. */
  readonly outcomes?: {
    readonly items: readonly StudyOutcome[];
    /** The asterisk's other half. Optional, but an asterisked number with no
     *  note underneath it is a claim hiding its own qualification. */
    readonly note?: string;
  };

  readonly meta: readonly StudyMeta[];
  readonly hero: StudyHero;

  /** The long-form write-up. `null` until it is written. */
  readonly sections: readonly StudySection[] | null;
};
