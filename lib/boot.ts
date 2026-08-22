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
 * Five seconds, which is a long time to hold somebody and is the brief. It
 * survives being that long only because it is skippable and because it is
 * showing the visitor the actual page being assembled rather than a spinner.
 */
export const BOOT_MS = 5000;

/**
 * Runs in <head>, before anything is painted.
 *
 * Hand-minified and deliberately dull. Four reasons to do nothing, then one
 * attribute:
 *
 *   - not the homepage — the sequence draws the homepage's cards, so it has
 *     nothing to say on a case study or the canvas;
 *   - seen already;
 *   - reduced motion, which this must honour: it is a large, fast, decorative
 *     animation and it is exactly what that setting is for;
 *   - a restore from the back/forward cache, where the page is already
 *     painted and re-running would be a flash for no reason.
 *
 * The `try` is not decoration. Safari in private mode throws on
 * `localStorage` access rather than returning null, and a portfolio that
 * white-screens on arrival because of a loading animation would be the single
 * most expensive bug this file could have.
 */
export const BOOT_SCRIPT = `try{if(location.pathname==="/"&&!localStorage.getItem(${JSON.stringify(
  BOOT_KEY,
)})&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute(${JSON.stringify(
  BOOT_ATTR,
)},"")}}catch(e){}`;

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
