"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import GlassAction, { CloseGlyph } from "@/components/primitives/GlassAction";
import { escapeFromField, useModalShell } from "@/lib/modalShell";
import styles from "./ModalSurface.module.css";

/* `EXIT_MS` and `MODAL_VT` used to live here and now live in
   `lib/viewTransition.ts`, alongside the rest of the morph's vocabulary —
   `StudyReader` needs the names and also renders on a server route, which
   cannot import them out of a `"use client"` module without dragging the
   whole shell along. Re-exported so the existing callers are unchanged. */
export { EXIT_MS, MODAL_VT } from "@/lib/viewTransition";

type Props = {
  open: boolean;
  /** Playing the exit animation — only ever true on the no-morph path. */
  closing?: boolean;
  onClose: () => void;
  /** Announced as the dialog's name. */
  label: string;
  /** Controls placed left of the close button — the theme toggle, and
   *  whatever else a given reader puts beside it. */
  actions?: ReactNode;
  /** The cluster in the *opposite* corner — Figma puts Share at top left. */
  leading?: ReactNode;
  /**
   * Which text-selection tint this reader carries. Omitted, it keeps the
   * homepage's orange — see "Selection" in globals.css.
   */
  selectionTint?: "green";
  /**
   * Which accent the surface inside is drawn in. Omitted, it keeps the
   * homepage's orange — see "Accent themes" in globals.css.
   *
   * Set on the overlay rather than on the reader, so the plate's own controls
   * are in the theme too and the page behind the modal is not: a case study
   * and the homepage it opened from are on screen at the same time, and only
   * one of them is blue.
   */
  accent?: "blue" | "rose";
  children: ReactNode;
};

/**
 * The full-bleed reader every modal on the site is built in.
 *
 * A modal rather than a route because it opens over the composition it was
 * launched from and returns you to exactly that scroll position. It is
 * portalled to <body> so no card's `overflow: hidden` or transform can clip or
 * contain it, and it deliberately does *not* use <dialog>: elements in the
 * browser's top layer paint above every fixed element on the page including
 * CanvasCursor, and with `cursor: none` set globally that would leave the modal
 * with no visible pointer. The three things <dialog> would have given us for
 * free — Escape, focus containment, focus restore — are done by hand below.
 */
export default function ModalSurface({
  open,
  closing = false,
  onClose,
  label,
  actions,
  leading,
  selectionTint,
  accent,
  children,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape, the Tab trap, initial focus, the scroll lock and the restore —
  // all of it shared with the canvas overlay now. See `lib/modalShell`.
  useModalShell({
    active: open,
    rootRef: overlayRef,
    onClose,
    initialFocusRef: closeRef,
    onEscape: escapeFromField,
  });

  useEffect(() => {
    if (!open) return;

    // ProximityField watches for this and stops writing transforms to the cards
    // behind us — they're invisible under an opaque overlay, and a card still
    // easing when the closing snapshot is taken drags on the morph back.
    document.documentElement.setAttribute("data-modal-open", "");

    /* And the page behind goes `inert`.
       The modal renders its own <h1> and portals it to <body>, alongside the
       homepage's — so with a case study open a screen reader could reach two
       first-level headings and the whole page under the overlay. `inert` takes
       the lot out of the accessibility tree and the tab order in one attribute,
       which is also a second belt on the focus trap. Not on <body>, which
       would include the modal: on the page's own root, which is its sibling. */
    const page = document.getElementById("main");
    page?.setAttribute("inert", "");

    // One frame late, so the browser has a painted "before" to transition from.
    // Written to the DOM rather than to state: it is a purely visual flag, and
    // a second render pass to flip a class the CSS is already watching for
    // would buy nothing.
    const raf = requestAnimationFrame(() =>
      overlayRef.current?.setAttribute("data-enter", ""),
    );

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.removeAttribute("data-modal-open");
      page?.removeAttribute("inert");
    };
  }, [open]);

  // Nothing to portal into during SSR — and nothing to portal, since `open`
  // starts false and only a click can flip it.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      style={{ viewTransitionName: "modal-plate" }}
      {...(closing ? { "data-exit": "" } : {})}
      {...(selectionTint ? { "data-selection": selectionTint } : {})}
      {...(accent ? { "data-accent": accent } : {})}
    >
      {/* Both clusters are deliberately unnamed for the view transition.
          `view-transition-name` makes an element a backdrop root, and every
          control in them is `.liquid` — whose frost is a `backdrop-filter`,
          which inside a backdrop root has nothing behind it to filter. Named,
          the cluster sat over the case study's hero photograph with no blur at
          all. See the note beside `::view-transition-group(*)` in
          globals.css. */}
      {leading && <div className={styles.leading}>{leading}</div>}

      <div className={styles.controls}>
        {actions}

        <GlassAction ref={closeRef} label="Close" onClick={onClose}>
          <CloseGlyph />
        </GlassAction>
      </div>

      {children}
    </div>,
    document.body,
  );
}
