import { describe, expect, it } from "vitest";
import { arrowHead, constrain } from "@/components/canvas/ink/ink";
import { angleOf, linearOf, multiply, toLocal, type Frame, type Linear } from "@/components/canvas/ink/local";

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

/** Where a local point lands on screen under a frame — the forward map. */
function toScreen(f: Frame, x: number, y: number) {
  const [a, b, c, d] = f.m;
  const lx = x - f.w / 2;
  const ly = y - f.h / 2;
  return { x: f.centre.x + a * lx + c * ly, y: f.centre.y + b * lx + d * ly };
}

describe("angleOf", () => {
  it("reads the computed forms of `rotate`", () => {
    expect(near(angleOf("2deg"), (2 * Math.PI) / 180)).toBe(true);
    expect(near(angleOf("-0.5turn"), -Math.PI)).toBe(true);
    expect(near(angleOf("0 0 1 90deg"), Math.PI / 2)).toBe(true);
    expect(angleOf("none")).toBe(0);
    expect(angleOf(undefined)).toBe(0);
  });

  it("ignores a tilt about x or y rather than misreading it as a spin", () => {
    expect(angleOf("1 0 0 45deg")).toBe(0);
    expect(angleOf("x 45deg")).toBe(0);
  });
});

describe("linearOf", () => {
  it("applies rotate before scale, the way CSS composes them", () => {
    const [a, b, c, d] = linearOf({ rotate: "90deg", scale: "2", transform: "none" });
    expect([a, b, c, d].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([0, 2, -2, 0]);
  });

  it("is the identity for an untransformed element", () => {
    expect(linearOf({ rotate: "none", scale: "none", transform: "none" })).toEqual([1, 0, 0, 1]);
  });
});

describe("toLocal", () => {
  // The board's drawing canvas: 320 square, in a slot at -2°, on a world
  // zoomed to 1.5.
  const theta = (-2 * Math.PI) / 180;
  const rotation: Linear = [Math.cos(theta), Math.sin(theta), -Math.sin(theta), Math.cos(theta)];
  const zoom: Linear = [1.5, 0, 0, 1.5];
  const frame: Frame = { m: multiply(zoom, rotation), centre: { x: 700, y: 420 }, w: 320, h: 320 };

  it("puts the ink exactly under the pointer, corners included", () => {
    for (const [x, y] of [
      [0, 0],
      [320, 0],
      [0, 320],
      [320, 320],
      [160, 160],
      [37, 251],
    ]) {
      const s = toScreen(frame, x, y);
      const back = toLocal(frame, s.x, s.y);
      expect(near(back.x, x, 1e-6) && near(back.y, y, 1e-6)).toBe(true);
    }
  });

  it("is what the bounding-box mapping got wrong", () => {
    // The old mapping: offset into the axis-aligned box, scaled by its width.
    const box = 1.5 * (320 * Math.abs(Math.cos(theta)) + 320 * Math.abs(Math.sin(theta)));
    const left = frame.centre.x - box / 2;
    const top = frame.centre.y - box / 2;
    const corner = toScreen(frame, 320, 0);
    const old = { x: ((corner.x - left) / box) * 320, y: ((corner.y - top) / box) * 320 };
    // On the canvas, at the far corner — and on screen that is 1.5x as far.
    expect(Math.hypot(old.x - 320, old.y) * 1.5).toBeGreaterThan(15);
  });
});

describe("constrain", () => {
  it("squares a box on the longer side, keeping the drag's direction", () => {
    expect(constrain("box", { x: 100, y: 100 }, { x: 40, y: 180 })).toEqual({ x: 20, y: 180 });
  });

  it("snaps an arrow to the nearest 45°", () => {
    const p = constrain("arrow", { x: 0, y: 0 }, { x: 100, y: 12 });
    expect(near(p.y, 0, 1e-9)).toBe(true);
    expect(near(p.x, Math.hypot(100, 12), 1e-9)).toBe(true);
  });
});

describe("arrowHead", () => {
  it("sits symmetric about the shaft and never outgrows it", () => {
    const [l, r] = arrowHead({ x: 0, y: 0 }, { x: 40, y: 0 }, 8);
    expect(near(l.y, -r.y, 1e-9)).toBe(true);
    expect(near(l.x, r.x, 1e-9)).toBe(true);
    expect(40 - l.x).toBeLessThanOrEqual(40 * 0.45 + 1e-9);
  });
});
