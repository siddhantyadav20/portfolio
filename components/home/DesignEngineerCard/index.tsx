"use client";

import { useEffect, useId, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import { designEngineer } from "@/content/site";
import {
  advance,
  at,
  clamp,
  frameOf,
  homeWaypoints,
  makeFlight,
  nearest,
  nearestAngle,
  readTrack,
  spline,
  sub,
  track,
  type Flight,
  type Pt,
} from "./flight";
import { createJet, type Jet } from "./jet";
import styles from "./DesignEngineerCard.module.css";

/** The dotted route, verbatim from `public/icons/journey.svg`. Inlined rather
 *  than left as an `<img>` so the flight can be measured off the real path and
 *  the trail can be masked against it — the drawn result is identical. */
const ROUTE =
  "M0.279503 32.3408C13.8039 23.2229 75.1834 48.309 62.3149 27.274C49.4465 6.23894 101.876 -1.1126 114.487 0.788256";

/* --- Tuning ---------------------------------------------------------------
   Times in ms. Outbound is the shorter, brisker leg: the plane is going
   somewhere. Home is longer and quieter — it has further to travel and no
   errand to run. Both are nominal; the curvature term inside flight.ts
   redistributes them across the route, spending more of the budget in the
   turns than on the straights.
   -------------------------------------------------------------------------- */

const OUT_MS = 1020;
const HOME_MS = 1520;

/** How far behind the plane the route stays lit, px of arc. Three overlapping
 *  windows in the mask composite into one stepped falloff. */
const TRAIL = [10, 20, 32] as const;

/** The trail starts at the badge's trailing edge rather than at the plane —
 *  the disc is 32px across, so anything closer than its radius is simply
 *  hidden underneath it and the tail reads as far shorter than it is. */
const TRAIL_LAG = 15;

/** Settling time (ms) for the trail's own opacity — it wants to arrive with
 *  the takeoff and linger for a moment after the landing. */
const TRAIL_IN = 140;
const TRAIL_OUT = 420;

/** rAF is suspended in a backgrounded tab; cap the first frame back. */
const DT_CEILING = 1 / 30;

/* --- Being off the ground --------------------------------------------------
   A plan view has no pitch to show, so the takeoff and the landing have to be
   carried by the two things a plan view does have: how big the aircraft is and
   what its shadow is doing. The badge grows very slightly and casts further as
   it climbs. Both are driven by the same `alt` the flight reports. ---------- */

/** Extra scale on the badge at cruise. Deliberately small — this is parallax,
 *  not a zoom. */
const ALT_LIFT = 0.06;

/** Below this the wheels are considered down: dust, scuff, and the compression
 *  below. */
const WHEELS_DOWN = 0.02;

/* --- Touchdown -------------------------------------------------------------
   The gear taking the weight, as a decaying oscillation on the badge's scale.
   Not a CSS animation: the badge's transform is written every frame, and a
   keyframe animation on the same property would win the cascade and fight it. */

const SQUASH = 0.12;
const SQUASH_TAU = 0.2;
/** Ringing frequency, rad/s. Two visible compressions, then it is over. */
const SQUASH_W = 26;
const SQUASH_FOR = 0.8;

/** The exhaust: throttle mapped to plume. Zero on the approach, half at
 *  cruise, full through the climb-out. */
const PLUME_FLOOR = 0.5;
const PLUME_SPAN = 0.85;

/**
 * Whether the card makes any noise. Turn this off and every reference to the
 * synth below no-ops — nothing else has to change.
 *
 * It is also off under reduced motion, and it stays silent on a page the user
 * has not yet interacted with, because browsers refuse to start audio there.
 */
const SOUND = true;

type Focus = "designer" | "transit" | "engineer";

export default function DesignEngineerCard() {
  const { from, to } = designEngineer;
  const [focus, setFocus] = useState<Focus>("designer");

  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const planeRef = useRef<HTMLSpanElement>(null);
  const thrustRef = useRef<HTMLSpanElement>(null);
  const dustRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<SVGGElement>(null);
  const windowRefs = useRef<(SVGPathElement | null)[]>([]);
  const startRef = useRef<HTMLSpanElement>(null);
  const destRef = useRef<HTMLSpanElement>(null);

  /** Written by the pointer handlers, read by the frame loop. */
  const hovered = useRef(false);
  const onEnter = useRef<() => void>(undefined);
  const onLeave = useRef<() => void>(undefined);

  const rawId = useId();
  const maskId = `deTrail-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  /**
   * The rendered width of the route, and the reason the flight is re-derived
   * at all.
   *
   * This card stretches to fill whatever the top row has spare, so the route
   * is no longer a fixed 114.21px — and every number in the effect below is
   * measured off the drawn path. Without this the plane would keep flying the
   * route the card had when it mounted, which after a resize is a line that is
   * no longer under it. Observing the SVG rather than the window because the
   * width comes from the grid track, not from the viewport directly.
   */
  const [routeWidth, setRouteWidth] = useState(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) =>
      setRouteWidth(entry.contentRect.width),
    );
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const badge = badgeRef.current;
    const plane = planeRef.current;
    const thrust = thrustRef.current;
    const dust = dustRef.current;
    const trail = trailRef.current;
    const startEl = startRef.current;
    const destEl = destRef.current;
    if (
      !svg ||
      !path ||
      !badge ||
      !plane ||
      !thrust ||
      !dust ||
      !trail ||
      !startEl ||
      !destEl
    ) {
      return;
    }

    /* --- Geometry, measured once ------------------------------------------
       The route lives in the SVG's user units, is non-uniformly scaled by the
       viewBox mapping and then flipped by Figma's exported matrix. Composing
       those two gives user units -> card px, which is what everything else
       here is expressed in. -------------------------------------------------- */

    const ctm = path.getCTM();
    if (!ctm) return;
    const svgCss = getComputedStyle(svg);
    const toCard = new DOMMatrix()
      // The element is absolutely positioned with transform-origin 0 0, so its
      // own transform maps element-local px straight into card px once it is
      // shifted by where the box sits.
      .translate(parseFloat(svgCss.left) || 0, parseFloat(svgCss.top) || 0)
      .multiply(new DOMMatrix(svgCss.transform))
      .multiply(new DOMMatrix([ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f]));

    const route = readTrack(path, toCard);
    /** SVG user units per card px — the mask's dash lengths are in user units. */
    const perPx = path.getTotalLength() / route.len;

    // Where the design puts the plane at rest, straight off the CSS. Read from
    // the computed style rather than offsetLeft/Top, which round to whole
    // pixels — the design's 74.5 / 29.03 would lose half a pixel, and the whole
    // flight is measured from here.
    const badgeCss = getComputedStyle(badge);
    const rest: Pt = {
      x: parseFloat(badgeCss.left) + badge.offsetWidth / 2,
      y: parseFloat(badgeCss.top) + badge.offsetHeight / 2,
    };
    const restRot = (() => {
      const m = new DOMMatrix(getComputedStyle(plane).transform);
      return (Math.atan2(m.b, m.a) * 180) / Math.PI;
    })();

    // Figma placed the badge about a pixel off the stroke it sits on. Carrying
    // that offset along the whole flight is what keeps the resting states
    // pixel-identical to the design while the plane still traces the real path.
    const s0 = nearest(route, rest);
    const anchor = at(route, s0);
    const off: Pt = { x: rest.x - anchor.x, y: rest.y - anchor.y };

    /* The Engineer end mirrors the Designer end's *relationship to its label*
       rather than its distance along the route. The route's far endpoint sits
       under the "ENG" glyphs, so landing there would put the badge on top of
       them; instead the plane stops where it leaves the same gap on this side
       as the design leaves on the other. Measured, so it survives the labels
       being re-set in another font. */
    const gap = rest.x - badge.offsetWidth / 2 - (startEl.offsetLeft + startEl.offsetWidth);
    const stopX = destEl.offsetLeft - gap - badge.offsetWidth / 2 - off.x;
    let s1 = route.len;
    for (const n of route.nodes) {
      if (n.x <= stopX) s1 = n.s;
    }

    const out = sub(route, s0, s1, off.x, off.y);
    const home: Pt = { x: rest.x, y: rest.y };

    /* --- Reduced motion ---------------------------------------------------
       No flight, no rotation sweep: the two states simply exchange, which is
       the whole meaning of the interaction minus the travel. ---------------- */

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    const parked = at(out, out.len);
    const parkedRot = parked.h + 90;

    /**
     * One frame on screen.
     *
     * Four elements, all driven from the same numbers: the badge carries the
     * position, its size and its shadow; the plane carries the nose; the plume
     * carries the throttle and rides along behind. Custom properties for the
     * two that CSS is better at expressing than a transform string is.
     */
    const paint = (
      x: number,
      y: number,
      rot: number,
      alt = 0,
      squash = 1,
      plume = 0,
    ) => {
      const dx = (x - rest.x).toFixed(2);
      const dy = (y - rest.y).toFixed(2);
      const scale = ((1 + ALT_LIFT * alt) * squash).toFixed(4);

      badge.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
      badge.style.setProperty("--alt", alt.toFixed(3));
      plane.style.transform = `rotate(${rot.toFixed(2)}deg)`;
      thrust.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot.toFixed(2)}deg)`;
      thrust.style.setProperty("--thrust", plume.toFixed(3));
    };

    /** Back to exactly what the stylesheet says — no residue from the flight. */
    const park = () => {
      badge.style.transform = "";
      badge.style.removeProperty("--alt");
      plane.style.transform = "";
      thrust.style.transform = "";
      thrust.style.setProperty("--thrust", "0");
    };

    /**
     * The wheels arriving: a puff at the touchdown point, laid along the
     * direction of travel so it is thrown out behind rather than sprayed in a
     * circle.
     *
     * Restarted by dropping the attribute, forcing a reflow and putting it
     * back — without the reflow the browser coalesces the two writes and the
     * animation never re-runs, which is why the second landing would otherwise
     * be silent visually.
     */
    const puff = (x: number, y: number, heading: number) => {
      dust.style.left = `${x.toFixed(1)}px`;
      dust.style.top = `${y.toFixed(1)}px`;
      dust.style.transform = `rotate(${heading.toFixed(1)}deg)`;
      dust.removeAttribute("data-puff");
      void dust.offsetWidth;
      dust.setAttribute("data-puff", "");
    };

    if (reduced.matches) {
      const enter = () => {
        paint(parked.x, parked.y, parkedRot);
        setFocus("engineer");
      };
      const leave = () => {
        park();
        setFocus("designer");
      };
      onEnter.current = enter;
      onLeave.current = leave;
      return () => {
        onEnter.current = undefined;
        onLeave.current = undefined;
        park();
      };
    }

    /* --- Flight loop ------------------------------------------------------- */

    type Mode = "idle-des" | "out" | "idle-eng" | "home";
    let mode: Mode = "idle-des";
    let flight: Flight | null = null;
    let frame = 0;
    let last = 0;
    let running = false;

    /** Trail opacity, eased separately so it survives the leg changing. */
    let lit = 0;
    let litTarget = 0;
    let head = 0;

    /** The nose angle currently on screen — every leg picks up from it. */
    let rot = restRot;

    /** Seconds since the loop last woke, and when this leg's wheels touched. */
    let elapsed = 0;
    let touchedAt = -1;
    let wheelsDown = false;

    /** Where to keep painting from once a leg is over but the gear is still
     *  settling. Null once the plane is properly at rest. */
    let hold: { x: number; y: number; rot: number } | null = null;

    /**
     * The engine. Built on the first frame of the first flight, not on mount:
     * an AudioContext per card on every page load is a cost for a sound most
     * visitors will never trigger.
     *
     * Built at most once, whether or not it worked. This is read every frame,
     * and a browser that won't give us a context would otherwise be asked for
     * one sixty times a second.
     */
    let jet: Jet | null = null;
    let jetTried = false;
    const engine = () => {
      if (!SOUND) return null;
      if (!jetTried) {
        jetTried = true;
        try {
          jet = createJet();
        } catch {
          jet = null;
        }
      }
      return jet;
    };

    const startOut = () => {
      mode = "out";
      wheelsDown = false;
      // No trim: the Engineer end is free to define its own resting angle, and
      // the Designer end is already within a tenth of a degree of the CSS one.
      // warm 0 — this leg always begins from a standstill in the slot, so it
      // gets the whole takeoff.
      flight = makeFlight(out, OUT_MS / 1000, 0, rot, s0, 0);
      litTarget = 1;
      setFocus("transit");
    };

    /** The canonical circuit's length, used to keep an interrupted departure
     *  proportionally quick rather than dawdling over a shorter route. */
    let homeRef = 0;

    /**
     * `warm` is the difference between the two ways this leg begins.
     *
     * Left alone at the Engineer end, the plane is parked and flies a full
     * departure — roll, climb-out, cruise, approach — which is the same shape
     * as the outbound and is what makes the return read as a second flight
     * rather than as a retreat. Peeled off mid-route it is already at speed and
     * in the air, and a second takeoff from cruise is a lurch; warm=1 replaces
     * the climb-out with cruise and leaves only the landing.
     */
    const startHome = (from: Pt, heading: number, warm: number) => {
      mode = "home";
      wheelsDown = false;
      const t = track(spline(homeWaypoints(from, heading, home), 0.4));
      if (!homeRef) homeRef = t.len;
      const dur = (HOME_MS / 1000) * clamp((t.len / homeRef) ** 0.7, 0.45, 1.1);
      // Trim the leg so its last tangent lands on the resting angle — on the
      // nearest turn of it, so the correction is a degree and not 359. The
      // circuit's own unwrapped heading already carries the plane the whole way
      // round, so this really is only ever a trim.
      const endRot = t.nodes[t.nodes.length - 1].h + 90;
      flight = makeFlight(
        t,
        dur,
        nearestAngle(restRot, endRot) - endRot,
        rot,
        -1,
        warm,
      );
      litTarget = 0;
      setFocus("transit");
    };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, DT_CEILING) : 1 / 60;
      last = now;
      elapsed += dt;

      // The gear taking the weight. Runs on past the end of the leg, so the
      // plane is still settling on its wheels after it has stopped.
      const since = touchedAt < 0 ? Infinity : elapsed - touchedAt;
      const squash =
        since < SQUASH_FOR
          ? 1 - SQUASH * Math.exp(-since / SQUASH_TAU) * Math.cos(since * SQUASH_W)
          : 1;

      if (flight) {
        const f = advance(flight, dt);
        rot = f.rot;

        // Wheels. Altitude reaches zero a little before the end of the leg, so
        // this fires during the rollout rather than at the stop — which is the
        // difference between landing and arriving.
        if (!wheelsDown && f.alt <= WHEELS_DOWN) {
          wheelsDown = true;
          touchedAt = elapsed;
          puff(f.x, f.y, f.heading);
          engine()?.touchdown();
        }

        const plume = clamp((f.throttle - PLUME_FLOOR) / PLUME_SPAN, 0, 1);
        paint(f.x, f.y, f.rot, f.alt, wheelsDown ? squash : 1, plume);
        engine()?.drive(f.throttle, f.alt);
        if (f.routeS >= 0) head = f.routeS;

        // `done` is the plane arriving — that is the moment the far side comes
        // alive. `settled` is the nose finishing its last degree of bank a few
        // frames later; the leg is not torn down until then, so the resting
        // attitude is exact rather than nearly.
        if (f.done && (mode === "out" || mode === "home")) {
          if (mode === "out") {
            mode = "idle-eng";
            setFocus("engineer");
            // Let the lit route go on touchdown, so the label coming up reads
            // as the thing that arrived.
            litTarget = 0;
          } else {
            mode = "idle-des";
            setFocus("designer");
          }
        }

        if (f.settled) {
          const landed = mode;
          flight = null;
          // Somewhere to keep painting from. The gear is still settling — the
          // wheels touched a few frames before the plane stopped — and without
          // this the badge would snap back to full size mid-compression.
          hold = {
            x: landed === "idle-des" ? rest.x : f.x,
            y: landed === "idle-des" ? rest.y : f.y,
            rot: landed === "idle-des" ? restRot : f.rot,
          };
          if (landed === "idle-des") {
            rot = restRot;
            if (hovered.current) startOut();
          } else if (!hovered.current) {
            // Standing departure from the Engineer end: the full takeoff.
            startHome({ x: f.x, y: f.y }, f.heading, 0);
          }
        }
      } else if (hold) {
        if (since < SQUASH_FOR) {
          paint(hold.x, hold.y, hold.rot, 0, squash, 0);
        } else {
          // Down, still, and quiet.
          if (mode === "idle-des") park();
          else paint(hold.x, hold.y, hold.rot, 0, 1, 0);
          engine()?.release();
          hold = null;
        }
      }

      // Trail: eased toward 0/1, arriving quickly and leaving slowly.
      const tau = (litTarget > lit ? TRAIL_IN : TRAIL_OUT) / 1000;
      lit += (litTarget - lit) * Math.min(1, dt / tau);
      if (Math.abs(litTarget - lit) < 0.004) lit = litTarget;

      trail.style.opacity = lit.toFixed(3);
      if (lit > 0) {
        // The mask's dash lengths are in the path's own user units, which the
        // non-uniform viewBox scale makes slightly longer than card px.
        const tip = (head - TRAIL_LAG) * perPx;
        for (let i = 0; i < TRAIL.length; i++) {
          const w = windowRefs.current[i];
          if (!w) continue;
          const len = TRAIL[i] * perPx;
          w.style.strokeDasharray = `${len} 9999`;
          w.style.strokeDashoffset = `${len - tip}`;
        }
      }

      if (flight || hold || lit !== litTarget) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
        last = 0;
      }
    };

    const run = () => {
      if (running) return;
      running = true;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    onEnter.current = () => {
      hovered.current = true;
      // Mid-circuit the plane is committed: it finishes coming home and leaves
      // again from the slot, so the outbound leg is always the exact route.
      if (mode === "idle-des") startOut();
      run();
    };

    onLeave.current = () => {
      hovered.current = false;
      if (mode === "out" || mode === "idle-eng") {
        const f = flight ? frameOf(flight) : null;
        // Altitude *is* the warmth: a plane at cruise carries its speed into
        // the circuit and only has the landing left to fly, one still on the
        // runway flies the whole departure, and the handful of frames in
        // between get the blend rather than a decision.
        startHome(f ?? parked, f ? f.heading : parked.h, f ? f.alt : 0);
      }
      run();
    };

    return () => {
      cancelAnimationFrame(frame);
      onEnter.current = undefined;
      onLeave.current = undefined;
      jet?.dispose();
      jet = null;
      park();
      dust.removeAttribute("data-puff");
      // The plane is back in its slot, so the lettering has to say so too.
      // `park()` alone leaves DES and ENG in whatever state the interrupted
      // flight had them in — both greyed, mid-transit — with the plane sitting
      // in the Designer slot. Only reachable via the re-run below; on unmount
      // it is a no-op.
      setFocus("designer");
    };
    // Re-measured whenever the card stretches: every number above is read off
    // the drawn route, and the route's length now depends on the card's width.
  }, [routeWidth]);

  return (
    <CardShell
      radius={32}
      className={styles.card}
      data-card="design-engineer"
      data-focus={focus}
      onPointerEnter={() => onEnter.current?.()}
      onPointerLeave={() => onLeave.current?.()}
    >
      <span className={styles.start} ref={startRef}>
        <span className={styles.abbrFrom}>{from.abbr}</span>
        <span className={styles.labelFrom}>{from.label}</span>
      </span>

      <svg
        ref={svgRef}
        className={styles.journey}
        viewBox="0 0 114.561 36.4017"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        {/* The stroke is a class rather than an attribute because it was
            `#222222` — which is exactly the colour a card is in dark, so the
            route between DES and ENG disappeared into the card it is drawn on.
            It follows the ink now. */}
        <path ref={pathRef} className={styles.route} d={ROUTE} strokeDasharray="3 3" />

        {/* The lit stretch behind the plane. Three windows of the same route,
            painted longest-first so they composite into a stepped falloff. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-10" y="-14" width="136" height="66">
          {[...TRAIL].reverse().map((len, i) => (
            <path
              key={len}
              ref={(el) => {
                windowRefs.current[TRAIL.length - 1 - i] = el;
              }}
              d={ROUTE}
              stroke="#ffffff"
              strokeOpacity={[0.2, 0.5, 1][i]}
              strokeWidth="6"
            />
          ))}
        </mask>
        <g ref={trailRef} className={styles.trail} mask={`url(#${maskId})`}>
          <path d={ROUTE} stroke="var(--accent)" strokeOpacity="0.9" strokeDasharray="3 3" />
        </g>
      </svg>

      {/* Dust, and the exhaust, both before the badge in the DOM so both paint
          behind the white disc. The plume is a sibling rather than a child for
          exactly that reason: inside the badge it would be drawn over the disc
          it is supposed to be coming out from under. */}
      <span className={styles.dust} ref={dustRef} aria-hidden="true">
        <span className={styles.puffRing} />
        <span className={styles.grain} />
        <span className={styles.grain} />
      </span>

      <span className={styles.thrust} ref={thrustRef} aria-hidden="true" />

      <span className={styles.planeBadge} ref={badgeRef} aria-hidden="true">
        <span
          ref={planeRef}
          className={`${styles.plane} inkIcon`}
          style={{ ["--icon" as string]: "url(/icons/plane.svg)" }}
        />
      </span>

      <span className={styles.dest} ref={destRef}>
        <span className={styles.abbrTo}>{to.abbr}</span>
        <span className={styles.labelTo}>{to.label}</span>
      </span>
    </CardShell>
  );
}
