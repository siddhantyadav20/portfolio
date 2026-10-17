import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ARRIVE_HOLD_MS, BOOT_SCRIPT } from "../lib/boot";
import { PRESS, RELEASE_EASE, pressScale } from "../lib/press";

/**
 * The press, the arrival and the rise.
 *
 * Loose on purpose, like `viewTransition.test.ts`: the feel can be re-tuned
 * freely, and only the properties that make it read as one material — or
 * that would cut a motion off part-way — are held.
 */

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

describe("press", () => {
  it("gives by a depth, not a percentage", () => {
    /* The two ends of the homepage: the Inspection card and a CTA pill. A
       uniform percentage would sag the card by ~19px; a depth keeps both
       presses within a few pixels of each other. */
    const card = { w: 420, h: 640 };
    const pill = { w: 172, h: 48 };
    const sag = ({ w, h }: { w: number; h: number }) =>
      (1 - pressScale(w, h)) * Math.max(w, h);
    expect(sag(card)).toBeLessThan(12);
    expect(sag(pill)).toBeLessThan(8);
    expect(pressScale(420, 640)).toBeGreaterThan(pressScale(172, 48));
  });

  it("is always visible and never a collapse", () => {
    for (const [w, h] of [
      [1, 1],
      [24, 24],
      [48, 48],
      [200, 120],
      [1440, 900],
      [4000, 4000],
    ]) {
      const s = pressScale(w, h);
      expect(s).toBeGreaterThanOrEqual(1 - PRESS.most - 1e-9);
      expect(s).toBeLessThanOrEqual(1 - PRESS.least + 1e-9);
    }
  });

  it("goes down faster than it comes back", () => {
    expect(PRESS.inMs).toBeLessThan(PRESS.outMs);
    // An answer to a finger: much past a tenth of a second reads as lag.
    expect(PRESS.inMs).toBeLessThanOrEqual(130);
  });

  it("comes back past rest, once, and lands exactly on it", () => {
    const points = /^linear\((.*)\)$/.exec(RELEASE_EASE)![1].split(",").map(Number);
    expect(points[0]).toBe(0);
    expect(points[points.length - 1]).toBe(1);
    const peak = Math.max(...points);
    // Felt, not seen: a visible overshoot, but not a wobble.
    expect(peak).toBeGreaterThan(1.05);
    expect(peak).toBeLessThan(1.35);
  });
});

describe("arrival", () => {
  const step = Number(/animation-delay: calc\(var\(--arrive, \d+\) \* (\d+)ms\)/.exec(css)?.[1]);
  const rings = [...css.matchAll(/--arrive: (\d+);/g)].map((m) => Number(m[1]));
  const fallback = Number(/var\(--arrive, (\d+)\)/.exec(css)?.[1]);
  const base = Number(/--dur-base: (\d+)ms/.exec(css)?.[1]);

  it("is written the way this test reads it", () => {
    expect(step).toBeGreaterThan(0);
    expect(rings.length).toBeGreaterThan(3);
    expect(base).toBeGreaterThan(0);
    expect(/animation: arrive var\(--dur-base\)/.test(css)).toBe(true);
  });

  it("finishes before the attribute that runs it is taken down", () => {
    /* `data-arriving` comes off ARRIVE_HOLD_MS after the first frame. A card
       still animating then loses its animation and snaps to rest — a cut on
       the last card or two, which is exactly where nobody looks in review. */
    const last = Math.max(...rings, fallback) * step + base;
    expect(last).toBeLessThan(ARRIVE_HOLD_MS);
  });

  it("is short enough not to be a loader", () => {
    const last = Math.max(...rings, fallback) * step + base;
    expect(last).toBeLessThanOrEqual(700);
  });

  it("never runs on the first visit, alongside the boot", () => {
    // One branch sets `data-booting`, the other `data-arriving`; never both.
    expect(BOOT_SCRIPT).toMatch(/if\(!localStorage\.getItem\([^)]*\)\)\{[^}]*data-booting[^}]*\}else\{[^}]*data-arriving/);
  });

  it("keeps off the properties the proximity field and the press own", () => {
    /* `transform` is written every frame by the field, and a fill that holds
       `scale` would sit over every later press. */
    const arrive = /@keyframes arrive \{([\s\S]*?)\n\}/.exec(css)![1];
    const rise = /@keyframes rise \{([\s\S]*?)\n\}/.exec(css)![1];
    for (const body of [arrive, rise]) expect(body).not.toMatch(/\btransform\s*:/);
    expect(css).toMatch(/animation: arrive [^;]*\bbackwards;/);
    expect(css).toMatch(/animation: rise [^;]*\bbackwards;/);
  });
});
