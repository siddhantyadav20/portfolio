"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOOT_MS, isBooting, markSeen, revealPage } from "@/lib/boot";
import styles from "./BootSequence.module.css";

/* ===========================================================================
   The drafting table.

   A loading screen on a design portfolio is time taken from looking at the
   work. The only version worth building is one where the waiting *is* a piece
   of the work — so this does not spin. It opens a drafting board, rules it,
   draws the bento grid with a pen, tidies the sketch, and lets the real page
   arrive underneath.

   FIVE ACTS, and each earns its seconds:

     1. THE BOARD.  Rulers slide in from all four edges and the grid resolves.
        Ticks every 10px, labelled every 100 — the actual drafting convention
        rather than a decorative approximation, because the difference between
        those two is the whole difference between technical and themed.
     2. THE PEN.  One continuous stroke travels the board, dropping an anchor
        at each corner and drawing each frame in turn. Guides track it out to
        the rulers, which light the span the pen is currently inside. This is
        what a vector tool actually looks like while somebody is using it.
     3. THE SKETCH.  The frames land slightly rotated and slightly off — drawn
        by a hand, not a machine.
     4. TIDY UP.  Everything is selected, then straightened and aligned in one
        spring. Figma's own gesture, and the moment the sequence is built
        around: loose becomes exact.
     5. THE HAND-OVER.  Each card fills in underneath its own frame as the
        wireframe scales up and dissolves through it.

   WHAT THE RESEARCH CHANGED. An earlier version staggered eight cards over two
   and a half seconds — about 350ms apart. The convention for a wave is 30 to
   60ms and a total under half a second; at 350 the eye reads a queue rather
   than a gesture, which is most of why it looked cheap. Everything here is
   fast and overlapped, and the length comes from having five acts rather than
   from any one of them dragging.

   The motion is a real spring, sampled out of `lib/spring.ts` at module scope.
   Nothing runs a frame loop: the component measures once, writes custom
   properties, and the compositor does the rest.
   =========================================================================== */

type Frame = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly radius: number;
  /** When the pen reaches it, ms from the start of the run. */
  readonly at: number;
  /** How far off a hand drew it, in px and degrees. Resolved by Tidy up. */
  readonly dx: number;
  readonly dy: number;
  readonly rot: number;
};

/* --- The beats, as fractions of BOOT_MS ---------------------------------- */

/** The pen reaches the first frame. */
const PEN_FROM = 0.1;
/** ...and the last. A fast wave: see the note on the research above. */
const PEN_SPAN = 0.26;
/** Everything straightens and aligns. */
const TIDY = 0.52;
/** A card fills in this long after its own frame was tidied. */
const COMMIT_LAG = 0.06;
/** Rulers retract, grid goes. */
const BOARD_OUT = 0.78;

/**
 * Which elements get a frame.
 *
 * `CardShell` marks every card it renders and the Introduction marks itself
 * passive — between them that is the bento grid and nothing else. Reading the
 * DOM rather than listing the cards means a card added later joins the
 * sequence without anybody remembering to come back here.
 */
const CARDS = "[data-prox-card], [data-prox-passive]";

/** The card the pen starts from, and the wave radiates out of. */
const FOCAL = '[data-card="introduction"]';

/**
 * How far a hand misses by.
 *
 * Deterministic, not random: the same card is off by the same amount on every
 * visit, so the sequence is reproducible and a screenshot test would not
 * flicker. Derived from the index so neighbouring frames never lean the same
 * way, which is what stops the sketch looking like a systematic skew.
 */
const wobble = (i: number) => ({
  dx: ((i * 37) % 15) - 7,
  dy: ((i * 53) % 13) - 6,
  /* Under half a degree. A tall card is 700px, and at 1.5deg its corners are
     nine pixels out of true — which stops reading as a hand and starts reading
     as a mistake. The tell for "sketched" is that the lines do not quite meet,
     not that the box is visibly crooked. */
  rot: (((i * 41) % 5) - 2) * 0.22,
});

export default function BootSequence() {
  /* Read once, during the first render, and never again.

     It has to be captured here rather than in an effect because the attribute
     it reads is the same one this component removes on the way out — and in
     development React mounts, tears down and remounts every effect, so an
     effect asking "are we booting?" gets "no" on the second run and gives up
     on a sequence that had barely started. */
  const [booting] = useState(isBooting);
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [penPath, setPenPath] = useState<string>("");
  const done = useRef(false);

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
       read before that is a rect of the layout mid-assembly. Deliberately not
       `requestAnimationFrame`, which is the mistake this replaced and the same
       one `useStudyUrl` documents: frames do not run in a backgrounded tab,
       and opening a link in a background tab is how people open links. */
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      window.scrollTo(0, 0);

      const els = Array.from(document.querySelectorAll<HTMLElement>(CARDS));
      const vh = window.innerHeight;

      const onScreen = els
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(
          ({ r }) =>
            r.width > 40 && r.height > 40 && r.y < vh - 40 && r.y + r.height > 40,
        );
      if (onScreen.length === 0) return;

      /* The wave's origin: the Introduction if it is on screen, the middle of
         the viewport if it is not. */
      const focal = document
        .querySelector<HTMLElement>(FOCAL)
        ?.getBoundingClientRect();
      const ox = focal ? focal.x + focal.width / 2 : window.innerWidth / 2;
      const oy = focal ? focal.y + focal.height / 2 : vh / 2;

      const ordered = onScreen
        .map((c) => ({
          ...c,
          d: Math.hypot(c.r.x + c.r.width / 2 - ox, c.r.y + c.r.height / 2 - oy),
        }))
        .sort((a, b) => a.d - b.d);

      const step =
        ordered.length > 1 ? (PEN_SPAN * BOOT_MS) / (ordered.length - 1) : 0;

      const out: Frame[] = ordered.map((c, i) => {
        const at = PEN_FROM * BOOT_MS + i * step;
        const w = wobble(i);

        /* The card is told when to arrive, and arrives on its own.

           Written straight to the element rather than held in React state: the
           real cards are not this component's to render, and re-rendering to
           move eight numbers would be work for nothing. The stylesheet picks
           them up — see "Boot" in globals.css. */
        c.el.dataset.bootCard = "";
        c.el.style.setProperty(
          "--boot-at",
          `${Math.round((TIDY + COMMIT_LAG) * BOOT_MS + i * 55)}ms`,
        );

        return {
          x: Math.round(c.r.x),
          y: Math.round(c.r.y),
          w: Math.round(c.r.width),
          h: Math.round(c.r.height),
          radius: parseFloat(getComputedStyle(c.el).borderTopLeftRadius) || 0,
          at: Math.round(at),
          ...w,
        };
      });

      /* One continuous stroke through every frame's top-left corner, in the
         order the pen visits them. A pen that teleports between shapes is a
         cursor; a pen that travels is somebody drawing. */
      setPenPath(
        out
          .map(
            (f, i) =>
              `${i === 0 ? "M" : "L"} ${f.x + f.dx} ${f.y + f.dy}`,
          )
          .join(" "),
      );
      setFrames(out);
    };

    const fallback = window.setTimeout(draw, 400);
    if (document.fonts) {
      void document.fonts.ready.then(() => {
        window.clearTimeout(fallback);
        draw();
      });
    }

    /* Skippable, and it does not cut.

       Five seconds is a long time to hold somebody who came to read three case
       studies, and the polite version of a long animation is one that stops
       the moment you ask. It stops by bringing everything home fast rather
       than by disappearing: `data-boot-skip` collapses every delay and
       shortens every duration, so a skip two seconds in still looks like the
       sequence finishing. */
    const skip = () => {
      document.documentElement.setAttribute("data-boot-skip", "");
      window.setTimeout(finish, 300);
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

     Every animation is timed from the moment the cards are measured, and
     measuring waits on the fonts. Starting the finishing timer in the effect
     above instead meant that on any load where Canela took a moment the
     overlay was torn down while the last cards were still arriving — cut short
     by exactly however long the fonts had taken, which is invisible in testing
     and different on every machine. */
  useEffect(() => {
    if (!frames) return;
    const timer = window.setTimeout(finish, BOOT_MS);
    return () => window.clearTimeout(timer);
  }, [frames, finish]);

  /* The last resort. Everything above can fail in ways this file cannot
     foresee, and the failure mode is the worst one available: a portfolio
     permanently behind an overlay. */
  useEffect(() => {
    if (!booting) return;
    const bail = window.setTimeout(() => {
      revealPage();
      document.documentElement.removeAttribute("data-boot-skip");
    }, BOOT_MS * 2);
    return () => window.clearTimeout(bail);
  }, [booting]);

  if (!booting || !frames) return null;

  const penEnd = frames[frames.length - 1];

  return (
    <div
      className={styles.boot}
      style={
        {
          "--run": `${BOOT_MS}ms`,
          "--tidy": `${TIDY * BOOT_MS}ms`,
          /* The pen stops when the last frame closes — 260ms is one frame's
             stroke. Given its own duration it either outran the drawing or
             lagged behind it, and a nib that is not where the line is being
             made is a mascot. */
          "--pen-run": `${(PEN_FROM + PEN_SPAN) * BOOT_MS + 260}ms`,
          "--board-out": `${BOARD_OUT * BOOT_MS}ms`,
        } as React.CSSProperties
      }
      /* Not announced. A screen reader gets the real page immediately — it was
         never hidden from the accessibility tree, only from the eye — and
         narrating a decorative animation would be an interruption rather than
         information. */
      aria-hidden="true"
    >
      <div className={styles.grid} />
      <Rulers />

      <svg className={styles.svg} width="100%" height="100%">
        {frames.map((f, i) => (
          <g
            key={i}
            className={styles.frame}
            style={
              {
                "--d": `${f.at}ms`,
                "--dx": `${f.dx}px`,
                "--dy": `${f.dy}px`,
                "--rot": `${f.rot}deg`,
                "--cx": `${f.x + f.w / 2}px`,
                "--cy": `${f.y + f.h / 2}px`,
              } as React.CSSProperties
            }
          >
            <rect
              className={styles.rect}
              x={f.x}
              y={f.y}
              width={f.w}
              height={f.h}
              rx={f.radius}
              /* `pathLength` normalises the perimeter to 1 so one dash rule
                 draws every rectangle at the same rate regardless of size —
                 without it a small card finishes long before a large one and
                 the wave loses its shape. */
              pathLength={1}
            />
            {/* The four anchors a pen drops at the corners. */}
            {[
              [f.x, f.y],
              [f.x + f.w, f.y],
              [f.x + f.w, f.y + f.h],
              [f.x, f.y + f.h],
            ].map(([ax, ay], k) => (
              <rect
                key={k}
                className={styles.anchor}
                x={ax - 2.5}
                y={ay - 2.5}
                width={5}
                height={5}
              />
            ))}
          </g>
        ))}

        {/* The stroke the pen is travelling along. Drawn once, behind
            everything, as the faint trace of where the hand has been. */}
        <path className={styles.trail} d={penPath} pathLength={1} />
      </svg>

      <Pen path={penPath} end={penEnd} />

      <p className={styles.hint}>Press any key to skip</p>
    </div>
  );
}

/* --- The board ------------------------------------------------------------ */

/**
 * Rulers on all four edges.
 *
 * Ticks every 10px and a label every 100 — the convention a real ruler uses,
 * and the reason this reads as an instrument rather than as a decorative
 * frame. The ticks themselves are a repeating gradient in the stylesheet; only
 * the numbers need the DOM, and only every hundredth one.
 */
function Rulers() {
  /* Measured during render, not in an effect.

     `BootSequence` renders nothing until it has measured the cards, which only
     happens in the browser — so by the time this exists `window` is real and
     there is no server pass to disagree with. An effect here would set state
     synchronously on mount for no reason, which React 19 flags and which would
     paint one frame of unlabelled ruler first. */
  const marks = useMemo(() => {
    const step = 100;
    const h: number[] = [];
    const v: number[] = [];
    for (let x = step; x < window.innerWidth; x += step) h.push(x);
    for (let y = step; y < window.innerHeight; y += step) v.push(y);
    return { h, v };
  }, []);

  return (
    <div className={styles.rulers}>
      <div className={`${styles.ruler} ${styles.top}`}>
        {marks.h.map((x) => (
          <span key={x} className={styles.mark} style={{ left: x }}>
            {x}
          </span>
        ))}
      </div>
      <div className={`${styles.ruler} ${styles.left}`}>
        {marks.v.map((y) => (
          <span key={y} className={styles.mark} style={{ top: y }}>
            {y}
          </span>
        ))}
      </div>
      <div className={`${styles.ruler} ${styles.right}`} />
      <div className={`${styles.ruler} ${styles.bottom}`} />
    </div>
  );
}

/**
 * The pen, and the guides that track it.
 *
 * `offset-path` moves it along the same stroke the trail draws, so the nib and
 * the line it is leaving cannot disagree — the alternative, keyframing a
 * translate per segment, drifts the moment a card moves.
 *
 * The guides are the part that makes it read as a *tool* rather than a mascot:
 * two hairlines running from the nib out to the rulers, which is what every
 * vector editor shows while you draw and what nobody thinks to animate.
 */
function Pen({ path, end }: { path: string; end?: Frame }) {
  if (!path || !end) return null;

  return (
    <div
      className={styles.penWrap}
      style={{ offsetPath: `path("${path}")` } as React.CSSProperties}
    >
      <span className={styles.guideX} />
      <span className={styles.guideY} />
      <svg className={styles.pen} viewBox="0 0 24 24" width="26" height="26">
        {/* A nib: the classic vector-pen triangle, drawn rather than iconified
            so it inherits the ink colour and stays one hairline at any zoom. */}
        <path
          d="M3 3 L11 21 L13.2 13.2 L21 11 Z"
          fill="var(--page-base)"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M13.2 13.2 L21 21" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </div>
  );
}
