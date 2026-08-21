"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * What Tab is allowed to land on inside a trapped surface.
 *
 * The form fields are not hypothetical padding: the canvas Terminal is a real
 * prompt, and the first version of this list — written when the only trapped
 * surfaces were the two case-study modals, neither of which has an input —
 * stepped straight over it.
 */
export const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Hand focus back to whatever opened the surface.
 *
 * The ring is the bug this guards against: close with Escape and the browser's
 * `:focus-visible` heuristic sees a keypress as the last input, so restoring
 * focus paints a focus state on a control nobody is navigating to. Blanket-
 * suppressing it on that control would remove the indicator for keyboard users
 * too, which is the wrong trade.
 *
 * So the suppression is scoped to this one restore: `data-focus-restore` is set
 * for exactly as long as focus sits where we put it, and dropped the moment
 * focus moves on. Tab back afterwards and the ring is there. See "Focus" in
 * globals.css.
 */
export function restoreFocus(opener: HTMLElement | null) {
  if (!opener?.focus) return;

  opener.setAttribute("data-focus-restore", "");
  opener.addEventListener(
    "blur",
    () => opener.removeAttribute("data-focus-restore"),
    { once: true },
  );
  opener.focus();
}

type Options = {
  /** Whether the surface is currently open. */
  active: boolean;
  /** The element Tab is confined to. */
  rootRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Focused when the surface opens. Falls back to the first focusable child. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * A chance to answer Escape first. Return true to say "handled, leave the
   * surface open" — a nested sheet closing itself, or a text field giving up
   * focus before the surface gives up existence.
   */
  onEscape?: () => boolean;
};

/**
 * Everything a surface that covers the page owes the keyboard.
 *
 * Extracted from `ModalSurface`, which had all of it and still does. The
 * canvas overlay had none of it: no focus trap, so Tab walked out of the
 * canvas and into the homepage still sitting underneath; nothing focused on
 * open; no restore to the card on close; and no scroll lock, so the page
 * behind it scrolled. It is the largest surface on the site and it was the
 * least navigable.
 *
 * Deliberately not `<dialog>`, for the reason `ModalSurface` records: its top
 * layer sits outside the view transition, and the morph is most of the point.
 */
export function useModalShell({
  active,
  rootRef,
  onClose,
  initialFocusRef,
  onEscape,
}: Options) {
  /**
   * The callbacks are held in refs so the effect below can depend on `active`
   * alone.
   *
   * This is not a micro-optimisation. `onEscape` legitimately closes over
   * state — the canvas rebuilds it whenever its shortcuts sheet opens — and
   * with the callbacks in the dependency array that made the whole shell tear
   * down and re-initialise on every toggle: the cleanup handed focus back to
   * the opener and the setup then grabbed it again, so opening the sheet stole
   * focus and the sheet's own Escape handler was registered against stale
   * state. Setup and teardown must happen when the surface opens and closes,
   * and at no other time.
   */
  const handlers = useRef({ onClose, onEscape });
  // Written in an effect, not during render — assigning to `.current` while
  // rendering is the thing React 19 flags, and this runs before any keydown
  // can reach the listener registered below.
  useEffect(() => {
    handlers.current = { onClose, onEscape };
  }, [onClose, onEscape]);

  useEffect(() => {
    if (!active) return;

    const opener = document.activeElement as HTMLElement | null;
    const body = document.body;
    const scrollLock = body.style.overflow;
    body.style.overflow = "hidden";

    const root = rootRef.current;
    const first = () =>
      root?.querySelector<HTMLElement>(FOCUSABLE) ?? undefined;
    (initialFocusRef?.current ?? first())?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (handlers.current.onEscape?.()) return;
        e.preventDefault();
        handlers.current.onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const el = rootRef.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;

      const head = items[0];
      const tail = items[items.length - 1];
      const at = document.activeElement;

      // Tab off either end wraps to the other, and focus that has escaped the
      // surface entirely is pulled back in rather than left outside.
      if (e.shiftKey && (at === head || !el.contains(at))) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && (at === tail || !el.contains(at))) {
        e.preventDefault();
        head.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = scrollLock;
      restoreFocus(opener);
    };
  }, [active, rootRef, initialFocusRef]);
}
