"use client";

import { useCallback, useEffect, useState } from "react";
import { EXIT_MS } from "@/components/primitives/ModalSurface";
import { heroStill, type CaseStudy } from "@/content/work";
import { canMorph, morph, warm } from "@/lib/viewTransition";

/**
 * Opening and closing a case-study modal from a card.
 *
 * `InspectionExperience` keeps its own copy of this because its open and close
 * also drive the hover recording, and folding those beats in here would make
 * the hook a two-caller abstraction with a branch for one of them. What is
 * shared is everything else: the morph, the no-morph exit animation, the
 * `?study=` deep link, and letting modified clicks stay ordinary clicks.
 */
export function useStudyModal(study: CaseStudy) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const openStudy = useCallback(async () => {
    if (!canMorph()) {
      setOpen(true);
      return;
    }
    // Decode the hero before the transition starts, or the modal's half of the
    // morph snapshots an empty frame. Hovering has usually done this already.
    //
    // A `live` hero is DOM rather than an image and has nothing to decode: it
    // is already painted by the time the transition takes its snapshot, so
    // waiting on its stand-in still would only delay the morph by a network
    // round trip for a file that surface never shows.
    if (study.hero && study.hero.kind !== "live") {
      await warm(heroStill(study.hero).src);
    }
    morph(() => setOpen(true));
  }, [study.hero]);

  const close = useCallback(() => {
    if (canMorph()) {
      morph(() => setOpen(false));
      return;
    }
    // No morph to play, so the modal animates itself out — otherwise closing
    // is an instant pop.
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
  }, []);

  // Arriving on a link the share button produced. A frame late on purpose:
  // hydration has to finish first.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("study");
    if (wanted !== study.slug) return;
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [study.slug]);

  /** Warms the hero so a click doesn't have to wait for it. */
  const prefetch = useCallback(() => {
    if (!study.hero || study.hero.kind === "live") return;
    warm(heroStill(study.hero).src);
  }, [study.hero]);

  /**
   * Click handler for the card's real `<a href="/work/...">`. The anchor stays
   * a genuine link — crawlers, middle-clicks and no-JS all get the route — and
   * only a plain left click is upgraded to the morph.
   */
  const onLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      void openStudy();
    },
    [openStudy],
  );

  return { open, closing, close, openStudy, onLinkClick, prefetch };
}
