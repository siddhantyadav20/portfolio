"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ===========================================================================
   Tuning — everything you'd want to change lives here.
   =========================================================================== */

/** How close (px) the cursor gets to a card's edge before it starts responding. */
export const CARD_PROXIMITY = 12;

/** Scale gained by the card the cursor is on, at full strength. */
const LIFT = 0.022;

/** How far (px) a neighbouring card yields away from the cursor. */
const YIELD_PUSH = 24;

/** Scale a neighbouring card gives up as it yields. */
const YIELD_SHRINK = 0.01;

/** Radius (px) over which neighbours feel the cursor at all. Wide enough that
 *  the composition reads as redistributing rather than one tile reacting. */
const FALLOFF_RADIUS = 900;

/** Per-frame easing toward the target. Lower = slower, heavier settle. */
const EASE = 0.13;

/** Below this, treat the card as settled and stop animating it. */
const EPSILON = 0.0015;

/* =========================================================================== */

type CardState = {
  el: HTMLElement;
  /** Page-space rect, measured at rest. */
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
  /* current + target transform */
  x: number;
  y: number;
  s: number;
  tx: number;
  ty: number;
  ts: number;
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Distance from a point to a rectangle; 0 when the point is inside. */
function distanceToRect(
  px: number,
  py: number,
  l: number,
  t: number,
  r: number,
  b: number,
) {
  const dx = Math.max(l - px, 0, px - r);
  const dy = Math.max(t - py, 0, py - b);
  return Math.hypot(dx, dy);
}

/**
 * Makes the composition respond to the cursor as a whole rather than
 * highlighting one card at a time.
 *
 * Each card gets an influence value from its distance to the pointer. The card
 * under the cursor gains a little scale; every card within the falloff radius
 * yields away from the cursor, by less the further out it sits. The result
 * redistributes the grid instead of enlarging one tile.
 *
 * Deliberately outside React's render path: pointer moves write CSS custom
 * properties straight onto the card elements inside a rAF loop, so nothing
 * re-renders and the layout itself never recalculates (transforms only).
 */
export default function ProximityField({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Pointer-driven and motion-sensitive: skip entirely where it doesn't belong.
    const finePointer = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reduced.matches) return;

    let cards: CardState[] = [];
    let pointerX = 0;
    let pointerY = 0;
    let pointerInside = false;
    let frame = 0;
    let running = false;

    function measure() {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      cards = Array.from(
        root!.querySelectorAll<HTMLElement>("[data-prox-card]"),
      ).map((el) => {
        // Neutralise any in-flight transform so we measure the resting box.
        el.style.setProperty("--prox-x", "0px");
        el.style.setProperty("--prox-y", "0px");
        el.style.setProperty("--prox-s", "1");
        const r = el.getBoundingClientRect();
        return {
          el,
          left: r.left + scrollX,
          top: r.top + scrollY,
          right: r.right + scrollX,
          bottom: r.bottom + scrollY,
          cx: r.left + scrollX + r.width / 2,
          cy: r.top + scrollY + r.height / 2,
          x: 0,
          y: 0,
          s: 1,
          tx: 0,
          ty: 0,
          ts: 1,
        };
      });
    }

    function computeTargets() {
      if (!pointerInside) {
        for (const c of cards) {
          c.tx = 0;
          c.ty = 0;
          c.ts = 1;
        }
        return;
      }

      // `own` is only non-zero for the card the cursor is on or approaching.
      let engage = 0;
      const own = new Float32Array(cards.length);

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const d = distanceToRect(
          pointerX,
          pointerY,
          c.left,
          c.top,
          c.right,
          c.bottom,
        );
        own[i] = clamp01(1 - d / CARD_PROXIMITY);
        if (own[i] > engage) engage = own[i];
      }

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const dx = c.cx - pointerX;
        const dy = c.cy - pointerY;
        const dist = Math.hypot(dx, dy) || 1;
        const near = smoothstep(clamp01(1 - dist / FALLOFF_RADIUS));

        // The active card yields less than its neighbours — it's the one
        // gaining space, not making it.
        const yield_ = near * engage * (1 - own[i] * 0.5);

        c.tx = (dx / dist) * YIELD_PUSH * yield_;
        c.ty = (dy / dist) * YIELD_PUSH * yield_;
        c.ts = 1 + LIFT * own[i] - YIELD_SHRINK * yield_ * (1 - own[i]);
      }
    }

    function tick() {
      computeTargets();

      let moving = false;
      for (const c of cards) {
        c.x += (c.tx - c.x) * EASE;
        c.y += (c.ty - c.y) * EASE;
        c.s += (c.ts - c.s) * EASE;

        if (
          Math.abs(c.tx - c.x) > EPSILON ||
          Math.abs(c.ty - c.y) > EPSILON ||
          Math.abs(c.ts - c.s) > EPSILON
        ) {
          moving = true;
        } else {
          c.x = c.tx;
          c.y = c.ty;
          c.s = c.ts;
        }

        c.el.style.setProperty("--prox-x", `${c.x.toFixed(2)}px`);
        c.el.style.setProperty("--prox-y", `${c.y.toFixed(2)}px`);
        c.el.style.setProperty("--prox-s", c.s.toFixed(4));
      }

      if (moving || pointerInside) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    }

    function start() {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      pointerX = e.clientX + window.scrollX;
      pointerY = e.clientY + window.scrollY;
      pointerInside = true;
      start();
    }

    function onPointerLeave() {
      pointerInside = false;
      start();
    }

    let resizeTimer = 0;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 150);
    }

    measure();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("resize", onResize);

    // Fonts and images settle after first paint; re-measure once they have.
    const onLoad = () => measure();
    window.addEventListener("load", onLoad);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onLoad);
      for (const c of cards) {
        c.el.style.removeProperty("--prox-x");
        c.el.style.removeProperty("--prox-y");
        c.el.style.removeProperty("--prox-s");
      }
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
