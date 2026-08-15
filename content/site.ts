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

  /**
   * Prototype recording that plays inside the phone while the card is hovered.
   * Not in the repo yet — drop the file at this path and it starts playing;
   * until then the card holds the still screenshot and nothing breaks. It is
   * loaded on first hover, never on page load.
   */
  video: "/media/inspection-prototype.mp4",

  /**
   * The case-study modal (Figma "Case Study - Modal", node 62:3688). Everything
   * below the mockup is first-pass copy standing in for the full write-up —
   * the layout is final, the words are not.
   */
  caseStudy: {
    /** What the share button puts on the clipboard, and what opens the modal
     *  on arrival — see `?study=` in InspectionExperience. */
    slug: "inspection-photos",
    title: "Capturing 200+ Inspection Photos",
    subtitle:
      "Cut reporting time by 13 minutes per inspection, across 20,000+ inspections daily",
    body: "In early 2026, after launching an offline-first mobile app for conducting home inspections for inspectors based in US (in early 2025): we set out to redesign the camera flow which was one of the most crucial and highly used feature but was never designed to it’s full potential.",
    meta: [
      { label: "Product", value: "iOS, iPad + Android" },
      { label: "Role", value: "Product Designer" },
      { label: "Timeline", value: "Jan 2026 - Mar 2026" },
      {
        label: "Skills",
        value:
          "Product design, Stakeholder management, Interactive prototyping, User research & testing",
      },
    ],
  },
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

  /**
   * The three marks that fly out of the portrait on hover, in the order they
   * are thrown. Order is the visual one — Figma to the upper left, Claude to
   * the right, After Effects below — and the orbit keeps them 120deg apart
   * from there.
   */
  tools: [
    { name: "Figma", icon: "/icons/tool-figma.svg" },
    { name: "Claude", icon: "/icons/tool-claude.svg" },
    { name: "After Effects", icon: "/icons/tool-after-effects.svg" },
  ],

  /**
   * The About modal. Placeholder copy: the layout, the morph and the staging
   * are the finished parts of this pass — the words are stand-ins and are meant
   * to be replaced wholesale.
   */
  story: {
    title: "A designer who builds",
    subtitle:
      "Placeholder — the real introduction goes here, in Siddhant’s own words.",
    body: [
      "Placeholder paragraph. This is where the story of how I got here goes: the detour through engineering, the years spent watching inspectors work with gloves on, and why that turned into a habit of designing for the hand rather than the mouse.",
      "Placeholder paragraph. And this is where the way I work goes — prototypes over specs, motion as a way of explaining rather than decorating, and shipping the thing rather than the deck about the thing.",
    ],
    meta: [
      { label: "Based in", value: "Placeholder — city" },
      { label: "Currently", value: "Placeholder — role, company" },
      { label: "Before that", value: "Placeholder — earlier chapters" },
      { label: "Elsewhere", value: "Placeholder — LinkedIn, Read.cv, Email" },
    ],
  },
} as const;

export const designEngineer = {
  from: { abbr: "DES", label: "Design" },
  to: { abbr: "ENG", label: "Engineer" },
} as const;

export const canvas = {
  cta: "Explore my Canvas",
  href: "/canvas",
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

  /** Figma "Currently Building", Input / Entered states. */
  placeholder: "Type your email/phone here",
  join: "Join",

  /** Figma "Currently Building", Success state. */
  success: {
    title: "Thanks for enrolling",
    subtitle: "You just gave me motivation to ship it faster :)",

    /**
     * The celebration, exported from Figma as-is (node 302:10059). 2.1MB, so it
     * is never part of the page load: nothing requests it until the visitor
     * opens the pill, and nothing renders it until they have actually joined.
     */
    art: "/media/waitlist-success.gif",
    artWidth: 146,
    artHeight: 109,
  },

  /**
   * Figma has no error state — five variants, all of them happy. These two
   * lines are the smallest honest addition: a submission can fail, and a card
   * that swallows that failure is worse than one that admits it. They render
   * into the 24px of slack the card already carries below the pill, so nothing
   * moves and the card stays 219 tall.
   */
  errors: {
    invalid: "That doesn’t look like an email or a phone number.",
    failed: "Couldn’t send that just now — try again?",
  },
} as const;

/**
 * Music player. Figma's component set (node 80:7658) is eight variants — four
 * tracks, each paused and playing — so the four tracks live here and the two
 * states are the component's own.
 *
 * The files come from `references/music player/`. They are streamed, never
 * preloaded, so nothing is fetched until someone presses play.
 *
 * `duration` is the fallback clock only — measured off each file, but the
 * player prefers the decoded `duration` once the browser reports one, so
 * these never have to be exact. A track with `src: null` still works: the
 * transport runs on this number instead.
 */
export const music = {
  label: "Listening to",
  tracks: [
    {
      title: "Ode to the Mets",
      cover: "/media/track-ode-to-the-mets.png",
      src: "/audio/ode-to-the-mets.mp3" as MaybeHref,
      duration: 409,
    },
    {
      title: "I Feel it Coming",
      cover: "/media/track-i-feel-it-coming.png",
      src: "/audio/i-feel-it-coming.mp3" as MaybeHref,
      duration: 297,
    },
    {
      title: "Read my Mind",
      cover: "/media/track-read-my-mind.png",
      src: "/audio/read-my-mind.mp3" as MaybeHref,
      duration: 244,
    },
    {
      title: "Wavin’ Flag",
      cover: "/media/track-wavin-flag.png",
      src: "/audio/wavin-flag.mp3" as MaybeHref,
      duration: 221,
    },
  ],
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
  href: "https://www.linkedin.com/in/siddhant-yadav-9942021b2/",
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
