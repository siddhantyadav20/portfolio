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
  focusQuietly(opener);
}

/**
 * Focus something without giving it a focus ring.
 *
 * Chrome scores a *programmatic* focus on a button as `:focus-visible`, which
 * is right for a keyboard user arriving and wrong for everyone else — open a
 * case study by tapping its card and the close button came up already ringed,
 * with nothing on the screen having been keyboarded at all.
 *
 * The suppression is scoped to exactly as long as focus sits where we put it:
 * `data-focus-restore` goes on before the focus and comes off the moment focus
 * moves, so tabbing back to the same control afterwards rings it normally. A
 * key press also clears it, so a keyboard user who arrives, presses Tab and
 * comes back has rings from the first keystroke rather than the first blur.
 *
 * See "Focus" in globals.css for the rule this attribute switches off.
 */
export function focusQuietly(el: HTMLElement | null | undefined) {
  if (!el?.focus) return;

  const clear = () => el.removeAttribute("data-focus-restore");
  el.setAttribute("data-focus-restore", "");
  el.addEventListener("blur", clear, { once: true });
  el.addEventListener("keydown", clear, { once: true });
  el.focus();
}

/**
 * Escape, when the thing you are escaping from is a half-written sentence.
 *
 * A case study carries a comment box, and closing the whole reader on the
 * first Escape would throw away whatever was typed into it with no warning and
 * no undo — the modal is portalled and unmounted, so the draft is simply gone.
 *
 * So the first Escape leaves the field and the second closes the reader, which
 * is what a text editor does and what the muscle memory expects. An *empty*
 * field is not worth the extra keystroke: there is nothing to lose, so Escape
 * closes as it always did.
 *
 * Lives here rather than in `ModalSurface`, which is where it was written and
 * is still its main caller, because the `/work/<slug>` route needs the same
 * rule and cannot import it out of a `"use client"` module that drags the
 * whole modal shell along. Pass it as `onEscape` below, or call it first from
 * a handler of your own — see `EscapeHome`.
 */
export function escapeFromField(): boolean {
  const el = document.activeElement;

  const editable =
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement &&
      !["button", "submit", "checkbox", "radio"].includes(el.type));

  if (!editable || !el.value.trim()) return false;

  el.blur();
  return true;
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
    /* Quietly: this fires on open, so on a tap it is a focus nobody asked
       for and a ring nobody earned. See `focusQuietly`. */
    focusQuietly(initialFocusRef?.current ?? first());

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
