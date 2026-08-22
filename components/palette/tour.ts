"use client";

import { designSystem, inspection, search as searchCard, store, timeline } from "@/content/site";
import { profile } from "@/content/canvas";
import { scrollToCard } from "./run";

/* ===========================================================================
   Sixty seconds.

   A recruiter gives a portfolio somewhere under a minute. Every interaction on
   this site is built to reward a visitor who stops and plays with it, and a
   visitor who has forty-five seconds will scroll past three of them without
   knowing they were there.

   So the site offers to present itself. The tour is not a video and not a
   sequence of screenshots: it scrolls the real page, lets each card's own
   scroll-into-view behaviour fire the way it does for anyone, and puts one
   line of caption underneath. Nothing here re-implements a card. If the demo
   plays for a visitor, it plays for the tour, because it is the same demo.

   Every caption is read out of content. The only authored words are the
   connective ones — see the note in `answers.ts`, which follows the same rule.
   =========================================================================== */

export type TourStep = {
  /** The `data-card` to scroll to, or null to stay where we are. */
  readonly card: string | null;
  readonly caption: string;
  /** How long to hold, in ms. */
  readonly hold: number;
};

/**
 * The running order.
 *
 * Work first, personality after. A recruiter who bails at step three should
 * have seen the three case studies, which is why the board, the records and
 * the books are not in here at all: they are the reward for staying, and this
 * is the version for somebody who cannot.
 *
 * Holds are uneven on purpose. The Search card plays an eight-tap drill-down
 * before it collapses into a query, so it needs the longest beat on the page;
 * the timeline reads in a glance.
 */
export const STEPS: readonly TourStep[] = [
  {
    card: null,
    caption: `${profile.role} — ${profile.status.text}`,
    hold: 2600,
  },
  {
    card: "inspection",
    caption: inspection.stat,
    hold: 5200,
  },
  {
    card: "search",
    caption: `${searchCard.before} → ${searchCard.after}. ${searchCard.delta}.`,
    hold: 8000,
  },
  {
    card: "design-system",
    caption: `${designSystem.stat} — ${designSystem.statDetail}`,
    hold: 6000,
  },
  {
    card: "timeline",
    caption: `${timeline.entries[0].title} → ${timeline.entries[timeline.entries.length - 1].title}`,
    hold: 4200,
  },
  {
    card: "store",
    caption: `${store.eyebrow}: ${store.title}`,
    hold: 4200,
  },
  {
    card: "about",
    caption: profile.body[1],
    hold: 5000,
  },
];

export const TOUR_MS = STEPS.reduce((n, s) => n + s.hold, 0);

/**
 * Play it.
 *
 * Returns a stop function, and calling it is the whole safety model: any
 * keypress, any wheel, any pointer press stops the tour, because the one thing
 * worse than not being shown around is being shown around while you are trying
 * to read something.
 *
 * `onStep` is called with the index and the caption so the caller can draw the
 * progress bar. `onEnd` fires whether the tour finished or was interrupted —
 * the caller has a bar to take down either way.
 */
export function playTour(
  onStep: (index: number, step: TourStep) => void,
  onEnd: () => void,
): () => void {
  let timer = 0;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    for (const [event, handler] of listeners) {
      window.removeEventListener(event, handler, true);
    }
    onEnd();
  };

  // Capture phase, so a keypress reaches this before whatever it was aimed at.
  // `wheel` and `touchmove` are passive: this only ever cancels a timer, and
  // registering a non-passive scroll listener to do that would make the page
  // janky for the whole length of the tour.
  const listeners: [string, EventListener][] = [
    ["keydown", stop],
    ["wheel", stop],
    ["touchmove", stop],
    ["pointerdown", stop],
  ];
  for (const [event, handler] of listeners) {
    window.addEventListener(event, handler, { capture: true, passive: true });
  }

  const advance = (i: number) => {
    if (stopped) return;
    if (i >= STEPS.length) return stop();

    const step = STEPS[i];
    if (step.card) scrollToCard(step.card);
    else window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });

    onStep(i, step);
    timer = window.setTimeout(() => advance(i + 1), step.hold);
  };

  advance(0);
  return stop;
}

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
