"use client";

import { useCallback, useEffect, useState } from "react";
import type CaseStudyModal from "./index";

type StudyModal = typeof CaseStudyModal;

/**
 * Fetching the case-study modal only once something wants to open one.
 *
 * Three homepage cards imported this modal at the top of the file, and it does
 * not arrive alone — `DeviceMockup` and `PrototypeScreen` (which hosts the
 * 8.7MB prototype recording), `StudyLiveBlock`, `StudySections` and the whole
 * theming specimen came with it. None of that can render until a visitor asks
 * for a study, and all of it was in the homepage's first load.
 *
 * A plain dynamic `import()` rather than `next/dynamic`, for the reason
 * `CanvasCard` writes out at its own loader: the morph needs the module
 * *resolved* before `startViewTransition` runs, and awaiting a promise is the
 * only way to be sure of that. A Suspense fallback would be what got
 * snapshotted.
 *
 * `import type` above is erased at compile time, so naming the component for
 * the type checker does not put it back in the bundle.
 */
export function useLazyStudyModal(open: boolean) {
  const [Modal, setModal] = useState<StudyModal | null>(null);

  const load = useCallback(
    async (): Promise<StudyModal> => (await import("./index")).default,
    [],
  );

  /**
   * The paths to `open` that never touched the card: a shared `/work/<slug>`
   * link, and the Back button. Neither has a transition to keep, so they can
   * ask for the module once they are already open and paint a beat later —
   * without this they set `open` and nothing appeared.
   */
  useEffect(() => {
    if (!open || Modal) return;
    let cancelled = false;
    void load().then((Component) => {
      if (!cancelled) setModal(() => Component);
    });
    return () => {
      cancelled = true;
    };
  }, [open, Modal, load]);

  /** Hovering a card. Mounting it closed costs nothing — `ModalSurface`
   *  returns null until `open` — and it means the click has nothing to wait
   *  for. */
  const warmModal = useCallback(() => {
    void load().then((Component) => setModal(() => Component));
  }, [load]);

  return { Modal, setModal, load, warmModal };
}
