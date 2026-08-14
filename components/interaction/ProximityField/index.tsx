"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  arrived,
  chan,
  clamp01,
  frameDelta,
  omegaFor,
  settle,
  type Channel,
} from "@/lib/spring";

/* ===========================================================================
   Tuning — everything you'd want to change lives here.

   The numbers below were read off the reference screenshots rather than
   guessed. With the large left card hovered, its neighbours had yielded by:

       gap 41px  -> 13.5px      gap 255px -> 5.5px      gap 465px -> 0px

   which is a straight line through 15px at zero gap, reaching zero at 400px.
   The active card itself measured 381.5px wide at rest and 389px hovered.
   =========================================================================== */

/** How close (px) the cursor gets to a card's edge before the page reacts. */
const PROXIMITY_RANGE = 32;

/** Fraction of the full yield earned by merely approaching a card.
 *  Entering it takes the yield the rest of the way to 1. */
const PROXIMITY_LEVEL = 0.45;

/** How far the whole composition draws in on itself once a card is approached,
 *  as a fraction of each card's distance from the composition's centre. This is
 *  the "let's interact with these" gesture: the page gathers, everything moving
 *  a little closer together, before any one card is singled out.
 *
 *  0.014 is the reference's own figure — its band measured 1228.5px wide at
 *  rest and 1211.5px on approach, and the top row dropping 12px against a
 *  centre ~875px below it agrees on the same number from the other axis. */
const CONTRACT = 0.014;

/** How much of that gathering is held once the cursor is actually on a card.
 *  The reference lets roughly half of it go — the page pulls in as you approach,
 *  then opens back up around the card you commit to. 1 would hold it all. */
const FOCUS_CONTRACT = 0.55;

/** Scale the hovered card gains. Measured 389 / 381.5 = 1.0197. */
const LIFT = 0.02;

/** How far (px) a card yields when it sits flush against the active card. */
const YIELD = 15;

/** Gap (px) over which that yield decays to nothing. Cards further from the
 *  active card than this are left exactly where the design put them. */
const YIELD_FALLOFF = 400;

/* --- Motion ----------------------------------------------------------------
   Settling times in milliseconds — roughly how long a channel takes to arrive
   after its target jumps. Real time, not frames: the previous per-frame
   constant made the whole interaction run at double speed on a 120Hz display
   and a third again on a 60Hz external monitor.

   The three layers deliberately do not share a tempo. The gather is heavy
   because it is the page as a whole answering; the lift is quick because it is
   the direct answer to the cursor. That gap is what makes the gather legible:
   being slow, it is still travelling once the cursor has landed on the card, so
   it plays out underneath the hover rather than having to finish inside the
   32px approach.

   Releases are slower than engagements throughout. Exits should settle, not
   snap, and the slower unwind gives the gesture a second, calmer reading.
   --------------------------------------------------------------------------- */

const GATHER_SETTLE = 380;
const YIELD_SETTLE = 220;
const LIFT_SETTLE = 170;

const GATHER_RELEASE = 620;
const YIELD_RELEASE = 420;
const LIFT_RELEASE = 260;

/** Per-card multiplier on the gather's settling time, by how far out the card
 *  sits. Outer elements lead and inner ones follow by a hair, so the
 *  composition has some give instead of moving like a single plate. Kept
 *  narrow on purpose — this should still read as one thing closing up, not as
 *  a ripple. */
const GIVE_OUTER = 0.88;
const GIVE_INNER = 1.15;

/** Below these — and with the channel almost stationary — treat it as arrived. */
const EPS_PX = 0.02;
const EPS_SCALE = 0.0002;
const EPS_VEL = 0.5;

/* =========================================================================== */

type Card = {
  el: HTMLElement;
  /** Passive cards are carried by the composition but never become active. */
  passive: boolean;
  /* Resting page-space rect. */
  l: number;
  t: number;
  r: number;
  b: number;
  cx: number;
  cy: number;
  area: number;
  /** Multiplier on this card's gather settling time — its share of the give. */
  give: number;

  /* The two layers are smoothed apart and summed only at write time, which is
     what lets the heavy gather lag behind the quick yield. */
  gx: Channel;
  gy: Channel;
  yx: Channel;
  yy: Channel;
  sc: Channel;

  /* Targets, in the same two buckets. */
  tgx: number;
  tgy: number;
  tyx: number;
  tyy: number;
  ts: number;
};

/** Distance from a point to a rectangle; 0 when the point is inside it. */
function pointToRect(px: number, py: number, c: Card) {
  const dx = Math.max(c.l - px, 0, px - c.r);
  const dy = Math.max(c.t - py, 0, py - c.b);
  return Math.hypot(dx, dy);
}

/**
 * Signed gap from rect `a` to rect `b`, per axis. An axis reads 0 when the two
 * rects overlap along it.
 *
 * This is what makes the response follow the *layout* rather than raw distance.
 * Two cards sitting side by side in the same row overlap vertically, so their
 * separation is purely horizontal and the yield is purely horizontal too — the
 * neighbour slides straight out of the way instead of drifting diagonally
 * toward wherever the cursor happens to be.
 */
function rectSeparation(a: Card, b: Card) {
  const dx = b.l > a.r ? b.l - a.r : b.r < a.l ? b.r - a.l : 0;
  const dy = b.t > a.b ? b.t - a.b : b.b < a.t ? b.b - a.t : 0;
  return { dx, dy };
}

/**
 * Proximity-triggered spatial re-composition.
 *
 * Three states, and nothing in between them is driven by the cursor's position:
 *
 *   RESTING    no card within PROXIMITY_RANGE. Every transform is identity and
 *              the page is exactly the Figma composition.
 *   PROXIMITY  the cursor is within PROXIMITY_RANGE of one card's edge. The
 *              whole composition gathers — every card drawing a little closer
 *              to the centre — and the approached card's neighbours begin to
 *              yield at PROXIMITY_LEVEL. Nothing scales yet.
 *   FOCUSED    the cursor is inside the card. It takes LIFT of extra scale, the
 *              yield completes, and most of the gathering is released so the
 *              composition opens back up around it.
 *
 * The cursor only ever picks the target card. Everything after that is decided
 * by the resting geometry — the gathering from each card's offset to the
 * composition's centre, the yield from each card's separation from the *active
 * card's rect*, decaying with the gap between the two. So a card is displaced
 * because of where it sits in the layout, not because of where the pointer is;
 * beyond YIELD_FALLOFF the gathering is all that is left.
 *
 * Targets are absolute, recomputed from the resting rects on every pointer
 * move, so moving between cards re-composes rather than accumulating, and
 * losing the pointer restores the design exactly.
 *
 * The two layers are smoothed independently and summed only when written, each
 * with its own weight — see the motion block above. That is what gives the
 * gesture its shape: the gather is heavy enough to still be travelling once the
 * cursor has arrived on a card, so it resolves underneath the quick hover
 * response instead of having to complete inside the approach.
 *
 * Deliberately outside React's render path: the loop writes CSS custom
 * properties straight onto the card elements, so nothing re-renders and layout
 * is never recalculated — transforms only.
 */
export default function ProximityField({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Pointer-driven and motion-bearing: skip entirely where it doesn't belong.
    const finePointer = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reduced.matches) return;

    let cards: Card[] = [];
    /** Centre of the composition's bounding box — what the page gathers toward. */
    let compCx = 0;
    let compCy = 0;
    let frame = 0;
    let running = false;

    function measure() {
      const sx = window.scrollX;
      const sy = window.scrollY;

      cards = Array.from(
        root!.querySelectorAll<HTMLElement>(
          "[data-prox-card], [data-prox-passive]",
        ),
      ).map((el) => {
        // Neutralise any in-flight transform so we measure the resting box.
        el.style.setProperty("--prox-x", "0px");
        el.style.setProperty("--prox-y", "0px");
        el.style.setProperty("--prox-s", "1");

        const r = el.getBoundingClientRect();
        return {
          el,
          passive: el.hasAttribute("data-prox-passive"),
          l: r.left + sx,
          t: r.top + sy,
          r: r.right + sx,
          b: r.bottom + sy,
          cx: r.left + sx + r.width / 2,
          cy: r.top + sy + r.height / 2,
          area: r.width * r.height,
          give: 1, // filled in below, once the composition's extent is known
          gx: chan(0),
          gy: chan(0),
          yx: chan(0),
          yy: chan(0),
          sc: chan(1),
          tgx: 0,
          tgy: 0,
          tyx: 0,
          tyy: 0,
          ts: 1,
        };
      });

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const c of cards) {
        if (c.l < minX) minX = c.l;
        if (c.t < minY) minY = c.t;
        if (c.r > maxX) maxX = c.r;
        if (c.b > maxY) maxY = c.b;
      }
      compCx = (minX + maxX) / 2;
      compCy = (minY + maxY) / 2;

      // Each card's distance from that centre, normalised against the furthest,
      // becomes its share of the give: outermost settles fastest and leads, the
      // middle of the page trails it slightly.
      let furthest = 0;
      for (const c of cards) {
        const d = Math.hypot(c.cx - compCx, c.cy - compCy);
        if (d > furthest) furthest = d;
      }
      for (const c of cards) {
        const t = furthest > 0 ? Math.hypot(c.cx - compCx, c.cy - compCy) / furthest : 0;
        c.give = GIVE_INNER + (GIVE_OUTER - GIVE_INNER) * t;
      }
    }

    /** True while nothing is engaged, which selects the slower release timings. */
    let releasing = true;

    function rest() {
      releasing = true;
      for (const c of cards) {
        c.tgx = 0;
        c.tgy = 0;
        c.tyx = 0;
        c.tyy = 0;
        c.ts = 1;
      }
    }

    /** Pick the card the cursor is on or approaching, or -1 for none. */
    function findActive(px: number, py: number) {
      let best = -1;
      let bestDist = Infinity;
      let bestArea = Infinity;

      for (let i = 0; i < cards.length; i++) {
        if (cards[i].passive) continue;
        const d = pointToRect(px, py, cards[i]);
        if (d > PROXIMITY_RANGE) continue;
        // Ties happen where cards overlap (Workspace overhangs the top row);
        // the smaller card is the one the cursor is meaningfully on.
        if (d < bestDist || (d === bestDist && cards[i].area < bestArea)) {
          best = i;
          bestDist = d;
          bestArea = cards[i].area;
        }
      }
      return { index: best, dist: bestDist };
    }

    function computeTargets(px: number, py: number) {
      const { index, dist } = findActive(px, py);
      if (index < 0) {
        rest();
        return;
      }

      releasing = false;

      const active = cards[index];
      const focused = dist === 0;
      const approach = 1 - dist / PROXIMITY_RANGE;

      // Two independent layers, summed.
      //
      //   contraction — global. Every card, active and passive alike, drifts
      //                 toward the composition's centre. This is the whole page
      //                 acknowledging the cursor, and it peaks on approach.
      //   yield       — local. Only the active card's neighbours, only along
      //                 the axis that separates them from it, and it peaks once
      //                 the cursor is actually on the card.
      //
      // So approaching gathers the page, and entering trades that gathering for
      // room around one card.
      const gather = (focused ? FOCUS_CONTRACT : approach) * CONTRACT;
      const engage = focused ? 1 : approach * PROXIMITY_LEVEL;

      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];

        c.tgx = (compCx - c.cx) * gather;
        c.tgy = (compCy - c.cy) * gather;
        c.tyx = 0;
        c.tyy = 0;

        if (c === active) {
          // The active card gathers with everything else but never yields —
          // it is the one being made room for. Scale arrives only on entry.
          c.ts = 1 + LIFT * (focused ? 1 : 0);
          continue;
        }

        c.ts = 1; // only the active card ever scales

        const { dx, dy } = rectSeparation(active, c);
        const gap = Math.hypot(dx, dy);
        const strength = clamp01(1 - gap / YIELD_FALLOFF);
        if (strength <= 0) continue;

        let ux: number;
        let uy: number;
        if (gap > 0) {
          ux = dx / gap;
          uy = dy / gap;
        } else {
          // Rects overlap on both axes — fall back to centre-to-centre.
          const vx = c.cx - active.cx;
          const vy = c.cy - active.cy;
          const len = Math.hypot(vx, vy) || 1;
          ux = vx / len;
          uy = vy / len;
        }

        const push = YIELD * strength * engage;
        c.tyx = ux * push;
        c.tyy = uy * push;
      }
    }

    let lastTime = 0;

    function tick(now: number) {
      // Real elapsed time, so the motion is identical at 60Hz and 120Hz.
      // frameDelta's ceiling absorbs the long first frame after a backgrounded
      // tab resumes.
      const dt = frameDelta(now, lastTime);
      lastTime = now;

      const yieldOmega = omegaFor(releasing ? YIELD_RELEASE : YIELD_SETTLE);
      const liftOmega = omegaFor(releasing ? LIFT_RELEASE : LIFT_SETTLE);
      const gatherBase = releasing ? GATHER_RELEASE : GATHER_SETTLE;

      let moving = false;

      for (const c of cards) {
        const gatherOmega = omegaFor(gatherBase * c.give);

        settle(c.gx, c.tgx, gatherOmega, dt);
        settle(c.gy, c.tgy, gatherOmega, dt);
        settle(c.yx, c.tyx, yieldOmega, dt);
        settle(c.yy, c.tyy, yieldOmega, dt);
        settle(c.sc, c.ts, liftOmega, dt);

        if (
          arrived(c.gx, c.tgx, EPS_PX, EPS_VEL) &&
          arrived(c.gy, c.tgy, EPS_PX, EPS_VEL) &&
          arrived(c.yx, c.tyx, EPS_PX, EPS_VEL) &&
          arrived(c.yy, c.tyy, EPS_PX, EPS_VEL) &&
          arrived(c.sc, c.ts, EPS_SCALE, EPS_VEL)
        ) {
          // Land exactly on target, so rest is a true identity transform.
          c.gx.v = c.tgx;
          c.gy.v = c.tgy;
          c.yx.v = c.tyx;
          c.yy.v = c.tyy;
          c.sc.v = c.ts;
          c.gx.vel = c.gy.vel = c.yx.vel = c.yy.vel = c.sc.vel = 0;
        } else {
          moving = true;
        }

        c.el.style.setProperty("--prox-x", `${(c.gx.v + c.yx.v).toFixed(2)}px`);
        c.el.style.setProperty("--prox-y", `${(c.gy.v + c.yy.v).toFixed(2)}px`);
        c.el.style.setProperty("--prox-s", c.sc.v.toFixed(4));
      }

      if (moving) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
        lastTime = 0;
      }
    }

    function start() {
      if (!running) {
        running = true;
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    }

    // Targets only change when the pointer does, so they are computed on the
    // event and the frame loop is left to do nothing but ease and settle.
    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      // A modal is covering the composition: the cards are invisible under an
      // opaque overlay, and one still easing when the modal's closing snapshot
      // is taken drags on the morph back to the card. CaseStudyModal sets this.
      if (document.documentElement.hasAttribute("data-modal-open")) return;
      computeTargets(e.clientX + window.scrollX, e.clientY + window.scrollY);
      start();
    }

    function onPointerLeave() {
      rest();
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
