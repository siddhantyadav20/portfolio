import { describe, expect, it } from "vitest";
import { handles, smoothClosedPath, type SplinePoint } from "@/lib/spline";

/**
 * The Catmull-Rom conversion, and the one assertion that pins it.
 *
 * The two handle expressions are near mirror images of each other, and getting
 * which point each term multiplies the wrong way round does not produce a
 * subtly-off curve — it produces tangents pointing backwards, and a shape that
 * comes out as a starburst of spikes. It shipped that way for one commit,
 * found by looking at it.
 *
 * With uniform spacing the formula must collapse to the classic uniform
 * Catmull-Rom handles, `p1 + (p2 - p0) / 6` and `p2 - (p3 - p1) / 6`. That is a
 * closed-form answer this can be checked against, and it is the check that
 * would have caught the swap in a second.
 */
const P = (x: number, y: number, corner?: true): SplinePoint => ({ x, y, corner });

describe("catmull-rom handles", () => {
  it("collapses to the uniform formula when the knots are evenly spaced", () => {
    // Four points a constant 10 apart along x, so every knot interval matches.
    const p0 = P(0, 0);
    const p1 = P(10, 0);
    const p2 = P(20, 0);
    const p3 = P(30, 0);

    const [c1, c2] = handles(p0, p1, p2, p3);

    expect(c1.x).toBeCloseTo(p1.x + (p2.x - p0.x) / 6, 6);
    expect(c2.x).toBeCloseTo(p2.x - (p3.x - p1.x) / 6, 6);
  });

  it("puts the handles between their own endpoints, not behind them", () => {
    // The failure mode: a tangent pointing away from the segment. On a curve
    // travelling left to right, both handles must sit inside the span.
    const [c1, c2] = handles(P(0, 10), P(10, 0), P(20, 0), P(30, 10));

    expect(c1.x).toBeGreaterThan(10);
    expect(c1.x).toBeLessThan(20);
    expect(c2.x).toBeGreaterThan(10);
    expect(c2.x).toBeLessThan(20);
  });

  it("keeps a straight run straight", () => {
    // Collinear points must not bow. A sign error shows up here as a handle
    // flung off the line.
    const [c1, c2] = handles(P(0, 5), P(10, 5), P(20, 5), P(30, 5));
    expect(c1.y).toBeCloseTo(5, 6);
    expect(c2.y).toBeCloseTo(5, 6);
  });

  it("survives two points landing on top of each other", () => {
    // A typo in a landmark list. It must not produce NaN, which reaches the
    // path string as an invisible shape rather than as an error.
    const [c1, c2] = handles(P(0, 0), P(10, 0), P(10, 0), P(20, 0));
    expect(Number.isFinite(c1.x)).toBe(true);
    expect(Number.isFinite(c2.y)).toBe(true);
  });
});

describe("the closed path", () => {
  const SQUARE = [P(0, 0), P(10, 0), P(10, 10), P(0, 10)];

  it("starts at the first point and closes", () => {
    const d = smoothClosedPath(SQUARE);
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("emits one segment per point, so the loop is actually closed", () => {
    // Four points is four segments — the last one runs back to the first.
    const d = smoothClosedPath(SQUARE);
    expect((d.match(/[CL]/g) ?? []).length).toBe(4);
  });

  it("draws a line either side of a corner, and a curve everywhere else", () => {
    const d = smoothClosedPath([P(0, 0), P(10, 0), P(10, 10, true), P(0, 10)]);
    // Segments 1->2 and 2->3 touch the corner; the other two are curves.
    expect((d.match(/L/g) ?? []).length).toBe(2);
    expect((d.match(/C/g) ?? []).length).toBe(2);
  });

  it("never emits NaN", () => {
    expect(smoothClosedPath(SQUARE)).not.toMatch(/NaN/);
  });

  it("has something to say about degenerate input", () => {
    expect(smoothClosedPath([])).toBe("");
    expect(smoothClosedPath([P(1, 2)])).toBe("M 1 2 Z");
    expect(smoothClosedPath([P(1, 2), P(3, 4)])).toBe("M 1 2 L 3 4 Z");
  });
});
