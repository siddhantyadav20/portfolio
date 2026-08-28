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
  note: "— Less, but better",
  /** Used by the Copy Email button. */
  email: "siddhantyadav20@gmail.com",
  /* No longer linked from the intro — the Figma CTA row is Copy Email and
     Search Portfolio only. The Store's door is the waitlist card further down
     the page; this stays for whenever the shop itself exists. */
  storeHref: null as MaybeHref,

  /**
   * The CV, and the first thing a recruiter looks for.
   *
   * CONTENT-INTAKE.md 6.1 asked for this and it had nowhere to land: the file
   * sat in `references/`, which is excluded from the build. Same `MaybeHref`
   * convention as the rest of this file, so removing the PDF renders the link
   * as a visibly-marked placeholder rather than a 404.
   */
  resumeHref: "/siddhant-yadav-cv.pdf" as MaybeHref,

  /**
   * The palette's front door, now a pill in the CTA row rather than a field
   * standing on its own.
   *
   * It says what pressing it does instead of impersonating the question the
   * palette asks — the field it replaced was a button dressed as an input, and
   * the palette's own "What do you want to know?" is the real one, focused the
   * moment this opens.
   */
  searchCta: "Search Portfolio",
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
   * The study itself now lives in `content/work/inspection-photos.ts`, with the
   * other two, behind one type. It moved because a case study has two surfaces
   * — the modal here and the `/work/[slug]` route — and keeping it in the
   * homepage's copy file made the route import homepage content to render a
   * page the homepage isn't involved in.
   */
  studySlug: "inspection-photos",
} as const;

export const search = {
  title: "Searching amidst a chaos",
  subtitle: "of 104,122 remarks",
  placeholder: "What did you observe?",

  /* `category: "Select category"` used to live here, naming a disabled button
     on the card. The control it named is gone — the old flow's category step is
     played out by the instrument now and then replaced by a live count of how
     many categories the answer spanned, so there is no copy left to hold. */
  before: "Navigation first",
  after: "Search first",
  delta: "~51m saved",
  href: "/work/search",
  studySlug: "search",
} as const;

export const designSystem = {
  eyebrow: "Scaling a",
  title: "Design System",
  subtitle: "across 12 products",
  stat: "281 Reusable Tokens",
  statDetail: "Used across 12 products",
  href: "/work/design-system",
  studySlug: "design-system",
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
   * The About reader.
   *
   * A PERSONAL PAGE, NOT A CASE STUDY, and the copy is written to that: first
   * person, specifics over adjectives, and no claim that is not already true
   * somewhere else in this file. What is genuinely not decided yet — the story
   * in Siddhant's own words, and the city — stays `null` and renders as a
   * marked placeholder, which is the same rule the rest of the site follows.
   * A page that invents a biography is worse than a page with a gap in it.
   */
  story: {
    /** The eyebrow over the statement — who, and what. Both live in `linkedin`
     *  already; naming them here would be a second copy to keep in step. */
    kicker: "About",

    /**
     * The opening statement, and the largest type on the site.
     *
     * It is `intro.tagline` verbatim rather than a second attempt at saying
     * the same thing. That line is the best sentence on this site and the one
     * the homepage already leads with; a personal page that opened with a
     * different, weaker version of it would read as two people talking.
     */
    afterStatement:
      "Five years of it, mostly for people whose hands are full and whose screens are outdoors.",

    /** The long version. Placeholder — see the note above. */
    body: null as readonly string[] | null,

    /** Where the prose will go, said plainly while it is not there. */
    bodyPending:
      "The long version is still being written — the short one is above, and the path below is the honest outline of it.",
  },

  /**
   * The colophon under the opening: four facts, no adjectives.
   *
   * Everything here except the city is derived from something else in this
   * file — the current role from the last timeline entry, the years from
   * `dayOne`, the tools from `about.tools` — and is assembled in the component
   * rather than restated, so none of it can go stale on its own.
   */
  facts: {
    basedLabel: "Based in",
    /** Not decided. Renders as a marked placeholder. */
    based: null as string | null,
    currentlyLabel: "Currently",
    beforeLabel: "Before that",
    studiedLabel: "Studied",
    sinceLabel: "Designing since",
    toolsLabel: "Working in",
  },

  /** The career, as a list rather than as the homepage's draggable ruler.
   *  Built from `timeline.entries` — see `AboutModal`. */
  path: {
    title: "The path",
    note: "Newest first. The years in orange are the jobs; the rest are things shipped while holding one.",
  },

  /** The sign-off. Destinations that already exist elsewhere in this file are
   *  referenced, not retyped. */
  elsewhere: {
    title: "Elsewhere",
    note: "The fastest way to reach me is the first one.",
    instagram: "https://instagram.com/designzoid_",
    instagramHandle: "@designzoid_",
  },

  /**
   * What's in the head — the pie chart inside the silhouette.
   *
   * THE NUMBERS ARE A CLAIM, NOT A MEASUREMENT, and the caption says so.
   * Nothing counts hours here and nothing should pretend to: this is the same
   * joke the reference infographic is making, which only works if the reader
   * is in on it. They are shares of one head, so they add to 100 — `HeadChart`
   * asserts that rather than normalising, because a set that no longer sums is
   * an edit that went wrong, not a chart to redraw at the wrong proportions.
   *
   * ORDER IS THE DRAWING ORDER. The fan is swept clockwise from twelve
   * o'clock in the order written here, and the last entry takes whatever is
   * left of the circle — so the dominant one goes last and becomes the head
   * itself, the way "design" does. Listing the thin ones smallest-first is
   * what keeps the fan reading as a fan instead of as a stack of arbitrary
   * widths.
   *
   * `note` is the second half of the joke and the first half of the honesty.
   */
  interests: {
    title: "What's in the head",
    note: "Self-reported, unmeasured, and revised constantly.",
    items: [
      { name: "History", share: 5 },
      { name: "Basketball", share: 5 },
      { name: "Psychology", share: 5 },
      { name: "Cycling", share: 6 },
      { name: "Explore", share: 6 },
      { name: "Football", share: 6 },
      { name: "Reading", share: 7 },
      { name: "Music", share: 8 },
      { name: "Design", share: 52 },
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
 * Timeline.
 *
 * The ruler is a calendar. A milestone every year, a mark every month, and one
 * number running through it: `at`, the position in years from day one. The
 * scale rests at `start` and the visitor drags it anywhere between `min` and
 * `max`.
 *
 * **The year is derived, not stored.** `Math.floor(dayOne + at)` reproduces
 * every year Siddhant gave for these entries, which is the whole reason to
 * compute it: dragging through a stretch with no entry of its own still moves
 * the count and the date, and only the words hold. A stored year could only
 * change where an entry happens to sit.
 *
 * `dayOne` is the one inferred number here. Siddhant gave (position, year)
 * pairs, not dates; October 2021 is the earliest month that lands all nine on
 * the year he wrote, and anything from October to December 2021 works
 * identically. If day one was really some other month, this constant is the
 * only thing that needs to move.
 *
 * Entries are step functions: whichever one is at or before the marker is the
 * one showing, because a career is continuous — mid-2023 you were still doing
 * what you started in early 2023. `title` is the bold line, `context` the
 * quiet one above it.
 *
 * There used to be a `kind` here — "role" | "launch" | "focus" — and the scale
 * drew a different bead shape for each. Both are gone. Three shapes nobody can
 * decode without a legend is a puzzle rather than a scale, and Figma draws no
 * bead at all: the dragger pointing at a mark is the whole indicator. What each
 * moment *is* now lives where it can be read, in `context`.
 *
 * The eight `at` positions are the scale's coarse grain, though: a hard drag or
 * a hard scroll steps to the next one and stops there, one per gesture, which
 * is the only detent the card has left. See `land` in `lib/scrubber.ts`.
 */
export const timeline = {
  /** The ruler's ends, in years from day one. */
  min: -2,
  max: 5,
  /** Where the scale rests, and what "back to now" means. */
  start: 5,
  /** Day one as a fractional year — October 2021. See above. */
  dayOne: 2021 + 9 / 12,

  /* Sorted by `at`, and the component relies on that.

     Every title and every context is one line at the card's width, and has to
     stay that way: the readout swaps them in place while the scale moves under
     a fixed marker, and a two-line entry between two one-line ones makes the
     whole block jump each time the marker crosses it. The card enforces it
     with `nowrap` and will ellipsize rather than wrap, so a long addition here
     shows up as a cut word rather than as a silently reflowed card.

     2020 is not here on purpose: Siddhant listed it, but it repeated the 2019
     entry word for word, and as a step function -2 already covers it. Adding
     it back would only make the card animate a change from "Student" to
     "Student". */
  entries: [
    { at: -2, title: "Student", context: "B.Sc Computer Science" },
    {
      at: -0.7,
      title: "Researching UX",
      context: "B.Sc Computer Science",
    },
    { at: 0, title: "UX Designer", context: "LikeMinds" },
    { at: 0.8, title: "UX Designer", context: "Mistry.Store" },
    { at: 2, title: "UX Design Specialist", context: "WIN" },
    {
      at: 2.8,
      title: "Report Writing Tool",
      context: "Multi-platform app launch",
      kind: "work",
    },
    {
      at: 3.8,
      title: "Order Management CRM",
      context: "Web app launch",
      kind: "work",
    },
    {
      at: 4.3,
      title: "Task Completion Flow",
      context: "WIN, current focus",
      kind: "work",
    },
  ] as const satisfies readonly TimelineEntry[],

  /** The unit next to the count. */
  unit: "yr",
} as const;

export type TimelineEntry = {
  /** Years from day one. */
  readonly at: number;
  /** The bold line. One line at the card's width — see the note on `entries`. */
  readonly title: string;
  /** The quiet line above it. One line too. */
  readonly context: string;
  /**
   * A post held, or a thing shipped while holding one.
   *
   * The homepage's ruler does not care — it draws both the same way, because
   * scrubbing a career is scrubbing one sequence of moments. The About page
   * does: "Currently" has to resolve to a job rather than to whichever entry
   * happens to be last, and the last two here are launches. Without this the
   * colophon read "Currently: Task Completion Flow, WIN, current focus", which
   * is a project with a job smuggled into its subtitle.
   *
   * Absent means `role` — the entries that are posts outnumber the ones that
   * are not, and the default should be the thing you have to say less often.
   */
  readonly kind?: "work";
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
 * What ships is a 25-second excerpt of each, not the record. Eight complete
 * commercial recordings in `public/` was 35MB and a licensing posture nobody
 * would defend; the card only ever needed enough of a track to say what it is.
 * See `scripts/trim-audio.mjs`, which cuts them losslessly at frame boundaries
 * and can be re-run to move where a preview opens.
 *
 * `duration` is the fallback clock only — the length of the excerpt, but the
 * player prefers the decoded `duration` once the browser reports one, so these
 * never have to be exact. A track with `src: null` still works: the transport
 * runs on this number instead.
 */
export const music = {
  label: "Listening to",
  tracks: [
    {
      title: "Ode to the Mets",
      cover: "/media/track-ode-to-the-mets.jpg",
      src: "/audio/ode-to-the-mets.mp3" as MaybeHref,
      duration: 25,
    },
    {
      title: "I Feel it Coming",
      cover: "/media/track-i-feel-it-coming.png",
      src: "/audio/i-feel-it-coming.mp3" as MaybeHref,
      duration: 25,
    },
    {
      title: "Read my Mind",
      cover: "/media/track-read-my-mind.jpg",
      src: "/audio/read-my-mind.mp3" as MaybeHref,
      duration: 25,
    },
    {
      title: "Wavin’ Flag",
      cover: "/media/track-wavin-flag.jpg",
      src: "/audio/wavin-flag.mp3" as MaybeHref,
      duration: 25,
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
  /** The name only. `SiteFooter` prefixes the year, which it reads from the
   *  clock at build time rather than from a literal that quietly goes stale
   *  the first January after it was written. */
  copyrightName: "Siddhant Yadav",
  credit: "Designed on Figma. Built using Claude + Qwen.",
  /* The count itself is not here any more — it is measured, not written down.
     `VisitorCount` asks `/api/visitors` for it and falls back to the em dash
     this used to be hard-coded to whenever there is no store to ask.

     "Live Visitors" was the Figma label and it is gone with the thing it
     described: this counts every distinct browser since the count shipped, not
     the ones here this minute, and a total that only ever rises has no
     business calling itself live. What is left is the two spellings, because
     "1 Visitors" is the kind of detail that makes a real number look fake. */
  visitorLabel: "Visitor",
  visitorsLabel: "Visitors",
  makingOf: null as MaybeHref,
  /** The same profile the LinkedIn card links to — there is only one, and the
   *  footer icon sat inert next to a working card link because this was null
   *  rather than because the destination was unknown. */
  linkedinHref: linkedin.href as MaybeHref,
} as const;
