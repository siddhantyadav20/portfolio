/* ===========================================================================
   The workspace board.

   Every widget, where it sits, and what it says — transcribed from the live
   Framer canvas at siddhant.framer.website/explore rather than re-imagined.
   Positions, sizes and rotations were read out of that page's DOM, so this is
   the same board, not a board like it.

   Two notes on the numbers:

   - Framer centres each widget on its x (a `translateX(-w/2)` on the wrapper).
     Those translates are already folded into `x` here, so every value below is
     a plain top-left in world space and nothing downstream has to know.

   - The world is 3000x3000, not the 4000x3000 the skeleton used. The board is
     square and its density depends on it — widening it would pull the clusters
     apart and lose the "one desk" reading.

   Content is real and quotable: it is Siddhant's own copy, lifted verbatim.
   =========================================================================== */

/** Board extent, world px. Matches the Framer canvas exactly. */
export const WORLD_W = 3000;
export const WORLD_H = 3000;

/**
 * Named regions, used by the dock's jump buttons and by Tab order.
 *
 * Derived from where things actually sit on the board rather than imposed on
 * it — the Framer canvas has no explicit grouping, but the clustering is real:
 * books along the left and upper right, records ringing the middle, the
 * profile card anchoring the centre.
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
        cover: string;
        /** null = the MP3 isn't in the repo yet. */
        src: string | null;
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

export const widgets: readonly Widget[] = [
  /* --- The centre ---------------------------------------------------------- */
    // h is the card's hugged height, not a reservation — the card sizes to its
  // content and this keeps cluster bounds honest about what is actually there.
  { id: "profile", kind: "profile", cluster: "me", x: 1180, y: 1230, w: 480, h: 544 },
  { id: "photos", kind: "photos", cluster: "me", x: 1880, y: 1180, w: 320, h: 320, rotate: 4 },
    // Sized to the homepage card's own 254x280 — it is the same component,
  // and stretching it would break the flood geometry baked into its numbers.
  { id: "linkedin", kind: "linkedin", cluster: "me", x: 960, y: 1930, w: 254, h: 280, rotate: 6 },

  /* --- Work ---------------------------------------------------------------- */
  { id: "receipt", kind: "receipt", cluster: "work", x: 200, y: 1240, w: 280, h: 839, rotate: -9 },
  { id: "terminal", kind: "terminal", cluster: "work", x: 260, y: 240, w: 520, h: 360, rotate: -5 },

  /* --- Play ---------------------------------------------------------------- */
  { id: "scratch", kind: "scratch", cluster: "play", x: 1520, y: 230, w: 320, h: 320, rotate: 4 },
  { id: "draw", kind: "draw", cluster: "play", x: 640, y: 1220, w: 320, h: 320, rotate: -2 },
  { id: "sticker-cs", kind: "sticker", cluster: "play", x: 1420, y: 1960, w: 200, h: 200, rotate: -1, label: "Counter-Strike", art: "/media/workspace/sticker-counter-strike.png" , effect: "recoil" },
  { id: "sticker-rooney", kind: "sticker", cluster: "play", x: 2160, y: 2360, w: 200, h: 200, rotate: 0, label: "Rooney’s bicycle kick", art: "/media/workspace/sticker-rooney.png" , effect: "bicycle" },
  { id: "sticker-ken", kind: "sticker", cluster: "play", x: 1160, y: 730, w: 200, h: 200, rotate: -11, label: "Street Fighter", art: "/media/workspace/sticker-ken.png" , effect: "hadouken" },
  { id: "sticker-rocket", kind: "sticker", cluster: "play", x: 2460, y: 300, w: 200, h: 178, rotate: 0, label: "Off to build something", art: "/media/workspace/sticker-rocket.png" , effect: "flight" },

  /* --- Listening. Six records, ringing the centre. ------------------------- */
  { id: "disc-safe", kind: "disc", cluster: "listen", x: 980, y: 180, w: 320, h: 320, rotate: 10, title: "Safe and Sound", artist: "Capital Cities", cover: "/media/workspace/album-safe-and-sound.png", src: "/audio/safe-and-sound.mp3" },
  { id: "disc-feel", kind: "disc", cluster: "listen", x: 620, y: 700, w: 320, h: 320, rotate: -7, title: "I Feel it Coming", artist: "The Weeknd", cover: "/media/workspace/album-i-feel-it-coming.png", src: "/audio/i-feel-it-coming.mp3" },
  { id: "disc-somewhere", kind: "disc", cluster: "listen", x: 860, y: 2400, w: 320, h: 320, rotate: -6, title: "Somewhere Only We Know", artist: "Keane", cover: "/media/workspace/album-somewhere-only-we-know.png", src: "/audio/somewhere-only-we-know.mp3" },
  { id: "disc-cantstop", kind: "disc", cluster: "listen", x: 2420, y: 1230, w: 320, h: 320, rotate: -4, title: "Can’t Stop", artist: "Red Hot Chili Peppers", cover: "/media/workspace/album-cant-stop.png", src: "/audio/cant-stop.mp3" },
  { id: "disc-chala", kind: "disc", cluster: "listen", x: 1580, y: 690, w: 320, h: 320, rotate: -1, title: "Chala Jaata Hoon", artist: "Kishore Kumar", cover: "/media/workspace/album-chala-jaata-hoon.png", src: "/audio/chala-jaata-hoon.mp3" },
  { id: "disc-mets", kind: "disc", cluster: "listen", x: 1860, y: 1900, w: 320, h: 320, rotate: -5, title: "Ode to the Mets", artist: "The Strokes", cover: "/media/workspace/album-ode-to-the-mets.png", src: "/audio/ode-to-the-mets.mp3" },

  /* --- Reading. Five books, each opening to a spread. ---------------------- */
  {
    id: "book-everyday", kind: "book", cluster: "read",
    x: 240, y: 760, w: 160, h: 240, rotate: 8,
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
    x: 2420, y: 1860, w: 160, h: 240, rotate: -6,
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
    x: 1560, y: 2420, w: 160, h: 240, rotate: 6,
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
    x: 620, y: 1950, w: 160, h: 240, rotate: -12,
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
    x: 2060, y: 250, w: 160, h: 240, rotate: -19,
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
    { text: "  in  linkedin.com/in/siddhant-yadav", href: "https://linkedin.com/in/siddhant-yadav" },
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

export const scratch = {
  label: "Scratch to play",
  prompt: "Scratch here",
  reset: "Scratch again",
  /** What the foil hides. */
  prize: {
    title: "Fancy a game?",
    body: "I play most evenings. Beat me and I'll owe you a coffee.",
    cta: "Play chess",
  },
  /** null until there is somewhere to send people. The reveal still works; the
   *  button is inert, the same convention `MaybeHref` uses on the homepage. */
  href: null as string | null,
} as const;

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
