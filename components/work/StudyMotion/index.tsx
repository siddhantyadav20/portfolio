"use client";

import { useLayoutEffect, useRef } from "react";
import { findScrollRoot } from "@/lib/scrollRoot";

/**
 * The reader's arrivals — artefacts that land as they reach the reader, and
 * numbers that count up to themselves.
 *
 * One island for the whole study rather than a client wrapper per block, so
 * every block stays a server component and the markup stays the design's:
 * a block opts in with `data-reveal` and its own stylesheet says what arriving
 * looks like. This only flips the attribute.
 *
 *   ""         eligible, and drawn exactly as designed. What the server sends,
 *              what a reader without JavaScript gets, and what a block that
 *              was already on screen when the page woke up keeps.
 *   "pending"  below the fold at mount, held at its starting pose.
 *   "in"       reached the reader; its stylesheet transitions it home.
 *
 * Only blocks *below the fold* are ever held back. Hiding something the reader
 * is already looking at so that it can animate in is the flash every reveal
 * library ships with, and it is measured away here in a layout effect, before
 * the first paint after hydration.
 *
 * Prose never opts in. Words are what the reader came for and should never be
 * waiting on a scroll position; the things that arrive are the artefacts —
 * cards, panels, the timeline, the phones.
 *
 * Reduced motion leaves everything at "" and counts nothing.
 */
export default function StudyMotion() {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const scope = ref.current?.parentElement;
    if (!scope) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const fold = window.innerHeight;
    const blocks = Array.from(scope.querySelectorAll<HTMLElement>("[data-reveal]"));
    const counters = Array.from(scope.querySelectorAll<HTMLElement>("[data-count]"));
    const stops: (() => void)[] = [];
    const count = (el: HTMLElement) => stops.push(countUp(el));

    /* Arrive when the block's top crosses 85% of the viewport — a little way
       into the screen, so the motion happens where the eye already is rather
       than at the bottom edge. */
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          if (el.dataset.reveal === "pending") {
            el.dataset.reveal = "in";
            // Its numbers start from zero in the same frame it is released,
            // so the card never shows its final figure on the way in.
            el.querySelectorAll<HTMLElement>("[data-count]").forEach(count);
          } else if (el.hasAttribute("data-count")) {
            count(el);
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    for (const el of blocks) {
      if (el.getBoundingClientRect().top > fold) {
        el.dataset.reveal = "pending";
        io.observe(el);
      }
    }

    /* A number counts the first time it is seen — but never after it has
       already been seen at its real value. On the `/work` route the intro's
       three numbers were painted by the server before this ran, and counting
       them now would read 43, then 0, then 43 again. Inside the modal the
       study is mounted fresh as it opens, so they are seen here first: zeroed
       before the first paint (this is a layout effect) and counted as the
       plate settles. The modal is the one surface that scrolls inside an
       overlay, which is how it is told apart. */
    const fresh = findScrollRoot(scope) !== null;
    for (const el of counters) {
      // Counted by its block when the block is released — see above.
      if (el.closest('[data-reveal="pending"]')) continue;
      if (el.getBoundingClientRect().top <= fold) {
        if (fresh) count(el);
      } else {
        io.observe(el);
      }
    }

    return () => {
      io.disconnect();
      stops.forEach((stop) => stop());
    };
  }, []);

  return <span ref={ref} hidden />;
}

/** Below this a count is a flicker rather than a climb — "3" counting is
 *  0, 1, 2, 3 and reads as a glitch. */
const COUNT_FROM = 20;
const COUNT_MS = 1400;

/**
 * Count the number inside an element up from zero to what it already says.
 *
 * The text is the design's and is restored exactly at the end, so a reader
 * who copies it, a screen reader that arrives late and the next render all
 * see the authored string. Everything around the digits — the "~" of
 * "~43 mins", the comma in "12,397" — is kept through the count.
 */
function countUp(el: HTMLElement): () => void {
  /* The text node React rendered, written in place. Replacing it through
     `textContent` would leave React holding a node that is no longer in the
     document. */
  const node = el.firstChild;
  if (!(node instanceof Text) || node !== el.lastChild) return () => {};

  const final = node.nodeValue ?? "";
  const match = final.match(/^(\D*?)(\d[\d,]*)(.*)$/);
  if (!match) return () => {};

  const [, head, digits, tail] = match;
  const target = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(target) || target < COUNT_FROM) return () => {};

  const grouped = digits.includes(",");
  const format = (n: number) =>
    grouped ? n.toLocaleString("en-US") : String(n);

  let frame = 0;
  let start = 0;
  const tick = (now: number) => {
    if (!start) start = now;
    const t = Math.min((now - start) / COUNT_MS, 1);
    // Exponential ease-out: most of the climb up front, the last few units
    // ticking over slowly, so the number lands rather than stops.
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    node.nodeValue =
      t === 1 ? final : head + format(Math.round(target * eased)) + tail;
    if (t < 1) frame = requestAnimationFrame(tick);
  };

  node.nodeValue = head + format(0) + tail;
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    node.nodeValue = final;
  };
}
