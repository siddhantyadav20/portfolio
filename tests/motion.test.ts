import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOOT_SCRIPT } from "../lib/boot";
import { SCENE_MS, SCENE_PAGES, SCENE_SCRIPT } from "../lib/scene";
import { PRESS, RELEASE_EASE, pressScale } from "../lib/press";

/**
 * The press, the opening scene and the rise.
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
    const points = /^linear\((.*)\)$/
      .exec(RELEASE_EASE)![1]
      .split(",")
      .map(Number);
    expect(points[0]).toBe(0);
    expect(points[points.length - 1]).toBe(1);
    const peak = Math.max(...points);
    // Felt, not seen: a visible overshoot, but not a wobble.
    expect(peak).toBeGreaterThan(1.05);
    expect(peak).toBeLessThan(1.35);
  });
});

describe("scene", () => {
  const norm = (sel: string) =>
    sel
      .split(/,(?![^(]*\))/)
      .map((p) =>
        p
          .replace(/\s+/g, " ")
          .replace(/\s*([>~+(),])\s*/g, "$1")
          .trim(),
      )
      .filter(Boolean)
      .sort();
  /** The selector list inside `html[data-scene="<kind>"] :where( ... )`. */
  const hidden = (kind: string) => {
    const at = css.indexOf(`html[data-scene="${kind}"]`);
    const open = css.indexOf(":where(", at) + 7;
    let depth = 1;
    let i = open;
    for (; depth && i < css.length; i++) {
      if (css[i] === "(") depth++;
      if (css[i] === ")") depth--;
    }
    return css.slice(open, i - 1);
  };

  it("holds back exactly what the runtime lands", () => {
    /* An item the stylesheet hides and the runtime does not list is
       invisible until the scene ends; the other way round, it is drawn twice. */
    for (const kind of ["home", "study", "page"] as const)
      expect(norm(hidden(kind))).toEqual(norm(SCENE_PAGES[kind].items));
  });

  it("only runs on a document load, and never on back/forward or reduced motion", () => {
    expect(BOOT_SCRIPT).toMatch(/prefers-reduced-motion: reduce/);
    expect(BOOT_SCRIPT).toMatch(/back_forward/);
    // The boot is only ever an addition to the homepage's scene.
    expect(BOOT_SCRIPT).toMatch(
      /p==="\/"\)\{d\.setAttribute\("data-scene","home"\);if\(!localStorage[^}]*data-booting/,
    );
    expect(BOOT_SCRIPT).toMatch(/"data-scene","study"/);
  });

  it("lets the page go even if the runtime never runs", () => {
    expect(css).toMatch(/animation: scene-failsafe 1ms \d+s forwards;/);
  });

  it("is a loader with a ceiling, not a wait", () => {
    expect(SCENE_MS.hold).toBeLessThan(SCENE_MS.wait);
    // A reload with everything cached: frames, then down, in about a second.
    expect(SCENE_MS.hold + SCENE_MS.spread).toBeLessThanOrEqual(1000);
    expect(SCENE_MS.wait).toBeLessThanOrEqual(3000);
  });

  it("keeps off the properties the proximity field and the press own", () => {
    /* `transform` is written every frame by the field, and a fill that holds
       `scale` would sit over every later press. */
    const land = /@keyframes scene-land \{([\s\S]*?)\n\}/.exec(css)![1];
    const rise = /@keyframes rise \{([\s\S]*?)\n\}/.exec(css)![1];
    for (const body of [land, rise])
      expect(body).not.toMatch(/\btransform\s*:/);
    expect(SCENE_SCRIPT).toMatch(
      /scene-land "[^"]*"ms var\(--spring-drop\) "[^"]*"ms backwards/,
    );
    expect(css).toMatch(/animation: rise [^;]*\bbackwards;/);
  });
});
