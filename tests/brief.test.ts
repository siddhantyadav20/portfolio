import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { benchedBriefs, briefs } from "@/content/canvas";
import { getStudy } from "@/content/work";
import {
  BRIEF_MAX,
  CONSTRAINT_MAX,
  TAKE_MAX,
  closeStudio,
  landStudio,
  openStudio,
  pickBrief,
  readHanded,
  readStudio,
  recordHandIn,
  setStudioPhase,
} from "@/lib/brief";
import { FRAME_LABEL } from "@/components/canvas/studio/frames";

/**
 * The scratch card's deck, the Studio's state, and what is handed in.
 *
 * The length checks are the ones that matter: the ticket and the take are
 * fixed-size cards, and copy that wraps one line too far slides under the
 * buttons — silently, and only for the one brief that is too long, which
 * nobody will scratch while checking a change.
 */

const ROOT = join(__dirname, "..");

describe("the brief deck", () => {
  it("has unique ids, bench included", () => {
    const ids = [...briefs, ...benchedBriefs].map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fits the ticket", () => {
    for (const b of [...briefs, ...benchedBriefs]) {
      expect(b.brief.length, b.id).toBeLessThanOrEqual(BRIEF_MAX);
      expect(b.constraint.length, b.id).toBeLessThanOrEqual(CONSTRAINT_MAX);
      expect(b.seconds, b.id).toBeGreaterThan(0);
    }
  });

  it("gives every dealt brief a frame to sketch in", () => {
    for (const b of briefs) expect(FRAME_LABEL[b.frame], b.id).toBeTruthy();
  });
});

describe("the takes", () => {
  it("gives every dealt brief a take that fits", () => {
    for (const b of briefs) {
      expect(b.take.note.trim().length, b.id).toBeGreaterThan(40);
      expect(b.take.note.length, b.id).toBeLessThanOrEqual(TAKE_MAX);
    }
  });

  it("links only to studies that exist", () => {
    for (const b of briefs) {
      if (!b.take.study) continue;
      const slug = b.take.study.href.replace(/^\/work\//, "");
      expect(getStudy(slug), b.id).toBeDefined();
    }
  });

  it("points only at sketches that exist", () => {
    for (const b of briefs) {
      if (!b.take.sketch) continue;
      expect(existsSync(join(ROOT, "public", b.take.sketch)), b.id).toBe(true);
    }
  });
});

describe("the Studio", () => {
  it("opens on the brief, lands the torn half, sketches, turns to the take, and remembers it when put down", () => {
    const b = briefs[3];
    openStudio(b, { landed: false });
    // One job per screen: the brief is read before the clock starts.
    expect(readStudio()).toMatchObject({ brief: b, phase: "brief", landed: false, open: true });
    landStudio();
    expect(readStudio()!.landed).toBe(true);
    setStudioPhase("draw");
    expect(readStudio()!.phase).toBe("draw");
    setStudioPhase("take");
    expect(readStudio()!.phase).toBe("take");
    closeStudio();
    // Closed, not forgotten: "Back to the paper" returns to the same sheet.
    expect(readStudio()).toMatchObject({ brief: b, phase: "take", open: false });
  });
});

describe("handing in", () => {
  it("remembers the sketch by brief, even with no storage to keep it in", () => {
    // No window here, as in a browser that refuses storage: nothing throws.
    recordHandIn("cancel-flow", "data:image/png;base64,AAAA");
    expect(readHanded()["cancel-flow"]).toBe("data:image/png;base64,AAAA");
  });

  it("keeps only the last ten", () => {
    for (let i = 0; i < 14; i++) recordHandIn(`b${i}`, `t${i}`);
    const kept = Object.keys(readHanded());
    expect(kept.length).toBe(10);
    expect(kept).toContain("b13");
    expect(kept).not.toContain("b0");
  });
});

describe("dealing", () => {
  it("never repeats a brief while unseen ones remain", () => {
    const seen = new Set<string>();
    for (let i = 0; i < briefs.length; i++) {
      const b = pickBrief(seen);
      expect(seen.has(b.id)).toBe(false);
      seen.add(b.id);
    }
  });

  it("does not deal the last brief again when the deck reshuffles", () => {
    const all = new Set(briefs.map((b) => b.id));
    for (let i = 0; i < 200; i++) {
      const last = briefs[i % briefs.length].id;
      expect(pickBrief(all, last).id).not.toBe(last);
    }
  });

  it("reaches every brief", () => {
    const all = new Set(briefs.map((b) => b.id));
    const got = new Set<string>();
    briefs.forEach((_, i) => got.add(pickBrief(new Set(), null, () => i / briefs.length).id));
    expect(got).toEqual(all);
  });
});
