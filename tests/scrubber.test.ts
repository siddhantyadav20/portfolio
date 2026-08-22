import { afterEach, describe, expect, it, vi } from "vitest";
import { MONTH, createScrubber } from "@/lib/scrubber";

/**
 * The timeline's dial.
 *
 * The card is one draggable ruler with three different ideas about where a
 * release should land — place it on a month, coast it to a month, or ratchet it
 * to the next moment in a career — and which one applies is decided by how fast
 * the hand was going. That decision is invisible, felt rather than seen, and
 * impossible to check by looking at the card. It is exactly what a test is for.
 *
 * The eight anchors below are the shape of the real ones in `content/site.ts`:
 * positions in years from day one, deliberately not on month boundaries,
 * because a moment in a career is not a position on a ruler.
 */
const MIN = -2;
const MAX = 5;
const ANCHORS = [-2, -0.7, 0, 0.8, 2, 2.8, 3.8, 4.3];

const make = (startAt = 5) => createScrubber(MIN, MAX, startAt, ANCHORS);

/** Run the integrator to rest, or give up. Returns the frames it took. */
function toRest(s: ReturnType<typeof make>, maxFrames = 2000) {
  let frames = 0;
  while (s.step(1 / 60) && frames < maxFrames) frames++;
  return frames;
}

/** A drag whose velocity the test controls, by driving the clock the scrubber
 *  samples. `drag` measures across an 80ms window, so the steps have to be
 *  spaced in real-looking time rather than all at once. */
function dragBy(
  s: ReturnType<typeof make>,
  from: number,
  to: number,
  overMs: number,
) {
  let now = 1000;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => now);

  s.beginDrag(from);
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    now += overMs / steps;
    s.drag(from + ((to - from) * i) / steps);
  }
  s.endDrag();
  clock.mockRestore();
}

afterEach(() => vi.restoreAllMocks());

describe("resting state", () => {
  it("starts where it was told and has no work to do", () => {
    const s = make(5);
    expect(s.value).toBe(5);
    expect(s.mode).toBe("idle");
    expect(s.moving).toBe(false);
    expect(s.step(1 / 60)).toBe(false);
  });
});

describe("goTo and nudge", () => {
  it("lands on a month, even when aimed between two", () => {
    // An anchor is a position in a career, not a position on a ruler — 4.3
    // years is 51.6 months. The tape still has to stop on a mark.
    const s = make();
    s.goTo(4.3);
    toRest(s);

    const months = s.value / MONTH;
    expect(months).toBeCloseTo(Math.round(months), 6);
    expect(Math.abs(s.value - 4.3)).toBeLessThan(MONTH);
  });

  it("clamps a destination past either end", () => {
    const s = make();
    s.goTo(99);
    toRest(s);
    expect(s.value).toBeCloseTo(MAX, 6);

    s.goTo(-99);
    toRest(s);
    expect(s.value).toBeCloseTo(MIN, 6);
  });

  it("steps a month off the nearest month, not off the live value", () => {
    // Pressing an arrow mid-settle should advance one month from where the
    // tape was headed, rather than a fraction from wherever it happened to be.
    const s = make(1.04); // a little past 12 months
    s.nudge(MONTH);
    toRest(s);

    expect(s.value).toBeCloseTo(13 * MONTH, 6);
  });
});

describe("the rubber band", () => {
  it("gives past an end, and refuses to give much", () => {
    const s = make(MAX);
    s.beginDrag(MAX);
    s.drag(MAX + 50); // an absurd pull

    expect(s.value).toBeGreaterThan(MAX);
    // The curve's asymptote is 0.38 years — twenty pixels on the real ruler.
    // A pull of fifty years must not drag the needle fifty years off its scale.
    expect(s.value - MAX).toBeLessThan(0.38);
  });

  it("returns to the end when released past it", () => {
    const s = make(MAX);
    s.beginDrag(MAX);
    s.drag(MAX + 10);
    s.endDrag();
    toRest(s);

    expect(s.value).toBeCloseTo(MAX, 6);
  });
});

describe("what a release means", () => {
  it("places, when the hand was slow", () => {
    // Slow means the hand was putting the tape somewhere. It should land on
    // the month it was put on, not travel onward.
    const s = make(2);
    dragBy(s, 2, 2.02, 400); // 0.05 years/sec — well under every threshold
    toRest(s);

    const months = s.value / MONTH;
    expect(months).toBeCloseTo(Math.round(months), 6);
    expect(Math.abs(s.value - 2.02)).toBeLessThan(MONTH);
  });

  it("ratchets to the next moment, when the hand was fast", () => {
    // Fast means the hand was travelling. The tape steps to the *next* anchor
    // and only ever one, so the same flick always does the same thing —
    // rather than stopping wherever momentum happened to run out.
    const s = make(2);
    dragBy(s, 2, 2.6, 60); // 10 years/sec
    toRest(s);

    // 2.8 is the next anchor past 2 going forward, taken to its month.
    expect(Math.abs(s.value - 2.8)).toBeLessThan(MONTH);
  });

  it("ratchets one moment per gesture however hard the flick", () => {
    // The property is "one anchor per gesture", measured from where the finger
    // let go — not from where the gesture started. A *drag* moves the tape
    // directly and legitimately travels as far as the hand does; only the
    // release ratchets. So this flicks a short distance very fast, twice, and
    // expects two single steps rather than one long jump.
    const s = make(2);

    dragBy(s, 2, 2.1, 20); // 5 years/sec across a tenth of a year
    toRest(s);
    expect(Math.abs(s.value - 2.8)).toBeLessThan(MONTH);

    const from = s.value;
    dragBy(s, from, from + 0.1, 20);
    toRest(s);
    expect(Math.abs(s.value - 3.8)).toBeLessThan(MONTH);
  });

  it("ratchets backwards too", () => {
    const s = make(2);
    dragBy(s, 2, 1.4, 60);
    toRest(s);

    expect(Math.abs(s.value - 0.8)).toBeLessThan(MONTH);
  });

  it("runs out of tape rather than off it", () => {
    // Past the last moment in that direction, the end of the ruler is the next
    // thing there is.
    const s = make(4.3);
    dragBy(s, 4.3, 4.9, 60);
    toRest(s);

    expect(s.value).toBeCloseTo(MAX, 6);
  });
});

describe("wheel and trackpad", () => {
  it("clamps hard rather than banding", () => {
    // The trackpad's own inertia would otherwise push into the rubber band and
    // hold it there for the length of the fling, which looks like straining.
    const s = make(MAX);
    s.scrollBy(2);
    expect(s.value).toBe(MAX);

    s.scrollBy(-100);
    expect(s.value).toBe(MIN);
  });

  it("snaps to a month when the wheel stops, and ratchets when it was fast", () => {
    const slow = make(1.04);
    slow.scrollBy(0);
    slow.snap(0);
    toRest(slow);
    const months = slow.value / MONTH;
    expect(months).toBeCloseTo(Math.round(months), 6);

    const fast = make(2);
    fast.snap(6);
    toRest(fast);
    expect(Math.abs(fast.value - 2.8)).toBeLessThan(MONTH);
  });
});

describe("reduced motion", () => {
  it("arrives at once and never glides", () => {
    // Someone who asked for less motion still gets the dial — what stops is
    // the journey.
    const s = make(0);
    s.setReducedMotion(true);
    s.goTo(4);

    expect(s.value).toBeCloseTo(4, 6);
    expect(s.mode).toBe("idle");
    expect(s.step(1 / 60)).toBe(false);
  });

  it("still ratchets, because a flick still means the same thing", () => {
    const s = make(2);
    s.setReducedMotion(true);
    dragBy(s, 2, 2.6, 60);

    expect(s.mode).toBe("idle");
    expect(Math.abs(s.value - 2.8)).toBeLessThan(MONTH);
  });
});

describe("the loop", () => {
  it("stops reporting work once it has settled", () => {
    const s = make(0);
    s.goTo(3);
    const frames = toRest(s);

    expect(frames).toBeGreaterThan(0);
    expect(frames).toBeLessThan(200); // ~3s at 60Hz; anything more is a stall
    expect(s.moving).toBe(false);
    expect(s.step(1 / 60)).toBe(false);
  });

  it("overshoots the end further than the rubber band's own asymptote", () => {
    // Documenting real behaviour rather than the intent beside it.
    //
    // `RUBBER_REACH` is 0.38 years — twenty pixels — and a *pull* can never
    // exceed it, because the band is asymptotic. A *bounce* can: released past
    // the end with the throw still on it, the spring is critically damped and
    // so cannot overshoot its target, but it starts outside that target moving
    // outwards and has to decelerate through the excess first. The hardest
    // throw the clamp allows peaks around 0.60 years past the end, roughly
    // 32px — further than the 14px needle is wide.
    //
    // It self-corrects inside about 200ms and needs a deliberately violent
    // flick to provoke. Flagged rather than changed: tightening it means
    // lowering the velocity handed to the bounce, and that is a decision about
    // feel, not a bug fix.
    let peak = MAX;
    const s = make(MAX);
    dragBy(s, MAX, MAX + 35, 30);
    for (let i = 0; i < 600; i++) {
      s.step(1 / 60);
      peak = Math.max(peak, s.value);
    }

    expect(peak).toBeGreaterThan(MAX + 0.38);
    expect(peak).toBeLessThan(MAX + 0.7);
  });

  it("comes back to the ruler from any throw", () => {
    const s = make(0);
    dragBy(s, 0, 40, 30);
    toRest(s);
    expect(s.value).toBeCloseTo(MAX, 6);

    const back = make(0);
    dragBy(back, 0, -40, 30);
    toRest(back);
    expect(back.value).toBeCloseTo(MIN, 6);
  });
});
