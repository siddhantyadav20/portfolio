"use client";

import { useCallback, useEffect, useState } from "react";
import { exitMs } from "@/components/primitives/ModalSurface";
import { MAKING_OPEN } from "@/lib/making";
import { canMorph, morph } from "@/lib/viewTransition";
import styles from "./SiteFooter.module.css";

/* ===========================================================================
   The colophon, and the only way into it.

   This link has been in the footer since the first build, `aria-disabled`
   against a null `footer.makingOf`, waiting for something to point at. It is
   now the whole entry point — there is no card.

   THE CARD IS GONE ON PURPOSE. It had a full-width row of its own above the
   footer, and a row is a claim: the homepage's cards are ways into the work,
   and how the site was built is not the work. Given a band the width of the
   page it sat between the personality cards and the footer arguing for its own
   importance, one scroll after a case study with real users behind it. A line
   in the footer is the correct weight for a colophon, which is where colophons
   have always been, and it is the same reader either way.

   THE READER IS OWNED HERE rather than by a host somewhere in the page. It is
   the only thing that opens it, so there is nothing to coordinate — and the
   alternative was a headless component mounted in `app/page.tsx` whose entire
   job was to hold state for this button.

   A `<button>`, not an anchor. There is no href that would survive a
   middle-click or a new tab, and an anchor that lies about that is worse than
   a button that does not pretend. ⌘K reaches the same reader through
   `lib/making`, and that is not a link either.

   Rendered only where the homepage asks for it. `SiteFooter` also draws inside
   the About reader, and a second full-screen modal over the first would leave
   two shells both claiming Escape and both clearing `data-modal-open` on the
   way out — so that footer keeps the inert placeholder. See `SiteFooter`.
   =========================================================================== */

/**
 * The reader, on demand.
 *
 * Four drawings, a `LogoMark` and their stylesheet, none of which can render
 * until somebody presses this — and all of which would otherwise be in the
 * homepage's first load. Same shape as `CaseStudyModal/lazy.ts` and
 * `CanvasCard`: a plain dynamic `import()` rather than `next/dynamic`, because
 * the transition needs the module *resolved* before `startViewTransition`
 * runs, and awaiting a promise is the only way to be sure of that. A Suspense
 * fallback would be what got snapshotted.
 *
 * `import type` is erased at compile time, so naming the component for the
 * type checker does not put it back in the bundle.
 */
type Reader = typeof import("@/components/home/MakingModal").default;
const loadReader = async (): Promise<Reader> =>
  (await import("@/components/home/MakingModal")).default;

/**
 * The words you press, named so the reader can grow out of them.
 *
 * This surface used to be the one exception on the site: no card to come from,
 * so it called `morph()` with no name and got the generic `modal-plate` scale
 * — a different animation from the four cards, on a different clock, for the
 * same gesture. Naming the button makes it the same move as everything else.
 * Nothing about the button changes at rest; a `view-transition-name` is inert
 * until a transition starts.
 */
const COLOPHON_MORPH = "colophon-frame";

export default function ColophonLink() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [Reader, setReader] = useState<Reader | null>(null);
  /* Which door was used. ⌘K opens this with nothing on screen to have come
     from, and a name that exists on only one side of a transition is a group
     the browser has to invent an arrival for — so that door stays unnamed and
     keeps the plate it always had. */
  const [morphed, setMorphed] = useState(false);

  const openReader = useCallback(async (from?: Element | null) => {
    const Loaded = await loadReader();
    const update = () => {
      setReader(() => Loaded);
      setOpen(true);
    };
    /* Still a `morph`, even though there is no card left to morph out of.

       `ModalSurface`'s stylesheet turns its own entry transition off wherever
       view transitions exist, on the assumption that a morph is playing
       instead — so calling `setOpen` directly here would make the reader
       appear in one frame with no animation at all in Chrome. With nothing
       carrying the plate's name on the old side, the browser plays the
       default arrival for that group, which is the cross-fade this wants. */
    if (!canMorph()) {
      update();
      return;
    }
    setMorphed(Boolean(from));
    morph(update, {
      name: from ? COLOPHON_MORPH : undefined,
      from,
      dir: "in",
    });
  }, []);

  const close = useCallback(() => {
    if (canMorph()) {
      morph(() => setOpen(false), {
        name: morphed ? COLOPHON_MORPH : undefined,
        dir: "out",
      });
      return;
    }
    // No transition to play, so the reader animates itself out — otherwise
    // closing is an instant pop. Same shape as `useStudyModal`.
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, exitMs());
  }, [morphed]);

  // ⌘K's way in — see `lib/making`. The palette and this button are the two
  // doors, and neither knows about the other.
  useEffect(() => {
    const onAsk = () => void openReader();
    window.addEventListener(MAKING_OPEN, onAsk);
    return () => window.removeEventListener(MAKING_OPEN, onAsk);
  }, [openReader]);

  /** Hovering. Mounting it closed costs nothing — `ModalSurface` returns null
   *  until `open` — and the click then has nothing to wait for. */
  const warm = useCallback(() => {
    void loadReader().then((Component) => setReader(() => Component));
  }, []);

  return (
    <>
      <button
        type="button"
        className={styles.making}
        style={open ? undefined : { viewTransitionName: COLOPHON_MORPH }}
        onClick={(e) => void openReader(e.currentTarget)}
        onPointerEnter={warm}
        onFocus={warm}
        aria-haspopup="dialog"
      >
        How I made this portfolio?
      </button>

      {Reader && (
        <Reader
          open={open}
          closing={closing}
          onClose={close}
          morphName={morphed ? COLOPHON_MORPH : undefined}
        />
      )}
    </>
  );
}
