import { briefs, type Brief } from "@/content/canvas";

/* ===========================================================================
   The brief, the Studio, and what has been handed in.

   Module singletons read through `useSyncExternalStore`, the same shape as
   `lib/discArt` and `lib/theme`: the scratch card, the Studio and the canvas
   surface all read them and none of them owns them.
   =========================================================================== */

/** What the ticket can hold: three lines of the display serif at 27px across
 *  272px, and one line of constraint beside its label. Enforced by
 *  tests/brief.test.ts, because a fourth line runs under the buttons. */
export const BRIEF_MAX = 48;
export const CONSTRAINT_MAX = 22;

/** Siddhant's note, set large in the "Mine" panel of the take. */
export const TAKE_MAX = 170;

/* --- The Studio --------------------------------------------------------------
   Open, closed but remembered (so "Back to the paper" returns to the same
   sketch), or never opened. `landed` is false while the torn half of the
   ticket is still flying to the tape: the tape is laid out so the scratch
   card can measure where it lands, but not shown until it does. */

/** One job per screen: read the brief, sketch it, compare. */
export type StudioPhase = "brief" | "draw" | "take";

export type StudioState = {
  readonly brief: Brief;
  readonly phase: StudioPhase;
  readonly landed: boolean;
  readonly open: boolean;
};

let studio: StudioState | null = null;
const studioListeners = new Set<() => void>();

function emitStudio() {
  for (const fn of studioListeners) fn();
}

export function subscribeStudio(fn: () => void): () => void {
  studioListeners.add(fn);
  return () => {
    studioListeners.delete(fn);
  };
}

export const readStudio = (): StudioState | null => studio;
export const noStudioServerSide = (): StudioState | null => null;

export function openStudio(
  brief: Brief,
  opts: { phase?: StudioPhase; landed?: boolean } = {},
): void {
  studio = { brief, phase: opts.phase ?? "brief", landed: opts.landed ?? true, open: true };
  emitStudio();
}

/** The torn half has arrived: show the tape it turned into. */
export function landStudio(): void {
  if (!studio || studio.landed) return;
  studio = { ...studio, landed: true };
  emitStudio();
}

export function setStudioPhase(phase: StudioPhase): void {
  if (!studio || studio.phase === phase) return;
  studio = { ...studio, phase };
  emitStudio();
}

/** Put the paper down. The brief and the sketch stay where they are. */
export function closeStudio(): void {
  if (!studio || !studio.open) return;
  studio = { ...studio, open: false };
  emitStudio();
}

/* --- Handed in ---------------------------------------------------------------
   A small thumbnail per brief, so the scratch card's stub can show what you
   drew and the Studio can show it again after a reload. Kept to the last ten:
   they are data URLs and localStorage is a few megabytes, shared with the
   whole site. */

const HANDED_KEY = "sy-handed-v1";
const HANDED_KEEP = 10;
const NONE: Readonly<Record<string, string>> = {};

let handed: Readonly<Record<string, string>> = NONE;
let handedLoaded = false;
const handedListeners = new Set<() => void>();

export function subscribeHanded(fn: () => void): () => void {
  handedListeners.add(fn);
  return () => {
    handedListeners.delete(fn);
  };
}

export function readHanded(): Readonly<Record<string, string>> {
  if (!handedLoaded && typeof window !== "undefined") {
    handedLoaded = true;
    try {
      const raw = window.localStorage.getItem(HANDED_KEY);
      if (raw) handed = JSON.parse(raw) as Record<string, string>;
    } catch {
      // Private mode, or storage refused: nothing remembered, nothing broken.
    }
  }
  return handed;
}

export const noHandedServerSide = (): Readonly<Record<string, string>> => NONE;

export function recordHandIn(briefId: string, thumb: string): void {
  const next: Record<string, string> = { ...readHanded() };
  delete next[briefId]; // re-insert so it counts as the newest
  next[briefId] = thumb;
  const keys = Object.keys(next);
  for (const k of keys.slice(0, Math.max(0, keys.length - HANDED_KEEP))) delete next[k];
  handed = next;
  try {
    window.localStorage.setItem(HANDED_KEY, JSON.stringify(next));
  } catch {
    // Full or refused. The stub still shows it for this visit.
  }
  for (const fn of handedListeners) fn();
}

/* --- Dealing ------------------------------------------------------------------ */

/**
 * One brief nobody has seen yet this visit.
 *
 * Pure so it can be tested: the caller holds the `seen` set. Once every brief
 * has been dealt the deck is reshuffled, except for the one just shown — a
 * re-deal that lands on the brief you just read looks like the card is
 * broken rather than random.
 */
export function pickBrief(
  seen: ReadonlySet<string>,
  last: string | null = null,
  random: () => number = Math.random,
): Brief {
  let pool = briefs.filter((b) => !seen.has(b.id));
  if (pool.length === 0) pool = briefs.filter((b) => b.id !== last);
  if (pool.length === 0) pool = [...briefs];
  return pool[Math.floor(random() * pool.length) % pool.length];
}

/* The visit's deck. Module-level, so it survives the scratch card re-mounting
   and resets on a reload — "no repeats until you have seen them all" is a
   promise about one sitting, not about the browser forever. */
const dealt = new Set<string>();
let lastDealt: string | null = null;

function deal(): Brief {
  if (dealt.size >= briefs.length) dealt.clear();
  const b = pickBrief(dealt, lastDealt);
  dealt.add(b.id);
  lastDealt = b.id;
  return b;
}

/* --- The brief on the table (under the scratch card's foil) ------------------
   A store rather than `useState(deal)`, and that is the fix rather than a
   preference: `/canvas` is server-rendered, and a random pick made during
   render is a different brief on the server and in the browser — a hydration
   failure on every load. The server snapshot is always the first brief; the
   browser deals its own on first read, and `useSyncExternalStore` swaps it in
   straight after hydration, under a foil nobody has scratched yet. */

let onTable: Brief | null = null;
const tableListeners = new Set<() => void>();

export function subscribeTable(fn: () => void): () => void {
  tableListeners.add(fn);
  return () => {
    tableListeners.delete(fn);
  };
}

export const readTable = (): Brief => (onTable ??= deal());
export const tableServerSide = (): Brief => briefs[0];

/** A different brief onto the table — "New brief", and "Try another". */
export function redeal(): void {
  onTable = deal();
  for (const fn of tableListeners) fn();
}

/** The ticket's serial: its place in the deck, three digits. */
export function briefNumber(b: Brief): string {
  return String(briefs.indexOf(b) + 1).padStart(3, "0");
}
