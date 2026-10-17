"use client";

import { useLayoutEffect } from "react";

/** The homepage's cards — the same set the proximity field and the boot use. */
const CARDS = "#main :is([data-prox-card], [data-prox-passive])";

/** Between two cards that reach the reader in the same moment — the pair of
 *  identity chips, the Fantasy and music cards side by side on a phone. Enough
 *  to read as one following the other, not as two separate events. */
const STAGGER_MS = 70;

/**
 * Homepage cards rise into place the first time they are scrolled to.
 *
 * Renders nothing; flips `data-rise` on each card, and "Rise" in globals.css
 * says what that looks like. The same contract as the case studies'
 * `StudyMotion`, for the same reasons, and with the same rule at its centre:
 *
 * ONLY WHAT IS BELOW THE FOLD IS EVER HELD BACK. Hiding a card the visitor is
 * already looking at so that it can animate in is the flash every reveal
 * library ships with. This runs in a layout effect, before the first paint
 * after hydration, and measures against wherever the page actually is — a
 * visitor who came back to a scrolled position is not shown the cards above
 * them disappearing.
 *
 * It matters most on a phone, where the homepage is a long column and the
 * proximity field (pointer-only) does nothing; on the wide page it is the
 * bottom row, the only cards out of sight at load. Reduced motion, or no
 * IntersectionObserver, and nothing is ever held.
 */
export default function HomeRise() {
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const fold = window.innerHeight;

    /* The bottom edge is pulled in, so a card arrives a little way into the
       screen — where the eye already is — rather than at its edge.

       The top edge is pushed out to effectively infinity, and that is the fix
       for a page that is jumped through rather than scrolled: a fling, the
       palette landing somewhere, a restored position. A card that goes from
       below the screen to above it between two frames never intersects the
       viewport at all, so an observer bounded by the viewport never hears
       about it — and it sat at opacity 0, above the reader, until they
       scrolled back and watched it rise *upward* into a page they had already
       read. Counted as arrived instead, it is simply there. */
    const io = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left,
          );

        let seen = 0;
        for (const entry of arriving) {
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          // Passed over, not arrived at: no motion for nobody to see.
          if (entry.boundingClientRect.bottom <= 0) {
            el.dataset.rise = "done";
            continue;
          }
          /* Capped, so a card does not wait on a queue of others: four
             arriving at once is a fling, and the last of them should not
             still be holding back a fifth of a second later. */
          const step = Math.min(seen++, 2);
          el.style.setProperty("--rise-delay", `${step * STAGGER_MS}ms`);
          el.dataset.rise = "in";
        }
      },
      { rootMargin: "100000px 0px -8% 0px" },
    );

    for (const el of document.querySelectorAll<HTMLElement>(CARDS)) {
      if (el.dataset.rise === "in" || el.dataset.rise === "done") continue;
      if (el.getBoundingClientRect().top <= fold) continue;
      el.dataset.rise = "pending";
      io.observe(el);
    }

    return () => io.disconnect();
  }, []);

  return null;
}
