"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import { EXIT_MS } from "@/components/primitives/ModalSurface";
import AboutModal, { PORTRAIT_MORPH } from "@/components/home/AboutModal";
import { about } from "@/content/site";
import { canMorph, morph, warm } from "@/lib/viewTransition";
import {
  arrived,
  chan,
  clamp,
  clamp01,
  flightPoint,
  omegaFor,
  onOutline,
  smooth,
  spring,
  type Channel,
  type Vec,
} from "./orbit";
import styles from "./AboutMeCard.module.css";

/* ===========================================================================
   Tuning. The whole interaction is four beats, and each one is a block below.

     THROW    the pills are flung out of the portrait, one after another, and
              overshoot their marks on the card's border.
     ORBIT    the triangle they hold turns, slowly, for as long as you stay.
     GATHER   they are drawn back in, in the order they left, and are absorbed.
     OPEN     a click gathers them first, then the portrait becomes the modal.
   =========================================================================== */

/** Where the first pill sits when the orbit is at rest, in screen bearings —
 *  0 is due right, increasing clockwise. -140 puts Figma up and to the left,
 *  which is where the design has it; the other two follow at 120deg. */
const START_BEARING = -140;
const SPACING = 360 / 3;

/** The card's own corner radius (--r-xl). Where `corner-shape: squircle` is
 *  supported the real outline is smoothed and this is a circular-arc
 *  approximation of it — under a pixel out at the corners, on a 28px pill that
 *  is straddling the border anyway. */
const CARD_RADIUS = 32;

/* --- Throw ---------------------------------------------------------------- */

/** Settling time and damping of the outward spring. Under 1, so a pill arrives
 *  slightly past its mark and settles back — the overshoot is the throw. */
const THROW_SETTLE = 520;
const THROW_DAMPING = 0.62;

/** Gap between one pill leaving and the next, seconds. They are thrown, not
 *  presented, and three things leaving at once reads as a menu opening. */
const THROW_STAGGER = 0.07;

/** How far the flight path bows, as a fraction of its own length, in the
 *  direction the orbit turns. */
const THROW_ARC = 0.3;

/* --- Orbit ---------------------------------------------------------------- */

/** Degrees per second once the triangle is fully out — a lap every 9s. Slow
 *  enough to read as floating rather than as a spinner. */
const ORBIT_SPEED = 40;

/** The orbit doesn't start until the last pill is nearly home on its mark:
 *  below this deployment it is stationary, above it, it winds up to speed. */
const ORBIT_THRESHOLD = 0.55;

/** Each pill also breathes on its own — a little in and out along the outward
 *  normal, and a little bigger and smaller, on periods that don't divide into
 *  each other so the three never sync up. */
const BOB_PX = 1.6;
const BOB_SCALE = 0.035;
const BOB_RATE = 1.7;

/** How far the whole formation leans toward the cursor. Small: it should feel
 *  like the icons noticed you, not like they are chasing the pointer. */
const LEAN_PX = 4;
const LEAN_SETTLE = 320;

/* --- Gather --------------------------------------------------------------- */

/** Critically damped, and quicker than the throw: coming home is decisive and
 *  has no bounce in it. */
const GATHER_SETTLE = 380;
const GATHER_STAGGER = 0.055;

/** The same move, without the stagger and at half the settling time, for the
 *  click. Leaving the card is a departure and can take its time; opening is an
 *  answer to a click, and everything in the way of it has to be brisk. */
const SNAP_SETTLE = 200;

/** Deployment below which a pill counts as swallowed by the portrait. */
const ABSORBED = 0.12;

/* --- The portrait's answer ------------------------------------------------ */

/** The portrait dips as the pills leave and swells as they land back — the
 *  recoil is what makes them look like they came out of it. Kicks are
 *  velocities, in scale units per second. */
const RECOIL_KICK = -0.9;
const ABSORB_KICK = 0.8;
const PULSE_SETTLE = 420;
const PULSE_DAMPING = 0.45;

/* --- Open ----------------------------------------------------------------- */

/** How long the gather is given before the morph starts. Not the whole of it —
 *  a beat, long enough that the card is visibly collecting itself as it opens,
 *  short enough that the click still feels answered. */
const GATHER_LEAD = 170;

/** Everything the modal paints that the card doesn't already have on screen.
 *  The portrait is the morph's far end and has to be decoded before the
 *  transition starts, or the browser snapshots an empty circle. */
const MODAL_ASSETS = ["/media/portrait.png"];

const EPS = 0.002;

/* The velocity floor `arrived` pairs with EPS. It used to be derived inside
   orbit.ts as `eps * 40`; lib/spring.ts takes it explicitly instead, because
   the site's other caller uses a flat floor and folding the two rules into one
   would have quietly retuned one of them. Same number as before. */
const EPS_VEL = EPS * 40;

/**
 * An element's position inside an ancestor, in layout coordinates.
 *
 * Offsets, not getBoundingClientRect: the proximity field keeps a live
 * transform on this card, and rects carry it — so measuring while the card
 * happened to be lifted would put the orbit permanently off centre. Offsets are
 * layout, and layout is what the geometry is expressed in.
 */
function offsetIn(el: HTMLElement, root: HTMLElement): Vec {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * The About card.
 *
 * At rest it is the Figma card and nothing else — the three tool pills are
 * stacked behind the portrait at a fraction of their size, invisible. The
 * interaction is one rAF loop that owns every pill's position, and one scalar
 * per pill that says how deployed it is; see orbit.ts for the machinery.
 *
 * The loop lives outside React on purpose. It writes transforms straight onto
 * the pills, so hovering this card costs no renders and no layout — which
 * matters, because ProximityField is already moving the whole composition
 * around underneath it.
 *
 * Two structural notes:
 *
 *   The pills are siblings of the CardShell, not children of it. Cards clip
 *   their contents (`overflow: hidden`) and these deliberately sit *on* the
 *   border, half outside.
 *
 *   Which means the wrapper, not the card, is what the proximity field moves:
 *   it carries `data-prox-card`, and the shell opts out. Otherwise the card
 *   would lift and the icons orbiting it would stay behind.
 */
export default function AboutMeCard() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLSpanElement>(null);
  const pillRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /**
   * The orbit's controls, published by the loop once it is running.
   *
   * Absent under reduced motion, on coarse pointers, and before mount — every
   * caller has to tolerate that, and the card works without it.
   */
  const orbitRef = useRef<{
    /** Deploy or gather. `urgent` skips the stagger; see SNAP_SETTLE. */
    set: (out: boolean, urgent?: boolean) => void;
    /** Hold the pills in, whatever the pointer is doing — for while the modal
     *  is over the card and the pointer is nominally still on it. */
    lock: (on: boolean) => void;
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const photo = photoRef.current;
    if (!wrap || !photo) return;

    // Pointer-driven and motion-bearing: skip entirely where it doesn't belong.
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const pills = pillRefs.current.filter(Boolean) as HTMLSpanElement[];
    if (pills.length === 0) return;

    /* --- Geometry ----------------------------------------------------------
       Two things, both in wrapper-local pixels: the card's half-extents, which
       the orbit is cast against, and the portrait's centre, which every flight
       starts and ends at. */
    let cx = 0;
    let cy = 0;
    let hw = 0;
    let hh = 0;
    let home: Vec = { x: 0, y: 0 };

    function measure() {
      hw = wrap!.offsetWidth / 2;
      hh = wrap!.offsetHeight / 2;
      cx = hw;
      cy = hh;

      const at = offsetIn(photo!, wrap!);
      home = {
        x: at.x + photo!.offsetWidth / 2,
        y: at.y + photo!.offsetHeight / 2,
      };
    }

    /* --- State -------------------------------------------------------------- */

    /** Deployment per pill: 0 behind the portrait, 1 out on the orbit. */
    const dep: Channel[] = pills.map(() => chan(0));
    /** Seconds each pill still has to wait before it may answer a new target. */
    const hold: number[] = pills.map(() => 0);
    /** The portrait's recoil, as a delta on its scale. */
    const pulse = chan(0);
    /** The formation's lean toward the pointer. */
    const lean = { x: chan(0), y: chan(0) };

    let want = 0; // 1 while the pointer is on the card
    let phase = 0; // orbit rotation, degrees
    let clock = 0; // seconds since mount, for the bob
    let leanTo = { x: 0, y: 0 };
    let swallowed = true; // were all three inside the portrait last frame?
    let locked = false; // the modal owns the card; stay in

    const throwOmega = omegaFor(THROW_SETTLE);
    const leanOmega = omegaFor(LEAN_SETTLE);
    const pulseOmega = omegaFor(PULSE_SETTLE);
    /** Which way home is being flown — reset by every call to `set`. */
    let gatherOmega = omegaFor(GATHER_SETTLE);

    let frame = 0;
    let running = false;
    let last = 0;

    function tick(now: number) {
      // Real elapsed time, so the motion is the same at 60Hz and 120Hz; the
      // ceiling absorbs the long first frame after a backgrounded tab resumes.
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      clock += dt;

      let least = 1;
      let most = 0;
      let settled = true;

      for (let i = 0; i < pills.length; i++) {
        // While a pill is still on hold it keeps aiming at the state we are
        // leaving, which is what turns three springs into a stagger.
        if (hold[i] > 0) hold[i] -= dt;
        const target = hold[i] > 0 ? 1 - want : want;

        if (target > 0.5) {
          spring(dep[i], 1, throwOmega, THROW_DAMPING, dt);
        } else {
          spring(dep[i], 0, gatherOmega, 1, dt);
        }

        if (!arrived(dep[i], target, EPS, EPS_VEL) || hold[i] > 0)
          settled = false;
        if (dep[i].v < least) least = dep[i].v;
        if (dep[i].v > most) most = dep[i].v;
      }

      // The orbit only turns once the formation is essentially assembled, and
      // it winds down again as the pills leave it. Nothing switches on: the
      // rotation has a speed, and that speed has a shape.
      const wind = smooth(clamp01((least - ORBIT_THRESHOLD) / (1 - ORBIT_THRESHOLD)));
      phase += ORBIT_SPEED * wind * dt;

      spring(lean.x, leanTo.x, leanOmega, 1, dt);
      spring(lean.y, leanTo.y, leanOmega, 1, dt);
      spring(pulse, 0, pulseOmega, PULSE_DAMPING, dt);

      // One kick as the last pill disappears behind the portrait — the swell
      // that says it caught them.
      if (!swallowed && most < ABSORBED) {
        pulse.vel += ABSORB_KICK;
        swallowed = true;
      } else if (swallowed && most > ABSORBED) {
        swallowed = false;
      }

      for (let i = 0; i < pills.length; i++) {
        const bearing = START_BEARING + SPACING * i + phase;
        const edge = onOutline(bearing, hw, hh, CARD_RADIUS);

        // Outward normal, for the breathing. The pill drifts along the line it
        // would leave the card on, which keeps the formation legible.
        const len = Math.hypot(edge.x, edge.y) || 1;
        const bob = Math.sin(clock * BOB_RATE + i * 2.1) * BOB_PX;

        const mark: Vec = {
          x: cx + edge.x * (1 + bob / len) + lean.x.v,
          y: cy + edge.y * (1 + bob / len) + lean.y.v,
        };

        const t = dep[i].v;
        const p = flightPoint(home, mark, THROW_ARC, clamp(t, 0, 1.25));

        // Scale rides the deployment directly, so the spring's overshoot is
        // also the pill's — it lands a touch large and settles. The breathing
        // is faded in over the last of the flight rather than switched on at a
        // threshold, which would put a step in the scale.
        const wobble =
          Math.sin(clock * BOB_RATE * 1.31 + i * 1.7) *
          BOB_SCALE *
          clamp01((t - 0.7) / 0.3);
        // 0.28 at home: a 40px pill shrinks to 11px, comfortably inside the
        // 32px portrait it is hiding behind.
        const s = (0.28 + 0.72 * t) * (1 + wobble);

        // Held back until the pill is clear of the portrait it came out of,
        // which is what sells them as having been *behind* it.
        const o = clamp01((t - 0.1) / 0.35);

        const el = pills[i];
        el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
        el.style.opacity = o.toFixed(3);
      }

      photo!.style.setProperty("--photo-s", (1 + pulse.v).toFixed(4));

      // Deployed means orbiting, which never finishes. Only a fully gathered,
      // fully still card is allowed to stop the loop.
      if (settled && want === 0 && Math.abs(pulse.v) < EPS) {
        running = false;
        last = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    function set(out: boolean, urgent = false) {
      if (out && locked) return;
      const next = out ? 1 : 0;
      if (next === want) return;
      want = next;

      gatherOmega = omegaFor(urgent ? SNAP_SETTLE : GATHER_SETTLE);

      // Out in reading order, home in the reverse — the formation unwinds the
      // way it was wound. The urgent gather has no order to it: it isn't a
      // gesture of its own, it is getting out of the way of the modal.
      for (let i = 0; i < pills.length; i++) {
        const rank = out ? i : pills.length - 1 - i;
        hold[i] = urgent ? 0 : rank * (out ? THROW_STAGGER : GATHER_STAGGER);
      }

      if (out) {
        measure(); // fonts and the proximity field may both have moved things
        pulse.vel += RECOIL_KICK;
      }
      start();
    }

    function onPointerMove(e: PointerEvent) {
      const r = wrap!.getBoundingClientRect();
      // Normalised against the card's own half-extents, so the lean is the
      // same gesture wherever the card ends up on the page.
      leanTo = {
        x: clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1) * LEAN_PX,
        y: clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1) * LEAN_PX,
      };
      // Also the way back in after the modal closes. `pointerenter` doesn't
      // fire when an overlay is removed from over the pointer, so without this
      // the card would sit inert under a cursor that never left it.
      set(true);
      start();
    }

    measure();
    orbitRef.current = {
      set,
      lock: (on: boolean) => {
        locked = on;
      },
    };
    wrap.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    // Fonts and images settle after first paint; re-measure once they have.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      orbitRef.current = null;
      wrap.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const openAbout = useCallback(async () => {
    // The gather comes first and is its own beat: the card collects what it
    // threw out before it opens. Without it the pills are still in mid-air when
    // the browser takes its snapshot, and they cross-fade into nothing — and
    // the portrait would be handing over the morph while things orbited it.
    orbitRef.current?.lock(true);
    orbitRef.current?.set(false, true);

    if (!canMorph()) {
      setOpen(true);
      return;
    }

    await Promise.all([
      ...MODAL_ASSETS.map(warm),
      new Promise((r) => window.setTimeout(r, GATHER_LEAD)),
    ]);
    morph(() => setOpen(true));
  }, []);

  const close = useCallback(() => {
    // Released once the card is back and the portrait is its own again; the
    // next pointer move over the card throws the pills out afresh.
    const release = () => orbitRef.current?.lock(false);

    if (canMorph()) {
      morph(() => setOpen(false), release);
      return;
    }
    // No morph to play, so the modal has to animate itself out — otherwise
    // closing is an instant pop.
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      release();
    }, EXIT_MS);
  }, []);

  return (
    <>
      <div ref={wrapRef} className={styles.wrap} data-prox-card>
        <CardShell
          as="button"
          type="button"
          radius={32}
          static
          className={styles.card}
          onPointerEnter={() => {
            orbitRef.current?.set(true);
            // The moment before a click: decode the modal's portrait now so the
            // transition never has to wait for it.
            MODAL_ASSETS.forEach(warm);
          }}
          onPointerLeave={() => orbitRef.current?.set(false)}
          onClick={openAbout}
          aria-label="About me — read more"
        >
          <span ref={photoRef} className={styles.photo}>
            {/* Released the moment the modal owns the name: two live elements
                sharing one abort the transition. */}
            <span
              className={styles.portrait}
              style={open ? undefined : { viewTransitionName: PORTRAIT_MORPH }}
            >
              <Image src="/media/portrait.png" alt="" width={32} height={32} />
            </span>
          </span>

          <span className={styles.dest}>
            <span className={styles.eyebrow}>{about.eyebrow}</span>
            <span className={styles.title}>{about.title}</span>
          </span>
        </CardShell>

        {/* Outside the card because they orbit its border, and cards clip.
            Inert to the pointer: they are scenery for the card underneath, and
            a pill passing under the cursor must not read as leaving it. */}
        <div className={styles.orbit} aria-hidden="true">
          {about.tools.map((tool, i) => (
            <span
              key={tool.name}
              ref={(el) => {
                pillRefs.current[i] = el;
              }}
              className={styles.pill}
            >
              <span className={`${styles.glass} liquid`} />
              <img src={tool.icon} alt="" width={18} height={18} />
            </span>
          ))}
        </div>
      </div>

      <AboutModal open={open} closing={closing} onClose={close} />
    </>
  );
}
