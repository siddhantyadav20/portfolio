import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOGO_BOX, LOGO_PARTS, type LogoPart } from "@/content/logo";

/**
 * The mark, as geometry.
 *
 * These paths were derived from a bitmap rather than exported, so they are the
 * one asset in the repo with no upstream file to diff against. That is the
 * reason for this file: it cannot check that the mark looks right — only eyes
 * do that, and it was checked by overlaying the result on the original — but it
 * can hold the properties that would make it *stop* looking right.
 *
 * The largest risk is not the path. It is that `nodes` and `d` describe the
 * same curve today and quietly stop agreeing later, because they are two
 * renderings of one thing and only one of them is visible in the mark. The
 * loader draws the other one. So most of what follows checks them against each
 * other.
 */

type Seg =
  | { kind: "L"; from: [number, number]; to: [number, number] }
  | { kind: "C"; from: [number, number]; c1: [number, number]; c2: [number, number]; to: [number, number] };

/** Enough of an SVG path parser for the three strings this file owns. */
function parse(d: string): { start: [number, number]; segs: Seg[] } {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g) ?? [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  const pair = (): [number, number] => [num(), num()];
  expect(tokens[i++]).toBe("M");
  const start = pair();
  let cur = start;
  const segs: Seg[] = [];
  while (i < tokens.length) {
    const op = tokens[i++];
    if (op === "Z") {
      // The close is a straight segment like any other, and the loader draws it.
      if (cur[0] !== start[0] || cur[1] !== start[1]) segs.push({ kind: "L", from: cur, to: start });
      break;
    }
    if (op === "L") {
      const to = pair();
      segs.push({ kind: "L", from: cur, to });
      cur = to;
    } else if (op === "C") {
      const c1 = pair(), c2 = pair(), to = pair();
      segs.push({ kind: "C", from: cur, c1, c2, to });
      cur = to;
    } else {
      throw new Error(`unexpected path command ${op}`);
    }
  }
  return { start, segs };
}

const bez = (s: Extract<Seg, { kind: "C" }>, t: number): [number, number] => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
  return [
    a * s.from[0] + b * s.c1[0] + c * s.c2[0] + e * s.to[0],
    a * s.from[1] + b * s.c1[1] + c * s.c2[1] + e * s.to[1],
  ];
};

function length(seg: Seg): number {
  if (seg.kind === "L") return Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
  let total = 0, prev = seg.from;
  for (let k = 1; k <= 128; k++) {
    const p = bez(seg, k / 128);
    total += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return total;
}

const points = (part: LogoPart) =>
  parse(part.d).segs.flatMap((s) => (s.kind === "L" ? [s.from, s.to] : [s.from, s.c1, s.c2, s.to]));

describe("the mark", () => {
  it("is three closed paths in two tones", () => {
    expect(LOGO_PARTS).toHaveLength(3);
    expect(LOGO_PARTS.map((p) => p.tone)).toEqual(["s", "s", "y"]);
    for (const part of LOGO_PARTS) {
      expect(part.d.startsWith("M")).toBe(true);
      expect(part.d.endsWith("Z")).toBe(true);
      // Arcs would be a hand edit: the fit only ever emits lines and cubics.
      expect(part.d).not.toMatch(/[HhVvSsQqTtAa]/);
    }
  });

  it("stays inside its own box", () => {
    /* Control points included, deliberately. A handle outside the box is not
       clipped — SVG only clips the drawn result — but it means a corner is
       being rounded by a curve that leaves the shape, and the loader draws
       those handles where anyone can see them. */
    for (const part of LOGO_PARTS) {
      for (const [x, y] of points(part)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(LOGO_BOX.w);
        expect(y).toBeLessThanOrEqual(LOGO_BOX.h);
      }
    }
  });

  it("fills its box on both axes", () => {
    // The box is the artwork's bounds, not a canvas it sits inside. If it stops
    // being that, `.logo`'s width and height stop describing the mark.
    const all = LOGO_PARTS.flatMap((p) => parse(p.d).segs.flatMap((s) => [s.from, s.to]));
    expect(Math.min(...all.map((p) => p[0]))).toBeCloseTo(0, 1);
    expect(Math.min(...all.map((p) => p[1]))).toBeCloseTo(0, 1);
    expect(Math.max(...all.map((p) => p[0]))).toBeCloseTo(LOGO_BOX.w, 1);
    expect(Math.max(...all.map((p) => p[1]))).toBeCloseTo(LOGO_BOX.h, 1);
  });

  it("draws every straight edge at 0, 45 or 90 degrees", () => {
    /* The mark is built on horizontals, verticals and 45s — that is what the
       line fits found in the original, to within two hundredths of a degree,
       and it is the property the polygon trace lost. A straight run arriving
       at 44.2 is the tell that somebody edited a path by hand. */
    for (const part of LOGO_PARTS) {
      for (const seg of parse(part.d).segs) {
        if (seg.kind !== "L") continue;
        const deg = (Math.atan2(seg.to[1] - seg.from[1], seg.to[0] - seg.from[0]) * 180) / Math.PI;
        const off = Math.abs(((deg % 45) + 45) % 45);
        expect(Math.min(off, 45 - off)).toBeLessThan(0.05);
      }
    }
  });

  it("keeps the two tones apart", () => {
    /* The S sits left of the Y and they do not overlap horizontally. The
       arrival sequence rests on this: the two tones are filled on their own
       beats, and two shapes sharing a column would be revealed by each
       other's. */
    const xs = (tone: "s" | "y") =>
      LOGO_PARTS.filter((p) => p.tone === tone).flatMap((p) => points(p).map(([x]) => x));
    expect(Math.min(...xs("y"))).toBeGreaterThan(Math.max(...xs("s")) - 12);
  });

  it("gives every anchor the handles the path actually has", () => {
    /* `nodes` is what the loader draws. It is generated from the same fit as
       `d`, and this is the check that it still is: every anchor is a segment
       boundary, and its two handles are that segment's control points — or
       null where the neighbouring segment is straight and has none. */
    for (const part of LOGO_PARTS) {
      const { segs } = parse(part.d);
      expect(part.nodes).toHaveLength(segs.length);
      part.nodes.forEach((node, i) => {
        const after = segs[i];
        const before = segs[(i - 1 + segs.length) % segs.length];
        expect(node.on[0]).toBeCloseTo(after.from[0], 5);
        expect(node.on[1]).toBeCloseTo(after.from[1], 5);
        expect(node.fwd).toEqual(after.kind === "C" ? after.c1 : null);
        expect(node.back).toEqual(before.kind === "C" ? before.c2 : null);
      });
    }
  });

  it("places every anchor where it really falls along the path", () => {
    /* `at` is an arc-length fraction and it is the loader's clock: an anchor
       lights up when the drawn stroke reaches it. Off by a few percent and the
       anchors appear before or after the line that made them, which is the one
       thing that would give the whole gesture away. */
    for (const part of LOGO_PARTS) {
      const lens = parse(part.d).segs.map(length);
      const total = lens.reduce((a, b) => a + b, 0);
      expect(part.len).toBeCloseTo(total, 0);
      let acc = 0;
      part.nodes.forEach((node, i) => {
        expect(node.at).toBeCloseTo(acc / total, 2);
        acc += lens[i];
      });
    }
  });

  it("is small enough to be worth having inlined", () => {
    // It replaced 24KB of PNG. If it ever stops being tiny, that trade is off.
    const bytes = JSON.stringify(LOGO_PARTS).length;
    expect(bytes).toBeLessThan(5000);
  });
});

/**
 * The tab icon.
 *
 * `app/icon.svg` is the mark again, in a square box, with the two tones as a
 * `prefers-color-scheme` media query so one file serves a light tab bar and a
 * dark one. It is generated by `scripts/build-icon.mjs` and checked in, which
 * means the mark now lives in two places — and the second one is a file nobody
 * looks at, in a size where being subtly wrong is invisible.
 *
 * So this is the thing that notices. Change the mark without re-running the
 * script and the paths stop matching here.
 */
describe("the tab icon", () => {
  const svg = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");

  it("draws the mark's own paths, in order and in the right tones", () => {
    const drawn = [...svg.matchAll(/<path fill="var\(--mark-([sy])\)" d="([^"]+)"\/>/g)].map(
      ([, tone, d]) => ({ tone, d }),
    );

    expect(drawn).toEqual(LOGO_PARTS.map((part) => ({ tone: part.tone, d: part.d })));
  });

  it("centres the mark in a square box", () => {
    const box = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
    expect(box).not.toBeNull();
    const [x, y, w, h] = box!.slice(1).map(Number);

    // Square, or it is not a favicon.
    expect(w).toBe(h);

    // The mark sits inside it with room on every side, and the same amount
    // above as below — the vertical air is the mark's own proportion, not a
    // choice, so an off-centre box would be a mistake rather than a design.
    expect(x).toBeLessThan(0);
    expect(x + w).toBeGreaterThan(LOGO_BOX.w);
    expect(-y).toBeCloseTo(y + h - LOGO_BOX.h, 5);
  });

  it("carries both themes in the one file", () => {
    expect(svg).toContain("prefers-color-scheme: dark");
    // Four declarations: two tones, twice.
    expect(svg.match(/--mark-[sy]:/g)).toHaveLength(4);
  });
});
