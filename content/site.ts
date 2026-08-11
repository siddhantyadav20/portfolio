/**
 * All homepage copy, in one place.
 *
 * Every string here is transcribed from the Figma file — nothing is invented.
 * Where a destination or value isn't decided yet it is `null`, which renders as
 * a visibly-marked placeholder in development (see `data-placeholder` styling)
 * rather than a dead link that looks finished.
 */

/** A link whose destination Siddhant hasn't confirmed yet. */
export type MaybeHref = string | null;

export const intro = {
  title: "Hi, I’m Siddhant",
  tagline: "I design tools for people who work with their hands, not a mouse.",
  note: "- Less, but better",
  /** Used by the Copy Email button. */
  email: "siddhantyadav20@gmail.com",
  storeHref: null as MaybeHref,
} as const;

/* Titles are single strings that wrap naturally at the width Figma gives them,
   rather than hard-coded line breaks — same result, survives copy edits. */

export const inspection = {
  title: "Capturing 200+ Inspection Photos",
  stat: "Cut reporting time by 13 minutes per inspection, across 20,000+ properties daily",
  href: "/work/inspection-photos",
} as const;

export const search = {
  title: "Searching amidst a chaos",
  subtitle: "of 104,122 remarks",
  placeholder: "What did you observe?",
  category: "Select category",
  before: "Navigation first",
  after: "Search first",
  delta: "~ 51m saved",
  href: "/work/search",
} as const;

export const designSystem = {
  eyebrow: "Scaling a",
  title: "Design System",
  subtitle: "across 12 products",
  stat: "281 Reusable Token",
  statDetail: "Used across 12 products",
  href: "/work/design-system",
} as const;

export const about = {
  eyebrow: "About",
  title: "Me",
  href: "/about",
} as const;

export const designEngineer = {
  from: { abbr: "DES", label: "Design" },
  to: { abbr: "ENG", label: "Engineer" },
} as const;

export const workspace = {
  cta: "Explore my WorkSpace",
  href: "/workspace",
} as const;

/**
 * Timeline. Only the currently-active entry exists in the Figma design; the
 * other years are deliberately empty rather than invented. Phase 6 makes this
 * scrubbable — the shape is already per-year so nothing needs restructuring.
 */
export const timeline = {
  milestones: [-1, 0, 1, 2, 3, 4, 5] as const,
  activeYear: 5,
  entries: {
    5: {
      years: "5",
      unit: "yr",
      date: "2026",
      company: "WIN Home Inspection",
      role: "Product Designer",
    },
  } as Record<number, TimelineEntry | undefined>,
};

export type TimelineEntry = {
  years: string;
  unit: string;
  date: string;
  company: string;
  role: string;
};

export const store = {
  eyebrow: "Currently Building",
  title: "An app to document yourself",
  description:
    "A web extension to document anything you see on the internet for your own custom wall like pinterest but for everything",
  cta: "Join the Waitlist",
} as const;

export const music = {
  label: "Listening to",
  track: "Ode to the Mets",
  index: 1,
  total: 3,
} as const;

export const linkedin = {
  name: "Siddhant Yadav",
  role: "Product Designer",
  /** Rendered as coloured runs, matching the Figma text styling. */
  blurb: [
    { text: "cooking up ", tone: "ink" },
    { text: "@win", tone: "blue" },
    { text: " • ", tone: "ink" },
    { text: "prev ", tone: "ink" },
    { text: "@mistry.store", tone: "red" },
    { text: " and ", tone: "ink" },
    { text: "@likeminds", tone: "green" },
  ] as const,
  cta: "Let’s Connect",
  href: null as MaybeHref,
} as const;

export const footer = {
  copyright: "© 2026 Siddhant Yadav",
  credit: "Designed on Figma. Built using Claude + Qwen.",
  /**
   * No presence service is connected yet, so the count is an em dash rather
   * than a number — a static "1" would read as measured live traffic.
   * Swap for a real value when a source exists (see ARCHITECTURE D7).
   */
  visitors: null as number | null,
  visitorsLabel: "Live Visitors",
  makingOf: null as MaybeHref,
  linkedinHref: null as MaybeHref,
} as const;
