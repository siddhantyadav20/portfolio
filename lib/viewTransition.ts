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
 * A skipped transition rejects rather than resolving, and the browser skips for
 * reasons that are none of our business and not worth an error: the tab being
 * hidden at the moment of the click, a second transition starting on top of
 * this one. The DOM update runs either way — `startViewTransition` always
 * invokes the callback — so a skip costs the animation and nothing else.
 */
/**
 * Marks which morph is in flight, on `<html>`, for the whole transition.
 *
 * WHY THIS EXISTS. A `view-transition-name` makes an element a group in the
 * transition tree, and groups at the same `z-index` paint in *tree* order —
 * which is the order they were captured, which is DOM order. The homepage has
 * five named cards and they all stay named while a modal is open, because the
 * page underneath stays mounted. So every card that happens to sit later in
 * the DOM than the one you clicked was painting **on top of the modal** for the
 * length of the transition: open the Inspection card (first in the band) and
 * all four others covered it; open About (last) and none did. That is the
 * reported "sometimes other elements show up on top of it", and it is exactly
 * the kind of bug that looks intermittent and is not.
 *
 * Ordering by hand is the only fix — a card that is not participating must not
 * be able to outrank the surface that is. CSS cannot tell which of the five
 * names is the live one, so this says so: `globals.css` gives every card name a
 * low z-index and lifts only the one named here. See "View transitions" there.
 */
const MORPH_ATTR = "data-morph";
/** Which way the morph is going, so leaving can be its own, faster move. */
const DIR_ATTR = "data-morph-dir";

/**
 * ONE CLOCK, AND IT IS SET BY THE JOURNEY RATHER THAN BY HAND.
 *
 * Every beat of a morph — the box, the contents fading through it, the corner
 * resolving, the reader's text arriving — is written in `globals.css` as a
 * fraction of `--morph-ms`, and this is where that number comes from. The
 * alternative is what was here before: seven hand-picked durations that only
 * agreed with each other on one card. The reader's `modal-meta` was still
 * animating 190ms after its container had landed.
 *
 * The size of the journey sets the length of it. `s` is how many times the
 * trigger has to grow, by area, to become the viewport — the geometric mean of
 * the two axes rather than the larger of them, because a small card that
 * travels a long way (Canvas: 322x246) and a large one that barely grows
 * (Inspection: 420x640) are different journeys and the larger axis alone
 * cannot tell them apart.
 *
 * The constants are not arbitrary: they are the two durations that were
 * already on the site, recovered. Canvas was hand-tuned to 680ms and the study
 * cards to 520ms, and this returns 683 and ~545 for them. So the formula is
 * not a new opinion about how long a morph should be — it is the existing
 * opinion, extended to the cards that were never tuned.
 */
const MIN_MS = 460;
const MAX_MS = 700;

type Geometry = { ms: number; radius: string };

/**
 * The last measured geometry per name.
 *
 * Closing measures nothing: the modal is the full viewport by definition, and
 * the card it returns to may have been scrolled off screen — but neither the
 * duration nor the corner depends on where the card currently *is*, only on
 * how big it is relative to the viewport. Caching what opening measured is
 * what makes the two directions symmetrical for free.
 */
const geometry = new Map<string, Geometry>();

function measure(from: Element): Geometry | null {
  const box = from.getBoundingClientRect();
  if (!box.width || !box.height) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.sqrt((vw * vh) / (box.width * box.height));
  const ms = Math.round(
    Math.min(MAX_MS, Math.max(MIN_MS, 390 + 145 * Math.log2(s))),
  );

  /* Read rather than declared, because the card corners are fluid: `--r-card-64`
     is a calc() against the container width, so the same `radius={64}` card is
     32px at 390 and 64px at 1440. One computed read gets the resolved value at
     the width the visitor is actually at. */
  const radius = getComputedStyle(from).borderTopLeftRadius || "0px";
  return { ms, radius };
}

/**
 * Runs `update` as a view transition, and swallows the transition's own
 * rejections.
 *
 * `name` is the `view-transition-name` this transition is *about* — the card
 * that is opening, or the surface that is closing back into one. Optional: a
 * modal with no card behind it is ordered by `modal-plate` as it always was.
 *
 * `from` is the element being morphed out of, measured at click time. Opening
 * passes it; closing does not, and reads back what opening cached.
 */
export function morph(
  update: () => void,
  {
    name,
    from,
    dir = "in",
    settled,
  }: {
    name?: string;
    from?: Element | null;
    dir?: "in" | "out";
    settled?: () => void;
  } = {},
) {
  /* The homepage smooths its own scrolling, and a rAF loop writing `scrollTo`
     under a snapshot is writing to a document nobody is looking at — the
     position it lands on is the one the new view inherits, so a glide still in
     flight can finish the morph somewhere the visitor did not ask to be.

     An event rather than an import: this module is the plumbing under every
     card on the site and has no business knowing whether a scroll library is
     mounted. Nothing listening is the normal case — every route but one. */
  window.dispatchEvent(new Event(SCROLL_PAUSE));

  const root = document.documentElement;

  /* Measure on the way in, recall on the way out. A card whose element we were
     never handed (the colophon's footer link before it was named, a deep link)
     falls back to the middle of the range, which is what every morph used to
     get unconditionally. */
  let geom: Geometry | null = null;
  if (from) {
    geom = measure(from);
    if (geom && name) geometry.set(name, geom);
  } else if (name) {
    geom = geometry.get(name) ?? null;
  }

  const ms = geom?.ms ?? 560;
  root.style.setProperty("--morph-ms", `${ms}ms`);
  root.style.setProperty("--morph-r-from", geom?.radius ?? "0px");
  root.setAttribute(DIR_ATTR, dir);

  /* Set before `startViewTransition`, so it is already in place when the
     browser builds the pseudo tree and reads its styles. Cleared in the same
     `finally` as everything else below, which covers a skipped transition —
     leaving it set would leave one card permanently outranking the others. */
  if (name) root.setAttribute(MORPH_ATTR, name);

  // flushSync so the DOM is already updated when the browser takes its "after"
  // snapshot — startViewTransition captures synchronously.
  const transition = document.startViewTransition(() => flushSync(update));
  transition.ready.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  // `finally`, not `then`: a skipped transition rejects, and the follow-on beat
  // still has to run or the card is left frozen in its hovered state. The
  // resume rides with it for the same reason: a skip must not leave the page
  // unable to scroll.
  const done = transition.finished
    .catch(() => {})
    .finally(() => {
      /* Only if it is still ours. Opening and closing quickly enough to overlap
         means the second transition has already written its own name here, and
         a bare `removeAttribute` would clear the live one and drop that card
         back under its bystanders — the very bug this attribute exists to
         stop, reintroduced on a double-click. */
      if (name && root.getAttribute(MORPH_ATTR) === name) {
        root.removeAttribute(MORPH_ATTR);
        root.removeAttribute(DIR_ATTR);
      }
      window.dispatchEvent(new Event(SCROLL_RESUME));
      settled?.();
    });

  return done;
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

/**
 * How long the no-morph close path should wait before unmounting.
 *
 * The two halves of that path had drifted apart. `canMorph()` is false under
 * reduced motion, so closing falls to a `setTimeout(EXIT_MS)` — while the
 * global rule in globals.css has clamped every transition on the page to
 * 0.01ms. The overlay finished fading instantly and then sat there, fully
 * transparent and still covering the page, for the remaining 240ms. Reduced
 * motion means less waiting, not the same wait with nothing to look at.
 */
export function exitMs() {
  if (typeof window === "undefined") return EXIT_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : EXIT_MS;
}
