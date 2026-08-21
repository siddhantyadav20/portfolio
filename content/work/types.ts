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

/** A titled run of paragraphs in the long-form body. */
export type StudySection = {
  readonly heading: string;
  readonly body: readonly string[];
  /** Figures, after the prose. */
  readonly media?: readonly StudyMedia[];
  /** A specimen, after the figures. */
  readonly live?: StudyLive;
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

  /** The opening paragraph, under the hero on both surfaces. */
  readonly body: string | null;

  readonly meta: readonly StudyMeta[];
  readonly hero: StudyHero;

  /** The long-form write-up. `null` until it is written. */
  readonly sections: readonly StudySection[] | null;
};
