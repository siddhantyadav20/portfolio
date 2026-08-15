/* ===========================================================================
   The canvas's camera.

   A world of size (worldW × worldH) is viewed through a viewport of
   (viewW × viewH). The camera owns three numbers — x, y, scale — and the
   mapping is:

       screen = world * scale + (x, y)
       world  = (screen - (x, y)) / scale

   Nothing here touches the DOM or React. The consumer runs the rAF loop,
   calls `step(dt)`, and writes `transform` once per frame.

   ---------------------------------------------------------------------------
   The two rules this file exists to enforce.

   1. DIRECT MANIPULATION IS NEVER SMOOTHED. While a pointer is down, or while
      wheel deltas are arriving, position is written straight through with no
      easing whatsoever. Smoothing a drag is the most common mistake in canvas
      UIs and it reads as lag, not polish — the content should feel stuck to
      the finger. The spring only ever engages on *release*, or on a move the
      user did not make with their hand (flyTo, zoomBy, reset).

   2. MOMENTUM IS FOR POINTER DRAG ONLY, NEVER FOR WHEEL. macOS trackpads
      already emit inertial wheel deltas for a hundred milliseconds after the
      fingers lift. Adding our own decay on top of that gives the doubled,
      greasy feel where the canvas keeps sliding well after it should have
      stopped. `panBy` (wheel) therefore has no follow-through at all; only
      `endDrag` can start a glide.

   ---------------------------------------------------------------------------
   Modes, and how one becomes another.

       idle    nothing moving.
       drag    a pointer is down. Position is assigned, not integrated.
       glide   momentum after a flick: velocity decays, position integrates.
       fly     a spring is carrying x/y/scale to explicit targets.

   The interesting transition is glide -> fly. When a glide carries the camera
   past the world's edge, it hands its *velocity* to the spring channels rather
   than stopping dead. Because the spring is a second-order system that already
   carries velocity, the handoff is invisible: the canvas decelerates through
   the boundary, reverses, and settles, as one continuous motion. That is the
   whole reason the site's spring integrates velocity instead of lerping.
   =========================================================================== */

import { chan, clamp, omegaFor, settle } from "./spring";

/* --- Tuning ---------------------------------------------------------------- */

export const MIN_SCALE = 0.35;
export const MAX_SCALE = 2.4;

/** Momentum decay, per second: v *= e^(-GLIDE_DECAY * dt). Higher stops
 *  sooner. 3.2 gives a flick that travels about a screen and a half before
 *  it's done, which is far enough to feel like throwing something and short
 *  enough that you never wait for it. */
const GLIDE_DECAY = 3.2;

/** Below this speed (px/s) a glide has visually stopped. 60px/s is about two
 *  pixels a frame — under it the canvas is not moving so much as seeping, and
 *  cutting the tail there is what keeps a flick feeling like it lands rather
 *  than dissolves. */
const GLIDE_STOP = 60;

/** iOS's overscroll constant. The excess past an edge is compressed by
 *  `(d * c * dim) / (dim + c * d)`, which is linear at first and asymptotes —
 *  so the edge gives a little, then refuses, with no discontinuity anywhere. */
const RUBBER_C = 0.55;

/* Settling times, ms. These extend the family in ProximityField (170 / 220 /
   380 engage, 260 / 420 / 620 release) upward — a camera crossing a whole
   world is a bigger gesture than a card yielding 15px and should take longer. */
const BOUNCE_SETTLE = 420;
const ZOOM_SETTLE = 260;
const FLY_SETTLE = 700;

/* Arrival thresholds.

   A spring approaches its target asymptotically, so where you declare it
   finished decides how long the loop runs — and the last stretch is invisible.
   These were set by measurement, not taste: with a 0.05px / 0.6px-per-second
   test, a corner-to-corner flight kept the rAF loop alive for 1.6s to cover a
   distance the eye saw it complete in about 0.8s. Nearly half the frames were
   spent animating nothing.

   0.3px is a third of a device pixel on a retina display and 3px/s is an
   eighth of a pixel per frame. Neither is perceptible, and the flight ends
   when it looks like it ends. */
const EPS_PX = 0.3;
const EPS_SCALE = 0.0008;
const EPS_VEL = 3;

/* --- Velocity sampling ----------------------------------------------------- */

/** How far back (ms) to look when measuring flick speed.
 *
 *  Too short and a single jittery frame becomes the throw; too long and a
 *  flick that ends in a pause still glides, which feels haunted. ~70ms is
 *  about one hand-movement's worth of signal. */
const VELOCITY_WINDOW = 70;

type Sample = { x: number; y: number; t: number };

export type Mode = "idle" | "drag" | "glide" | "fly";

export type CameraState = {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
};

export function createCamera(worldW: number, worldH: number) {
  const cx = chan(0);
  const cy = chan(0);
  const cs = chan(1);

  let mode: Mode = "idle";

  /**
   * Reduced motion, handled here rather than at the call sites.
   *
   * Every indirect move still *happens* — the camera arrives at exactly the
   * same place — it just arrives immediately, and a flick does not throw. Doing
   * this inside the camera means the consumer has one code path; the earlier
   * arrangement, where the component branched on it, silently broke keyboard
   * zoom under reduced motion by setting a spring target and never stepping it.
   */
  let reduced = false;

  let viewW = 1;
  let viewH = 1;
  let world = { w: worldW, h: worldH };

  /* Targets, used only in "fly". */
  let tx = 0;
  let ty = 0;
  let ts = 1;
  let omegaXY = omegaFor(FLY_SETTLE);
  let omegaS = omegaFor(ZOOM_SETTLE);

  /* Drag bookkeeping. */
  let grabX = 0;
  let grabY = 0;
  let samples: Sample[] = [];

  /* --- Bounds -------------------------------------------------------------
     The legal range for x at a given scale. When the world is narrower than
     the viewport there is exactly one legal value — centred — so min and max
     collapse onto it and the axis simply cannot be dragged. */

  function rangeX(scale: number) {
    const contentW = world.w * scale;
    if (contentW <= viewW) {
      const c = (viewW - contentW) / 2;
      return [c, c] as const;
    }
    return [viewW - contentW, 0] as const;
  }

  function rangeY(scale: number) {
    const contentH = world.h * scale;
    if (contentH <= viewH) {
      const c = (viewH - contentH) / 2;
      return [c, c] as const;
    }
    return [viewH - contentH, 0] as const;
  }

  function clampX(x: number, scale: number) {
    const [lo, hi] = rangeX(scale);
    return clamp(x, lo, hi);
  }

  function clampY(y: number, scale: number) {
    const [lo, hi] = rangeY(scale);
    return clamp(y, lo, hi);
  }

  const rubber = (d: number, dim: number) =>
    (d * RUBBER_C * dim) / (dim + RUBBER_C * d);

  /** Position with the part that lies past an edge compressed rather than cut. */
  function band(v: number, lo: number, hi: number, dim: number) {
    if (v > hi) return hi + rubber(v - hi, dim);
    if (v < lo) return lo - rubber(lo - v, dim);
    return v;
  }

  function outOfBounds() {
    const [lox, hix] = rangeX(cs.v);
    const [loy, hiy] = rangeY(cs.v);
    return cx.v < lox - 0.5 || cx.v > hix + 0.5 || cy.v < loy - 0.5 || cy.v > hiy + 0.5;
  }

  /** Enter "fly", carrying whatever velocity the camera already has into the
   *  spring so the change of mode is not a change of motion. */
  function flyToRaw(
    nx: number,
    ny: number,
    ns: number,
    settleMs = FLY_SETTLE,
  ) {
    ts = clamp(ns, MIN_SCALE, MAX_SCALE);
    tx = clampX(nx, ts);
    ty = clampY(ny, ts);

    if (reduced) {
      cs.v = ts;
      cx.v = tx;
      cy.v = ty;
      cx.vel = cy.vel = cs.vel = 0;
      mode = "idle";
      return;
    }

    omegaXY = omegaFor(settleMs);
    omegaS = omegaFor(settleMs === FLY_SETTLE ? ZOOM_SETTLE : settleMs);
    mode = "fly";
  }

  /* --- Public API ---------------------------------------------------------- */

  const api = {
    get state(): CameraState {
      return { x: cx.v, y: cy.v, scale: cs.v };
    },

    get mode() {
      return mode;
    },

    /** Indirect moves land instantly and flicks stop dead. See `reduced`. */
    setReducedMotion(on: boolean) {
      reduced = on;
    },

    /** World coordinates of a point on screen. */
    toWorld(px: number, py: number) {
      return { x: (px - cx.v) / cs.v, y: (py - cy.v) / cs.v };
    },

    setViewport(w: number, h: number) {
      viewW = Math.max(1, w);
      viewH = Math.max(1, h);
      // A resize can leave the camera outside the new legal range; correct it
      // immediately rather than springing, since nothing about a window resize
      // should look animated.
      cx.v = clampX(cx.v, cs.v);
      cy.v = clampY(cy.v, cs.v);
    },

    setWorld(w: number, h: number) {
      world = { w, h };
      cx.v = clampX(cx.v, cs.v);
      cy.v = clampY(cy.v, cs.v);
    },

    /** Place a world point at the centre of the viewport, immediately. */
    jumpTo(wx: number, wy: number, scale = cs.v) {
      cs.v = clamp(scale, MIN_SCALE, MAX_SCALE);
      cs.vel = 0;
      cx.v = clampX(viewW / 2 - wx * cs.v, cs.v);
      cy.v = clampY(viewH / 2 - wy * cs.v, cs.v);
      cx.vel = cy.vel = 0;
      mode = "idle";
    },

    /** The same, as a flight. */
    flyTo(wx: number, wy: number, scale = cs.v, settleMs = FLY_SETTLE) {
      const s = clamp(scale, MIN_SCALE, MAX_SCALE);
      flyToRaw(viewW / 2 - wx * s, viewH / 2 - wy * s, s, settleMs);
    },

    /* --- Direct manipulation ---------------------------------------------- */

    beginDrag(px: number, py: number) {
      mode = "drag";
      grabX = px - cx.v;
      grabY = py - cy.v;
      cx.vel = cy.vel = 0;
      samples = [{ x: px, y: py, t: performance.now() }];
    },

    /**
     * Assigned, not integrated, not eased — see rule 1 at the top.
     * The only thing between the pointer and the transform is the rubber band.
     */
    drag(px: number, py: number) {
      if (mode !== "drag") return;

      const [lox, hix] = rangeX(cs.v);
      const [loy, hiy] = rangeY(cs.v);
      cx.v = band(px - grabX, lox, hix, viewW);
      cy.v = band(py - grabY, loy, hiy, viewH);

      const now = performance.now();
      samples.push({ x: px, y: py, t: now });
      while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW) {
        samples.shift();
      }
    },

    endDrag() {
      if (mode !== "drag") return;

      // Velocity across the sampling window rather than between the last two
      // events: pointer events arrive irregularly, and one 2ms gap at the end
      // of a slow drag otherwise reports a violent throw.
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last && first ? (last.t - first.t) / 1000 : 0;
      let vx = 0;
      let vy = 0;
      if (dt > 0.008) {
        vx = (last.x - first.x) / dt;
        vy = (last.y - first.y) / dt;
      }
      samples = [];

      // Released past an edge: the boundary wins outright, and it inherits the
      // throw so the return reads as one motion rather than a stop and a slide.
      if (outOfBounds()) {
        cx.vel = vx;
        cy.vel = vy;
        flyToRaw(clampX(cx.v, cs.v), clampY(cy.v, cs.v), cs.v, BOUNCE_SETTLE);
        return;
      }

      if (reduced || Math.hypot(vx, vy) < GLIDE_STOP) {
        mode = "idle";
        return;
      }

      cx.vel = vx;
      cy.vel = vy;
      mode = "glide";
    },

    /**
     * Wheel and two-finger trackpad pan. Direct, and deliberately with no
     * follow-through of our own — see rule 2 at the top.
     */
    panBy(dx: number, dy: number) {
      const [lox, hix] = rangeX(cs.v);
      const [loy, hiy] = rangeY(cs.v);
      // Clamped hard, not banded. The trackpad's own inertia would otherwise
      // push into the rubber band and hold it there for the length of the
      // fling, which looks like the canvas is straining against the edge.
      cx.v = clamp(cx.v - dx, lox, hix);
      cy.v = clamp(cy.v - dy, loy, hiy);
      cx.vel = cy.vel = 0;
      mode = "idle";
    },

    /**
     * Zoom about a screen point, keeping the world point under it fixed.
     *
     * That fixed point is the whole trick: without it, pinching on something
     * you're interested in slides it out from under your fingers.
     */
    zoomAt(px: number, py: number, factor: number, animate = false) {
      // Compound off wherever the camera is *headed*, not where it currently
      // is. Tapping `-` five times quickly should zoom out five notches; if
      // each press read the live scale, all five would land on the same target
      // — the spring hasn't moved yet — and four of the presses would be
      // silently swallowed. Only relevant mid-flight; `fromScale` is the live
      // value the rest of the time.
      const flying = mode === "fly";
      const fromScale = flying ? ts : cs.v;
      const fromX = flying ? tx : cx.v;
      const fromY = flying ? ty : cy.v;

      const ns = clamp(fromScale * factor, MIN_SCALE, MAX_SCALE);
      const wx = (px - fromX) / fromScale;
      const wy = (py - fromY) / fromScale;
      const nx = px - wx * ns;
      const ny = py - wy * ns;

      if (animate) {
        flyToRaw(nx, ny, ns, ZOOM_SETTLE);
        return;
      }

      cs.v = ns;
      cs.vel = 0;
      cx.v = clampX(nx, ns);
      cy.v = clampY(ny, ns);
      cx.vel = cy.vel = 0;
      mode = "idle";
    },

    /** Keyboard and button zoom: about the viewport centre, and sprung, because
     *  this one is not a gesture the hand is making. */
    zoomBy(factor: number) {
      api.zoomAt(viewW / 2, viewH / 2, factor, true);
    },

    reset() {
      api.flyTo(world.w / 2, world.h / 2, 1);
    },

    /* --- The loop ------------------------------------------------------------ */

    /** Advance by `dt` seconds. Returns whether anything is still moving. */
    step(dt: number) {
      if (mode === "idle" || mode === "drag") return false;

      if (mode === "glide") {
        const k = Math.exp(-GLIDE_DECAY * dt);
        cx.vel *= k;
        cy.vel *= k;
        cx.v += cx.vel * dt;
        cy.v += cy.vel * dt;

        // Ran past an edge — hand the throw to the spring. See the note at the
        // top of the file; this is the transition the whole design is for.
        if (outOfBounds()) {
          flyToRaw(clampX(cx.v, cs.v), clampY(cy.v, cs.v), cs.v, BOUNCE_SETTLE);
          return true;
        }

        if (Math.hypot(cx.vel, cy.vel) < GLIDE_STOP) {
          cx.vel = cy.vel = 0;
          mode = "idle";
          return false;
        }
        return true;
      }

      // fly
      settle(cx, tx, omegaXY, dt);
      settle(cy, ty, omegaXY, dt);
      settle(cs, ts, omegaS, dt);

      /* The targets are deliberately NOT re-clamped here.

         They used to be, against the *in-flight* scale, on the theory that a
         zooming flight would otherwise land outside the world. That was wrong
         twice over: flyToRaw already clamps against `ts`, the scale being
         flown to, which is the only range that matters at the destination —
         and re-clamping against the current scale actively destroys the
         target. Zoom out until the world is narrower than the viewport and
         the legal range for x collapses to a single centred value, so the
         first frame of a flight home overwrote its own destination with that
         value and the camera landed against the board's left edge instead of
         at the middle. Pressing R from full zoom-out missed by half a
         viewport, every time.

         Mid-flight the camera may sit briefly outside the range for the scale
         it is passing through. That is invisible and resolves on arrival,
         which is a far better trade than not arriving. */

      const done =
        Math.abs(tx - cx.v) <= EPS_PX &&
        Math.abs(ty - cy.v) <= EPS_PX &&
        Math.abs(ts - cs.v) <= EPS_SCALE &&
        Math.abs(cx.vel) <= EPS_VEL &&
        Math.abs(cy.vel) <= EPS_VEL;

      if (done) {
        cx.v = tx;
        cy.v = ty;
        cs.v = ts;
        cx.vel = cy.vel = cs.vel = 0;
        mode = "idle";
        return false;
      }
      return true;
    },
  };

  return api;
}

export type Camera = ReturnType<typeof createCamera>;
