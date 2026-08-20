/* ===========================================================================
   The timeline's scrubber.

   A needle on a ruler. One number — where the needle is, in years from day
   one — and the physics that move it: drag, throw, detent, edge.

   Nothing here touches the DOM or React. The consumer runs the rAF loop,
   calls `step(dt)`, and paints once per frame. Same contract as `camera.ts`,
   and the same two rules, because they are the two that matter for anything
   a hand is pushing:

   1. DIRECT MANIPULATION IS NEVER SMOOTHED. While the pointer is down the
      value is assigned, not integrated — the needle is stuck to the finger.
      The spring only ever engages on release.

   2. MOMENTUM IS FOR POINTER DRAG ONLY. A trackpad already emits its own
      inertial deltas for a hundred milliseconds after the fingers lift, so
      `scrollBy` has no follow-through of its own; only `endDrag` can throw.

   The one thing this has that the camera doesn't is a *detent*. The ruler is
   a calendar — a milestone every year, a mark every month — so the needle
   comes to rest on a month, never between two. Everything in flight is
   continuous; only the landing is quantised.

   There are two grains, not one. Months are the fine grain and they catch
   everything careful: a slow drag, a wheel, an arrow key. `anchors` is the
   coarse grain — the handful of positions that actually mean something, which
   for the timeline are the eight entries. The hand asks for precision by being
   slow, and the control answers in kind.

   The coarse grain is a RATCHET, not a magnet. Anything released above
   `COARSE_VEL` goes to the *next* anchor in the direction it was travelling —
   one per throw, however hard the throw — rather than coasting to a stop and
   snapping to whichever anchor happens to be nearest. Two reasons:

     A throw is a request to get somewhere, and "somewhere" is the next thing,
     not a function of how hard you happened to flick. A magnet makes the same
     gesture land in different places depending on speed, which is the opposite
     of a control you can aim.

     And it is the only detent left. There is no vibration here any more — it
     was Android-only, so it was a feel most visitors never got — and nothing
     on the scale lights up. What says "landed" is the motion: the value is
     handed to the spring *with the throw's velocity still on it*, so it
     arrives fast, overshoots a hair and settles. Flick again and it steps
     again. That is a detented dial, and it is felt rather than seen.
   =========================================================================== */

import { arrived, chan, clamp, omegaFor, settle } from "./spring";

export type Mode = "idle" | "drag" | "glide" | "settle";

/** One month, in years. The ruler's small lines are months, so this is both
 *  the detent grain and the tick spacing. */
export const MONTH = 1 / 12;

/** Momentum decay per second: v *= e^(-GLIDE_DECAY * dt). Higher stops sooner.
 *  4.2 gives a throw that crosses about two years before the detent takes it —
 *  far enough to feel like a flick, short enough that you never wait for it. */
const GLIDE_DECAY = 4.2;

/** Below this (years/sec) a throw has visually stopped and the nearest month
 *  takes over. A tenth of a year a second is about half a month a frame. */
const GLIDE_STOP = 0.12;

/** iOS's overscroll constant, as in `camera.ts`: the excess past an end is
 *  compressed by `(d * c * reach) / (reach + c * d)` — linear at first, then
 *  asymptotic, so the edge gives a little and then refuses. */
const RUBBER_C = 0.55;

/** How far past an end the needle can ever be pulled, in years. It is the
 *  curve's asymptote: as the pull grows without bound the excess approaches
 *  this and stops.
 *
 *  The camera scales this by the viewport, because a world sliding half a
 *  screen past its edge still looks like a world. A needle is 14px on a ruler
 *  it must never leave — the same rule scaled by seven years would let a hard
 *  pull drag it seven years off the end of its own scale.
 *
 *  0.38 is 20px: unmistakably elastic, and still on the ruler. */
const RUBBER_REACH = 0.38;

/** Ceiling on a throw, years/sec. At `GLIDE_DECAY` this is about three years
 *  of travel — a third of the ruler — which is as far as one flick should ever
 *  carry. It also bounds the bounce: without it, a violent flick hands the
 *  return spring a velocity that carries the needle a year past the end before
 *  it turns round. */
const MAX_THROW = 12;

/* Settling times, ms. Shorter than the camera's family (260 / 420 / 700):
   this is a 14px needle finding a mark, not a world crossing a viewport, and
   anything slower reads as the detent being reluctant. */
const SNAP_SETTLE = 240;
const BOUNCE_SETTLE = 400;
const GOTO_SETTLE = 540;

/** Above this (years/sec) a release is read as "take me somewhere" rather than
 *  "put it here", and the ratchet takes over. Deliberately equal to the
 *  component's `FAST` threshold: the same speed that softens the marks is the
 *  speed that stops aiming at months. */
const COARSE_VEL = 2;

/** How much of the throw the ratchet is allowed to carry into the spring.
 *  Some is essential — it is what makes the step feel thrown rather than
 *  animated — but an unclamped flick hands a 12-years/sec velocity to a target
 *  half a year away and the tape slams past it and swings back. */
const RATCHET_VEL = 3.5;

/** How long a ratchet step takes to settle. Longer than SNAP_SETTLE because it
 *  covers a whole gap between moments rather than a fraction of a month. */
const RATCHET_SETTLE = 340;

/** Velocity is measured across a window rather than between the last two
 *  events: pointer events arrive irregularly, and one 2ms gap at the end of a
 *  slow drag otherwise reports a violent throw. */
const VELOCITY_WINDOW = 80;

/* Arrival thresholds. A month is 0.083, so an eighth of that is a hundredth of
   a month — closer than any pixel can show. */
const EPS = 0.001;
const EPS_VEL = 0.012;

export function createScrubber(
  min: number,
  max: number,
  startAt: number,
  /** The coarse grain: positions worth landing on. Sorted, though nothing here
   *  requires it — the nearest is found by scan, and there are eight of them. */
  anchors: readonly number[] = [],
) {
  const c = chan(startAt);

  let mode: Mode = "idle";
  let target = startAt;
  let omega = omegaFor(SNAP_SETTLE);
  let grab = 0;
  let reduced = false;
  let samples: { v: number; t: number }[] = [];

  const rubber = (d: number) =>
    (d * RUBBER_C * RUBBER_REACH) / (RUBBER_REACH + RUBBER_C * d);

  const band = (v: number) =>
    v > max ? max + rubber(v - max) : v < min ? min - rubber(min - v) : v;

  const detent = (v: number) => clamp(Math.round(v / MONTH) * MONTH, min, max);

  /** The first anchor strictly past `v` going in `dir`, or `null` if `v` is
   *  already past the last one. `EPS` is what makes the ratchet repeat: parked
   *  exactly on an anchor, the next throw has to skip it rather than land on
   *  the place it is already sitting. */
  const nextAnchor = (v: number, dir: number) => {
    let best: number | null = null;
    for (const a of anchors) {
      if (dir > 0 ? a > v + EPS : a < v - EPS) {
        if (best == null || (dir > 0 ? a < best : a > best)) best = a;
      }
    }
    return best;
  };

  /** Where a released gesture comes to rest.
   *
   *  Slow means the hand was placing, so it lands on the month it was placed
   *  on. Fast means the hand was travelling, so it steps to the next moment —
   *  and only ever one, so the same flick always does the same thing.
   *
   *  Either way the target goes through the month detent, which keeps the tape
   *  on a mark even when it lands on an anchor that sits between two: an
   *  anchor is a position in a career, not a position on a ruler, and 4.3
   *  years is 51.6 months. */
  const land = (v: number, vel: number) => {
    if (Math.abs(vel) >= COARSE_VEL && anchors.length) {
      const a = nextAnchor(v, vel);
      // Past the last moment in that direction, the end of the tape is the
      // next thing there is.
      c.vel = clamp(vel, -RATCHET_VEL, RATCHET_VEL);
      springTo(a == null ? (vel > 0 ? max : min) : detent(a), RATCHET_SETTLE);
      return;
    }
    springTo(detent(v), SNAP_SETTLE);
  };

  /** Hand the value to the spring, keeping whatever velocity it already has —
   *  which is what makes a throw that runs out of speed, or one that hits an
   *  end, read as one motion rather than a stop followed by a slide. */
  function springTo(v: number, ms: number) {
    if (reduced) {
      c.v = v;
      c.vel = 0;
      mode = "idle";
      return;
    }
    target = v;
    omega = omegaFor(ms);
    mode = "settle";
  }

  return {
    get value() {
      return c.v;
    },
    get velocity() {
      return c.vel;
    },
    get mode() {
      return mode;
    },
    /** Whether the loop still has work. Drag is excluded on purpose: the
     *  pointer drives those frames, not the integrator. */
    get moving() {
      return mode === "glide" || mode === "settle";
    },

    /** Reduced motion lands every indirect move at once and kills the throw. */
    setReducedMotion(on: boolean) {
      reduced = on;
    },

    /* --- Direct manipulation ---------------------------------------------- */

    beginDrag(v: number) {
      mode = "drag";
      grab = v - c.v;
      c.vel = 0;
      samples = [{ v: c.v, t: performance.now() }];
    },

    /** Assigned, not integrated, not eased — see rule 1. The only thing
     *  between the pointer and the needle is the rubber band. */
    drag(v: number) {
      if (mode !== "drag") return;
      c.v = band(v - grab);

      const now = performance.now();
      samples.push({ v: c.v, t: now });
      while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW) {
        samples.shift();
      }
    },

    endDrag() {
      if (mode !== "drag") return;

      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last && first ? (last.t - first.t) / 1000 : 0;
      const raw = dt > 0.008 ? (last.v - first.v) / dt : 0;
      const vel = clamp(raw, -MAX_THROW, MAX_THROW);
      samples = [];

      // Released past an end: the edge wins outright and inherits the throw.
      if (c.v > max || c.v < min) {
        c.vel = vel;
        springTo(clamp(c.v, min, max), BOUNCE_SETTLE);
        return;
      }

      // Reduced motion never glides, so its landing is decided here rather
      // than in `step` — and it still gets the ratchet, because a fast flick
      // means the same thing whether or not the journey is animated.
      //
      // A hard throw is decided here too, and deliberately never glides: the
      // whole point of the ratchet is that the throw goes to the next moment
      // rather than to wherever momentum happened to run out. Only the middle
      // band — faster than a placement, slower than a flick — coasts, and it
      // coasts to a month.
      if (
        reduced ||
        Math.abs(vel) < GLIDE_STOP ||
        Math.abs(vel) >= COARSE_VEL
      ) {
        land(c.v, vel);
        return;
      }

      c.vel = vel;
      mode = "glide";
    },

    /** Wheel and trackpad. Clamped hard rather than banded — the trackpad's
     *  own inertia would otherwise push into the rubber band and hold it there
     *  for the length of the fling, which looks like the ruler is straining. */
    scrollBy(dv: number) {
      c.v = clamp(c.v + dv, min, max);
      c.vel = 0;
      mode = "idle";
    },

    /** The wheel has stopped arriving. `vel` is the fastest the gesture ever
     *  went, signed — a hard scroll ratchets to the next moment exactly as a
     *  hard drag does, and a careful one lands on the month it stopped at. The
     *  trackpad cannot be read from `c.vel` because `scrollBy` assigns rather
     *  than integrates, so the caller measures it. */
    snap(vel = 0) {
      if (mode === "idle") land(c.v, vel);
    },

    /** Keyboard. Steps off the nearest month rather than off the live value,
     *  so a press mid-settle advances one month from where it was headed
     *  instead of a fraction from wherever it happened to be. */
    nudge(dv: number) {
      springTo(clamp(detent(c.v) + dv, min, max), SNAP_SETTLE);
    },

    /** Tapping a mark, or going back to now. Not a gesture the hand is making,
     *  so it gets the longer settle. */
    goTo(v: number) {
      springTo(detent(clamp(v, min, max)), GOTO_SETTLE);
    },

    /* --- The loop --------------------------------------------------------- */

    /** Advance by `dt` seconds. Returns whether anything is still moving. */
    step(dt: number) {
      if (mode === "idle" || mode === "drag") return false;

      if (mode === "glide") {
        c.vel *= Math.exp(-GLIDE_DECAY * dt);
        c.v += c.vel * dt;

        // Thrown into an end. The spring inherits the speed and decelerates
        // through the boundary, reverses and settles as one motion — capped,
        // so the needle never leaves its window on the way through.
        if (c.v > max || c.v < min) {
          c.vel = clamp(c.vel, -MAX_THROW, MAX_THROW);
          springTo(clamp(c.v, min, max), BOUNCE_SETTLE);
          return true;
        }

        // The coast has run out. Only middling releases ever get here — a
        // flick was handed to the ratchet at `endDrag` and never entered the
        // glide — so the month detent is the right grain and there is no
        // launch speed left to consult.
        if (Math.abs(c.vel) < GLIDE_STOP) springTo(detent(c.v), SNAP_SETTLE);
        return true;
      }

      settle(c, target, omega, dt);
      if (arrived(c, target, EPS, EPS_VEL)) {
        c.v = target;
        c.vel = 0;
        mode = "idle";
        return false;
      }
      return true;
    },
  };
}

export type Scrubber = ReturnType<typeof createScrubber>;
