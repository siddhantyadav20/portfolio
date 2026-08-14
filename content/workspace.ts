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
   The only things still owed are the four songs whose MP3s aren't in the repo
   (marked `src: null`), which is a licensing question rather than a writing
   one, and the photo set behind the carousel.
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
        excerpt: string;
        status: string;
      }
    | { kind: "sticker"; label: string; art: string }
    | { kind: "profile" }
    | { kind: "linkedin" }
    | { kind: "caseStudy" }
    | { kind: "receipt" }
    | { kind: "terminal" }
    | { kind: "scratch" }
    | { kind: "draw" }
    | { kind: "photos" }
  );

/* --- The board ------------------------------------------------------------- */

export const widgets: readonly Widget[] = [
  /* --- The centre ---------------------------------------------------------- */
  { id: "profile", kind: "profile", cluster: "me", x: 1260, y: 1151, w: 480, h: 578 },
  { id: "photos", kind: "photos", cluster: "me", x: 1750, y: 1843, w: 280, h: 280, rotate: 4 },
  { id: "linkedin", kind: "linkedin", cluster: "me", x: 1287, y: 2361, w: 306, h: 306, rotate: 6 },

  /* --- Work ---------------------------------------------------------------- */
  { id: "case-inspection", kind: "caseStudy", cluster: "work", x: 2218, y: 2355, w: 226, h: 340, rotate: -5 },
  { id: "receipt", kind: "receipt", cluster: "work", x: 460, y: 2033, w: 280, h: 839, rotate: -9 },
  { id: "terminal", kind: "terminal", cluster: "work", x: 980, y: 449, w: 520, h: 360, rotate: -5 },

  /* --- Play ---------------------------------------------------------------- */
  { id: "scratch", kind: "scratch", cluster: "play", x: 1610, y: 635, w: 380, h: 420, rotate: 4 },
  { id: "draw", kind: "draw", cluster: "play", x: 1280, y: 1869, w: 320, h: 320, rotate: -2 },
  { id: "sticker-cs", kind: "sticker", cluster: "play", x: 680, y: 1391, w: 200, h: 200, rotate: -1, label: "Counter-Strike", art: "/media/workspace/sticker-counter-strike.png" },
  { id: "sticker-rooney", kind: "sticker", cluster: "play", x: 1940, y: 1080, w: 200, h: 200, rotate: 0, label: "Rooney’s bicycle kick", art: "/media/workspace/sticker-rooney.png" },
  { id: "sticker-ken", kind: "sticker", cluster: "play", x: 950, y: 1300, w: 200, h: 200, rotate: -11, label: "Street Fighter", art: "/media/workspace/sticker-ken.png" },
  { id: "sticker-rocket", kind: "sticker", cluster: "play", x: 2120, y: 560, w: 200, h: 178, rotate: 0, label: "Off to build something", art: "/media/workspace/sticker-rocket.png" },

  /* --- Listening. Six records, ringing the centre. ------------------------- */
  { id: "disc-safe", kind: "disc", cluster: "listen", x: 890, y: 956, w: 200, h: 200, rotate: 10, title: "Safe and Sound", artist: "Capital Cities", cover: "/media/workspace/album-safe-and-sound.png", src: null },
  { id: "disc-feel", kind: "disc", cluster: "listen", x: 650, y: 1725, w: 200, h: 200, rotate: -7, title: "I Feel it Coming", artist: "The Weeknd", cover: "/media/workspace/album-i-feel-it-coming.png", src: "/audio/i-feel-it-coming.mp3" },
  { id: "disc-somewhere", kind: "disc", cluster: "listen", x: 1790, y: 2275, w: 200, h: 200, rotate: -6, title: "Somewhere Only We Know", artist: "Keane", cover: "/media/workspace/album-somewhere-only-we-know.png", src: null },
  { id: "disc-cantstop", kind: "disc", cluster: "listen", x: 2240, y: 1822, w: 200, h: 200, rotate: -4, title: "Can’t Stop", artist: "Red Hot Chili Peppers", cover: "/media/workspace/album-cant-stop.png", src: null },
  { id: "disc-chala", kind: "disc", cluster: "listen", x: 2300, y: 1395, w: 200, h: 200, rotate: -1, title: "Chala Jaata Hoon", artist: "Kishore Kumar", cover: "/media/workspace/album-chala-jaata-hoon.png", src: null },
  { id: "disc-mets", kind: "disc", cluster: "listen", x: 950, y: 2135, w: 200, h: 200, rotate: -5, title: "Ode to the Mets", artist: "The Strokes", cover: "/media/workspace/album-ode-to-the-mets.png", src: "/audio/ode-to-the-mets.mp3" },

  /* --- Reading. Five books, each opening to a spread. ---------------------- */
  {
    id: "book-everyday", kind: "book", cluster: "read",
    x: 430, y: 1212, w: 160, h: 240, rotate: 8,
    title: "The Design of Everyday Things", author: "Don Norman",
    cover: "/media/workspace/book-everyday-things.png",
    rating: 4.3, year: 1988, pages: 368, status: "Reading",
    genres: ["UX Design", "Product Design", "Psychology"],
    excerpt:
      "The introduction explains that many everyday objects are difficult to use not because people are incompetent, but because they are poorly designed.",
  },
  {
    id: "book-japanese", kind: "book", cluster: "read",
    x: 1930, y: 1437, w: 160, h: 240, rotate: -6,
    title: "Japanese Design", author: "Patricia J Graham",
    cover: "/media/workspace/book-japanese-design.png",
    rating: 4.5, year: 2014, pages: 288, status: "Reading",
    genres: ["Design", "Art", "Culture"],
    excerpt:
      "Japanese design has long been admired for its elegance, simplicity, and attention to detail, reflecting a culture where beauty and utility coexist.",
  },
  {
    id: "book-less", kind: "book", cluster: "read",
    x: 970, y: 1722, w: 160, h: 240, rotate: 6,
    title: "Less and More", author: "Dieter Rams",
    cover: "/media/workspace/book-less-and-more.png",
    rating: 4.7, year: 2011, pages: 224, status: "Reading",
    genres: ["Industrial Design", "Design Philosophy"],
    excerpt:
      "The book opens by introducing Dieter Rams’ philosophy that good design should prioritize function, clarity, and restraint.",
  },
  {
    id: "book-metamorphosis", kind: "book", cluster: "read",
    x: 2260, y: 856, w: 160, h: 240, rotate: -12,
    title: "Metamorphosis", author: "Franz Kafka",
    cover: "/media/workspace/book-metamorphosis.png",
    rating: 3.9, year: 1915, pages: 112, status: "Reading",
    genres: ["Literary Fiction", "Absurdism", "Existentialism"],
    excerpt:
      "As Gregor Samsa awoke one morning from uneasy dreams he found himself transformed in his bed into a gigantic insect.",
  },
  {
    id: "book-1984", kind: "book", cluster: "read",
    x: 550, y: 810, w: 160, h: 240, rotate: -19,
    title: "1984", author: "George Orwell",
    cover: "/media/workspace/book-1984.png",
    rating: 4.2, year: 1949, pages: 328, status: "Reading",
    genres: ["Dystopian Fiction", "Political Fiction", "Science Fiction"],
    excerpt:
      "It was a bright cold day in April, and the clocks were striking thirteen.",
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
  actions: [
    { label: "Message", icon: "chat", badge: "NEW" },
    { label: "Mail", icon: "send", badge: null },
    { label: "LinkedIn", icon: "linkedin", badge: null },
    { label: "Insta", icon: "share", badge: null },
  ],
  updatesLabel: "Latest updates",
  updates: [
    { text: "Working on a telephony app to automate bookings", when: "Jun 2026" },
    { text: "Built a 3D report similar to Google Maps Street View", when: "May 2026" },
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

export const caseStudy = {
  eyebrow: "B2B SaaS",
  title: "Home Inspection Report Writer",
  body: "A tool to conduct home inspections on-site and deliver reports the same day.",
  cta: "Case Study",
  art: "/media/workspace/case-inspection.png",
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
  host: "siddhant@portfolio — zsh",
  boot: [
    "booting portfolio.sh",
    "loading modules  [████████████]  100%",
    "mounting  /skills  /tools  /projects",
    "ready ✓",
  ],
  /** Drawn as an ASCII banner; the glyphs live in the component. */
  banner: "SIDDHANT",
} as const;

export const scratch = {
  prompt: "Scratch to play",
  reset: "↺",
} as const;

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

/** Where the camera opens, and where R returns to: centred on the profile card,
 *  which is what the Framer canvas frames on arrival. */
export const HOME = { x: 1500, y: 1440 };
