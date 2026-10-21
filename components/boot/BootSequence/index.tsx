"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LogoMark from "@/components/brand/LogoMark";
import { LOGO_BOX, LOGO_PARTS } from "@/content/logo";
import { BOOT_MS, isBooting, markSeen, revealPage } from "@/lib/boot";
import { landScene } from "@/lib/scene";
import styles from "./BootSequence.module.css";

/* ===========================================================================
   The signature.

   A loading screen on a design portfolio is time taken from looking at the
   work, so this one is a piece of the work: the mark gets drawn with the pen
   tool, on the site's own paper, and then becomes the page.

   WHAT IS ON SCREEN. A hairline travelling around the outline of the mark.
   Behind it, an anchor drops at every point the path actually has one, and
   where a corner is a curve its two control handles flick out and retract as
   the line passes. When the last path closes, the two tones flood in, the
   vector chrome lets go, and the finished mark flies into its slot in the
   Introduction card while the page rises behind it.

   IT IS THE REAL PATH. Every anchor and every handle below is read out of
   `content/logo.ts` — the same thirty-eight anchors and the same control
   points that draw the mark on the page. Nothing here is a decoration shaped
   like a pen tool; it is the pen tool, showing its own work. That is also why
   the mark had to be re-derived as curves first: the polygon trace this
   replaced had sixty-nine anchors, most of them meaningless, and drawing
   *those* would have looked like noise rather than like a path somebody drew.

   WHAT IT DELIBERATELY IS NOT. No drawn pen cursor, no ruler, no grid, no
   readout narrating itself, and nothing in a colour that appears nowhere else
   on the site — four earlier attempts were rejected for exactly those, and
   the homepage says "Less, but better". One object, drawn once, then held
   still. The stillness before the flight is a beat, not a gap.

   THE HAND-OVER IS NOT A CROSS-FADE. The overlay renders `LogoMark` — the same
   component the Introduction renders. It is positioned at the real logo's
   measured rect and transformed *away* from it, so the whole sequence is one
   FLIP running backwards: when the transform reaches identity the overlay is
   sitting on the real logo, pixel for pixel, and the two swap in a single
   frame. Nothing is measured twice and nothing can drift.

   Nothing here runs a frame loop. Measure once, write custom properties, let
   the compositor do it — which is why it stays smooth while React is still
   hydrating the page underneath.
   =========================================================================== */

/* --- The beats, as fractions of BOOT_MS ---------------------------------- */

/** The pen touches down. */
const TRACE_FROM = 0.035;
/** All three paths together, at one speed. */
const TRACE = 0.4;
/** The pen lifts between them. Two of these, so it is nearly free. */
const LIFT = 0.012;
/** How long a tone takes to flood in once its outline has closed. */
const INK = 0.055;
/** Both tones are down; the mark rests. Stillness is the point of this beat. */
const HOLD_UNTIL = 0.66;
/** The flight home. */
const FLY = 0.22;
/** Cards start before the mark lands — overlapping action. */
const CARDS_LEAD = 0.19;
/** How long a control handle is out for, and how far ahead of the line it goes. */
const ARM = 0.1;
const ARM_LEAD = 0.012;
/**
 * How far above its resting size the mark is drawn.
 *
 * A multiple of the logo's *measured* size, so the drawing is anchored to the
 * thing it becomes rather than to a viewport figure. On the wide layout that
 * lands it at about a fifth of the screen, which is where a brand mark sits in
 * the loaders this is in conversation with: a script or a wordmark would want
 * half the screen, a monogram this dense looks shouty at it.
 */
const SCALE = 5.4;
/**
 * ...and the ceiling that stops it shouting on a phone.
 *
 * `--u` scales the logo with the composition above 1000px and is a flat pixel
 * below it, so the resting mark is the same 52px on a 390px phone as on a
 * 1440px laptop — and five and a half times 52 is most of a phone screen.
 * Measured against the *smaller* viewport axis so a landscape phone is caught
 * by its height, which is the axis that is actually short.
 */
const MAX_SHARE = 0.42;

/**
 * The vector chrome, in device pixels.
 *
 * Sizes here are screen sizes, not drawing sizes: an anchor is the same small
 * square whether the mark is being drawn at 200px or at 500px, exactly as it
 * would be in the tool. They are divided down into user units once the mark's
 * real size is known, which is the only reason this component measures at all
 * beyond the flight. `anchor` and `head` are half-sizes; `hair` is a width.
 */
const PX = { anchor: 2.8, handleDot: 2.1, head: 3.2, hair: 1.5 };

const LOGO = "[data-logo]";

type Flight = {
  /** The real logo's rect — where the overlay sits and where it lands. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** The transform that lifts it to the middle of the screen, big. */
  readonly dx: number;
  readonly dy: number;
  /** How much bigger — `SCALE`, unless the viewport is too small to take it. */
  readonly k: number;
  /** Drawing units per device pixel, at the size the mark is drawn. */
  readonly unit: number;
};

/**
 * When each path is drawn, and when each tone is filled.
 *
 * Time is handed out by *length*, not per path, so the hairline moves at one
 * constant speed all the way round: the wedge is a third of the S's outline
 * and takes a third as long. Dividing the beat equally instead made the small
 * path look hurried and the long one look reluctant, which is the tell that a
 * schedule was imposed on the drawing rather than taken from it.
 */
const BEATS = (() => {
  const total = LOGO_PARTS.reduce((sum, p) => sum + p.len, 0);
  let at = TRACE_FROM;
  const parts = LOGO_PARTS.map((p) => {
    const dur = TRACE * (p.len / total);
    const from = at;
    at += dur + LIFT;
    return { from, dur, ends: from + dur };
  });
  /* A tone fills the moment its own last outline closes — so the S is already
     solid while the Y is still being drawn. Two moments rather than one, which
     is how the drawing actually goes. */
  const inkAt = (tone: "s" | "y") =>
    Math.max(
      ...LOGO_PARTS.map((p, i) => (p.tone === tone ? parts[i].ends : 0)),
    );
  return { parts, ink: { s: inkAt("s"), y: inkAt("y") } };
})();

export default function BootSequence() {
  /* Read once, during the first render.

     It cannot be read in an effect: the attribute it reads is the same one
     this component removes on the way out, and in development React mounts,
     tears down and remounts every effect — so an effect asking "are we
     booting?" gets "no" on the second run and abandons a sequence that had
     barely started. */
  const [booting] = useState(isBooting);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [gone, setGone] = useState(false);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    /* A no-op when the flight already called it — and the only thing that
       brings the cards in when the sequence ended before it could. */
    landScene(0);
    revealPage();
    markSeen();
    /* And actually leave.

       An earlier version only removed the attribute, and the render guard read
       a `booting` value captured at first render — so the overlay stayed in
       the DOM at z-index 990 over the live homepage, forever. An end state, so
       there is nothing left to animate away. */
    setGone(true);
  }, []);

  useEffect(() => {
    if (!booting) return;

    /* Measured when the fonts are ready.

       Canela reflows every heading when it lands, and the Introduction's logo
       moves with it. Deliberately not `requestAnimationFrame`: frames do not
       run in a backgrounded tab, and opening a link in a background tab is how
       people open links — a lesson this file has already had to learn twice. */
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      window.scrollTo(0, 0);

      const logo = document.querySelector<HTMLElement>(LOGO);
      if (!logo) return finish();
      const r = logo.getBoundingClientRect();
      if (r.width < 4) return finish();

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      /* When the content lands.

         The cards are the scene's (lib/scene.ts): it has been showing them as
         their own skeleton since the HTML arrived, and the mark is being
         drawn in a clearing of it. All this decides is the moment the content
         comes down into those frames — `CARDS_LEAD` before the mark lands, so
         the page fills in behind it on its way home and the two motions
         overlap instead of queueing; and never before both tones are down,
         because content arriving during the sketch reads as the page giving
         up on its own animation.

         The ripple's order and spread are the scene's too, outward from the
         Introduction — the card the mark is flying to. The run no longer has
         to fit inside BOOT_MS: the scene takes itself down when its last card
         is down, so finishing here cannot cut a card off part-way. */
      const drawn = (BEATS.ink.y + INK) * BOOT_MS;
      const lands = Math.max(drawn, (HOLD_UNTIL + FLY - CARDS_LEAD) * BOOT_MS);
      landScene(Math.round(lands));

      /* The two moments the stylesheet needs, derived here so retiming the
         sequence cannot desynchronise them. An earlier version hardcoded the
         chrome delay at 3200ms and it drifted the first time BOOT_MS moved. */
      document.documentElement.style.setProperty(
        "--boot-handover",
        `${Math.round((HOLD_UNTIL + FLY) * BOOT_MS)}ms`,
      );

      const k = Math.min(SCALE, (Math.min(vw, vh) * MAX_SHARE) / r.width);

      setFlight({
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        // Where the middle of the screen is, relative to where the logo lives.
        dx: vw / 2 - (r.x + r.width / 2),
        dy: vh / 2 - (r.y + r.height / 2),
        k,
        /* One device pixel, in drawing units, at the size the mark is drawn.
           The rect is the *box* the logo is laid out in and the mark is fitted
           inside it, so the scale that matters is whichever axis is tight. */
        unit:
          LOGO_BOX.w /
          (Math.min(r.width, (r.height * LOGO_BOX.w) / LOGO_BOX.h) * k),
      });
    };

    const fallback = window.setTimeout(measure, 400);
    if (document.fonts) {
      void document.fonts.ready.then(() => {
        window.clearTimeout(fallback);
        measure();
      });
    }

    /* Deliberately not skippable.

       This used to end early on the first keydown, pointerdown, wheel or
       touchstart, on the argument that somebody who has waited long enough
       should not have to watch the rest. What that actually did was end the
       sequence for anybody whose first instinct on a new page is to scroll —
       which is most people, and a trackpad reports it before the page has
       given them anything to read. The gesture that means "get on with it" and
       the gesture that means "I am looking" are the same event, and guessing
       wrong throws away the arrival rather than the wait.

       So the run is the run. It is under four seconds, it happens once per
       visitor, reduced motion opts out of it entirely, and the page beneath is
       scroll-locked while it plays, so a scroll here loses nothing.

       The safety timers below are what guarantee it ends; nothing the visitor
       does can leave them stuck behind it. */

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [booting, finish]);

  /* The clock starts when the mark does, not when this mounted — every
     animation is timed from the measurement, and the measurement waits on the
     fonts. Started in the effect above instead, a slow font load cut the
     sequence short by exactly however long the font had taken. */
  useEffect(() => {
    if (!flight) return;
    const t = window.setTimeout(finish, BOOT_MS);
    return () => window.clearTimeout(t);
  }, [flight, finish]);

  /* The last resort. A portfolio permanently behind its own loading screen is
     the most expensive bug this file could have, so one unconditional timer
     puts the page back whatever else went wrong. */
  useEffect(() => {
    if (!booting) return;
    const bail = window.setTimeout(() => {
      landScene(0);
      revealPage();
      setGone(true);
    }, BOOT_MS * 2);
    return () => window.clearTimeout(bail);
  }, [booting]);

  if (!booting || gone || !flight) return null;

  const u = flight.unit;
  const ms = (f: number) => `${Math.round(f * BOOT_MS)}ms`;

  return (
    <div className={styles.boot} aria-hidden="true">
      <div
        className={styles.flight}
        style={
          {
            left: `${flight.x}px`,
            top: `${flight.y}px`,
            width: `${flight.w}px`,
            height: `${flight.h}px`,
            "--dx": `${flight.dx}px`,
            "--dy": `${flight.dy}px`,
            "--k": flight.k,
            "--ink-s": ms(BEATS.ink.s),
            "--ink-y": ms(BEATS.ink.y),
            "--ink-run": ms(INK),
            "--hold": ms(HOLD_UNTIL),
            "--fly": ms(FLY),
            "--let-go": ms(BEATS.ink.y + INK * 0.6),
            "--arm": ms(ARM),
            "--drop": ms(ARM * 0.42),
            "--chrome-out": ms(INK * 1.6),
            /* The traced hairline cannot use `vector-effect: non-scaling-stroke`
               the way the anchors and handles do: that moves the *dash* into
               device space too, so `stroke-dasharray` stops being the path's
               length and the reveal runs at the wrong speed and stops early.
               So it is a real user-unit width, sized here instead. */
            "--hair": `${(PX.hair * flight.unit).toFixed(3)}`,
          } as React.CSSProperties
        }
      >
        {/* Three nested transforms, because they are three different motions.

            `.flight` carries the horizontal, `.lift` the vertical and the
            scale, and they run on different easings — which is the whole
            trick. A single `translate(dx, dy)` moves the mark along a straight
            line from the middle of the screen to its slot, and a straight line
            is the one path nothing in the physical world takes. Splitting the
            axes and easing them differently bends it into an arc for free, no
            motion path and no per-frame work.

            `.mark` then carries the settle, which cannot share an element with
            the flight because both would be animating `transform`. */}
        <div className={styles.lift}>
          <LogoMark
            className={styles.mark}
            partClass={{ s: styles.inkS, y: styles.inkY }}
          >
            {/* The outlines, drawn. One dash the length of the whole path,
                walked back to zero. */}
            {LOGO_PARTS.map((part, i) => (
              <path
                key={`t${i}`}
                className={styles.trace}
                d={part.d}
                style={
                  {
                    "--len": part.len,
                    "--from": ms(BEATS.parts[i].from),
                    "--dur": ms(BEATS.parts[i].dur),
                  } as React.CSSProperties
                }
              />
            ))}

            {/* The handles. Two per curved corner, out of the path itself,
                flicked out as the line reaches them and pulled back in behind
                it — so at any moment there are two or three on screen and the
                whole set never piles up. */}
            {LOGO_PARTS.flatMap((part, i) =>
              part.nodes.flatMap((node, j) =>
                ([node.back, node.fwd] as const)
                  .filter((h): h is readonly [number, number] => h !== null)
                  .map((h, k) => (
                    <g
                      key={`h${i}-${j}-${k}`}
                      className={styles.handle}
                      style={
                        {
                          "--ox": `${node.on[0]}px`,
                          "--oy": `${node.on[1]}px`,
                          "--at": ms(
                            BEATS.parts[i].from +
                              node.at * BEATS.parts[i].dur -
                              ARM_LEAD,
                          ),
                        } as React.CSSProperties
                      }
                    >
                      {/* `vector-effect` is not an inherited property, so it
                          has to sit on the shapes rather than on the group
                          that carries the rest of their styling — set on the
                          group it silently does nothing and the arms come out
                          scaled with the mark. */}
                      <line
                        x1={node.on[0]}
                        y1={node.on[1]}
                        x2={h[0]}
                        y2={h[1]}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle cx={h[0]} cy={h[1]} r={PX.handleDot * u} />
                    </g>
                  )),
              ),
            )}

            {/* The anchors. They stay once dropped: a path you have just drawn
                is a path that is still selected. */}
            {LOGO_PARTS.flatMap((part, i) =>
              part.nodes.map((node, j) => (
                <rect
                  key={`a${i}-${j}`}
                  className={styles.anchor}
                  x={node.on[0] - PX.anchor * u}
                  y={node.on[1] - PX.anchor * u}
                  width={PX.anchor * 2 * u}
                  height={PX.anchor * 2 * u}
                  style={
                    {
                      "--ox": `${node.on[0]}px`,
                      "--oy": `${node.on[1]}px`,
                      "--at": ms(
                        BEATS.parts[i].from + node.at * BEATS.parts[i].dur,
                      ),
                    } as React.CSSProperties
                  }
                />
              )),
            )}

            {/* The point of the pen. `offset-path` walks it along the same
                geometry the dash is uncovering, on the same clock, so it sits
                on the end of the line rather than near it. */}
            {LOGO_PARTS.map((part, i) => (
              <circle
                key={`p${i}`}
                className={styles.head}
                r={PX.head * u}
                style={
                  {
                    "--path": `path("${part.d}")`,
                    "--from": ms(BEATS.parts[i].from),
                    "--dur": ms(BEATS.parts[i].dur),
                  } as React.CSSProperties
                }
              />
            ))}
          </LogoMark>
        </div>
      </div>
    </div>
  );
}
