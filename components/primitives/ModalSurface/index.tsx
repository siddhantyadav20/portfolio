"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./ModalSurface.module.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Must match the exit transition in ModalSurface.module.css. */
export const EXIT_MS = 240;

/**
 * The parts of the open/close transition that are choreographed against a
 * card's morph — their timings live in globals.css.
 *
 * Set inline by the consumer rather than in a module, because CSS Modules
 * scopes `view-transition-name` exactly as it scopes a class name: written in a
 * stylesheet, `modal-title` reaches the browser as
 * `Something-module__NKAC5q__modal-title` and every `::view-transition-*` rule
 * silently fails to match. Inline styles aren't scoped.
 *
 * Anything inside the overlay *without* a name of its own rides with the plate.
 * `plate` and `controls` are applied by this component; the three content names
 * are handed to whichever blocks a given modal wants staged, in reading order.
 */
export const MODAL_VT = {
  title: { viewTransitionName: "modal-title" },
  body: { viewTransitionName: "modal-body" },
  meta: { viewTransitionName: "modal-meta" },
} as const;

/** The glass disc the close button wears. Exported so a modal's own actions —
 *  Share, and whatever comes after it — can match it without redeclaring it. */
export const modalAction = styles.action;

/**
 * Hand focus back to whatever opened the modal, without drawing a focus ring
 * around it.
 *
 * The ring is the bug: close with Escape and the browser's `:focus-visible`
 * heuristic sees a keypress as the last input, so restoring focus to the card
 * paints an orange outline around a card nobody is navigating to. Blanket-
 * suppressing the outline on the card would fix it by removing the indicator
 * for keyboard users too, which is the wrong trade.
 *
 * So the suppression is scoped to this one restore: `data-focus-restore` is set
 * for exactly as long as focus sits where we put it, and is dropped the moment
 * focus moves on. Tab back to the card afterwards and the ring is there.
 */
function restoreFocus(opener: HTMLElement | null) {
  if (!opener?.focus) return;

  opener.setAttribute("data-focus-restore", "");
  opener.addEventListener(
    "blur",
    () => opener.removeAttribute("data-focus-restore"),
    { once: true },
  );
  opener.focus();
}

type Props = {
  open: boolean;
  /** Playing the exit animation — only ever true on the no-morph path. */
  closing?: boolean;
  onClose: () => void;
  /** Announced as the dialog's name. */
  label: string;
  /** Controls placed left of the close button — the theme toggle, Share, etc. */
  actions?: ReactNode;
  /**
   * Which text-selection tint this reader carries. Omitted, it keeps the
   * homepage's orange — see "Selection" in globals.css.
   */
  selectionTint?: "violet" | "green";
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
  selectionTint,
  children,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Whatever launched the modal gets focus back when it closes.
    const opener = document.activeElement as HTMLElement | null;
    const body = document.body;
    const scrollLock = body.style.overflow;
    body.style.overflow = "hidden";

    // ProximityField watches for this and stops writing transforms to the cards
    // behind us — they're invisible under an opaque overlay, and a card still
    // easing when the closing snapshot is taken drags on the morph back.
    document.documentElement.setAttribute("data-modal-open", "");

    closeRef.current?.focus();

    // One frame late, so the browser has a painted "before" to transition from.
    // Written to the DOM rather than to state: it is a purely visual flag, and
    // a second render pass to flip a class the CSS is already watching for
    // would buy nothing.
    const raf = requestAnimationFrame(() =>
      overlayRef.current?.setAttribute("data-enter", ""),
    );

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      // Focus containment: Tab off either end wraps to the other.
      const root = overlayRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.removeAttribute("data-modal-open");
      body.style.overflow = scrollLock;
      restoreFocus(opener);
    };
  }, [open, onClose]);

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
    >
      {/* Deliberately unnamed for the view transition. `view-transition-name`
          makes an element a backdrop root, and every control in here is
          `.liquid` — whose frost is a `backdrop-filter`, which inside a
          backdrop root has nothing behind it to filter. Named, the cluster sat
          over the case study's hero photograph with no blur at all. See the
          note beside `::view-transition-group(*)` in globals.css. */}
      <div className={styles.controls}>
        {actions}

        <button
          ref={closeRef}
          type="button"
          className={`${styles.action} liquid`}
          onClick={onClose}
        >
          <span className={`${styles.bar} ${styles.barBack}`} />
          <span className={`${styles.bar} ${styles.barForward}`} />
          <span className="srOnly">Close</span>
        </button>
      </div>

      {children}
    </div>,
    document.body,
  );
}
