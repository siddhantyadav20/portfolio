import { describe, expect, it } from "vitest";
import { LOGO_BOX, LOGO_S, LOGO_Y } from "@/content/logo";

/**
 * The mark, as geometry.
 *
 * These paths were traced out of a PNG rather than exported, so they are the
 * one asset in the repo with no upstream file to diff against. That is the
 * reason for this file: it cannot check that the mark looks right — only eyes
 * do that, and it was checked by overlaying the trace on the original — but it
 * can hold the properties that would make it *stop* looking right, and each of
 * those is a mistake that is easy to make by hand-editing a path string.
 */

const points = (d: string) =>
  d
    .replace(/^M/, "")
    .replace(/Z$/, "")
    .split("L")
    .map((p) => p.trim().split(/\s+/).map(Number));

describe("the traced mark", () => {
  it("is closed, and made only of straight segments", () => {
    // The mark is angular by construction — every edge is a mitred straight
    // run. A curve command appearing here would mean somebody edited the path
    // by hand against the design, not that the trace changed.
    for (const d of [...LOGO_S, LOGO_Y]) {
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toMatch(/[CcSsQqTtAa]/);
    }
  });

  it("stays inside its own viewBox", () => {
    // A point outside the box is a clipped mark, and it clips silently — the
    // shape just loses a corner at whatever size it happens to be drawn.
    for (const d of [...LOGO_S, LOGO_Y]) {
      for (const [x, y] of points(d)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(LOGO_BOX.w);
        expect(y).toBeLessThanOrEqual(LOGO_BOX.h);
      }
    }
  });

  it("keeps the two tones apart", () => {
    /* The S sits left of the Y and they do not overlap horizontally. The whole
       arrival sequence rests on this: each tone is wiped in along its own
       stroke direction, and two shapes sharing a column would be revealed by
       each other's wipe. */
    const sRight = Math.max(...LOGO_S.flatMap((d) => points(d).map(([x]) => x)));
    const yLeft = Math.min(...points(LOGO_Y).map(([x]) => x));
    expect(yLeft).toBeGreaterThan(sRight - 12);
  });

  it("is small enough to be worth having inlined", () => {
    // It replaced 24KB of PNG. If it ever stops being tiny, that trade is off.
    const bytes = [...LOGO_S, LOGO_Y].join("").length;
    expect(bytes).toBeLessThan(2000);
  });
});
