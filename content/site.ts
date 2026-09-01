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
  /* Both lines of the heading, as one string, with the count and its noun tied
     together by a non-breaking space.

     Figma 869:6399 breaks this after `in`, and left to itself the box breaks it
     after `104,122` instead — the display face here is narrower than the file's,
     so the first three words plus the number still fit on one line and the
     second line is the single word `remarks`. A hard `<br>` would fix the
     design width and be wrong at every other, since this card is fluid past
     1440. Making `104,122 remarks` one unbreakable unit states the intent
     rather than the measurement: the number never gets separated from what it
     counts, and the break lands after `in` at any width where it has to break
     at all. */
  title: "Finding signal in 104,122\u00A0remarks",
  subtitle: "Search library without digging through categories",
  placeholder: "What did you observe?",

  /**
   * The libraries a search can run against, in the order the loader visits
   * them.
   *
   * The chip named a disabled `Select category` button for a long time and the
   * card dropped it rather than ship a control that did nothing. It is a picker
   * over these now, and it mirrors the real product: an inspector searches what
   * they have written themselves by default, and reaches for the network or the
   * expert content when their own library does not have the remark yet. In
   * WINspect the middle one is the SP (Service Provider) library; `Community`
   * is what it is called out here, where nobody knows what an SP is.
   *
   * `searching` and `support` are the two lines the loader shows while that
   * source is being searched — see the note above `SEARCH_PER_SOURCE` in
   * RemarkFinder for what the loader does and does not actually change.
   */
  libraries: [
    {
      id: "mine",
      label: "My Library",
      searching: "Searching your library",
      support: "Your saved inspection knowledge",
    },
    {
      id: "community",
      label: "Community",
      searching: "Searching the community",
      support: "Observations from other inspectors",
    },
    {
      id: "sme",
      label: "SME",
      searching: "Searching the SME Toolkit",
      support: "Expert-curated observations & templates",
    },
  ],

  /** What the chip says when more than one is on. */
  librariesLabel: (n: number) => `${n} Libraries`,
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

/**
 * A run of prose with emphasis in it.
 *
 * The About page sets two phrases in full ink inside otherwise quiet
 * paragraphs — the current role, and the four-hours-to-forty-minutes number.
 * A plain string cannot carry that and a string with markup in it would need
 * parsing at the call site, so a paragraph is a list of runs and a `strong`
 * one is the emphasised kind.
 */
export type Rich = readonly (string | { readonly strong: string })[];

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

  /* --- The opening — Figma 886:7394 ------------------------------------ */

  /**
   * The greeting, in every language it is willing to say it in.
   *
   * A list rather than a string because the line cycles — see `Greeting`. The
   * comma is not in here: it belongs to the design rather than to any of these
   * languages, so the component sets it once and lets it slide as the word
   * under it changes width. `lang` is on each entry because it is set on the
   * element too, which is what lets a browser pick the right face and a screen
   * reader the right voice.
   *
   * English first, and that is load-bearing: it is what the page renders
   * before the cycle starts and what a reduced-motion visitor keeps.
   */
  greetings: [
    { lang: "en", word: "Hello" },
    { lang: "hi", word: "नमस्ते" },
    { lang: "es", word: "Hola" },
  ],

  name: "I’m Siddhant",

  /**
   * The pun line, as its three beats.
   *
   * Written as a list rather than one string because the design sets a 4px dot
   * between them rather than a slash or a comma — see `.pun` in the
   * stylesheet. It is a pronunciation gloss and a joke about the name, so the
   * two halves have to stay separable.
   */
  puns: ["/siddh", "aant/", "but I start from where it ends"],

  lede:
    "I'm a product designer with 5 years of experience who thrives on all " +
    "things ambiguous and gnarly. With a strong focus on craft, storytelling, " +
    "and high exploration output. I enjoy diving into the details, solving " +
    "problems thoughtfully, and bringing order to chaos.",

  /**
   * The portrait, and the thing the head chart hides behind.
   *
   * Cropped at authoring time to the window Figma 886:7392 shows rather than
   * positioned at that window in CSS. The file places the source at 180% wide
   * and 133% tall with a negative offset, which is a zoom past `cover` and
   * cannot be expressed as an `object-position` — but it can be expressed as a
   * different file, and a file that is already the right rectangle also stops
   * the browser downloading the two thirds of the photograph nobody sees.
   */
  portrait: {
    src: "/media/siddhant-portrait.jpg",
    alt: "Siddhant, standing in a garden",
    width: 900,
    height: 1630,
  },

  /**
   * What the portrait turns into.
   *
   * The head chart was a section of its own in the previous reader and is now
   * the answer to poking at the photograph — see `HeadChart` and the
   * `dissect` block in `AboutModal`. The label is what a pointer is told
   * before it finds out; it has to promise something without spoiling it.
   */
  dissect: {
    hint: "Have a look inside",
    close: "Put it back",
  },

  dayJob: {
    title: "Day job",
    body: [
      "Currently, I am a ",
      { strong: "User Experience Specialist at WIN Home Inspection" },
      ". Before that, I designed at Mistry.Store which is a homebuilding " +
        "material e-commerce business and LikeMinds which is a plug & play " +
        "community platform. I hold a Bsc(Hons) in Computer Science from the " +
        "University of Delhi.",
    ] as Rich,
  },

  outOfOffice: {
    title: "Out of office",
    body: [
      "When I'm not building things, I love going out, playing football, " +
        "basketball and video games, cooking, designing, and capturing moments " +
        "through photography. I'm a natural puzzler with a passion for trivia " +
        "and crosswords! If I've piqued your interest, feel free to reach out!",
    ] as Rich,
  },

  /* --- Figma 887:7528 --------------------------------------------------- */

  superPowers: {
    title: "My Super Powers",
    items: [
      {
        title: "Structure in ambiguity",
        body:
          "I have a knack for adding clarity and structure to ambiguous " +
          "problems and environments. I love making complex situations easier " +
          "for others to navigate and understand.",
      },
      {
        title: "Storytelling",
        body:
          "I love taking complicated concepts and crafting easy to understand " +
          "narratives through animations and visuals on slide decks.",
      },
      {
        title: "Design speed",
        body:
          "I have optimized my workflows and tools to focus on generating ideas " +
          "and exploring a larger volume of options in a shorter amount of " +
          "time, allowing me to explore solutions thoroughly and deeply.",
      },
      {
        title: "Design 🤝 development",
        body:
          "I understand software systems and limitations. I can also get in the " +
          "trenches with my devs. This means anything from fixing small bugs in " +
          "production to code reviews in Gitbhub.",
      },
    ],
  },

  /**
   * The full-bleed strip — Figma 886:7445.
   *
   * Nine plates at the file's own widths, heights and vertical nudges, and
   * only one of them has an export behind it: the other eight are unfilled
   * rectangles in Figma too. They are kept at their sizes rather than dropped,
   * because the rhythm of the strip is the design and a strip of one photo is
   * not it — and marked as placeholders so the gap reads as unfinished rather
   * than broken. See the `data-placeholder` convention in globals.css.
   */
  reel: {
    label: "Photos",
    plates: [
      { w: 280, h: 458, y: -49, src: null },
      { w: 201, h: 362, y: -1, src: "/media/siddhant-portrait.jpg" },
      { w: 280, h: 509, y: -74, src: null },
      { w: 332, h: 600, y: -120, src: null },
      { w: 322, h: 360, y: 0, src: null },
      { w: 300, h: 558, y: -99, src: null },
      { w: 336, h: 360, y: 0, src: null },
      { w: 232, h: 412, y: -26, src: null },
      { w: 332, h: 444, y: -42, src: null },
    ] as readonly {
      readonly w: number;
      readonly h: number;
      readonly y: number;
      readonly src: string | null;
    }[],
  },

  /* --- Figma 887:7556 --------------------------------------------------- */

  experience: {
    title: "Experience",
    entries: [
      {
        years: "2023 - Now",
        org: "WIN Home Inspection",
        role: "User Experience Specialist",
        body: [
          [
            "Designed a home inspection app which allows the inspectors based " +
              "in the USA to generate a fully fledged report using their library " +
              "of remarks or through AI, along which the app also contained an " +
              "exhaustive list of features to help them complete the inspections " +
              "quickly. We brought the time it took to complete an inspection " +
              "from ",
            { strong: "4 hours to 40 minutes" },
            ".",
          ],
          [
            "Worked on a template management system that controls the service " +
              "templates including categories, remarks, search, reminders, etc. " +
              "for the app.",
          ],
          [
            "Worked on the final interactive and PDF Report which gets sent out " +
              "to the stakeholders involved like Clients, Buyer’s Agent and " +
              "Seller’s Agent with multiple features and a negotiation tool for " +
              "the agents specifically.",
          ],
        ] as readonly Rich[],
      },
      {
        /* 2022, not the 2021 the desktop frame prints. `timeline.dayOne` puts
           this entry at 2022.55 and the mobile frame agrees; the desktop label
           is the stale one of the two. */
        years: "2022 - 2023",
        org: "Mistry.Store",
        role: "Lead UX Designer + Product Lead",
        body: [
          [
            "Lead the design & product conceptualisation from scratch for a " +
              "startup that dealt in sourcing & delivering home building " +
              "materials to professionals like Interior Designers, Contractors, " +
              "Architects, etc.",
          ],
          [
            "Onboarded all the partners within the first month of the app by " +
              "giving them a platform from where they could choose and add " +
              "products using AI tagging, track and maintain orders and " +
              "invoices, view catalogs to showcase it to their clients, and an " +
              "earnings platform which was used by marketing team to promote " +
              "sales using bonus vouchers, loyalty points, sponsored trips, etc.",
          ],
        ] as readonly Rich[],
      },
      {
        years: "2021 - 2022",
        org: "LikeMinds",
        role: "UX Designer",
        body: [
          [
            "Worked with the design team to create a product which offered the " +
              "users to join or create a community where they could have " +
              "limited (or unlimited via subscription) access to customisable " +
              "chat groups, managing one time or recurring events, shared " +
              "resources categorised by folders, engaging daily streak " +
              "leaderboards, study or informative cohorts and more…",
          ],
        ] as readonly Rich[],
      },
    ],
  },

  /* --- Figma 887:7603 --------------------------------------------------- */

  education: {
    title: "Education",
    entries: [
      {
        years: "2018 - 2021",
        org: "University of Delhi",
        role: "Bsc. (Hons) Computer Science",
        note: "CGPA - 7.1",
      },
      {
        years: "2004 - 2018",
        org: "St. Columba’s School",
        role: "Majors: Computer Science, Maths, Physics, Chemistry",
        /* The mobile frame repeats the university's CGPA under the school,
           which is a copy-paste in the file rather than a fact — the desktop
           frame has no third line here. Left off. */
        note: null as string | null,
      },
    ],
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
