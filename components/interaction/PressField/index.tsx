"use client";

import { useEffect } from "react";
import { PRESS, RELEASE_EASE, pressScale } from "@/lib/press";

/** Opt-in, per element. See the note on the component. */
const PRESSABLE = "[data-press]";

/**
 * Everything you can press gives under the press.
 *
 * Before this, nothing on the site answered a finger. A card went straight
 * from its hover to its morph, and a pill's `:active` only took back the
 * 1.5% its hover had added — so the moment of committing to something, which
 * is the moment an interface most needs to say "got it", was the one moment
 * nothing moved. iOS answers it on every cell and every button, and the
 * App Store's cards are the reference for what happens next: the card is
 * pushed down, and the expansion starts *from the pushed card*. That is what
 * happens here too, for free — the click lands while the surface is still
 * down, and `morph()` snapshots it there.
 *
 * ONE LISTENER FOR THE WHOLE SITE rather than a handler per component: an
 * element opts in with `data-press` and this does the rest, the same contract
 * `CanvasCursor` uses for its variants. The depth is computed per element from
 * its size — see `lib/press.ts` for why it is pixels and not percent.
 *
 * DRIVEN THROUGH WEB ANIMATIONS, ON THE `scale` PROPERTY, and both halves of
 * that matter. `scale` is separate from `transform`, which the proximity field
 * writes every frame, the pills scale on hover, and the arrival animates — so
 * a press composes with all of them instead of replacing them. And a Web
 * Animation is separate from CSS `transition`, which is one property per
 * element: declaring `transition: scale` anywhere would silently delete
 * whatever transition list the element already had. Nothing here touches a
 * stylesheet.
 *
 * What it does NOT do: take over controls that already answer a press in
 * their own way (the theme toggle's stretching pill, the music transport, the
 * phone keypad), or anything on the canvas, where a press is the start of a
 * drag. Those simply do not opt in.
 */
export default function PressField() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const running = new WeakMap<Element, Animation>();

    function current(el: HTMLElement) {
      const s = getComputedStyle(el).scale;
      const v = parseFloat(s);
      return Number.isFinite(v) ? v : 1;
    }

    function animate(el: HTMLElement, to: number, ms: number, easing: string) {
      /* Read before cancelling: the computed value is wherever the previous
         animation has got to, which is where this one has to start from or a
         press interrupted mid-release would jump. */
      const from = current(el);
      running.get(el)?.cancel();
      const anim = el.animate([{ scale: `${from}` }, { scale: `${to}` }], {
        duration: ms,
        easing,
        fill: "forwards",
      });
      running.set(el, anim);
      if (to === 1) {
        /* Back at rest, let go of the property entirely. A finished animation
           with `fill: forwards` would otherwise hold `scale: 1` over the
           element for the rest of the page's life. */
        anim.finished.then(
          () => {
            if (running.get(el) !== anim) return;
            anim.cancel();
            running.delete(el);
          },
          () => {},
        );
      }
    }

    const down = (el: HTMLElement) =>
      animate(el, pressScale(el.offsetWidth, el.offsetHeight), PRESS.inMs, PRESS.inEase);
    const up = (el: HTMLElement) => animate(el, 1, PRESS.outMs, RELEASE_EASE);

    const usable = (el: HTMLElement) =>
      !reduced.matches &&
      !el.matches(":disabled, [aria-disabled='true']");

    /* --- Pointer -------------------------------------------------------- */

    type Press = {
      el: HTMLElement;
      id: number;
      x: number;
      y: number;
      touch: boolean;
      /** Whether the surface is currently down. */
      held: boolean;
      /** The pending touch hold, if the finger has not earned a press yet. */
      wait: number;
    };
    let press: Press | null = null;

    function abandon() {
      if (!press) return;
      clearTimeout(press.wait);
      if (press.held) up(press.el);
      press = null;
    }

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>(PRESSABLE)
          : null;
      if (!el || !usable(el)) return;

      abandon();
      const touch = e.pointerType !== "mouse";
      const p: Press = {
        el,
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        touch,
        held: false,
        wait: 0,
      };
      press = p;

      if (touch) {
        p.wait = window.setTimeout(() => {
          if (press !== p) return;
          p.wait = 0;
          p.held = true;
          down(el);
        }, PRESS.touchHoldMs);
      } else {
        p.held = true;
        down(el);
      }
    }

    function onMove(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;

      if (p.touch) {
        // A finger that travels was scrolling, not pressing.
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > PRESS.slop) abandon();
        return;
      }

      /* A mouse dragged off a pressed surface lets it back up, and dragging
         back on presses it again — the way every native button behaves, and
         the honest answer to "will letting go here do anything?" */
      const inside = e.target instanceof Node && p.el.contains(e.target);
      if (inside === p.held) return;
      p.held = inside;
      if (inside) down(p.el);
      else up(p.el);
    }

    function onUp(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      press = null;

      if (p.held) {
        up(p.el);
        return;
      }
      /* A tap quicker than the hold still earns its answer — compressed into
         one short dip — rather than a tap that visibly did nothing. */
      if (p.touch && p.wait) {
        clearTimeout(p.wait);
        down(p.el);
        window.setTimeout(() => up(p.el), PRESS.tapMs);
      }
    }

    /* --- Keyboard -------------------------------------------------------
       Space and Enter press a focused surface as surely as a finger does, and
       deserve the same answer. Only when the focused element is itself the
       pressable one: a key typed into a field inside a card is not a press
       of the card. */
    let keyed: HTMLElement | null = null;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (!el || !el.matches(PRESSABLE) || !usable(el)) return;
      if (keyed && keyed !== el) up(keyed);
      keyed = el;
      down(el);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!keyed || (e.key !== " " && e.key !== "Enter")) return;
      up(keyed);
      keyed = null;
    }

    function onBlur() {
      abandon();
      if (keyed) up(keyed);
      keyed = null;
    }

    /* Capture, so a component that stops propagation for its own reasons
       cannot leave a surface stuck down. All passive: this never prevents
       anything, it only watches. */
    const opts = { capture: true, passive: true } as const;
    document.addEventListener("pointerdown", onDown, opts);
    document.addEventListener("pointermove", onMove, opts);
    document.addEventListener("pointerup", onUp, opts);
    document.addEventListener("pointercancel", abandon, opts);
    document.addEventListener("keydown", onKeyDown, opts);
    document.addEventListener("keyup", onKeyUp, opts);
    window.addEventListener("blur", onBlur);

    return () => {
      onBlur();
      document.removeEventListener("pointerdown", onDown, opts);
      document.removeEventListener("pointermove", onMove, opts);
      document.removeEventListener("pointerup", onUp, opts);
      document.removeEventListener("pointercancel", abandon, opts);
      document.removeEventListener("keydown", onKeyDown, opts);
      document.removeEventListener("keyup", onKeyUp, opts);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return null;
}
