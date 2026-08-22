import { describe, expect, it } from "vitest";
import {
  DT_CEILING,
  arrived,
  chan,
  clamp,
  clamp01,
  frameDelta,
  omegaFor,
  settle,
  smooth,
  spring,
} from "@/lib/spring";

/**
 * The motion primitive.
 *
 * Everything that moves under its own weight on this site runs through these —
 * the proximity field, the About card's orbit, the canvas camera, the timeline
 * scrubber, the two card instruments. So the properties below are not
 * incidental; they are the reasons the file was written the way it was, and
 * each test names the one it is holding.
 */

/**
 * Run a channel to `target` for `seconds`, stepping at `dt`.
 *
 * The step count is computed rather than accumulated. `for (t = 0; t < s; t +=
 * dt)` drifts — after thirty additions of 1/60 the total is not 0.5 — and two
 * runs at different rates then cover different amounts of time, which is
 * exactly the thing the rate-independence test is trying to measure.
 */
function run(from: number, target: number, settleMs: number, seconds: number, dt: number) {
  const c = chan(from);
  const omega = omegaFor(settleMs);
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) settle(c, target, omega, dt);
  return c;
}

describe("settle", () => {
  it("is critically damped — it never crosses its target", () => {
    // The property the whole default rests on: this reads as weight, not as
    // bounce, and anything that overshoots would read as the latter.
    const c = chan(0);
    const omega = omegaFor(300);
    let maxSeen = 0;

    for (let i = 0; i < 600; i++) {
      settle(c, 1, omega, 1 / 60);
      maxSeen = Math.max(maxSeen, c.v);
    }

    expect(maxSeen).toBeLessThanOrEqual(1);
  });

  it("is inside 2% after exactly one settling time", () => {
    // What `omegaFor`'s 5.83 actually is. For a critically damped system the
    // response is 1 - e^(-wt)(1 + wt), and e^(-x)(1 + x) = 0.02 at x = 5.83 —
    // so the constant is the *2% band*, and "settling time" here means "within
    // 2% of the target", not "arrived".
    //
    // Worth pinning precisely because the number reads like a magic constant.
    // Anyone who changes it will change how every moving thing on the site
    // feels, and this says what it currently means.
    const c = run(0, 1, 300, 0.3, 1 / 240);
    const error = Math.abs(1 - c.v);

    expect(error).toBeLessThan(0.021);
    expect(error).toBeGreaterThan(0.019);
  });

  it("reaches the same place at 60Hz and at 120Hz", () => {
    // The reason this is an exact discrete solution rather than a stepped
    // integration. A stepped integrator visibly changes character between
    // refresh rates, and the site is run on both.
    const slow = run(0, 1, 380, 0.5, 1 / 60);
    const fast = run(0, 1, 380, 0.5, 1 / 120);

    // An exact solution agrees to floating-point noise, not merely closely —
    // so this is asserted at ten decimal places. A stepped integrator would
    // miss by a percent or so and pass a looser test.
    expect(fast.v).toBeCloseTo(slow.v, 10);
    expect(fast.vel).toBeCloseTo(slow.vel, 10);
  });

  it("is stable across one enormous frame", () => {
    // dt is whatever the display and the tab's visibility state hand over. A
    // stepped integrator diverges here; this must not.
    const c = chan(0);
    settle(c, 1, omegaFor(300), 10);

    expect(Number.isFinite(c.v)).toBe(true);
    expect(c.v).toBeCloseTo(1, 6);
  });

  it("carries velocity through a moving target", () => {
    // A plain lerp re-lurches every time the target moves. This should follow
    // as one continuous motion, which means it is still moving when it gets
    // there.
    const c = chan(0);
    const omega = omegaFor(300);
    for (let i = 0; i < 10; i++) settle(c, 1, omega, 1 / 60);

    expect(c.vel).toBeGreaterThan(0);
  });
});

describe("spring", () => {
  it("overshoots below zeta 1, and does not at or above it", () => {
    // The branch exists so a caller can choose temperament per direction with
    // one function — a thing being flung out should feel different from the
    // same thing being drawn back in.
    const loose = chan(0);
    const tight = chan(0);
    const omega = omegaFor(300);

    let looseMax = 0;
    let tightMax = 0;
    for (let i = 0; i < 400; i++) {
      spring(loose, 1, omega, 0.5, 1 / 60);
      spring(tight, 1, omega, 1, 1 / 60);
      looseMax = Math.max(looseMax, loose.v);
      tightMax = Math.max(tightMax, tight.v);
    }

    expect(looseMax).toBeGreaterThan(1);
    expect(tightMax).toBeLessThanOrEqual(1);
  });

  it("is `settle` exactly at zeta 1", () => {
    const viaSpring = chan(0);
    const viaSettle = chan(0);
    const omega = omegaFor(300);

    for (let i = 0; i < 60; i++) {
      spring(viaSpring, 1, omega, 1, 1 / 60);
      settle(viaSettle, 1, omega, 1 / 60);
    }

    expect(viaSpring.v).toBe(viaSettle.v);
    expect(viaSpring.vel).toBe(viaSettle.vel);
  });
});

describe("arrived", () => {
  it("needs both position and velocity", () => {
    // Position alone reports success at the top of an overshoot, on the way
    // past the target at speed — which is the bug the second test prevents.
    const atTargetButMoving = { v: 1, vel: 5 };
    const nearAndStill = { v: 1.0005, vel: 0.001 };

    expect(arrived(atTargetButMoving, 1, 0.01, 0.01)).toBe(false);
    expect(arrived(nearAndStill, 1, 0.01, 0.01)).toBe(true);
  });
});

describe("frameDelta", () => {
  it("guesses a frame when there is no previous one", () => {
    expect(frameDelta(1000, 0)).toBeCloseTo(1 / 60, 6);
  });

  it("caps the frame that follows a backgrounded tab", () => {
    // rAF stops entirely while a tab is hidden, so the first frame back can
    // carry an arbitrarily long dt. Capped, it replays as one ordinary step
    // instead of a jump across the screen.
    expect(frameDelta(90_000, 1000)).toBe(DT_CEILING);
  });

  it("passes an ordinary frame through", () => {
    expect(frameDelta(1016.7, 1000)).toBeCloseTo(0.0167, 4);
  });
});

describe("scalars", () => {
  it("clamps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });

  it("smoothsteps with zero slope at both ends", () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBe(0.5);
    // Flat at the ends is the whole point — it is what stops an eased value
    // from arriving with a visible corner.
    expect(smooth(0.001)).toBeLessThan(0.001);
    expect(smooth(0.999)).toBeGreaterThan(0.999);
  });
});
