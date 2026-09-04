/* ===========================================================================
   Pages.

   Two events and a deliberate gulf between them, which is the request:

     hover    ONE page turning. A single sheet lifting, arcing and settling.
     click    A HUNDRED pages turning. The whole block riffling past a thumb.

   That gap is the design. The hover is the quietest thing on the board and
   the open is one of the busiest, and they are made of exactly the same
   ingredient — which is what makes the second read as "more of the first"
   rather than as a different object.

   A PAGE IS NOT A SWEEP. Earlier versions were one filtered sweep, then a
   note, and neither is what paper does. A sheet turning is a short run of
   separate contacts as it buckles, releases and lands — three or four for one
   page, and for a riffle, forty of them accelerating and then slowing as the
   block runs out. The *rate* of those contacts is the whole illusion: even
   spacing is a machine, and a rate that changes across the gesture is a thumb.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

/** Master ceiling. */
const PEAK = 0.095;

/* --- One page ------------------------------------------------------------- */

/** Contacts in a single turn, and how long the turn takes. */
const PAGE_CONTACTS = 4;
const PAGE_MS = 150;

/** Where a sheet lives. Bright at the lift, dull as it flattens out. */
const PAGE_FROM = 3800;
const PAGE_TO = 1100;

/** The hover is a fraction of the level of everything else here — it fires
 *  from a pointer merely passing over a cover. */
const HOVER_LEVEL = 0.42;

/* --- A hundred pages ------------------------------------------------------ */

/** Contacts in a riffle. Enough that no one can count them, which is the
 *  point — a countable riffle is a ratchet. */
const RIFFLE_CONTACTS = 42;
const RIFFLE_MS = 520;

/** The block accelerates under the thumb and slows as it runs out, so the gaps
 *  shrink then stretch. A flat rate here is a zip, not a book. */
const RIFFLE_CURVE = 1.7;

/** Closing runs the block the other way: faster, and it ends on the boards. */
const CLOSE_MS = 400;
const CLOSE_CONTACTS = 34;
const BOARD_LEVEL = 0.5;

/** Two turns closer together than this are one turn. */
const RETRIGGER_MS = 220;
/** Far longer, for the hover: a pointer crossing a shelf of books, or drifting
 *  on and off one cover, must not sound like riffling a deck. Module-scoped,
 *  so a whole shelf plays one page rather than five. */
const HOVER_GUARD_MS = 420;

let lastAt = -Infinity;
let lastHover = -Infinity;

/**
 * A run of paper contacts.
 *
 * `curve` warps where each contact falls in the run: 1 is even, above 1
 * crowds them at the start and stretches the tail, which is a block being
 * released rather than fed.
 */
function paper(
  ctx: AudioContext,
  out: AudioNode,
  t: number,
  o: { contacts: number; ms: number; level: number; curve: number; from: number; to: number },
) {
  const seconds = o.ms / 1000;
  for (let i = 0; i < o.contacts; i += 1) {
    const at = Math.pow(i / o.contacts, o.curve);
    // Each contact is its own short band, scattered off the beat. The scatter
    // is what stops a run of forty becoming a buzz at a single pitch.
    const jitter = (Math.random() * 2 - 1) * (0.6 / o.contacts);
    const centre = o.from + (o.to - o.from) * (i / o.contacts);

    burst(ctx, out, {
      at: t + Math.max(0, at + jitter) * seconds,
      seconds: 0.02 + Math.random() * 0.012,
      // Loudest through the middle, where the block is moving fastest.
      level: o.level * (0.4 + 0.6 * Math.sin(Math.PI * (i / o.contacts))) * (0.6 + Math.random() * 0.4),
      type: "bandpass",
      hz: centre * (0.75 + Math.random() * 0.5),
      // Wide. Paper has no pitch, and a narrow Q here whistles.
      q: 0.85,
      attack: 0.002,
    });
  }

  // Air under the run, holding it together as one gesture rather than a
  // handful of ticks.
  burst(ctx, out, {
    at: t,
    seconds,
    level: o.level * 0.4,
    type: "lowpass",
    hz: [o.from, o.to],
    attack: 0.02,
  });
}

function open(contacts: number, ms: number, board: number) {
  if (prefersQuiet()) return;
  const now = Date.now();
  if (now - lastAt < RETRIGGER_MS) return;
  lastAt = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const t = ctx.currentTime + 0.01;

  paper(ctx, out, t, {
    contacts,
    ms,
    level: 1,
    curve: RIFFLE_CURVE,
    from: PAGE_FROM,
    to: PAGE_TO,
  });

  // The boards, on the close only — a cover being lifted lands on nothing.
  if (board > 0) {
    burst(ctx, out, {
      at: t + (ms / 1000) * 0.94,
      seconds: 0.075,
      level: board,
      type: "lowpass",
      hz: [520, 150],
      attack: 0.004,
    });
  }
}

/** A hundred pages, opening. */
export const openBook = () => open(RIFFLE_CONTACTS, RIFFLE_MS, 0);

/** A hundred pages the other way, landing on the boards. */
export const closeBook = () => open(CLOSE_CONTACTS, CLOSE_MS, BOARD_LEVEL);

/** One page, under a hover. */
export function riffle() {
  if (prefersQuiet()) return;
  const now = Date.now();
  if (now - lastHover < HOVER_GUARD_MS) return;
  lastHover = now;

  /* Deliberately does not touch `lastAt`. Hovering a book and clicking it is
     one gesture and takes well under the open's guard, so a shared timer would
     have one page swallow the hundred — the incidental sound silencing the one
     that matters. */

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  paper(ctx, stage(voice, PEAK), ctx.currentTime + 0.008, {
    contacts: PAGE_CONTACTS,
    ms: PAGE_MS,
    level: HOVER_LEVEL,
    // Even, because one page is one movement rather than a block running out.
    curve: 1,
    from: PAGE_FROM,
    to: PAGE_TO,
  });
}
