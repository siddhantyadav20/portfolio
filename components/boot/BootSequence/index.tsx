"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOOT_MS, isBooting, markSeen, revealPage } from "@/lib/boot";
import styles from "./BootSequence.module.css";

/* ===========================================================================
   The site, drawing itself.

   A loading screen for a design portfolio has an obvious trap: it is time
   taken from somebody looking at the work, spent on something that is not the
   work. The only version worth building is one where the waiting *is* a piece
   of the work — so this does not spin. It measures the homepage's real bento
   grid and then draws it, frame by frame, the way the file it came from was
   drawn: a rectangle dragged out, its dimensions ticking up beside it, corner
   handles snapping on when it lands.

   THE ONE IDEA THAT MAKES IT WORK: the wireframes are not a picture of the
   layout, they are measured from it. Every frame is positioned at the exact
   `getBoundingClientRect()` of a real card and given that card's real corner
   radius, so the hand-over at the end is a cross-fade between two things
   occupying the same pixels. Nothing slides into place, because nothing was
   ever out of place — which is the whole difference between this and the
   jumpy version where a loader's idea of the layout and the layout itself
   disagree by four pixels and the eye catches every one of them.

   It also means this cannot drift. Re-flow the grid, change a card's radius,
   add a card: the sequence re-measures on the next arrival and is correct,
   because it has no opinion of its own about where anything is.
   =========================================================================== */

type Frame = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly radius: number;
  /** The Figma-ish layer name shown while it draws. */
  readonly name: string;
};

/**
 * The beats, as fractions of `BOOT_MS`.
 *
 * Fractions rather than milliseconds so the whole thing retimes from one
 * constant: asked for four seconds instead of five, every stagger, stroke and
 * fade moves with it and none of them need touching.
 */
const DRAW_FROM = 0.08;
const DRAW_TO = 0.66; // all frames drawn by here
/* There is deliberately no separate "select everything" beat between the last
   frame landing and the hand-over. It was in the first plan and it was dead
   time: the handles pop on as each frame finishes, so by the time the last one
   lands the whole board is already sitting there selected. Adding a moment to
   announce a state the screen is already in is how five seconds becomes six. */
const HANDOVER = 0.78; // real cards begin to appear

/** How long one frame takes to draw itself, as a fraction of the run. */
const STROKE = 0.12;

/**
 * Which elements get a frame.
 *
 * `CardShell` marks every card it renders, and the Introduction marks itself
 * passive — between them that is the bento grid and nothing else. Reading the
 * DOM rather than listing the cards means a card added later is drawn without
 * anybody remembering to come back here.
 */
const CARDS = "[data-prox-card], [data-prox-passive]";

function titleCase(slug: string) {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Measure the real grid.
 *
 * Only what is on screen: the footer and anything below the fold would be
 * drawn off the edge of the overlay, and a designer's file does not open
 * scrolled somewhere else either. Sorted into reading order — top to bottom,
 * then left to right within a row — so the sequence works across the page the
 * way a person would rather than in whatever order the DOM happens to be in.
 */
function measure(): Frame[] {
  const seen = Array.from(document.querySelectorAll<HTMLElement>(CARDS));
  const vh = window.innerHeight;

  return seen
    .map((el) => {
      const r = el.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const slug = el.dataset.card;
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius,
        name: slug ? titleCase(slug) : "Frame",
      };
    })
    .filter((f) => f.w > 40 && f.h > 40 && f.y < vh - 40 && f.y + f.h > 40)
    .sort((a, b) => {
      // Same row if their tops are within a card's height of each other.
      const row = Math.abs(a.y - b.y) < 80 ? 0 : a.y - b.y;
      return row || a.x - b.x;
    });
}

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
  const [phase, setPhase] = useState<"draw" | "handover" | "gone">("draw");
  const done = useRef(false);

  /**
   * End it, from anywhere.
   *
   * Idempotent because three things race to call it: the timer, the skip, and
   * the unmount. Whichever gets there first wins and the rest are no-ops.
   */
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;

    /* Both at once, and this ordering is the whole hand-over.

       Revealing the page *starts* the cross-fade rather than ending it: the
       real cards fade up from `opacity: 0` at exactly the rects the wireframes
       are occupying, while the overlay fades down over the same beat. For a
       few hundred milliseconds both are half-present and sitting on the same
       pixels, which is what reads as the drawing becoming the thing.

       The first version revealed the page *after* the overlay had gone, and
       the result was a second of blank screen between the two — the sketch
       vanished, nothing replaced it, and then the homepage appeared. Same
       assets, same timings, and completely wrong. */
    setPhase("handover");
    revealPage();

    // Only once the cross-fade is over does the overlay stop existing.
    window.setTimeout(() => {
      setPhase("gone");
      markSeen();
    }, BOOT_MS * (1 - HANDOVER) + 120);
  }, []);

  useEffect(() => {
    if (!booting) return;

    /* Measured when the fonts are ready, and not before.

       Two things had to be true and only one of them was obvious. The obvious
       one: a rect read on mount is a rect of the layout mid-assembly — Canela
       is a webfont, every heading reflows when it lands, and frames measured
       before that are drawn a few pixels off the cards they are supposed to
       become. `document.fonts.ready` is the actual signal for "the layout has
       stopped moving", so it is the one to wait on.

       The one that cost an hour: the first version waited on
       `requestAnimationFrame` instead, which is the same mistake `useStudyUrl`
       and the palette's tour both document. Frames do not run in a
       backgrounded tab — and opening a link in a background tab is how people
       open links — so anybody who did that got a page held behind an overlay
       that had measured nothing and drawn nothing. A promise resolves either
       way. */
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      window.scrollTo(0, 0);
      setFrames(measure());
    };

    /* `fonts.ready` resolves on its own schedule, and on a cold cache that can
       be slower than the sequence is long. The race keeps the sequence
       honest: whichever arrives first wins, and a font landing late costs a
       few pixels of accuracy rather than the whole animation. */
    const fallback = window.setTimeout(draw, 400);
    if (document.fonts) {
      void document.fonts.ready.then(() => {
        window.clearTimeout(fallback);
        draw();
      });
    }

    const timer = window.setTimeout(finish, BOOT_MS * HANDOVER);

    /* Skippable, and it has to be. Five seconds is a long time to hold
       somebody who came here to look at three case studies, and the polite
       version of a long animation is one that stops the moment you ask. */
    const skip = () => finish();
    for (const e of ["keydown", "pointerdown", "wheel", "touchstart"]) {
      window.addEventListener(e, skip, { once: true, passive: true });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      window.clearTimeout(timer);
      for (const e of ["keydown", "pointerdown", "wheel", "touchstart"]) {
        window.removeEventListener(e, skip);
      }
    };
  }, [booting, finish]);

  /* The last resort.

     Everything above can fail in ways this file cannot foresee — a thrown
     measure, a timer a background tab never fires — and the failure mode is
     the worst one available: a portfolio that is permanently invisible behind
     an overlay. So one unconditional timer, well past the end of the run,
     puts the page back no matter what happened. It costs nothing when the
     sequence works, because by then there is nothing left to reveal. */
  useEffect(() => {
    if (!booting) return;
    const bail = window.setTimeout(revealPage, BOOT_MS * 2);
    return () => window.clearTimeout(bail);
  }, [booting]);

  if (!booting || !frames || phase === "gone") return null;

  const step = frames.length > 1 ? (DRAW_TO - DRAW_FROM) / frames.length : 0;

  return (
    <div
      className={styles.boot}
      data-phase={phase}
      style={{ "--run": `${BOOT_MS}ms` } as React.CSSProperties}
      /* Not announced. A screen reader gets the real page immediately — it was
         never hidden from the accessibility tree, only from the eye — and
         narrating a decorative animation would be an interruption, not
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
               without it a small card finishes long before a large one and
               the sequence loses its beat. */
            pathLength={1}
            style={{ "--d": `${(DRAW_FROM + i * step) * BOOT_MS}ms` } as React.CSSProperties}
          />
        ))}
      </svg>

      {frames.map((f, i) => (
        <div
          key={i}
          className={styles.label}
          style={
            {
              transform: `translate(${f.x}px, ${f.y + f.h}px)`,
              "--d": `${(DRAW_FROM + i * step) * BOOT_MS}ms`,
            } as React.CSSProperties
          }
        >
          <span className={styles.name}>{f.name}</span>
          <span className={styles.size}>
            {f.w} × {f.h}
          </span>
        </div>
      ))}

      {/* The corner handles, drawn once every frame has landed. */}
      {frames.map((f, i) => (
        <div
          key={i}
          className={styles.handles}
          style={
            {
              transform: `translate(${f.x}px, ${f.y}px)`,
              width: f.w,
              height: f.h,
              "--d": `${(DRAW_FROM + i * step + STROKE) * BOOT_MS}ms`,
            } as React.CSSProperties
          }
        >
          <i /><i /><i /><i />
        </div>
      ))}

      <p className={styles.hint}>Press any key to skip</p>
    </div>
  );
}

