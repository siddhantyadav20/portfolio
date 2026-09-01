/* ===========================================================================
   The three things every card that morphs into a modal needs.

   Lifted out of InspectionExperience when the About card became the second
   caller. Nothing here is card-specific — the choreography lives in
   globals.css, the names in the components.
   =========================================================================== */

import { flushSync } from "react-dom";

const warmed = new Map<string, Promise<void>>();

/**
 * How long a caller will wait for an asset before opening without it.
 *
 * A cached image decodes in single-digit milliseconds, so in the normal case
 * this timer is never reached and nothing about the transition changes. It is
 * here for the case below.
 */
const WARM_TIMEOUT_MS = 400;

/**
 * Fetch and decode an asset, once, and remember the promise.
 *
 * These have to be decoded *before* a transition starts. The modal mounts
 * inside `startViewTransition`'s callback and the browser snapshots the result
 * immediately — so an image that is still loading is captured as nothing, and
 * the card appears to expand into a blank panel.
 *
 * ---------------------------------------------------------------------------
 * The timeout is not belt-and-braces. `decode()` on a detached <img> can
 * simply never settle — neither resolving nor rejecting — and Chrome does it
 * reliably for `/media/inspection-modal-bg.jpg`, a 2240px JPEG that loads
 * perfectly well (`complete` true, `naturalWidth` 2240, HTTP 200) and then
 * leaves its decode promise pending forever.
 *
 * Every caller awaits this before opening, so a promise that never settles is
 * a card that never opens: click the Inspection study and nothing at all
 * happens, with no error to find. Rejecting was already handled — the original
 * note here said a resolved-either-way promise "keeps a failed asset from
 * wedging the UI", which was the right intent against the wrong failure. This
 * covers the one that actually occurs.
 *
 * Losing the race costs the morph its sharpest frame, which is the correct
 * trade against not opening.
 */
/* The homepage's smooth-scroll loop listens for these; see
   `components/interaction/SmoothScroll`. Names rather than an import, so the
   dependency points one way only — nothing in lib/ pulls in a component. */
export const SCROLL_PAUSE = "sy-scroll-pause";
export const SCROLL_RESUME = "sy-scroll-resume";

export function warm(src: string) {
  let p = warmed.get(src);
  if (!p) {
    p = new Promise<void>((resolve) => {
      // createElement, not `new Image()` — callers import next/image as `Image`.
      const img = document.createElement("img");
      img.src = src;
      // `decode` also waits for the bitmap, which is what the snapshot needs.
      img.decode().then(resolve, () => resolve());
      // `load` is the weaker signal — pixels fetched, not necessarily decoded —
      // and the timer is weaker still. Whichever arrives first wins; the others
      // resolve an already-settled promise, which is a no-op.
      img.addEventListener("load", () => resolve(), { once: true });
      setTimeout(resolve, WARM_TIMEOUT_MS);
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
  /* The homepage smooths its own scrolling, and a rAF loop writing `scrollTo`
     under a snapshot is writing to a document nobody is looking at — the
     position it lands on is the one the new view inherits, so a glide still in
     flight can finish the morph somewhere the visitor did not ask to be.

     An event rather than an import: this module is the plumbing under every
     card on the site and has no business knowing whether a scroll library is
     mounted. Nothing listening is the normal case — every route but one. */
  window.dispatchEvent(new Event(SCROLL_PAUSE));

  // flushSync so the DOM is already updated when the browser takes its "after"
  // snapshot — startViewTransition captures synchronously.
  const transition = document.startViewTransition(() => flushSync(update));
  transition.ready.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  // `finally`, not `then`: a skipped transition rejects, and the follow-on beat
  // still has to run or the card is left frozen in its hovered state. The
  // resume rides with it for the same reason: a skip must not leave the page
  // unable to scroll.
  transition.finished
    .catch(() => {})
    .finally(() => {
      window.dispatchEvent(new Event(SCROLL_RESUME));
      settled?.();
    });
}

/**
 * The parts of a modal's open/close transition that are choreographed against
 * a card's morph — their timings live in globals.css.
 *
 * Set inline by the consumer rather than in a CSS module, because CSS Modules
 * scopes `view-transition-name` exactly as it scopes a class name: written in
 * a stylesheet, `modal-title` reaches the browser as
 * `Something-module__NKAC5q__modal-title` and every `::view-transition-*` rule
 * silently fails to match. Inline styles aren't scoped.
 *
 * Anything inside the overlay *without* a name of its own rides with the
 * plate. `plate` and `controls` are applied by `ModalSurface`; the three
 * content names are handed to whichever blocks a given modal wants staged, in
 * reading order.
 *
 * Here rather than on `ModalSurface` because `StudyReader` carries these names
 * and also renders on the `/work/<slug>` route, which is a server component —
 * importing them out of a `"use client"` module would have pulled the whole
 * modal shell into a route that never opens one.
 */
export const MODAL_VT = {
  title: { viewTransitionName: "modal-title" },
  body: { viewTransitionName: "modal-body" },
  meta: { viewTransitionName: "modal-meta" },
} as const;

/** Must match the exit transition in ModalSurface.module.css. */
export const EXIT_MS = 240;
