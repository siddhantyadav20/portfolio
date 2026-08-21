"use client";

import { useCallback, useState } from "react";
import { useLazyStudyModal } from "@/components/home/CaseStudyModal/lazy";
import { EXIT_MS } from "@/components/primitives/ModalSurface";
import { heroStill, type CaseStudy } from "@/content/work";
import { canMorph, morph, warm } from "@/lib/viewTransition";
import { useStudyUrl } from "./useStudyUrl";

/**
 * Opening and closing a case-study modal from a card.
 *
 * `InspectionExperience` keeps its own copy of this because its open and close
 * also drive the hover recording, and folding those beats in here would make
 * the hook a two-caller abstraction with a branch for one of them. What is
 * shared is everything else: the morph, the no-morph exit animation, the
 * address bar (`useStudyUrl`), and letting modified clicks stay ordinary
 * clicks.
 */
export function useStudyModal(study: CaseStudy) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const { Modal, setModal, load, warmModal } = useLazyStudyModal(open);

  const openStudy = useCallback(async () => {
    // Resolved before anything else moves — see `useLazyStudyModal`. Hovering
    // has normally done this already; awaiting is the guarantee.
    const Loaded = await load();
    const update = () => {
      setModal(() => Loaded);
      setOpen(true);
    };
    if (!canMorph()) {
      update();
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
    morph(update);
  }, [study.hero, load, setModal]);

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

  // The address bar, in both directions: deep links and Back in, `/work/<slug>`
  // out. See `useStudyUrl` — the morph above is what this hook does not share.
  useStudyUrl(study.slug, open, setOpen);

  /** Warms the modal's code and its hero, so a click has nothing to wait for. */
  const prefetch = useCallback(() => {
    warmModal();
    if (!study.hero || study.hero.kind === "live") return;
    warm(heroStill(study.hero).src);
  }, [study.hero, warmModal]);

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

  return { Modal, open, closing, close, openStudy, onLinkClick, prefetch };
}
