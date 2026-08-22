"use client";

/**
 * How anything on the site asks for the command palette.
 *
 * An event rather than context or a store, for the same reason `lib/theme`
 * uses one: the palette is mounted once in the root layout, and the things
 * that open it — the field in the Introduction card, the canvas chrome, a
 * "Keyboard shortcuts" row inside the palette itself — are scattered across
 * the tree and share no provider with it. A context would mean wrapping the
 * whole app to let three components fire one message.
 *
 * It also keeps the palette lazily loadable. The host listens for this without
 * importing any of the palette's code; nothing is fetched until somebody
 * actually asks for it, which is what keeps a 600KB homepage budget intact.
 */

export const PALETTE_OPEN = "sy-palette-open";

/** What the palette should be showing when it appears. */
export type PaletteIntent = {
  /** Pre-fill the query. */
  readonly query?: string;
  /**
   * Open straight onto an answer panel instead of the search list.
   *
   * How the canvas hands `/` and `?` over: those keys used to open a sheet of
   * their own, and the palette now renders that same keymap, so the board asks
   * for the panel rather than keeping a second surface that says the same
   * thing in a different box.
   */
  readonly answer?: "shortcuts";
};

export function openPalette(intent: PaletteIntent = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PALETTE_OPEN, { detail: intent }));
}

/** Whether this looks like a machine that has a ⌘K to press. */
export function hasKeyboard(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** ⌘ on a Mac, Ctrl everywhere else. Display only. */
export function commandKeyLabel(): string {
  if (typeof navigator === "undefined") return "⌘";
  return /mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

/* --- Flying the canvas ---------------------------------------------------- */

/**
 * A place on the board.
 *
 * `content/palette.ts` indexes all twenty-two widgets and the five clusters,
 * which is the palette's strongest single case: the canvas is 3000x3000 with a
 * five-button dock, so finding one particular book means panning until you see
 * it. That is the same drill-down problem the Search study is about, on the
 * same site as the Search study.
 */
export type CanvasTarget = {
  readonly widget?: string;
  readonly cluster?: string;
};

/**
 * The board publishes its camera here; the palette asks for it here.
 *
 * A registry rather than an import, in both directions. The palette must not
 * import `CanvasSurface` — that would pull the camera, the widgets and the
 * board's whole world into the homepage bundle for a panel that mostly gets
 * used to copy an email. And the canvas must not import the palette, because
 * it is loaded lazily and may not exist yet.
 *
 * So neither knows about the other, and this module — which both already
 * depend on — holds the one function between them.
 */
let jumper: ((target: CanvasTarget) => void) | null = null;

/**
 * Where to fly once the board finishes opening.
 *
 * Searching for a book from the homepage has to open the canvas *and then* fly
 * to it, and those are seconds apart: the overlay is code-split, the world
 * mounts, the camera measures itself. Rather than have the palette poll for a
 * surface that does not exist yet, it leaves the destination here and the board
 * collects it on arrival.
 */
let pending: CanvasTarget | null = null;

/** The canvas morph, from globals.css. See `registerCanvasJump`. */
const MORPH_MS = 680;

/** Called by the board when its camera is ready. Returns an unregister. */
export function registerCanvasJump(fn: (target: CanvasTarget) => void) {
  jumper = fn;

  /* Whatever asked for the board while it was still opening.
  
     Deferred, and the number is the canvas morph's own duration: the board
     arrives by growing out of the homepage card over 680ms, and a camera
     flying somewhere *during* that reads as the board being dropped rather
     than opened. It also does not survive — the surface re-measures itself as
     it settles, and a fly issued before that lands back at the middle, which
     is exactly what the first version did: the palette opened the canvas and
     then sat on the profile card, having apparently ignored the request. */
  if (pending) {
    const target = pending;
    pending = null;
    window.setTimeout(() => fn(target), MORPH_MS);
  }

  return () => {
    if (jumper === fn) jumper = null;
  };
}

/**
 * Fly, if the board is on screen.
 *
 * Returns false when it is not, which is the caller's cue to open it — the
 * target is remembered either way.
 */
export function canvasJump(target: CanvasTarget): boolean {
  if (!jumper) {
    pending = target;
    return false;
  }
  jumper(target);
  return true;
}
