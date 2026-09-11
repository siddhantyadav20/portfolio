/* ===========================================================================
   The canvas board.

   Every widget, where it sits, and what it says. The content was transcribed
   from the live Framer canvas at siddhant.framer.website/explore; the
   arrangement no longer is.

   FIVE NEIGHBOURHOODS, NOT A SCATTER. The Framer positions spread every kind
   of thing across a 3000x3000 board, so the dock's five places were five
   bounding boxes the size of the whole world: "Playing" framed x 1160-2660,
   y 230-2560 and clamped to the 0.4 zoom floor, where the scratch card was
   128px wide. Three of the five tabs were, in effect, "zoom out". Now each
   kind of thing lives together, and each tab lands on its neighbourhood at
   0.8-1.0. tests/board.test.ts holds that, and the no-overlap rule.

   A CROSS, SET BY HAND. Two relaxed layouts came before this — an orbit
   with one gap everywhere, then the same orbit with wider gaps between
   neighbourhoods — and both read as clutter, because a force relaxation
   lines nothing up and every object leaned its own way. This one is placed,
   not simulated: Work, Me and Reading on one centre line, Listening above
   it, Playing below. Each group sits on its own small grid — records three
   by two, books three over two, the brief pair flanked by two stickers a
   side — with 48-64px inside a group and a river of 150-200px between
   groups, so proximity does the grouping. Cards lean 1-3 degrees,
   alternating; only the stickers keep a real tilt, because stickers are
   slapped on. tests/board.test.ts holds the river.

   Numbers are plain top-lefts in world space.

   Content is real and quotable: it is Siddhant's own copy, lifted verbatim.
   =========================================================================== */

/** Board extent, world px: the cross's bounds plus a margin. The corners are
 *  the empty space a cross leaves, and they are where the edge fades. */
export const WORLD_W = 3400;
export const WORLD_H = 2300;

/**
 * The five neighbourhoods — the dock's places, and where things are.
 *
 * Every widget names its neighbourhood, and the board is laid out by them,
 * so a dock tab frames one coherent place rather than a category scattered
 * across the world.
 */
export const CLUSTERS = ["me", "read", "listen", "play", "work"] as const;
export type Cluster = (typeof CLUSTERS)[number];

export const CLUSTER_LABELS: Record<Cluster, string> = {
  me: "Me",
  read: "Reading",
  listen: "Listening",
  play: "Playing",
  work: "Work",
};

type Placed = {
  id: string;
  cluster: Cluster;
  /** Top-left in world px, centring translate already applied. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees. Nothing on the board sits square. */
  rotate?: number;
};

export type Widget = Placed &
  (
    | {
        kind: "disc";
        title: string;
        artist: string;
        /**
         * The record on Apple's storefront, and the only thing written down
         * about it. The sleeve and the thirty-second preview are fetched from
         * that id at runtime (`/api/music/discs`), so neither is committed —
         * six album PNGs and four MP3s used to be, which was 3MB of other
         * people's records in this repository for a widget that renders them
         * at 320px.
         *
         * An id rather than a name because these six are curated: looking a
         * title up at runtime is a matching problem with real failure modes
         * (see the header of `lib/itunes.ts`), and writing the answer down
         * removes it entirely for the set where it can be written down.
         *
         * Found with `lookup?id=<this>` — the spelling of the title here is
         * ours and does not have to agree with Apple's.
         */
        itunesId: number;
      }
    | {
        kind: "book";
        title: string;
        author: string;
        cover: string;
        rating: number;
        year: number;
        pages: number;
        genres: readonly string[];
        /** The book's opening line — set on the spread with a drop cap. */
        excerpt: string;
        status: string;
        /** Binding and back-board colours. They drive the spine, the ribbon,
         *  the drop cap and the star fill, so each book carries its own
         *  palette rather than the board's. */
        binding: string;
        board: string;
        /** What I took from it — written at Siddhant’s request rather than
         *  left null, and his to edit. One sentence each: this is the only
         *  line on the page that is mine rather than the book’s, and a
         *  paragraph here would go unread. */
        learnt: string | null;
      }
    | {
        kind: "sticker";
        label: string;
        art: string;
        /** How it moves when touched — each sticker gets the motion of the
         *  thing it is a picture of. See widgets/Sticker/effects.ts. */
        effect: "flight" | "bicycle" | "recoil" | "hadouken";
      }
    | { kind: "profile" }
    | { kind: "linkedin" }
    | { kind: "receipt" }
    | { kind: "terminal" }
    | { kind: "scratch" }
    | { kind: "draw" }
    | { kind: "photos" }
  );

/* --- The board ------------------------------------------------------------- */

/**
 * What a screen reader calls a widget.
 *
 * Every slot on the board is `tabIndex={0}` so the Tab tour can walk it and
 * the camera can follow — a lovely piece of navigation that, until this
 * existed, announced twenty-two identical unnamed groups. The name comes off
 * the widget's own data wherever the data already says it (a book has a title,
 * a disc has a title and an artist, a sticker has a label), and falls back to
 * what the thing is.
 */
export function widgetLabel(w: Widget): string {
  switch (w.kind) {
    case "disc":
      return `${w.title} by ${w.artist} — press to play`;
    case "book":
      return `${w.title} by ${w.author} — press to open`;
    case "sticker":
      return `${w.label} sticker`;
    case "photos":
      return "Photographs";
    case "profile":
      return "About Siddhant Yadav";
    case "linkedin":
      return "LinkedIn";
    case "receipt":
      return "Receipt";
    case "terminal":
      return "Terminal";
    case "scratch":
      return "Scratch card — press Enter to reveal a design brief";
    case "draw":
      return "Drawing canvas";
  }
}

export const widgets: readonly Widget[] = [
  /* --- The centre ---------------------------------------------------------- */
    // h is the card's hugged height, not a reservation — the card sizes to its
  // content and this keeps cluster bounds honest about what is actually there.
  { id: "profile", kind: "profile", cluster: "me", x: 1557, y: 1019, w: 480, h: 544 },
  { id: "photos", kind: "photos", cluster: "me", x: 2101, y: 1131, w: 320, h: 320, rotate: 2 },
    // Sized to the homepage card's own 254x280 — it is the same component,
  // and stretching it would break the flood geometry baked into its numbers.
  { id: "linkedin", kind: "linkedin", cluster: "me", x: 1239, y: 1151, w: 254, h: 280, rotate: -2 },

  /* --- Work ---------------------------------------------------------------- */
  { id: "receipt", kind: "receipt", cluster: "work", x: 175, y: 872, w: 280, h: 839, rotate: -2 },
  { id: "terminal", kind: "terminal", cluster: "work", x: 519, y: 1111, w: 520, h: 360, rotate: -1 },

  /* --- Play ---------------------------------------------------------------- */
  { id: "scratch", kind: "scratch", cluster: "play", x: 1445, y: 1713, w: 320, h: 320, rotate: 2 },
  // Level with the scratch card: the doodle toy, beside the brief that
  // opens the Studio.
  { id: "draw", kind: "draw", cluster: "play", x: 1829, y: 1713, w: 320, h: 320, rotate: -2 },
  { id: "sticker-cs", kind: "sticker", cluster: "play", x: 1181, y: 1905, w: 200, h: 200, rotate: 6, label: "Counter-Strike", art: "/media/workspace/sticker-counter-strike.png" , effect: "recoil" },
  { id: "sticker-rooney", kind: "sticker", cluster: "play", x: 2213, y: 1641, w: 200, h: 200, rotate: -6, label: "Rooney’s bicycle kick", art: "/media/workspace/sticker-rooney.png" , effect: "bicycle" },
  { id: "sticker-ken", kind: "sticker", cluster: "play", x: 1181, y: 1641, w: 200, h: 200, rotate: -8, label: "Street Fighter", art: "/media/workspace/sticker-ken.png" , effect: "hadouken" },
  { id: "sticker-rocket", kind: "sticker", cluster: "play", x: 2213, y: 1916, w: 200, h: 178, rotate: 8, label: "Off to build something", art: "/media/workspace/sticker-rocket.png" , effect: "flight" },

  /* --- Listening. Six records, three by two. ------------------------------ */
  { id: "disc-safe", kind: "disc", cluster: "listen", x: 1253, y: 165, w: 320, h: 320, rotate: 2, title: "Safe and Sound", artist: "Capital Cities", itunesId: 1766005715 },
  { id: "disc-feel", kind: "disc", cluster: "listen", x: 1637, y: 165, w: 320, h: 320, rotate: -1, title: "I Feel it Coming", artist: "The Weeknd", itunesId: 1440872309 },
  { id: "disc-somewhere", kind: "disc", cluster: "listen", x: 2021, y: 165, w: 320, h: 320, rotate: 2, title: "Somewhere Only We Know", artist: "Keane", itunesId: 1440737356 },
  { id: "disc-cantstop", kind: "disc", cluster: "listen", x: 1253, y: 549, w: 320, h: 320, rotate: -2, title: "Can’t Stop", artist: "Red Hot Chili Peppers", itunesId: 945578427 },
  { id: "disc-chala", kind: "disc", cluster: "listen", x: 1637, y: 549, w: 320, h: 320, rotate: 1, title: "Chala Jaata Hoon", artist: "Kishore Kumar", itunesId: 1338704397 },
  { id: "disc-mets", kind: "disc", cluster: "listen", x: 2021, y: 549, w: 320, h: 320, rotate: -2, title: "Ode to the Mets", artist: "The Strokes", itunesId: 1498121956 },

  /* --- Reading. Five books, each opening to a spread. ---------------------- */
  {
    id: "book-everyday", kind: "book", cluster: "read",
    x: 2621, y: 1027, w: 160, h: 240, rotate: 3,
    title: "The Design of Everyday Things", author: "Don Norman",
    cover: "/media/workspace/book-everyday-things.png",
    rating: 4.3, year: 1988, pages: 368, status: "Reading",
    genres: ["UX Design", "Product Design", "Psychology"],
    excerpt:
      "The introduction explains that many everyday objects are difficult to use not because people are incompetent, but because they are poorly designed.",
    binding: "#E0A03A", board: "#B5701F", learnt:
      "I stopped blaming people the week I read this. Now when someone can’t find a button, my first thought is that I hid it."
  },
  {
    id: "book-japanese", kind: "book", cluster: "read",
    x: 3037, y: 1027, w: 160, h: 240, rotate: 2,
    title: "Japanese Design", author: "Patricia J Graham",
    cover: "/media/workspace/book-japanese-design.png",
    rating: 4.5, year: 2014, pages: 288, status: "Reading",
    genres: ["Design", "Art", "Culture"],
    excerpt:
      "Japanese design has long been admired for its elegance, simplicity, and attention to detail, reflecting a culture where beauty and utility coexist.",
    binding: "#D83A34", board: "#8E1F1C", learnt:
      "Restraint and emptiness are not the same thing. What stays has to earn the space you left around it."
  },
  {
    id: "book-less", kind: "book", cluster: "read",
    x: 2725, y: 1315, w: 160, h: 240, rotate: -3,
    title: "Less and More", author: "Dieter Rams",
    cover: "/media/workspace/book-less-and-more.png",
    rating: 4.7, year: 2011, pages: 224, status: "Reading",
    genres: ["Industrial Design", "Design Philosophy"],
    excerpt:
      "The book opens by introducing Dieter Rams’ philosophy that good design should prioritize function, clarity, and restraint.",
    binding: "#E8C547", board: "#B08A18", learnt:
      "Rams keeps asking whether the thing needs to exist at all. Most screens I’ve deleted started as that question."
  },
  {
    id: "book-metamorphosis", kind: "book", cluster: "read",
    x: 2933, y: 1315, w: 160, h: 240, rotate: 2,
    title: "Metamorphosis", author: "Franz Kafka",
    cover: "/media/workspace/book-metamorphosis.png",
    rating: 3.9, year: 1915, pages: 112, status: "Reading",
    genres: ["Literary Fiction", "Absurdism", "Existentialism"],
    excerpt:
      "As Gregor Samsa awoke one morning from uneasy dreams he found himself transformed in his bed into a gigantic insect.",
    binding: "#A9743F", board: "#6E4522", learnt:
      "Nobody in it stops to ask how it happened — they just adjust and carry on. That is most product decisions I’ve watched get made."
  },
  {
    id: "book-1984", kind: "book", cluster: "read",
    x: 2829, y: 1027, w: 160, h: 240, rotate: -2,
    title: "1984", author: "George Orwell",
    cover: "/media/workspace/book-1984.png",
    rating: 4.2, year: 1949, pages: 328, status: "Reading",
    genres: ["Dystopian Fiction", "Political Fiction", "Science Fiction"],
    excerpt:
      "It was a bright cold day in April, and the clocks were striking thirteen.",
    binding: "#E03A2F", board: "#8E1109", learnt:
      "Narrow the words and you narrow what people can think. I read my own labels differently now."
  },
];

/* --- Copy ------------------------------------------------------------------
   Verbatim from the Framer canvas. Kept out of the widget list because these
   are paragraphs, and inlining them makes the board's geometry unreadable.
   --------------------------------------------------------------------------- */

export const profile = {
  name: "Siddhant Yadav",
  role: "Product/UX Designer",
  avatar: "/media/workspace/avatar.png",
  body: [
    "Product and UX Designer with 4.5 years of experience. Currently designing AI assisted inspection software used by field professionals across the US.",
    "Years of gaming taught me that great experiences are rarely noticed, they just feel right. That’s the standard I design for.",
  ],
  /** A one-line state-of-play under the name. Small, but it is the first
   *  thing read on arrival and "designer" alone says nothing. */
  status: { text: "Open to new work", tone: "live" as const },
  location: "India · IST",
  /** The three numbers worth stating, and only those. */
  facts: [
    { value: "5", label: "Years" },
    { value: "20+", label: "Shipped" },
  ],
  updatesLabel: "Latest updates",
  updates: [
    { text: "Working on a telephony app to automate bookings", when: "Aug 2026" },
    { text: "Built a 3D report similar to Google Maps Street View", when: "Jun 2026" },
    {
      text: "Shipped out a CRM which reduced the time for order creation by 30%",
      when: "Feb 2026",
    },
  ],
} as const;

export const linkedInCard = {
  name: "Siddhant Yadav",
  role: "Product designer",
  cover: "/media/workspace/linkedin-cover.jpeg",
  avatar: "/media/workspace/avatar.png",
  blurb: "cooking up @win • prev @mistry.store and @likeminds",
  cta: "Visit LinkedIn",
} as const;

export const receipt = {
  title: "Design Receipt",
  subtitle: "Est. in the pixels",
  order: "2024-0042",
  name: "Siddhant Yadav",
  role: "Product/UX Designer",
  items: [
    { label: "User Research", price: 13.37 },
    { label: "Interaction Design", price: 13.28 },
    { label: "Design Systems", price: 10.05 },
    { label: "Prototyping", price: 10.54 },
    { label: "Visual Design", price: 7.64 },
  ],
  tools: ["Figma", "Framer", "Notion", "Jira", "Miro"],
  toolFrequency: "daily",
  stats: [
    { label: "Years experience", value: "4.5 yrs" },
    { label: "Projects shipped", value: "12+" },
    { label: "Coffee consumed", value: "∞" },
  ],
  subtotal: 54.88,
  creativityTax: "Waived",
  total: "Priceless",
  stamp: ["Open", "to work"],
  footer: ["Thank you for visiting", "No returns · No refunds"],
  barcode: "2024004200",
} as const;

export const terminal = {
  user: "siddhant",
  host: "portfolio",

  /** Six rows of block glyphs spelling SIDDHANT. Data, not art: it is printed
   *  a character at a time by the reveal engine like every other line. */
  banner: [
    " ███████╗██╗██████╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗████████╗",
    " ██╔════╝██║██╔══██╗██╔══██╗██║  ██║██╔══██╗████╗  ██║╚══██╔══╝",
    " ███████╗██║██║  ██║██║  ██║███████║███████║██╔██╗ ██║   ██║   ",
    " ╚════██║██║██║  ██║██║  ██║██╔══██║██╔══██║██║╚██╗██║   ██║   ",
    " ███████║██║██████╔╝██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║   ",
    " ╚══════╝╚═╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═╝  ",
  ],

  boot: [
    "  booting portfolio.sh",
    "  loading modules  [████████████]  100%",
    "  mounting  /skills  /tools  /projects",
  ],
  bootOk: "  ready ✓",

  tagline: "  Product/UX Designer  ·  4.5 yrs  ·  India 🇮🇳",

  skills: [
    "User Research",
    "Interaction Design",
    "Design Systems",
    "Prototyping",
    "Visual Design",
    "Motion Design",
  ],
  tools: ["Figma", "Framer", "Notion", "Jira", "Miro", "Principle", "Zeroheight"],
  projects: [
    { name: "WIN Home Inspection", desc: "UX overhaul · task completion +40%" },
    { name: "Mistry.Store", desc: "Design system 0→1 · served 3 designers" },
    { name: "LikeMinds", desc: "Onboarding redesign · drop-off −28%" },
  ],
  about: [
    "  Product/UX Designer · 4.5 yrs",
    "  Currently @ WIN Home Inspection",
    "  Based in India 🇮🇳",
  ],
  aboutNote: "  Open to new opportunities ✦",
  contact: [
    { text: "  ✉   siddhantyadav20@gmail.com", href: "mailto:siddhantyadav20@gmail.com" },
    /* Display text stays short because it is set in a terminal; the href is
       the real profile. They disagreed before, and the short form is not a
       real slug — the link simply 404'd. */
    {
      text: "  in  linkedin.com/in/siddhant-yadav",
      href: "https://www.linkedin.com/in/siddhant-yadav-9942021b2/",
    },
    { text: "  ig  @designzoid_", href: "https://instagram.com/designzoid_" },
  ],

  /** Local palettes the `theme` command swaps in.
   *
   *  Each carries both a dark and a light variant. The original had only the
   *  dark set, so running `theme matrix` on a light board turned the terminal
   *  black and there was no way back except `theme default` — the palettes
   *  were, in effect, dark-mode-only.
   *
   *  `tone` tells the component which ink set to pair with the background, so
   *  a deliberately dark palette stays legible on a light board. */
  palettes: {
    amber: {
      dark: { accent: "#f5a623", bg: "#1d1812", tone: "dark" },
      light: { accent: "#b45309", bg: "#f7efe0", tone: "light" },
    },
    matrix: {
      dark: { accent: "#22ff88", bg: "#05110a", tone: "dark" },
      light: { accent: "#0f7a3d", bg: "#eaf6ee", tone: "light" },
    },
    ice: {
      dark: { accent: "#38bdf8", bg: "#0c1620", tone: "dark" },
      light: { accent: "#0369a1", bg: "#e9f2f9", tone: "light" },
    },
    mono: {
      dark: { accent: "#e5e7eb", bg: "#1a1a1a", tone: "dark" },
      light: { accent: "#3f3f46", bg: "#f2f2f0", tone: "light" },
    },
  },
} as const;

/* --- The scratch card ------------------------------------------------------
   The foil hides a design brief. "Sketch it" pins the brief to the drawing
   canvas and flies the camera there; the visitor draws it and can send it.
   It used to hide a chess game with nowhere to go — PLAY NOW was an inert
   placeholder and the "beat me, I'll owe you a coffee" prize never rendered.

   A brief is three things, and each has a job on the ticket: the problem in a
   sentence, the one constraint that makes it interesting, and a time limit
   that keeps it a sketch rather than a project. Length budgets are enforced
   by tests/brief.test.ts — the ticket is 320px and a fourth line overflows. */

/**
 * The back of the paper. Handing a sketch in flips it over to this: the call
 * Siddhant made on the same brief, so the visitor's reward is a comparison
 * with how he thinks rather than a "sent ✓".
 */
export type BriefTake = {
  /** Two or three sentences on the call he made. Budget: `TAKE_MAX`. */
  readonly note: string;
  /** His own 60-second sketch, under /public. Absent until he draws it — the
   *  back then shows the note alone, never a placeholder. */
  readonly sketch?: string;
  /** A brief he has had for real links to the study where it happened. */
  readonly study?: { readonly href: string; readonly label: string };
};

/** What a brief is designed for — drawn faint under the Studio's paper, so
 *  the sketch has a context. See components/canvas/studio/frames.ts. */
export type Frame = "phone" | "tablet" | "laptop" | "sign" | "car" | "watch";

export type Brief = {
  readonly id: string;
  readonly brief: string;
  readonly constraint: string;
  /** Soft: at zero it says "pencils down", and drawing still works. */
  readonly seconds: number;
  readonly frame: Frame;
  readonly take: BriefTake;
};

/** Out of the deck until they have a take and a frame — kept, not deleted. */
export type BenchedBrief = Omit<Brief, "take" | "frame">;

export const scratch = {
  label: "Scratch for a brief",
  prompt: "Scratch here",
  reset: "New brief",
  eyebrow: "Your brief",
  cta: "Sketch it",
} as const;

/* The deck: ten, each with Siddhant's take on the back of the paper. Cut
   from twenty-four because a take has to be his — a note he stands behind
   and, in time, a sketch he drew — and ten is a set he can actually draw.
   The notes are first drafts in his voice, his to rewrite before ship; the
   roof-inspection one is held to the Inspection study's own summary rather
   than to anything invented about the work.

   Real situations over hypothetical personas: a constraint someone has
   actually been in reads as a problem, an invented one reads as homework. */
export const briefs: readonly Brief[] = [
  {
    id: "checkout-baby", brief: "A checkout for someone holding a baby", constraint: "One thumb", seconds: 60, frame: "phone",
    take: { note: "One thumb means one column and one decision per screen. Pay sits where the thumb already rests, and everything above it arrives filled in." },
  },
  {
    id: "roof-form", brief: "An inspection form filled in on a roof", constraint: "Gloves on, wind up", seconds: 60, frame: "tablet",
    take: {
      note: "I had this one for real. The camera stopped being a separate tool: you photograph what's in front of you, and it lands in the right part of the report.",
      study: { href: "/work/inspection-photos", label: "How it went" },
    },
  },
  {
    id: "score-meeting", brief: "The live cricket score, during a meeting", constraint: "Glanceable, silent", seconds: 60, frame: "laptop",
    take: { note: "Nothing moves unless the score does. One number in the menu bar, and it changes colour only for a wicket, the one thing worth breaking eye contact for." },
  },
  {
    id: "wedding-rsvp", brief: "An RSVP for a big Indian wedding", constraint: "300 guests, 5 events", seconds: 90, frame: "phone",
    take: { note: "Ask per family, not per guest, and per event, not per wedding. One tap for “all of us, all five”; the edge cases get their own screen." },
  },
  {
    id: "song-driving", brief: "Skipping a song while driving", constraint: "Eyes on the road", seconds: 60, frame: "car",
    take: { note: "No screen at all. A long press on the wheel skips, and the car reads the new song's name aloud, so there's never a reason to look down." },
  },
  {
    id: "platform-delay", brief: "A train delay on a platform screen", constraint: "Read in three seconds", seconds: 60, frame: "sign",
    take: { note: "Lead with the new time, not the word “delayed”. Three seconds is enough to read one number, so the number is the biggest thing there." },
  },
  {
    id: "flour-recipe", brief: "A recipe screen for hands covered in flour", constraint: "No touching", seconds: 60, frame: "tablet",
    take: { note: "The step turns when you say “next”, and the screen stays awake while the timer runs. The only thing your hands should touch is the dough." },
  },
  {
    id: "cancel-flow", brief: "A cancel flow that doesn't guilt-trip", constraint: "Three taps, max", seconds: 60, frame: "phone",
    take: { note: "Cancel is the first button, not the last. One screen that says what you lose and when, and a pause offered once, never twice." },
  },
  {
    id: "festival-lost", brief: "Finding your friends at a festival", constraint: "No signal", seconds: 60, frame: "watch",
    take: { note: "Agree before you lose each other. Drop a meeting pin while there's signal; after that the phone is a compass pointing at it." },
  },
  {
    id: "bad-news", brief: "Telling a user their order is late", constraint: "Before they ask", seconds: 60, frame: "phone",
    take: { note: "Say it before they notice: the new date, the reason in one line, and what's being done about it. The apology goes last, not first." },
  },
];

/* Benched rather than deleted: good briefs, waiting on a take. Moving one
   into the deck means writing its note — the tests will say if it's missing. */
export const benchedBriefs: readonly BenchedBrief[] = [
  { id: "atm-rain", brief: "An ATM screen people use in the rain", constraint: "Wet fingers, glare", seconds: 60 },
  { id: "first-phone", brief: "Video calls on a grandparent's first phone", constraint: "One button", seconds: 60 },
  { id: "parking-meter", brief: "A parking meter nobody swears at", constraint: "Paid in ten seconds", seconds: 60 },
  { id: "empty-todo", brief: "The empty state of a brand-new to-do app", constraint: "No illustration", seconds: 60 },
  { id: "useful-404", brief: "A 404 page that still gets you somewhere", constraint: "No jokes", seconds: 60 },
  { id: "meds-travel", brief: "Medication reminders for someone who travels", constraint: "Time zones", seconds: 90 },
  { id: "kid-savings", brief: "A savings app for a nine-year-old", constraint: "No numbers over 100", seconds: 60 },
  { id: "skip-onboarding", brief: "Onboarding for people who skip onboarding", constraint: "One screen", seconds: 60 },
  { id: "password-reset", brief: "A password reset that isn't a punishment", constraint: "No email loop", seconds: 60 },
  { id: "waiting-room", brief: "A hospital waiting-room queue display", constraint: "Anxious people", seconds: 90 },
  { id: "honest-unsub", brief: "Unsubscribe, designed by someone honest", constraint: "One click", seconds: 60 },
  { id: "lift-panel", brief: "Lift buttons for a forty-storey building", constraint: "Found at a glance", seconds: 60 },
  { id: "fridge-expiry", brief: "A fridge that says what's about to go off", constraint: "No screen", seconds: 60 },
  { id: "shared-bill", brief: "Splitting a bill when one person paid", constraint: "Nobody feels cheap", seconds: 60 },
];

/* --- Photos ----------------------------------------------------------------
   The carousel groups by category and counts within it — the reference board
   reads "People 1/1". Tapping advances, and rolling past the last photo in a
   category moves to the next one.

   Empty until the photo set arrives. The widget renders a correctly-sized,
   visibly-unfinished plate rather than inventing filler, and lights up the
   moment entries land here — nothing else has to change.
   --------------------------------------------------------------------------- */

export type Photo = { src: string; alt: string };

export type PhotoCategory = {
  name: string;
  /** Glyph key drawn by the carousel — see its ICONS map. */
  icon: "person" | "paw" | "sparkle" | "pin" | "heart" | "star" | "camera";
  photos: readonly Photo[];
};

/** Grouped, because the carousel counts within a category and rolls into the
 *  next one at the end — "People 2/4" is a position in a set, not in a list. */
export const photoCategories: readonly PhotoCategory[] = [
  {
    name: "Me",
    icon: "person",
    photos: [
      { src: "/media/workspace/photos/me-garden.jpg", alt: "Standing in a courtyard full of plants" },
      { src: "/media/workspace/photos/me-table.jpg", alt: "At a table, glasses off" },
    ],
  },
  {
    name: "Cats",
    icon: "paw",
    photos: [
      { src: "/media/workspace/photos/cat-kitten.jpg", alt: "A ginger kitten standing up" },
      { src: "/media/workspace/photos/cat-shop.jpg", alt: "A ginger cat stretched out by a shopfront" },
    ],
  },
  {
    name: "Wallpapers",
    icon: "sparkle",
    photos: [
      { src: "/media/workspace/photos/wall-cats.jpg", alt: "Cats looming over a city, in black and white" },
      { src: "/media/workspace/photos/wall-cats-2.jpg", alt: "A second cat wallpaper" },
    ],
  },
];

/** The cursor-chasing cat. A sprite sheet, not a placed widget — it roams. */
export const oneko = {
  sprite: "/media/workspace/oneko.png",
  /** Sprite cell size, px. The sheet is 8 columns x 4 rows of 32px cells. */
  cell: 32,
} as const;

/* --- Derived --------------------------------------------------------------- */

/** Centre and extent of a cluster, computed from its members so that moving a
 *  widget can never leave the dock flying the camera at where it used to be. */
export function clusterBounds(cluster: Cluster) {
  const members = widgets.filter((w) => w.cluster === cluster);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const w of members) {
    if (w.x < minX) minX = w.x;
    if (w.y < minY) minY = w.y;
    if (w.x + w.w > maxX) maxX = w.x + w.w;
    if (w.y + w.h > maxY) maxY = w.y + w.h;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}

/** Margin, world px, around a neighbourhood when the dock frames it. */
export const FIT_PAD = 240;

/** Below this fit a neighbourhood is too small to read, and the dock goes to
 *  its anchor instead — a phone, mostly. */
const MIN_READABLE_FIT = 0.6;

/** What a neighbourhood is known by: where the dock goes when the whole of it
 *  cannot be shown at a readable size. */
export const DISTRICT_ANCHORS: Record<Cluster, string> = {
  me: "profile",
  work: "terminal",
  listen: "disc-safe",
  read: "book-everyday",
  play: "scratch",
};

/**
 * Where the dock puts the camera for a neighbourhood, at a viewport size.
 *
 * The whole neighbourhood when it fits at a readable scale; otherwise its
 * anchor, filling the width. The old rule framed the bounding box of a
 * category that spanned the board and clamped at the zoom floor, which is
 * what made three of the five tabs mean "zoom out".
 */
export function clusterView(
  cluster: Cluster,
  viewportW: number,
  viewportH: number,
): { x: number; y: number; scale: number } {
  const b = clusterBounds(cluster);
  const fit = Math.min(viewportW / (b.w + FIT_PAD), viewportH / (b.h + FIT_PAD));
  if (fit >= MIN_READABLE_FIT) return { x: b.x, y: b.y, scale: Math.min(1.1, fit) };
  const a = widgets.find((w) => w.id === DISTRICT_ANCHORS[cluster])!;
  return {
    x: a.x + a.w / 2,
    y: a.y + a.h / 2,
    scale: Math.min(1, (viewportW - 48) / a.w, (viewportH - 200) / a.h),
  };
}

/* --- Where the camera is --------------------------------------------------
   The neighbourhoods' boxes never overlap — tests/board.test.ts holds that —
   so the place under a point is simply the nearest box: the one it is in,
   or the one it is closest to out in a river. The orbit before this
   overlapped at every seam and had to use bearings around the hub. */

const BOXES = CLUSTERS.map((c) => {
  const b = clusterBounds(c);
  return { c, l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.h / 2, b: b.y + b.h / 2 };
});

/**
 * The neighbourhood a world point is in — what the dock lights as you pan.
 * It used to change only when a tab was pressed, so panning from Me to
 * Playing left "Me" lit.
 */
export function clusterAt(wx: number, wy: number): Cluster | null {
  let best: Cluster | null = null;
  let bestD = Infinity;
  for (const box of BOXES) {
    const d = Math.hypot(Math.max(box.l - wx, 0, wx - box.r), Math.max(box.t - wy, 0, wy - box.b));
    if (d < bestD) {
      bestD = d;
      best = box.c;
    }
  }
  return best;
}

/**
 * The neighbourhoods' names, set on the board itself — the same words as the
 * dock, so the two speak one language. World px, just above each place, in
 * the gap its first row leaves.
 */
export const DISTRICT_LABELS: Record<Cluster, { x: number; y: number }> = {
  me: { x: 1565, y: 979 },
  listen: { x: 1255, y: 120 },
  read: { x: 2622, y: 983 },
  play: { x: 1447, y: 1668 },
  work: { x: 523, y: 1067 },
};

/**
 * Where the camera opens, and where R returns to.
 *
 * Derived from the profile card's own box rather than written as a pair of
 * numbers: the card is the thing being framed, and hard-coding its centre
 * meant that growing the card by a row left the "reset" view fifty pixels
 * off — which is exactly what happened when the facts row landed.
 */
const anchor = widgets.find((w) => w.id === "profile")!;
export const HOME = {
  x: anchor.x + anchor.w / 2,
  y: anchor.y + anchor.h / 2,
};

/** The opening scale: 1:1, unless the profile card would be clipped — on a
 *  375px phone it was, on both sides, as the very first thing anyone saw. */
export function homeScale(viewportW: number): number {
  return Math.min(1, (viewportW - 32) / anchor.w);
}

/**
 * The scale the Canvas card renders the board at.
 *
 * It lives here rather than in the card because two very distant places need
 * to agree on it: the card, which sets the transform, and `Still`, which uses
 * it to work out how large a widget's artwork is *actually* painted. A 320px
 * record at this scale occupies about 42 CSS pixels, and asking the browser
 * for the full-resolution file to fill 42 pixels is how the homepage came to
 * carry several megabytes of board art.
 */
export const PREVIEW_SCALE = 0.13;

/**
 * The name the Canvas card and the canvas share while morphing.
 *
 * Set inline by both, never in a module: CSS Modules scope
 * `view-transition-name` exactly as they scope a class, so written in a
 * stylesheet it reaches the browser mangled and every `::view-transition-*`
 * rule silently fails to match. globals.css documents the same trap for the
 * modal names.
 *
 * It lives here, next to the board it names, rather than in CanvasSurface —
 * the card needs the string at module scope but must *not* pull the surface's
 * ~40KB of camera, chrome and twelve widgets into the homepage bundle to get
 * it. The surface is loaded on demand instead; see CanvasCard.
 */
export const CANVAS_MORPH = "canvas-frame";

/**
 * The board's keymap.
 *
 * Lives here rather than beside the sheet that used to render it, because two
 * surfaces read it now: the command palette answers "keyboard shortcuts" with
 * this list, and `CanvasSurface` binds the keys themselves. A keymap that is
 * documented in one file and implemented in another is a keymap that drifts,
 * and this is the half that both can share.
 *
 * Tuned in the Framer reference's CommandPalette and carried over unchanged.
 */
export const SHORTCUTS: readonly (readonly [string, string])[] = [
  ["Drag / two fingers", "Pan the board"],
  ["\u2318 / Ctrl + scroll", "Zoom"],
  ["Pinch", "Zoom, on a trackpad or touch"],
  ["+ / \u2212", "Zoom in and out"],
  ["R", "Back to the middle"],
  ["Tab", "Walk the board, one thing at a time"],
  ["Space", "Lift off"],
  ["C", "Confetti"],
  ["/ or ?", "This list"],
  ["Esc", "Close the canvas"],
];
