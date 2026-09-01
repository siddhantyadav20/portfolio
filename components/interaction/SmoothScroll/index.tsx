"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { SCROLL_PAUSE, SCROLL_RESUME } from "@/lib/viewTransition";

/**
 * Momentum scrolling, on the homepage and nowhere else.
 *
 * The homepage is a bento composition rather than a document — there is no
 * reading order down it, and the eye moves between cards rather than through
 * paragraphs. A wheel tick that steps the page 100px and stops reads as a
 * filmstrip of that composition; the same tick eased over a second reads as
 * one surface being moved. That is the whole of what this is for.
 *
 * It is NOT on the case studies, and that is deliberate rather than an
 * oversight: those are documents, they are read rather than looked at, and
 * momentum between you and a line of prose is a cost with no matching benefit.
 * `app/page.tsx` mounts this; nothing else does.
 *
 * WHAT IS DELIBERATELY LEFT NATIVE
 *
 * Touch. `syncTouch` is off, so a finger drag is the platform's own scroll
 * with the platform's own momentum. iOS and Android have spent fifteen years
 * on that curve and it is tuned to the hardware; re-deriving it in JavaScript
 * on top of a rubber-band the browser is already running is how smooth-scroll
 * libraries earn their reputation on phones. The wheel and the trackpad are
 * where the browser gives you a raw delta and nothing else, and that is what
 * this smooths.
 */

export default function SmoothScroll() {
  useEffect(() => {
    const quiet = window.matchMedia("(prefers-reduced-motion: reduce)");

    let lenis: Lenis | null = null;
    let frame = 0;

    const start = () => {
      if (lenis) return;

      lenis = new Lenis({
        /* ~1s to settle. Long enough to read as momentum rather than as a
           slow scroll, short enough that a second tick during the glide feels
           like pushing something already moving rather than queuing. */
        duration: 1,
        /* An exponential ease-out: fast off the line, a long tail into rest.
           The default, stated here because it is the thing most worth tuning
           and a magic call site is a bad place to discover that. */
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

        smoothWheel: true,
        /* See the note above — the platform's touch momentum is better than
           anything re-derived on top of it. */
        syncTouch: false,

        /* Nested scrollers keep their own scroll: the command palette's
           results, the modals, the personality row, the canvas. Detected
           rather than enumerated, so a scroller added later works without
           anyone remembering this file exists. `data-lenis-prevent` is still
           honoured for anything the detection cannot see. */
        allowNestedScroll: true,

        /* This site has no homepage anchors today, and if one arrives it
           should glide with everything else rather than jumping. */
        anchors: true,

        /* Our own rAF, below — Lenis's would keep a loop alive across the
           view transition this component is careful to stand down for. */
        autoRaf: false,
      });

      const raf = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lenis?.destroy();
      lenis = null;
    };

    /* Someone who has asked for less motion has asked for exactly this. Bound
       to `change` as well as read once, because the OS setting is a switch
       people actually use mid-session — and turning it on has to take effect
       without a reload, which is the whole point of asking. */
    const sync = () => (quiet.matches ? stop() : start());
    sync();
    quiet.addEventListener("change", sync);

    /* A view transition snapshots the page and cross-fades it. A rAF loop
       still writing `scrollTo` underneath that is writing to a document
       nobody is looking at, and the scroll position it lands on is the one
       the new view inherits — so the card morph can finish somewhere the
       visitor did not ask to be. Standing down for the length of it costs
       nothing: nobody scrolls during a 300ms transition they just triggered. */
    const pause = () => lenis?.stop();
    const resume = () => lenis?.start();
    window.addEventListener(SCROLL_PAUSE, pause);
    window.addEventListener(SCROLL_RESUME, resume);

    return () => {
      quiet.removeEventListener("change", sync);
      window.removeEventListener(SCROLL_PAUSE, pause);
      window.removeEventListener(SCROLL_RESUME, resume);
      stop();
    };
  }, []);

  return null;
}
