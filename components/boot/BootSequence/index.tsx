"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LogoMark from "@/components/brand/LogoMark";
import { BOOT_MS, isBooting, markSeen, revealPage } from "@/lib/boot";
import styles from "./BootSequence.module.css";

/* ===========================================================================
   The signature.

   A loading screen on a design portfolio is time taken from looking at the
   work. So this does not spin, and it does not perform "design tool" — the
   four attempts that did were rejected for exactly that: a ruler and a pen
   drawn literally, eighteen visual systems, a blue that appears nowhere else
   on the site, and a HUD narrating itself. The homepage says "Less, but
   better"; a busy Figma simulation is the opposite of the value it claims.

   WHAT IT DOES NOW. The mark writes itself, once, on the site's own paper.
   Then it flies into its real slot in the Introduction card and *becomes* it,
   and the page rises behind it.

   THE IDEA. The mark is two strokes — an S and a Y, two tones, two drawings.
   Each is laid down by a wipe running along its own stroke direction: the Y up
   its stem, the S down its diagonal. That is what a broad nib does, and it is
   the mark's own geometry rather than a gesture imposed on it. Airbnb draws
   the Bélo and fills it; Slack clicks its mark together from parts; this is
   the same family, using the two parts this mark already has.

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

/** The Y begins. */
const WRITE_FROM = 0.02;
/** The S follows this much later — overlapping, not queued. */
const STROKE_GAP = 0.045;
/** One stroke's length. */
const STROKE = 0.155;
/** Both strokes are down; the mark rests. Stillness is the point of this beat. */
const HOLD_UNTIL = 0.385;
/** The flight home. */
const FLY = 0.225;
/** Cards start before the mark lands — overlapping action. */
const CARDS_LEAD = 0.075;
/** How far above its resting size the mark is written. */
const SCALE = 3.4;

const CARDS = "[data-prox-card], [data-prox-passive]";
const FOCAL = '[data-card="introduction"]';
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
};

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
    revealPage();
    markSeen();
    /* And actually leave.

       The previous version only removed the attribute, and the render guard
       read a `booting` value captured at first render — so the overlay stayed
       in the DOM at z-index 990 over the live homepage, forever. Every layer
       inside it animated itself to transparent, which is the only reason it
       was not obvious; the rulers were the one layer that had no exit written,
       and they were the symptom. An end state, so there is nothing left to
       animate away. */
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

      /* Schedule every card. Written straight onto the elements rather than
         held in state — the cards are not this component's to render, and
         re-rendering to move eight numbers would be work for nothing. */
      const cards = Array.from(document.querySelectorAll<HTMLElement>(CARDS))
        .map((el) => ({ el, b: el.getBoundingClientRect() }))
        .filter(
          ({ b }) => b.width > 40 && b.height > 40 && b.y < vh - 40 && b.y + b.height > 40,
        );

      const focal = document.querySelector<HTMLElement>(FOCAL)?.getBoundingClientRect();
      const ox = focal ? focal.x + focal.width / 2 : vw / 2;
      const oy = focal ? focal.y + focal.height / 2 : vh / 2;

      /* Ordered by distance from the Introduction, so the page opens outward
         from the card the mark just landed in rather than in DOM order. 45ms
         apart — the interval a wave wants. Wider than that and the eye reads a
         queue, which is what an earlier version at 350ms got wrong. */
      const lands = (HOLD_UNTIL + FLY - CARDS_LEAD) * BOOT_MS;
      cards
        .map((c) => ({
          ...c,
          d: Math.hypot(c.b.x + c.b.width / 2 - ox, c.b.y + c.b.height / 2 - oy),
        }))
        .sort((a, b) => a.d - b.d)
        .forEach((c, i) => {
          c.el.dataset.bootCard = "";
          c.el.style.setProperty("--boot-at", `${Math.round(lands + i * 45)}ms`);
        });

      /* The two moments the stylesheet needs, derived here so retiming the
         sequence cannot desynchronise them. The previous version hardcoded the
         chrome delay at 3200ms and it drifted the first time BOOT_MS moved. */
      const root = document.documentElement.style;
      root.setProperty("--boot-handover", `${Math.round((HOLD_UNTIL + FLY) * BOOT_MS)}ms`);
      root.setProperty(
        "--boot-chrome",
        `${Math.round(lands + cards.length * 45 + 260)}ms`,
      );

      setFlight({
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        // Where the middle of the screen is, relative to where the logo lives.
        dx: vw / 2 - (r.x + r.width / 2),
        dy: vh / 2 - (r.y + r.height / 2),
      });
    };

    const fallback = window.setTimeout(measure, 400);
    if (document.fonts) {
      void document.fonts.ready.then(() => {
        window.clearTimeout(fallback);
        measure();
      });
    }

    /* Skippable, and it does not cut. Three seconds is short, but somebody who
       has decided they have waited long enough should not have to watch the
       rest — and the polite version of that brings everything home fast rather
       than switching it off mid-gesture. */
    const skip = () => {
      document.documentElement.setAttribute("data-boot-skip", "");
      window.setTimeout(finish, 340);
    };
    for (const e of ["keydown", "pointerdown", "wheel", "touchstart"]) {
      window.addEventListener(e, skip, { once: true, passive: true });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      for (const e of ["keydown", "pointerdown", "wheel", "touchstart"]) {
        window.removeEventListener(e, skip);
      }
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
      revealPage();
      document.documentElement.removeAttribute("data-boot-skip");
      setGone(true);
    }, BOOT_MS * 2);
    return () => window.clearTimeout(bail);
  }, [booting]);

  if (!booting || gone || !flight) return null;

  return (
    <div className={styles.boot} aria-hidden="true">
      <div
        className={styles.flight}
        style={
          {
            "--run": `${BOOT_MS}ms`,
            left: `${flight.x}px`,
            top: `${flight.y}px`,
            width: `${flight.w}px`,
            height: `${flight.h}px`,
            "--dx": `${flight.dx}px`,
            "--dy": `${flight.dy}px`,
            "--k": SCALE,
            "--write": `${WRITE_FROM * BOOT_MS}ms`,
            "--gap": `${STROKE_GAP * BOOT_MS}ms`,
            "--stroke": `${STROKE * BOOT_MS}ms`,
            "--hold": `${HOLD_UNTIL * BOOT_MS}ms`,
            "--fly": `${FLY * BOOT_MS}ms`,
          } as React.CSSProperties
        }
      >
        <LogoMark
          className={styles.mark}
          partClass={{ s: styles.s, y: styles.y }}
        />
      </div>
    </div>
  );
}
