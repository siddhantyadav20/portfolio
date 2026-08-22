"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOOT_MS, isBooting, markSeen, revealPage } from "@/lib/boot";
import styles from "./BootSequence.module.css";

/* ===========================================================================
   The site, drawing itself.

   A loading screen on a design portfolio is time taken from looking at the
   work and spent on something that is not the work. The only version worth
   building is one where the waiting *is* a piece of the work — so this does
   not spin. It draws the bento grid the way the file it came from was drawn: a
   frame dragged out, held for a beat, and then filled with the thing it was a
   drawing of.

   TWO IDEAS DO ALL THE WORK.

   1. THE CARDS ANIMATE THEMSELVES. The overlay draws a wireframe over each
      card, but what fills in underneath is the real card, on its own timer.
      The first version faded the whole page up at the end, which meant four
      seconds of outlines and then everything at once — a diagram of a loading
      sequence rather than a page assembling. Now each card commits while its
      neighbours are still being drawn, so something is always resolving and
      the content starts arriving at about a second instead of at four.

   2. IT MOVES IN A WAVE, NOT IN ORDER. Frames are ordered by distance from the
      Introduction — the card a reader's eye goes to first — so the sequence
      travels outward from a focal point. Reading order gave every card the
      same stagger and read as a metronome. A wave has a place to look.

   The motion is a real spring, sampled out of `lib/spring.ts` into a CSS
   `linear()` at module scope. Cards overshoot about four percent and settle,
   which is the difference between a card arriving and a card being placed.

   Nothing here runs a frame loop. The component measures once, writes two
   custom properties per card, and the compositor does the rest — which is why
   it stays smooth while React is still hydrating the page underneath.
   =========================================================================== */

type Frame = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly radius: number;
  /** Milliseconds from the start of the run. */
  readonly at: number;
};

/* --- The beats, as fractions of BOOT_MS ---------------------------------- */

/** When the first frame starts drawing. */
const DRAW_FROM = 0.08;
/** How long the last frame waits before it starts. */
const DRAW_SPAN = 0.5;
/**
 * The gap between a frame appearing and its card filling in.
 *
 * Expressed here and again as a percentage inside the frame's keyframes, which
 * have to agree: the wireframe begins leaving on the same beat the card begins
 * arriving, so the two pass through each other rather than one waiting for the
 * other to finish. See `frameLife` in the stylesheet.
 */
const COMMIT_LAG = 0.105;
/** When the canvas underneath starts to go. */
const GROUND_OUT = 0.7;

/**
 * Which elements get a frame.
 *
 * `CardShell` marks every card it renders and the Introduction marks itself
 * passive — between them that is the bento grid and nothing else. Reading the
 * DOM rather than listing the cards means a card added later joins the
 * sequence without anybody remembering to come back here.
 */
const CARDS = "[data-prox-card], [data-prox-passive]";

/** The card the wave starts from. */
const FOCAL = '[data-card="introduction"]';

export default function BootSequence() {
  /* Read once, during the first render, and never again.

     It has to be captured here rather than in an effect because the attribute
     it reads is the same one this component removes on the way out — and in
     development React mounts, tears down and remounts every effect, so an
     effect asking "are we booting?" gets "no" on the second run and gives up
     on a sequence that had barely started. A state initialiser runs before any
     of that and holds the answer. */
  const [booting] = useState(isBooting);

  const [frames, setFrames] = useState<Frame[] | null>(null);
  const done = useRef(false);

  /**
   * End it, from anywhere.
   *
   * Idempotent because three things race to call it: the timer, the skip and
   * the failsafe. Whichever arrives first wins and the rest are no-ops.
   */
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    revealPage();
    markSeen();
  }, []);

  useEffect(() => {
    if (!booting) return;

    /* Measured when the fonts are ready, and not before.

       Canela is a webfont and every heading reflows when it lands, so a rect
       read before that is a rect of the layout mid-assembly and the frames are
       drawn a few pixels off the cards they are supposed to become.
       `document.fonts.ready` is the actual signal for "the layout has stopped
       moving".

       Deliberately not `requestAnimationFrame`, which is the mistake this
       replaced and the same one `useStudyUrl` and the palette's tour both
       document: frames do not run in a backgrounded tab, and opening a link in
       a background tab is how people open links. A promise resolves either
       way. */
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      window.scrollTo(0, 0);

      const els = Array.from(document.querySelectorAll<HTMLElement>(CARDS));
      const vh = window.innerHeight;

      const onScreen = els
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(
          ({ r }) => r.width > 40 && r.height > 40 && r.y < vh - 40 && r.y + r.height > 40,
        );
      if (onScreen.length === 0) return;

      /* The wave's origin: the middle of the Introduction if it is on screen,
         and the middle of the viewport if it is not. */
      const focal = document.querySelector<HTMLElement>(FOCAL)?.getBoundingClientRect();
      const ox = focal ? focal.x + focal.width / 2 : window.innerWidth / 2;
      const oy = focal ? focal.y + focal.height / 2 : vh / 2;

      const ordered = onScreen
        .map((c) => ({
          ...c,
          d: Math.hypot(c.r.x + c.r.width / 2 - ox, c.r.y + c.r.height / 2 - oy),
        }))
        .sort((a, b) => a.d - b.d);

      const step = ordered.length > 1 ? (DRAW_SPAN * BOOT_MS) / (ordered.length - 1) : 0;

      const out: Frame[] = ordered.map((c, i) => {
        const at = DRAW_FROM * BOOT_MS + i * step;

        /* The card is told when to arrive, and arrives on its own.

           Written straight to the element rather than held in React state: the
           real cards are not this component's to render, and eleven re-renders
           to move eleven numbers would be work for nothing. The stylesheet
           picks them up — see "Boot" in globals.css. */
        c.el.dataset.bootCard = "";
        c.el.style.setProperty(
          "--boot-at",
          `${Math.round(at + COMMIT_LAG * BOOT_MS)}ms`,
        );

        return {
          x: Math.round(c.r.x),
          y: Math.round(c.r.y),
          w: Math.round(c.r.width),
          h: Math.round(c.r.height),
          radius: parseFloat(getComputedStyle(c.el).borderTopLeftRadius) || 0,
          at: Math.round(at),
        };
      });

      setFrames(out);
    };

    /* `fonts.ready` resolves on its own schedule, and on a cold cache that can
       be slower than the sequence is long. Whichever arrives first wins, and a
       font landing late costs a few pixels of accuracy rather than the whole
       animation. */
    const fallback = window.setTimeout(draw, 400);
    if (document.fonts) {
      void document.fonts.ready.then(() => {
        window.clearTimeout(fallback);
        draw();
      });
    }

    /* Skippable, and it does not cut.

       Five seconds is a long time to hold somebody who came here to read three
       case studies, and the polite version of a long animation is one that
       stops the moment you ask. It stops by bringing everything home fast
       rather than by disappearing — `data-boot-skip` collapses every delay and
       shortens every duration, so a skip two seconds in still looks like the
       sequence finishing. Nothing on this site should ever appear to be cut
       off mid-gesture. */
    const skip = () => {
      document.documentElement.setAttribute("data-boot-skip", "");
      window.setTimeout(finish, 260);
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

  /* The clock starts when the frames do, not when this mounted.

     Every animation in the sequence is timed from the moment the cards are
     measured — which is when the overlay renders and when `--boot-at` lands on
     each card — and measuring waits on the fonts. The first version started
     the finishing timer in the effect above instead, so on any load where
     Canela took a moment the overlay was torn down while the last cards were
     still arriving: the sequence was cut short by exactly however long the
     fonts had taken, which is both invisible in testing and different on every
     machine. Same clock for both, or they drift. */
  useEffect(() => {
    if (!frames) return;
    const timer = window.setTimeout(finish, BOOT_MS);
    return () => window.clearTimeout(timer);
  }, [frames, finish]);

  /* The last resort.

     Everything above can fail in ways this file cannot foresee, and the
     failure mode is the worst one available: a portfolio permanently behind an
     overlay. One unconditional timer, well past the end of the run, puts the
     page back whatever happened. It costs nothing when the sequence works,
     because by then there is nothing left to reveal. */
  useEffect(() => {
    if (!booting) return;
    const bail = window.setTimeout(() => {
      revealPage();
      document.documentElement.removeAttribute("data-boot-skip");
    }, BOOT_MS * 2);
    return () => window.clearTimeout(bail);
  }, [booting]);

  if (!booting || !frames) return null;

  return (
    <div
      className={styles.boot}
      style={
        {
          "--run": `${BOOT_MS}ms`,
          "--ground-out": `${GROUND_OUT * BOOT_MS}ms`,
        } as React.CSSProperties
      }
      /* Not announced. A screen reader gets the real page immediately — it was
         never hidden from the accessibility tree, only from the eye — and
         narrating a decorative animation would be an interruption rather than
         information. */
      aria-hidden="true"
    >
      <div className={styles.grid} />

      <svg className={styles.svg} width="100%" height="100%">
        {frames.map((f, i) => (
          <rect
            key={i}
            className={styles.rect}
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            rx={f.radius}
            /* `pathLength` normalises the perimeter to 1 so one dash rule
               draws every rectangle at the same rate regardless of size —
               without it a small card finishes long before a large one and the
               wave loses its shape. */
            pathLength={1}
            style={{ "--d": `${f.at}ms` } as React.CSSProperties}
          />
        ))}
      </svg>

      <p className={styles.hint}>Press any key to skip</p>
    </div>
  );
}
