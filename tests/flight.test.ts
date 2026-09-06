/**
 * The DES -> ENG card's flight, checked as geometry rather than as a picture.
 *
 * Every number in `flight.ts` is a measurement of a 260x116 card, and the class
 * of bug this file exists to catch is a number that has quietly stopped
 * describing the thing it was measured from. Three of those shipped at once:
 *
 *   - the circuit home was placed with a badge radius of 16, but `ALT_LIFT`
 *     flies it at 16.96, so the disc sat 0.4px below the card's bottom edge
 *     with its shadow clipped off and 0.1px inside the "Design" label;
 *   - the curvature law was documented as a ceiling on speed and written as a
 *     multiplier, so the return spent its 1.68 climb-out boost inside its own
 *     16px peel and the nose fell 61deg behind the direction of travel;
 *   - the wheels fired on the first frame of every takeoff, because altitude
 *     is zero at both ends of a standing leg.
 *
 * None of the three is visible in a screenshot and all three are obvious in a
 * column of numbers, which is the argument for testing this at all. The card's
 * real geometry is rebuilt here rather than mocked: the same two cubics from
 * the `<path>`, the same viewBox mapping, the same Figma matrix. `readTrack` is
 * the only part of `flight.ts` that touches the DOM, and this replaces it.
 *
 * The assertions are deliberately loose bounds, not golden values. They should
 * survive the motion being re-tuned and fail if it is re-broken.
 */
import { describe, it, expect } from "vitest";
import {
  advance, at, homeWaypoints, makeFlight, nearest, spline, sub, track,
  type Flight, type Pt, type Track,
} from "@/components/home/DesignEngineerCard/flight";

const VB_W = 114.561, VB_H = 36.4017, EL_W = 114.21, EL_H = 35.43;
const M = { a: 0.9961, b: -0.0886, c: -0.0886, d: -0.9961, e: 73.43, f: 78.336 };
const SX = EL_W / VB_W, SY = EL_H / VB_H;
const toCard = (p: Pt): Pt => {
  const x = p.x * SX, y = p.y * SY;
  return { x: M.a * x + M.c * y + M.e, y: M.b * x + M.d * y + M.f };
};
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const s = 1 - t;
  return {
    x: s*s*s*p0.x + 3*s*s*t*p1.x + 3*s*t*t*p2.x + t*t*t*p3.x,
    y: s*s*s*p0.y + 3*s*s*t*p1.y + 3*s*t*t*p2.y + t*t*t*p3.y,
  };
};
const SEGS: [Pt, Pt, Pt, Pt][] = [
  [{x:0.279503,y:32.3408},{x:13.8039,y:23.2229},{x:75.1834,y:48.309},{x:62.3149,y:27.274}],
  [{x:62.3149,y:27.274},{x:49.4465,y:6.23894},{x:101.876,y:-1.1126},{x:114.487,y:0.788256}],
];
function routeTrack(): Track {
  const pts: Pt[] = [];
  for (const seg of SEGS) for (let i = 0; i <= 900; i++) pts.push(toCard(cubic(...seg, i / 900)));
  const raw = track(pts);
  const out: Pt[] = [];
  for (let s = 0; s <= raw.len; s += 0.3) out.push(at(raw, s));
  out.push(at(raw, raw.len));
  return track(out);
}

const REST: Pt = { x: 90.5, y: 45.03 };
const REST_ROT = 77.39, R = 16, ALT_LIFT = 0.06;
const CARD_H = 116, START_RIGHT = 62.5, DEST_LEFT = 174;
const OUT_MS = 1020, HOME_MS = 1520, WHEELS_DOWN = 0.02;
const nearestAngle = (a: number, b: number) => a + Math.round((b - a) / 360) * 360;

function build() {
  const route = routeTrack();
  const s0 = nearest(route, REST);
  const anchor = at(route, s0);
  const off: Pt = { x: REST.x - anchor.x, y: REST.y - anchor.y };
  const gap = REST.x - R - START_RIGHT;
  const stopX = DEST_LEFT - gap - R - off.x;
  let s1 = route.len;
  for (const n of route.nodes) if (n.x <= stopX) s1 = n.s;
  return { out: sub(route, s0, s1, off.x, off.y), s0 };
}

type Rec = { t:number; x:number; y:number; alt:number; head:number; rot:number; raw:number };
function fly(f: Flight): Rec[] {
  const r: Rec[] = []; let t = 0;
  for (let i = 0; i < 480; i++) {
    const fr = advance(f, 1/60); t += 1/60;
    r.push({ t, x: fr.x, y: fr.y, alt: fr.alt, head: fr.heading, rot: fr.rot, raw: f.rot });
    if (fr.settled) break;
  }
  return r;
}

describe("DES -> ENG card, as flight.ts now stands", () => {
  it("the badge stays inside the card and off both labels, on every way home", () => {
    const { out, s0 } = build();
    const o = fly(makeFlight(out, OUT_MS/1000, 0, REST_ROT, s0, 0));

    const starts: Rec[] = [o[o.length - 1]];
    for (const fr of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) starts.push(o[Math.floor(o.length * fr)]);

    let homeRef = 0, bottom = -Infinity, left = Infinity, right = -Infinity, lag = 0;
    for (let i = 0; i < starts.length; i++) {
      const p = starts[i];
      const t = track(spline(homeWaypoints({ x: p.x, y: p.y }, p.head, REST), 0.4));
      if (!homeRef) homeRef = t.len;
      const dur = (HOME_MS/1000) * Math.max(0.45, Math.min(1.1, (t.len/homeRef) ** 0.7));
      const er = t.nodes[t.nodes.length - 1].h + 90;
      const trim = nearestAngle(REST_ROT, er) - er;
      for (const r of fly(makeFlight(t, dur, trim, p.rot, -1, i === 0 ? 0 : Math.min(1, p.alt)))) {
        const rr = R * (1 + ALT_LIFT * r.alt);
        bottom = Math.max(bottom, r.y + rr);
        left = Math.min(left, r.x - rr);
        right = Math.max(right, r.x + rr);
        const want = r.head + 90 + trim;
        lag = Math.max(lag, Math.abs(((r.raw - want + 180) % 360 + 360) % 360 - 180));
      }
    }
    console.log(`bottom ${bottom.toFixed(1)} / ${CARD_H}   left ${left.toFixed(1)} > ${START_RIGHT}   right ${right.toFixed(1)} < ${DEST_LEFT}   worst lag ${lag.toFixed(0)}deg`);
    expect(bottom).toBeLessThan(CARD_H - 2);
    expect(left).toBeGreaterThan(START_RIGHT + 1.5);
    expect(right).toBeLessThan(DEST_LEFT);
    expect(lag).toBeLessThan(75);
  });

  it("the outbound still flies its hairpin the way it was tuned to", () => {
    const { out, s0 } = build();
    const recs = fly(makeFlight(out, OUT_MS/1000, 0, REST_ROT, s0, 0));
    let minV = Infinity, maxV = 0;
    for (let i = 1; i < recs.length; i++) {
      const v = Math.hypot(recs[i].x - recs[i-1].x, recs[i].y - recs[i-1].y) * 60;
      maxV = Math.max(maxV, v);
      if (recs[i].t > 0.2 && recs[i].t < 0.9) minV = Math.min(minV, v);
    }
    console.log(`outbound ${recs[recs.length-1].t.toFixed(2)}s, speed ${minV.toFixed(0)}..${maxV.toFixed(0)} px/s`);
    // It must still nearly stop in the turn and still boost on the straight.
    expect(minV).toBeLessThan(60);
    expect(maxV).toBeGreaterThan(190);
  });

  it("the wheels come down at the landing, not at the takeoff", () => {
    const { out, s0 } = build();
    const f = makeFlight(out, OUT_MS/1000, 0, REST_ROT, s0, 0);
    let airborne = false, wheels = -1, t = 0, total = 0;
    for (let i = 0; i < 480; i++) {
      const fr = advance(f, 1/60); t += 1/60;
      if (fr.alt > 0.5) airborne = true;
      if (airborne && wheels < 0 && fr.alt <= WHEELS_DOWN) wheels = t;
      if (fr.settled) { total = t; break; }
    }
    console.log(`wheels at ${wheels.toFixed(2)}s of a ${total.toFixed(2)}s leg`);
    expect(wheels).toBeGreaterThan(total * 0.6);
    expect(wheels).toBeLessThan(total);
  });
});
