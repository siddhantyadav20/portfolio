/* ===========================================================================
   The three things every card that morphs into a modal needs.

   Lifted out of InspectionExperience when the About card became the second
   caller. Nothing here is card-specific — the choreography lives in
   globals.css, the names in the components.
   =========================================================================== */

import { flushSync } from "react-dom";

const warmed = new Map<string, Promise<void>>();

/**
 * Fetch and decode an asset, once, and remember the promise.
 *
 * These have to be decoded *before* a transition starts. The modal mounts
 * inside `startViewTransition`'s callback and the browser snapshots the result
 * immediately — so an image that is still loading is captured as nothing, and
 * the card appears to expand into a blank panel.
 */
export function warm(src: string) {
  let p = warmed.get(src);
  if (!p) {
    p = new Promise<void>((resolve) => {
      // createElement, not `new Image()` — callers import next/image as `Image`.
      const img = document.createElement("img");
      img.src = src;
      // `decode` also waits for the bitmap, which is what the snapshot needs;
      // a resolved-either-way promise keeps a failed asset from wedging the UI.
      img.decode().then(resolve, () => resolve());
    });
    warmed.set(src, p);
  }
  return p;
}

/** Whether the browser can morph a card into a modal. */
export function canMorph() {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Runs `update` as a view transition, and swallows the transition's own
 * rejections.
 *
 * A skipped transition rejects rather than resolving, and the browser skips
 * for reasons that are none of our business and not worth an error: the tab
 * being hidden at the moment of the click, a second transition starting on top
 * of this one. The DOM update runs either way — `startViewTransition` always
 * invokes the callback — so a skip costs the animation and nothing else, which
 * is exactly what it should cost.
 */
export function morph(update: () => void, settled?: () => void) {
  // flushSync so the DOM is already updated when the browser takes its "after"
  // snapshot — startViewTransition captures synchronously.
  const transition = document.startViewTransition(() => flushSync(update));
  transition.ready.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  // `finally`, not `then`: a skipped transition rejects, and the follow-on beat
  // still has to run or the card is left frozen in its hovered state.
  transition.finished.catch(() => {}).finally(() => settled?.());
}
