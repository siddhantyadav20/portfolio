"use client";

import { useEffect, useRef, type RefObject } from "react";
import SystemPreview from "@/components/interaction/SystemPreview";
import {
  arrived,
  chan,
  clamp01,
  frameDelta,
  omegaFor,
  settle,
} from "@/lib/spring";
import { PRESETS, skinAt, writeSkin } from "./theming";
import styles from "./ThemingInstrument.module.css";

/* ===========================================================================
   The demonstration, once, for both surfaces that make it.

   Two axes, and they are the same claim from different directions:

     ACROSS   sweeps the primary through the system's six semantic presets.
              One variable, forty-five painted elements, no component touched.

     DOWN     slides a diagonal seam between the light and dark colour modes,
              which are the same variable names holding different tables.

   At rest the seam sits part-way across on purpose. A frame showing one mode
   is a screenshot of a product; a frame showing the join is a picture of a
   system, and it is the figure the library's own preview draws.

   This is the DeviceMockup arrangement applied to a different subject: the
   homepage card and the case study both need the identical running thing, so
   it lives out here and neither of them owns it. What differs between the two
   is only how big it is drawn and what surface the pointer is read from.
   =========================================================================== */

/** Where the sweep rests: stop 0, the real `primary/main` #005982. */
const REST_HUE = 0;

/** Where the seam rests. 0 is all light, 1 is all dark. */
const REST_SEAM = 0.45;

/** How far the seam leans off vertical, in percent of the frame's width.
 *  Close enough to the diagonal in the library's own preview that the two read
 *  as the same figure. */
const SKEW = 22;

/** Settling times. The hue is the slower of the two because it is carrying the
 *  detents — it should feel like a control with notches, not like a slider. */
const HUE_SETTLE = 420;
const SEAM_SETTLE = 300;

/**
 * How close to its target a channel has to be before the loop is allowed to
 * stop, in sweep units and units per second.
 *
 * This matters more here than it does on the other cards. `settle` is an
 * exponential decay and never arrives exactly, so a loop with no stop
 * condition keeps writing `--ds-primary` forever — and that property is
 * inherited by ninety painted elements across two stacked copies, several of
 * which are a conic gradient behind a mask. Repainting all of that every frame
 * for a card nobody is pointing at is felt across the whole page, not just
 * here. The epsilons are set below what a rounded percentage or a four-decimal
 * colour can express, so the loop stops at the first frame that could not have
 * changed a pixel.
 */
const EPS = 4e-4;
const EPS_VEL = 4e-3;

/**
 * The unattended demonstration, as keyframes of `[seconds, hue, seam]`.
 *
 * Most visitors will never put a cursor on this, and something whose entire
 * argument only fires on hover has not made it. So it makes it once, by
 * itself, the first time it is scrolled into view — the same bargain the
 * Timeline card strikes with its own cue.
 *
 * The two axes play against each other rather than in sequence: by the time
 * the hue reaches the far stop the seam has crossed and come back, so what is
 * seen is one gesture and not a list of features.
 */
const CUE: readonly (readonly [number, number, number])[] = [
  [0.0, REST_HUE, REST_SEAM],
  [0.45, REST_HUE, REST_SEAM],
  [1.7, 1, 0.86],
  [2.6, 0.55, 0.12],
  [3.6, REST_HUE, REST_SEAM],
];

const CUE_END = CUE[CUE.length - 1][0];

/** The stop it is sitting on before anything has moved. Rendered on the
 *  server, so it has to be derived the way the loop derives it. */
export const REST_NAME = skinAt(REST_HUE).name;

/** Which modes are on screen before anything has moved. Same reason as above:
 *  the server has to render what the first frame would have written. */
export const REST_MODE = "Light + Dark";

export { PRESETS };

type Readouts = {
  /** Its text content is replaced with the active stop's name. */
  readonly label?: RefObject<HTMLElement | null>;
  /** `data-on` is moved between its children, one per stop. */
  readonly dots?: RefObject<HTMLElement | null>;
  /**
   * The other axis. Its text becomes which colour modes are on screen, and it
   * carries `--seam-mid` so a legend can draw the split itself.
   *
   * This exists because the card was half mute: sweeping across it moved the
   * stop indicator, and moving down it moved only the seam — which, if you
   * happen to be looking at the legend rather than the preview, reads as the
   * card having stopped responding. Both axes now say what they did.
   */
  readonly mode?: RefObject<HTMLElement | null>;
};

type Props = {
  /**
   * The element whose pointer drives the sweep. Defaults to the instrument.
   *
   * The homepage card passes its own root: there, the whole 386x578 card is
   * the control and the 346px preview is only where you watch the result.
   * Confining the gesture to the preview would make most of the card dead
   * again, which is the thing being fixed.
   */
  readonly track?: RefObject<HTMLElement | null>;
  /** Play the unattended demonstration once, when scrolled into view. */
  cue?: boolean;
  /** Where to write the active stop, for a legend the caller lays out itself. */
  readouts?: Readouts;
  className?: string;
};

export default function ThemingInstrument({
  track,
  cue: wantCue = false,
  readouts,
  className,
}: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const seamRef = useRef<HTMLSpanElement>(null);

  const label = readouts?.label;
  const dots = readouts?.dots;
  const mode = readouts?.mode;

  /** The instrument's rendered width, from the observer below. The loop uses
   *  it to round the seam to whole pixels — see `tick`. */
  const widthRef = useRef(0);

  // How far down the 1440x1024 artboard is drawn, so that it covers whatever
  // box the caller gave it. Measured rather than passed in: the card's frame
  // is a fixed 346x256 but the study's is whatever the reading column is that
  // day, and a magic number per call site is a magic number that goes stale.
  //
  // `cover`, not `contain` — the overspill is clipped by the caller's frame,
  // and a letterboxed dashboard would read as a picture of one.
  //
  // This is layout, not motion, so it runs for everyone: the still the
  // reduced-motion and touch paths get is only correct if it is the right size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      widthRef.current = width;
      root.style.setProperty(
        "--ds-scale",
        String(Math.max(width / 1440, height / 1024)),
      );
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const seamEl = seamRef.current;
    const surface = track?.current ?? root;
    if (!root || !seamEl || !surface) return;

    // Nothing below is worth doing without a pointer that hovers, and a
    // sweeping colour is precisely what someone asking for reduced motion is
    // asking not to get. Both cases keep the rest state the CSS already paints,
    // which is a correct, still picture of the system rather than a dead one.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const hue = chan(REST_HUE);
    const seam = chan(REST_SEAM);
    const hueOmega = omegaFor(HUE_SETTLE);
    const seamOmega = omegaFor(SEAM_SETTLE);

    let hueTo = REST_HUE;
    let seamTo = REST_SEAM;

    /** Seconds into the cue, or -1 once it is finished or interrupted. */
    let clock = -1;
    let name = REST_NAME;

    let frame = 0;
    let last = 0;
    let running = false;

    /* The last values actually written. Comparing against these is what keeps
       a moving sweep from re-setting properties it already holds — several
       frames of any transit round to the same colour. */
    let wroteHue = "";
    let wroteTop = "";
    let wroteMode = "";

    function tick(now: number) {
      const dt = frameDelta(now, last);
      last = now;

      // The cue drives the same two targets the pointer does, so there is no
      // second code path and nothing to hand over when it is interrupted — it
      // simply stops writing them.
      if (clock >= 0) {
        clock += dt;
        if (clock >= CUE_END) {
          clock = -1;
        } else {
          for (let i = 1; i < CUE.length; i++) {
            if (clock > CUE[i][0]) continue;
            const [t0, h0, s0] = CUE[i - 1];
            const [t1, h1, s1] = CUE[i];
            const k = (clock - t0) / (t1 - t0);
            hueTo = h0 + (h1 - h0) * k;
            seamTo = s0 + (s1 - s0) * k;
            break;
          }
        }
      }

      settle(hue, hueTo, hueOmega, dt);
      settle(seam, seamTo, seamOmega, dt);

      const skin = skinAt(hue.v);
      if (skin.css !== wroteHue) {
        wroteHue = skin.css;
        writeSkin(root!, skin);
      }

      // The seam goes out as two finished percentages rather than one number
      // the stylesheet does arithmetic on. `clip-path` is re-parsed every frame
      // either way; handing it ready values keeps that as cheap as it can be.
      // Rounded to one rendered pixel, not to a fixed number of decimals.
      // Moving the seam re-clips and so repaints the whole dark copy, and a
      // change too small to move an edge buys nothing for that: at the card's
      // 346px two decimals of a percent is a thirtieth of a pixel, and thirty
      // of those repaints produce one frame of visible movement. The observer
      // already knows how wide this is drawn, so the step can be exactly a
      // pixel at any size.
      const step = widthRef.current ? 100 / widthRef.current : 0.05;
      const x = Math.round(((1 - seam.v) * (100 + SKEW)) / step) * step;
      const top = `${x.toFixed(3)}%`;
      if (top !== wroteTop) {
        wroteTop = top;
        seamEl!.style.setProperty("--seam-top", top);
        seamEl!.style.setProperty("--seam-bottom", `${(x - SKEW).toFixed(3)}%`);

        // The legend's own little split, driven off the same number.
        if (mode?.current) {
          mode.current.style.setProperty(
            "--seam-mid",
            `${(100 - seam.v * 100).toFixed(1)}%`,
          );
        }
      }

      // Text and attributes only when they actually change. Writing the same
      // string sixty times a second dirties layout for nothing.
      const modeName =
        seam.v < 0.16 ? "Light" : seam.v > 0.84 ? "Dark" : "Light + Dark";
      if (modeName !== wroteMode) {
        wroteMode = modeName;
        if (mode?.current) mode.current.textContent = modeName;
      }

      if (skin.name !== name) {
        name = skin.name;
        if (label?.current) label.current.textContent = name;
        const row = dots?.current?.children;
        if (row) {
          const active = PRESETS.findIndex((p) => p.name === name);
          for (let i = 0; i < row.length; i++) {
            (row[i] as HTMLElement).toggleAttribute("data-on", i === active);
          }
        }
      }

      // Both channels are where they were asked to be and the cue is not
      // playing, so the next frame could only write what is already there.
      // Stop, and let the next pointer event wake it — see `start`.
      if (
        clock < 0 &&
        arrived(hue, hueTo, EPS, EPS_VEL) &&
        arrived(seam, seamTo, EPS, EPS_VEL)
      ) {
        running = false;
        last = 0;
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      // Not carried over from whenever the loop last stopped: `frameDelta`
      // would read the gap between then and now as one enormous frame.
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    start();

    /* --- Pointer ---------------------------------------------------------- */

    const onMove = (e: PointerEvent) => {
      clock = -1;

      // A ratio, not a distance. ProximityField writes a live `scale()` onto
      // the homepage card, so the rect it reports is the scaled one — but the
      // numerator is scaled by the same factor as the denominator and the
      // ratio survives it. (Measuring `offsetWidth` against a scaled `clientX`
      // is the version of this that drifts, silently, only while lifted.)
      const r = surface!.getBoundingClientRect();
      hueTo = clamp01((e.clientX - r.left) / r.width);
      seamTo = clamp01((e.clientY - r.top) / r.height);
      start();
    };

    const onLeave = () => {
      hueTo = REST_HUE;
      seamTo = REST_SEAM;
      start();
    };

    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);

    /* --- The cue ---------------------------------------------------------- */

    // Once, and only if it is actually on screen. An IntersectionObserver
    // rather than a timer: demonstrating itself out of view has done nothing
    // except spend a frame budget.
    let io: IntersectionObserver | undefined;
    if (wantCue && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          if (clock < 0 && hueTo === REST_HUE) {
            clock = 0;
            start();
          }
          io?.disconnect();
        },
        { threshold: 0.6 },
      );
      io.observe(surface);
    }

    return () => {
      cancelAnimationFrame(frame);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      io?.disconnect();
    };
  }, [track, wantCue, label, dots, mode]);

  return (
    /* Two copies of one drawing, one per colour mode, with the dark one clipped
       to a diagonal. Not a filter and not a blend mode: both modes are really
       painted, so what meets at the join is the library's actual light and dark
       tables rather than an approximation of the difference between them. */
    <span
      className={[styles.skin, className].filter(Boolean).join(" ")}
      ref={rootRef}
    >
      <SystemPreview mode="light" />
      <span className={styles.seam} ref={seamRef}>
        <SystemPreview mode="dark" />
      </span>
    </span>
  );
}
