import { describe, expect, it } from "vitest";

import {
  CLUSTER_LABELS,
  CLUSTERS,
  DISTRICT_ANCHORS,
  DISTRICT_LABELS,
  clusterAt,
  clusterBounds,
  clusterView,
  homeScale,
  widgets,
  WORLD_H,
  WORLD_W,
  type Widget,
} from "@/content/canvas";

/**
 * The board's neighbourhoods.
 *
 * The failure this guards is the one that made the dock meaningless: kinds of
 * thing scattered across the world, so a tab framed the whole board at the
 * zoom floor. Every rule here is about a tab landing on a place you can read.
 */

/** A rotated widget's axis-aligned box — what it actually covers. */
function box(w: Widget) {
  const a = ((w.rotate ?? 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const hw = (w.w * c + w.h * s) / 2;
  const hh = (w.h * c + w.w * s) / 2;
  const cx = w.x + w.w / 2;
  const cy = w.y + w.h / 2;
  return { l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh };
}

describe("the layout", () => {
  it("keeps everything on the board", () => {
    for (const w of widgets) {
      const b = box(w);
      expect(b.l, w.id).toBeGreaterThanOrEqual(0);
      expect(b.t, w.id).toBeGreaterThanOrEqual(0);
      expect(b.r, w.id).toBeLessThanOrEqual(WORLD_W);
      expect(b.b, w.id).toBeLessThanOrEqual(WORLD_H);
    }
  });

  it("puts nothing on top of anything else, with air between", () => {
    const pad = 20;
    for (let i = 0; i < widgets.length; i++) {
      for (let j = i + 1; j < widgets.length; j++) {
        const a = box(widgets[i]);
        const b = box(widgets[j]);
        const overlap = a.l - pad < b.r && a.r + pad > b.l && a.t - pad < b.b && a.b + pad > b.t;
        expect(overlap, `${widgets[i].id} / ${widgets[j].id}`).toBe(false);
      }
    }
  });

  it("keeps a river between neighbourhoods, so each reads as a group", () => {
    // One gap everywhere made the board one undifferentiated crowd. And
    // clusterAt's nearest-box rule depends on the boxes never overlapping.
    for (let i = 0; i < widgets.length; i++) {
      for (let j = i + 1; j < widgets.length; j++) {
        const [p, q] = [widgets[i], widgets[j]];
        if (p.cluster === q.cluster) continue;
        const a = box(p);
        const b = box(q);
        const gap = Math.max(b.l - a.r, a.l - b.r, b.t - a.b, a.t - b.b);
        expect(gap, `${p.id} / ${q.id}`).toBeGreaterThanOrEqual(120);
      }
    }
    const boxes = CLUSTERS.map((c) => [c, clusterBounds(c)] as const);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [ca, a] = boxes[i];
        const [cb, b] = boxes[j];
        const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2;
        expect(apart, `${ca} / ${cb}`).toBe(true);
      }
    }
  });

  it("sets each neighbourhood's name clear of every widget", () => {
    for (const c of CLUSTERS) {
      const { x, y } = DISTRICT_LABELS[c];
      // 13px caps at 0.18em tracking, plus the leading rule.
      const label = { l: x, r: x + CLUSTER_LABELS[c].length * 12 + 30, t: y, b: y + 20 };
      for (const w of widgets) {
        const b = box(w);
        const overlap = label.l < b.r && label.r > b.l && label.t < b.b && label.b > b.t;
        expect(overlap, `${c} label / ${w.id}`).toBe(false);
      }
    }
  });
});

describe("the dock", () => {
  it("frames every neighbourhood whole and readable on a laptop", () => {
    for (const c of CLUSTERS) {
      const v = clusterView(c, 1440, 900);
      expect(v.scale, c).toBeGreaterThanOrEqual(0.75);
      // Every member inside the framed view.
      const halfW = 1440 / 2 / v.scale;
      const halfH = 900 / 2 / v.scale;
      for (const w of widgets.filter((x) => x.cluster === c)) {
        const b = box(w);
        expect(b.l, `${c}: ${w.id}`).toBeGreaterThanOrEqual(v.x - halfW);
        expect(b.r, `${c}: ${w.id}`).toBeLessThanOrEqual(v.x + halfW);
        expect(b.t, `${c}: ${w.id}`).toBeGreaterThanOrEqual(v.y - halfH);
        expect(b.b, `${c}: ${w.id}`).toBeLessThanOrEqual(v.y + halfH);
      }
    }
  });

  it("goes to a neighbourhood's anchor on a phone, filling the width", () => {
    for (const c of CLUSTERS) {
      const v = clusterView(c, 390, 844);
      const a = widgets.find((w) => w.id === DISTRICT_ANCHORS[c])!;
      expect(a.cluster, c).toBe(c);
      expect(a.w * v.scale, c).toBeLessThanOrEqual(390 - 32);
      expect(v.scale, c).toBeGreaterThan(0.5);
    }
  });

  it("lights the tab for wherever the camera is", () => {
    // Every widget's centre is in its own neighbourhood, as far as the dock
    // is concerned.
    for (const w of widgets) {
      expect(clusterAt(w.x + w.w / 2, w.y + w.h / 2), w.id).toBe(w.cluster);
    }
  });
});

describe("arriving", () => {
  it("opens 1:1 on a laptop and fits the profile card on a phone", () => {
    expect(homeScale(1440)).toBe(1);
    const profile = widgets.find((w) => w.id === "profile")!;
    expect(profile.w * homeScale(375)).toBeLessThanOrEqual(375 - 32 + 0.001);
  });
});
