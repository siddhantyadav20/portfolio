/* ===========================================================================
   The arrival sequence, and the decision to run it at all.

   The site opens by drawing itself: a Figma-ish canvas where each card of the
   bento grid is framed, measured and filled in turn, and then hands over to
   the real page underneath. It is five seconds, it happens once, and every
   part of that sentence is load-bearing.

   ONCE. A loader that plays on every navigation is a tax the visitor pays for
   a flourish they have already seen. This one is remembered in
   `localStorage`, so it greets somebody arriving and never interrupts them
   again — including on the second, third and tenth page of the same visit.

   BEFORE REACT. The decision has to be made before first paint or a returning
   visitor sees the homepage flash, then get covered by an overlay, then get
   uncovered. So it runs as an inline script in <head>, exactly like
   `THEME_SCRIPT`, and it writes an attribute the stylesheet is already
   watching for. React finds out afterwards.

   AND IT IS NEVER LOAD-BEARING. Everything below is wrapped so that a browser
   with storage disabled, a visitor who prefers reduced motion, a crawler, or
   an exception nobody predicted all get the same outcome: no overlay, and the
   site as it would have been. The page underneath is fully rendered the whole
   time — the sequence is drawn on top of it, not instead of it.
   =========================================================================== */

/** Bumping this replays the sequence for everyone who has already seen it. */
export const BOOT_KEY = "sy-seen-v1";

/** Set on <html> while the sequence is running. See "Boot" in globals.css. */
export const BOOT_ATTR = "data-booting";

/**
 * The whole run, in milliseconds.
 *
 * Every beat in `BootSequence` is a fraction of this, so this is the only
 * number that sets the pace. Three and a half seconds is a long time to hold
 * somebody and it is deliberate: about a second and a half of it is the mark
 * being drawn, and the drawing is the point. It survives being that long only
 * because it happens once, because reduced motion opts out of it entirely, and
 * because the second half of it is the actual page arriving rather than a
 * spinner. (It is deliberately *not* skippable — see the note in
 * `BootSequence`, which is where that decision is argued. This comment used to
 * claim the opposite.)
 */
export const BOOT_MS = 3400;

/**
 * Runs in <head>, before anything is painted.
 *
 * Hand-minified and deliberately dull. Four reasons to do nothing, then one
 * attribute:
 *
 *   - not the homepage — the sequence draws the homepage's cards, so it has
 *     nothing to say on a case study or the canvas;
 *   - seen already — which is not nothing any more: a returning visitor gets
 *     `ARRIVE_ATTR` instead, the sequence's last beat on its own, and the
 *     script takes it down again a second after the first frame;
 *   - reduced motion, which this must honour: it is a large, fast, decorative
 *     animation and it is exactly what that setting is for;
 *   - a restore from the back/forward cache, where the page is already
 *     painted and re-running would be a flash for no reason. (Neither
 *     attribute can fire there: an inline script does not run again on a
 *     restore.)
 *
 * The `try` is not decoration. Safari in private mode throws on
 * `localStorage` access rather than returning null, and a portfolio that
 * white-screens on arrival because of a loading animation would be the single
 * most expensive bug this file could have.
 */
/**
 * Set on <html> for the first second of every *later* arrival. See "Arrival"
 * in globals.css.
 *
 * The sequence above happens once, and everything after it used to be a cut:
 * the second visit, and every one after, got the finished page in a single
 * frame, as if the first five seconds had been a different site. This is the
 * last beat of that sequence and nothing else — the page rising behind the
 * mark — kept short enough that nobody waits on it. No overlay, no drawing,
 * nothing hidden for longer than half a second, and never on a client-side
 * navigation, because this script only runs on a document load.
 */
export const ARRIVE_ATTR = "data-arriving";

/**
 * How long, after the first frame, the attribute stays up. Longer than the
 * slowest card's delay plus its run (see `--arrive` in globals.css), so it is
 * only ever taken down from cards whose animation has already finished — a
 * card losing its animation part-way through would snap to rest.
 *
 * Counted from the first frame rather than from now: this runs in <head>,
 * before the stylesheet has loaded or anything has been painted, and a timer
 * started here could run out before the animation it is guarding had begun.
 */
export const ARRIVE_HOLD_MS = 1000;

export const BOOT_SCRIPT = `try{var d=document.documentElement;if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){if(!localStorage.getItem(${JSON.stringify(
  BOOT_KEY,
)})){d.setAttribute(${JSON.stringify(
  BOOT_ATTR,
)},"")}else{d.setAttribute(${JSON.stringify(
  ARRIVE_ATTR,
)},"");requestAnimationFrame(function(){setTimeout(function(){d.removeAttribute(${JSON.stringify(
  ARRIVE_ATTR,
)})},${ARRIVE_HOLD_MS})})}}}catch(e){}`;

/** Whether the pre-paint script decided to run. Read by the component. */
export function isBooting(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute(BOOT_ATTR);
}

/**
 * Let the page be seen again.
 *
 * Deliberately separate from `markSeen`, and the split is a bug fix rather
 * than tidiness. When the two were one function, the component's unmount
 * cleanup called it as a safety — "never leave the page hidden" — and React's
 * StrictMode double-invoke in development ran that cleanup immediately, on the
 * first mount. The sequence was marked as seen and torn down before it drew a
 * single frame, and the only symptom was that it never appeared.
 *
 * Unhiding is now something that can happen for several reasons. Remembering
 * happens for exactly one: the visitor got their arrival.
 */
export function revealPage() {
  document.documentElement.removeAttribute(BOOT_ATTR);
}

/**
 * Don't do this again.
 *
 * Called when the sequence ends *or* when it is skipped — skipping is a
 * decision about this arrival, not a request to be shown it next time.
 */
export function markSeen() {
  try {
    localStorage.setItem(BOOT_KEY, "1");
  } catch {
    // Storage refused. The sequence will run again next time, which is a much
    // smaller problem than throwing here.
  }
}
