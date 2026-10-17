/**
 * One page lock, shared by every surface that opens over the homepage.
 *
 * WHAT THIS FIXES. Four surfaces — the palette, the compose window, the case
 * study reader and the About/colophon modals — each set `data-modal-open` on
 * <html> by hand, and none of them stopped the page underneath from scrolling.
 * On the two that cover the viewport nobody could tell. On the two that do not,
 * a wheel tick over the palette scrolled the homepage behind it: the backdrop
 * slid, the cards moved, and the panel appeared to float over a page being
 * dragged out from under it.
 *
 * WHY IT IS A COUNT AND NOT A FLAG. `data-modal-open` is also what
 * ProximityField watches to stop writing transforms to the cards. Two surfaces
 * can legitimately overlap — the palette can be opened from inside a case
 * study — and with a bare attribute the first one to close unlocks the page
 * while the second is still up. A depth count means the page unlocks when the
 * last one leaves.
 *
 * WHY LENIS IS TOLD SEPARATELY. `overflow: hidden` stops the browser, not the
 * smooth-scroll loop: Lenis keeps its own virtual position from wheel events
 * and would apply the accumulated delta the moment the lock lifts, so the page
 * would jump on close. `SCROLL_PAUSE` is the contract SmoothScroll already
 * listens on — see `lib/viewTransition.ts`, which uses it for the morph.
 */

import { SCROLL_PAUSE, SCROLL_RESUME } from "./viewTransition";

let depth = 0;

/**
 * Lock the page behind an overlay. Returns the matching unlock, so a caller
 * cannot unlock a lock it did not take — an effect cleanup just calls what the
 * effect body handed it, and calling it twice is a no-op.
 */
export function lockPage(): () => void {
  depth += 1;
  if (depth === 1) {
    document.documentElement.setAttribute("data-modal-open", "");
    window.dispatchEvent(new Event(SCROLL_PAUSE));
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth === 0) {
      document.documentElement.removeAttribute("data-modal-open");
      window.dispatchEvent(new Event(SCROLL_RESUME));
    }
  };
}
