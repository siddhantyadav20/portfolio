import { describe, expect, it } from "vitest";

import { LEAF_MS, PEEL, faceKeyframes, leafKeyframes, worldPose } from "@/lib/briefFlight";

/**
 * The brief's flight from the scratch card.
 *
 * The geometry is where this can go wrong without anything throwing: a sign
 * error in the rotation lands the leaf mirrored across the slot's centre, and
 * the only symptom is a strip of tape that jumps sideways when the real one
 * replaces it. Where things sit on the board is tests/board.test.ts.
 */

const nums = (t: string) => (t.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("worldPose", () => {
  it("is plain offset arithmetic when nothing is turned", () => {
    expect(worldPose({ x: 100, y: 200, w: 320, h: 320 }, { x: 0, y: 0, w: 320, h: 160 })).toEqual({
      cx: 260,
      cy: 280,
      rot: 0,
    });
  });

  it("turns with the slot, clockwise for a positive angle", () => {
    // A slot turned 90° carries its top-left corner to the top-right.
    const p = worldPose({ x: 0, y: 0, w: 100, h: 100, rotate: 90 }, { x: 0, y: 0, w: 10, h: 10 });
    expect(p.cx).toBeCloseTo(95);
    expect(p.cy).toBeCloseTo(5);
    expect(p.rot).toBe(90);
  });

  it("adds the rect's own tilt to the slot's", () => {
    expect(worldPose({ x: 0, y: 0, w: 10, h: 10, rotate: 4 }, { x: 0, y: 0, w: 10, h: 10, rot: -1.2 }).rot).toBeCloseTo(2.8);
  });
});

describe("the leaf's flight", () => {
  const from = { cx: 0, cy: 0, rot: 4 };
  const to = { cx: 380, cy: 20, rot: -4.2 };
  const kf = leafKeyframes(from, to);

  it("leaves from the ticket and lands on the tape exactly", () => {
    expect(kf[0].offset).toBe(0);
    expect(kf[0].transform).toBe("translate(0px, 0px) rotate(4deg) scale(1)");
    expect(kf.at(-1)!.offset).toBe(1);
    expect(kf.at(-1)!.transform).toBe("translate(380px, 20px) rotate(-4.2deg) scale(1)");
  });

  it("leaves at the camera's zoom and lands at 1:1", () => {
    const zoomed = leafKeyframes(from, to, 0.8, 1);
    expect(zoomed[0].transform).toBe("translate(0px, 0px) rotate(4deg) scale(0.8)");
    expect(zoomed.at(-1)!.transform).toBe("translate(380px, 20px) rotate(-4.2deg) scale(1)");
  });

  it("peels up before it travels, and arcs over the straight line", () => {
    const peel = nums(String(kf[1].transform));
    expect(kf[1].offset).toBe(PEEL);
    expect(peel[1]).toBeLessThan(from.cy);
    const mid = nums(String(kf[2].transform));
    const straight = from.cy + (to.cy - from.cy) * Number(kf[2].offset);
    expect(mid[1]).toBeLessThan(straight - 20);
  });

  it("hands the ticket face to the tape face at the same width", () => {
    const k = 228 / 320;
    const f = faceKeyframes(k);
    expect(f.ticket.at(-1)!.transform).toBe(`scale(${k})`);
    expect(f.tape[0].transform).toBe(`scale(${1 / k})`);
    expect(f.ticket.find((x) => x.opacity === 0)!.offset).toBeLessThan(1);
    expect(f.tape.find((x) => x.opacity === 1)!.offset).toBeLessThan(1);
  });

  it("never shows both texts at once", () => {
    // The double exposure the first crossfade made: a 27px serif and a 15px
    // one on screen together, out of register.
    const f = faceKeyframes(0.7);
    const ticketGone = f.ticketText.find((x) => x.opacity === 0)!.offset!;
    const tapeRises = Math.min(
      ...f.tapeText.map((x, i, all) =>
        Number(x.opacity) > 0 ? Number(all[i - 1]?.offset ?? 0) : Infinity,
      ),
    );
    expect(ticketGone).toBeLessThanOrEqual(tapeRises);
    // And the sheets swap material with no words on either.
    const sheetsStart = f.tape.find((x) => x.opacity === 0 && Number(x.offset) > 0)!.offset!;
    expect(ticketGone).toBeLessThanOrEqual(sheetsStart);
  });

  it("is quick", () => {
    expect(LEAF_MS).toBeGreaterThanOrEqual(700);
    expect(LEAF_MS).toBeLessThan(1100);
  });
});
