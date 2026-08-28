"use client";

import { useEffect, useRef, useState } from "react";
import { timeline } from "@/content/site";
import { MONTH, createScrubber, type Scrubber } from "@/lib/scrubber";
import { frameDelta } from "@/lib/spring";
import styles from "./TimelineExperience.module.css";

/**
 * Figma node 244:9388, made draggable.
 *
 * In Figma the whole card is rotated -90deg; here it is built upright, which
 * is the same picture with none of the transform. Every length below was read
 * off the node and checked against a render of it — see the geometry block in
 * the stylesheet for the full list.
 *
 * ---------------------------------------------------------------------------
 * The instrument: a tape under a fixed marker
 *
 * The scale is a calendar — a mark every month, a longer one at the half year,
 * a longer one still and a number at the year. What is not Figma's is which
 * half of it moves.
 *
 * It used to move both: a needle travelled down the window while the scale
 * drifted the other way, and between them they covered seven years. That is
 * two moving frames of reference for one number. Every physical instrument
 * with a scale this long — a tape measure pulled past a mark, a rotary dial, a
 * picker wheel — holds the *reading* still and moves the *scale*. So does this
 * now. The marker is Figma's dragger, parked at `READ_Y` and never moving:
 *
 *     translateY = READ_Y - (value - FIRST) * STEP
 *
 * Three things fall out of that, and they are the whole reason for the change:
 *
 *   1. Direct manipulation actually is direct. The tape goes where the finger
 *      goes; drag down and the past comes down to meet you. With a needle, the
 *      finger and the thing it grabbed moved opposite ways.
 *
 *   2. A tap anywhere on the tape means "bring this up to the marker", which
 *      is a gesture with an obvious result rather than a coordinate lookup.
 *
 *   3. Every highlight the old version painted per frame is now a *static* CSS
 *      mask, because the point of interest no longer moves. See `.window` in
 *      the stylesheet: one gradient centred on the marker does the work of a
 *      hover glow, eighty-five per-mark highlights and a whole-ruler hover
 *      brightening put together, at nothing per frame.
 *
 * ---------------------------------------------------------------------------
 * What says "you are here", and why it is nothing
 *
 * Figma draws a dragger pointing at the scale across an 8px gap, and draws no
 * line, no dot and no highlight anywhere on the scale. That is the whole
 * indicator, and it is right: a triangle aimed at a mark is unambiguous, and
 * every extra channel — a bar across the tape, a bead at each moment, a glow
 * under the pointer, a label that grows — is one more thing saying what the
 * triangle already said.
 *
 * So the reading is: the triangle, the mark it points at, and the words. The
 * tape is inert.
 *
 * ---------------------------------------------------------------------------
 * The detent is a ratchet, and it is the only feedback there is
 *
 * Because nothing lights up, landing has to be *felt*. A hard drag or a hard
 * scroll steps to the next moment in the career and stops dead there; do it
 * again and it steps again. One throw, one moment, however hard the throw. See
 * `land` in `lib/scrubber.ts` — the value is handed to the spring with the
 * throw's own velocity still on it, so it arrives fast, overshoots a hair and
 * settles, which is what a detent feels like.
 *
 * `navigator.vibrate` used to fire here as well and no longer does: it is
 * Android-only, so it was a feel most visitors never got, and it was covering
 * for an interaction that now does the job on its own.
 *
 * ---------------------------------------------------------------------------
 * What updates when
 *
 * The count and the date change every frame and are written straight to their
 * text nodes — putting a number that moves at 120Hz through React would render
 * the page a hundred times a second to change four characters. Only the entry
 * is state, because it animates. Per frame that leaves one transform, at most
 * two text nodes, and one boolean attribute when the tape crosses in or out of
 * "too fast to read".
 */

/* --- Geometry, from Figma --------------------------------------------------
   Node 244:9389 ("Scale"), a flex column with a 6px gap:

     milestone 2  +  gap 6  +  fillers 17  +  gap 6
     middle  1.5  +  gap 6  +  fillers 17  +  gap 6   =  61.5

   which is where STEP comes from, and it is exact. Figma's five fillers sit at
   a 4px pitch inside each 17px block, so its months are not evenly spaced;
   here they are, because a mark that means a month has to be a month away from
   its neighbour. Everything else — the lengths, the weights, the 16px channel
   in front of the marks, the number 4px past the milestone's end — is Figma's
   and lives in the stylesheet. */

/** Distance between two year milestones. */
const STEP = 61.5;

/** One month. */
const TICK = STEP / 12;

const { min, max, start, dayOne, entries, unit } = timeline;

/** Years of scale drawn past each end of what can actually be reached.
 *
 *  The career stops where it stops, and a scale that runs out in the middle of
 *  its own window looks broken rather than finished — at rest the reading is
 *  `max`, so without this the whole bottom of the instrument is blank. These
 *  years are drawn, dimmed, and unreachable: the scrubber is still clamped to
 *  [min, max], so the tape runs out of travel before it runs out of scale,
 *  which is exactly how a real tape measure behaves.
 *
 *  Three rather than two because the top end has the same problem in reverse
 *  and needs more of it — at `min` there is a whole window above the marker to
 *  fill, and two years does not reach the fade. */
const LOCK = 3;

/** The first and last year the scale draws, as opposed to the first and last
 *  it will let you stop on. */
const FIRST = min - LOCK;
const LAST = max + LOCK;

const YEARS = LAST - FIRST; // 13 groups of marks
const SCALE_H = YEARS * STEP + 2; // the last milestone is 2px tall

/** The ruler's box. Must agree with `.ruler`'s height in the stylesheet — it
 *  is the divisor that turns a measured on-screen height back into design
 *  pixels, which is how a drag stays stuck to the finger while the proximity
 *  field is scaling the card. */
const WINDOW_H = 436;

/** Where the marker sits, in design pixels from the top of that box. Written
 *  into CSS as `--read` rather than duplicated there: the stylesheet centres
 *  the focus mask on it and hangs the marker off it, and both have to be the
 *  same number as the transform the loop writes.
 *
 *  313 puts it at card-y 157, which is within three pixels of where Figma
 *  parks its dragger. Below centre, because at rest the reading is `max` and
 *  everything worth looking at is above the marker. */
const READ_Y = 313;

/** The same number as a fraction of the window, which is the form the loop
 *  actually wants.
 *
 *  `READ_Y` is only correct while the window is exactly `WINDOW_H` tall, and it
 *  stopped being: `.ruler`'s height is in `--u`, so it is 581 at 1920 while the
 *  marker stayed at a literal 313 — the focus band sat at 54% of the window
 *  instead of the 72% it is drawn at. Below 1001 the instrument is turned a
 *  quarter and its length becomes the card's width, which is a third length
 *  again. Measured against the box each time, all three are the same
 *  instrument. */
const READ_FRAC = READ_Y / WINDOW_H;

/** Where a value sits on the tape, in the tape's own pixels. */
const tapeAt = (v: number) => (v - FIRST) * STEP;

/** The tape's offset for a given reading, at the drawn size. The loop uses the
 *  measured reading point instead — this is the server's copy, correct at the
 *  size the card is drawn and replaced on the first frame after mount. */
const tapeY = (v: number) => READ_Y - tapeAt(v);

/** The calendar year. Derived — see the note in `content/site.ts`. */
const yearAt = (v: number) => Math.floor(dayOne + v);

/** The count, clamped at zero: "-1.3 years of experience" is not a thing
 *  anyone has. Below day one the scale dims and the count holds at 0 while the
 *  date keeps moving, which is the honest way to say the clock hasn't started. */
const countAt = (v: number) => {
  const y = Math.round(Math.max(0, v) * 10) / 10;
  return Number.isInteger(y) ? String(y) : y.toFixed(1);
};

/** The last entry at or before the marker. Entries are step functions. */
const entryAt = (v: number) => {
  let i = 0;
  for (let k = 1; k < entries.length; k++) if (entries[k].at <= v) i = k;
  return i;
};

/** The coarse grain, handed to the scrubber: the moments a throw steps to, one
 *  per throw. The same eight the readout names. */
const ANCHORS = entries.map((e) => e.at);

/* --- Feel ------------------------------------------------------------------ */

/** Above this (years/sec) the tape is moving too fast to read and the marks
 *  soften. Deliberately equal to the scrubber's `COARSE_VEL`: the speed that
 *  blurs the scale is the speed that arms the ratchet. */
const FAST = 2;

/** Milliseconds of quiet before a wheel gesture is considered over. */
const WHEEL_END = 130;

/** A tap, not a drag: under this many pixels and this many milliseconds, the
 *  gesture is read as "bring what I just touched up to the marker". */
const TAP_PX = 4;
const TAP_MS = 320;

/* The demonstration.

   A tape that never moves on its own gives a visitor no reason to think it
   can. This runs once, the first time the card is properly on screen and only
   if nobody has touched it yet: the tape rolls back most of a year and
   returns. It is deliberately small and deliberately slow to start — a card
   that twitches the instant it appears reads as a loading glitch, not as an
   invitation.

   It is cancelled outright by any real gesture, and never runs under reduced
   motion. */
const CUE_WAIT = 900;
const CUE_HOLD = 820;
const CUE_BACK = 0.85;

/** How much of the card has to be on screen before the cue counts as seen. */
const CUE_RATIO = 0.6;

/* The resting readout, as constants rather than as derived state.

   The count and the date are written by the loop, and React must never render
   a *different* value into those two text nodes or it would overwrite the live
   one for a frame every time the entry changes. Constant children are children
   React has no reason to touch on a re-render, so it doesn't. */
const REST_COUNT = countAt(start);
const REST_YEAR = yearAt(start);

type Shown = {
  /** Index into `entries`. */
  i: number;
  /** Which way the tape was going, so the swap enters from that side. 0 is the
   *  first paint: the card should not animate itself on page load, only when
   *  someone has moved it. */
  dir: 0 | 1 | -1;
  /** The announced position. Updated when the tape lands, not per frame. */
  at: number;
};

export default function TimelineExperience() {
  /* Built once and kept for the life of the component: it holds the reading
     and its velocity, which must survive every re-render the entry causes. */
  const scrubRef = useRef<Scrubber | null>(null);
  if (scrubRef.current == null) {
    scrubRef.current = createScrubber(min, max, start, ANCHORS);
  }

  const cardRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLParagraphElement>(null);

  /* The entry is the only thing React renders per change: it animates, and it
     changes eight times across the whole scale. */
  const [entry, setEntry] = useState<Shown>(() => ({
    i: entryAt(start),
    dir: 0,
    at: start,
  }));

  /* The only thing the *rendered* markup needs to know about the quarter turn.
     Everything else about it is CSS and the loop's own `turned` — but
     `aria-orientation` is a promise to a screen reader about which arrow keys
     move this control, and below 1001 the answer changes. `onKey` has always
     taken both pairs, so nothing about the behaviour turns with it; this stops
     the announcement being wrong.

     False on the server and corrected on mount: there is no viewport to
     measure until there is one, and a wrong orientation for one frame is not
     something anything can act on. */
  const [horizontal, setHorizontal] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1000px)");
    const read = () => setHorizontal(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  useEffect(() => {
    const scrub = scrubRef.current!;
    const card = cardRef.current;
    const grip = gripRef.current;
    const box = windowRef.current;
    const scale = scaleRef.current;
    const count = countRef.current;
    const date = dateRef.current;
    if (!card || !grip || !box || !scale || !count || !date) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReduce = () => scrub.setReducedMotion(reduce.matches);
    onReduce();
    reduce.addEventListener("change", onReduce);

    let frame = 0;
    let last = 0;
    let dragging = false;
    let fast = false;
    let shownCount = "";
    let shownDate = 0;

    /* --- Which way the tape runs ------------------------------------------

       Below 1001 the stylesheet turns `.ruler` a quarter so time reads left to
       right — a phone has width to spare and no height, and a vertical scrub
       on a touch screen is a gesture arguing with the page's own.

       Only three things know about it, and none of them is the tape. The
       element turned; the coordinate system inside it did not, so the tape's
       own pixels, the transform the loop writes and `--read` are all unchanged.
       What changes is which side of the bounding box is the tape's length, and
       which pointer coordinate runs along it. */
    const turned = window.matchMedia("(max-width: 1000px)");

    /** The tape's axis in screen terms: how long it is, and where it starts. */
    const along = () => {
      const r = box.getBoundingClientRect();
      return turned.matches
        ? { span: r.width, start: r.left }
        : { span: r.height, start: r.top };
    };

    /** The pointer coordinate that moves along the tape. */
    const coord = (e: { clientX: number; clientY: number }) =>
      turned.matches ? e.clientX : e.clientY;

    /** The reading point, in the window's own pixels. `clientHeight` rather
     *  than the bounding box: it is the layout height, so it is the tape's
     *  length in both orientations and it ignores the proximity field's
     *  scale — which is the transform, not the geometry. */
    const readPx = () => READ_FRAC * box.clientHeight;

    /** Pixels per year on screen, live: the proximity field scales this card
     *  under the pointer, and a drag has to stay stuck to the finger through
     *  that. Measured rather than assumed.
     *
     *  Divided by the window's own length rather than by `WINDOW_H`, so what
     *  this reads is the scale factor and nothing else. Against the constant it
     *  silently meant "scale" only while the window was its drawn height, and
     *  would have read a turned or a 1920 window as a permanent zoom. */
    const perYear = () => (along().span / box.clientHeight) * STEP;

    /** What a tap means: bring the touched point up to the marker. The distance
     *  from the marker converts straight into a change in the reading, which is
     *  why this is a delta off the current value rather than an absolute
     *  lookup — with a fixed marker there is no absolute mapping from a screen
     *  coordinate to a year, and that is the point. */
    const valueAt = (at: number) => {
      const a = along();
      const line = a.start + READ_FRAC * a.span;
      return scrub.value + (at - line) / perYear();
    };

    /* The stylesheet hangs the marker and the focus mask off `--read`, and the
       loop writes the tape against the same number. The server rendered it at
       the drawn size; this is the measured one. */
    const sync = () => {
      card.style.setProperty("--read", `${readPx()}px`);
    };
    sync();

    /* Arrow consts rather than declarations, all of them: a hoisted `function`
       is analysed as if it sat above the null guard, and every ref inside it
       goes back to being possibly-null. */

    const paint = () => {
      const v = scrub.value;

      // The whole instrument, in one write. Nothing else on the ruler moves.
      scale.style.transform = `translate3d(0, ${readPx() - tapeAt(v)}px, 0)`;

      const c = countAt(v);
      if (c !== shownCount) {
        count.textContent = c;
        shownCount = c;
      }
      const y = yearAt(v);
      if (y !== shownDate) {
        date.textContent = String(y);
        shownDate = y;
      }
      count.parentElement!.toggleAttribute("data-zero", v <= 0);

      const isFast = Math.abs(scrub.velocity) > FAST && !reduce.matches;
      if (isFast !== fast) {
        fast = isFast;
        scale.toggleAttribute("data-fast", isFast);
      }

      // The entry re-renders. Its index changes the moment the marker crosses
      // a moment — that is what ticks the marker, and mid-drag it is the only
      // thing that says one went past — while the position it *announces* only
      // catches up once the tape has landed, so a drag is one announcement to
      // a screen reader rather than four hundred.
      const i = entryAt(v);
      setEntry((prev) =>
        prev.i === i && (scrub.moving || dragging || prev.at === v)
          ? prev
          : { i, dir: i >= prev.i ? 1 : -1, at: v },
      );
    };

    const tick = (now: number): void => {
      const dt = frameDelta(now, last);
      last = now;
      const moving = scrub.step(dt);
      paint();
      frame = moving || dragging ? requestAnimationFrame(tick) : 0;
    };

    /** Nothing runs until something moves, and it stops itself when nothing is. */
    const wake = () => {
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    /* --- The invitation ---------------------------------------------------

       A control nobody knows is a control. Two things answer that, and neither
       paints anything per frame.

       The first is the cursor: the ruler opts out of the site's drawn cursor
       (`data-cursor="native"`) and wears the OS `ns-resize` — the vertical bar
       with an arrow at each end, which is the platform's own word for "this
       drags up and down". That replaced a pair of hand-drawn chevrons and,
       with them, the accent glow that used to follow the pointer down the
       scale.

       The second is the demonstration below. */

    let cueTimer = 0;
    let cued = false;

    /** Any real gesture retires the cue for good, whether it has run or not.
     *  Someone already dragging the tape does not need to be shown how. */
    const retireCue = () => {
      cued = true;
      window.clearTimeout(cueTimer);
    };

    const runCue = () => {
      if (cued || reduce.matches) return;
      cued = true;
      scrub.goTo(start - CUE_BACK);
      wake();
      cueTimer = window.setTimeout(() => {
        scrub.goTo(start);
        wake();
      }, CUE_HOLD);
    };

    /* `useVisible` is the site's hook for this and is deliberately not used:
       it returns state, and a re-render is exactly what this component spends
       its whole design avoiding. The observer is six lines and lives in the
       closure that owns the scrubber. */
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([e]) => {
              if (!e.isIntersecting) return;
              io?.disconnect();
              if (!cued) cueTimer = window.setTimeout(runCue, CUE_WAIT);
            },
            { threshold: CUE_RATIO },
          );
    io?.observe(card);

    /* --- Pointer ---------------------------------------------------------- */

    let grabY = 0;
    let grabV = 0;
    let grabAt = 0;
    let moved = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      retireCue();
      dragging = true;
      grabY = coord(e);
      grabV = scrub.value;
      grabAt = performance.now();
      moved = 0;
      scrub.beginDrag(grabV);
      grip.setPointerCapture(e.pointerId);
      /* Focused so the arrow keys work the moment the drag ends, and flagged
         so the ring stays off: Chrome scores a programmatic focus on a
         `role="slider"` as `:focus-visible`, which left the marker permanently
         ringed after every click. `onKey` clears the flag the instant anyone
         actually uses the keyboard. */
      grip.setAttribute("data-pointer", "");
      grip.focus({ preventScroll: true });
      wake();
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = coord(e) - grabY;
      moved = Math.max(moved, Math.abs(dy));
      /* Minus, and this is the whole inversion in one character. The tape is
         what the hand has hold of, so it goes where the hand goes: pull down
         and the tape comes down, which brings *earlier* years to the marker.
         The old needle moved the same way as the finger and therefore the
         opposite way from the thing it was dragging. */
      scrub.drag(grabV - dy / perYear());
      wake();
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (grip.hasPointerCapture(e.pointerId)) {
        grip.releasePointerCapture(e.pointerId);
      }

      // A tap on the tape brings that point up to the marker. Cheap, and it is
      // also the way back to now: the end of the tape is where it started.
      // Anything else goes to `endDrag`, where a hard release steps to the
      // next moment and stops there — see `land` in lib/scrubber.ts.
      scrub.endDrag();
      if (moved < TAP_PX && performance.now() - grabAt < TAP_MS) {
        scrub.goTo(valueAt(coord(e)));
      }
      wake();
    };

    /* --- Wheel and trackpad -----------------------------------------------

       `scrollBy` assigns rather than integrates, so the scrubber has no
       velocity of its own to read at the end of a wheel gesture and cannot
       tell a shove from a nudge. Measured here instead, and deliberately as
       the *peak* rather than the average: a trackpad flick is a fast burst
       followed by a long inertial tail, and averaging over that tail turns
       every flick into a nudge. */

    let wheelTimer = 0;
    let wheelAt = 0;
    let wheelPeak = 0;
    let wheelFrom = 0;

    const onWheel = (e: WheelEvent) => {
      /* Whichever axis the wheel is actually being pushed along. Turned, the
         tape runs across the screen and a trackpad swipe sideways is the
         gesture that matches it — but a mouse wheel only ever reports
         `deltaY`, so take the larger of the two rather than the axis the
         orientation would suggest and leave both inputs working. */
      const raw =
        turned.matches && Math.abs(e.deltaX) > Math.abs(e.deltaY)
          ? e.deltaX
          : e.deltaY;
      // Lines on Firefox, pages on nothing anyone has. 16px is a line.
      const px = e.deltaMode === 1 ? raw * 16 : raw;
      const v = scrub.value;

      // Chain out to the page at the ends rather than trapping the scroll:
      // a control that eats the wheel forever is how a page stops scrolling.
      if ((px < 0 && v <= min) || (px > 0 && v >= max)) return;

      e.preventDefault();
      retireCue();

      const now = performance.now();
      if (!wheelTimer) {
        wheelPeak = 0;
        wheelFrom = v;
        wheelAt = now - 8;
      }
      const dv = px / perYear();
      const rate = dv / Math.max((now - wheelAt) / 1000, 0.004);
      if (Math.abs(rate) > Math.abs(wheelPeak)) wheelPeak = rate;
      wheelAt = now;

      /* No sign flip here, unlike the drag, and the two do agree. A wheel
         delta is already expressed as "how far the content should move up", so
         a positive delta means the tape rolls up and the reading advances —
         the same thing a finger dragging the tape upward does. */
      scrub.scrollBy(dv);
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        wheelTimer = 0;
        // Signed by where the gesture actually went rather than by the last
        // event: the tail of a trackpad fling can arrive with either sign.
        const dir = Math.sign(scrub.value - wheelFrom) || Math.sign(wheelPeak);
        scrub.snap(Math.abs(wheelPeak) * dir);
        wake();
      }, WHEEL_END);
      wake();
    };

    /* --- Keyboard --------------------------------------------------------- */

    const onKey = (e: KeyboardEvent) => {
      const step =
        e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -MONTH
          : e.key === "ArrowDown" || e.key === "ArrowRight"
            ? MONTH
            : e.key === "PageUp"
              ? -1
              : e.key === "PageDown"
                ? 1
                : 0;

      if (step) {
        e.preventDefault();
        scrub.nudge(step);
      } else if (e.key === "Home") {
        e.preventDefault();
        scrub.goTo(min);
      } else if (e.key === "End") {
        e.preventDefault();
        scrub.goTo(max);
      } else {
        return;
      }
      // Whoever pressed that is navigating by keyboard, ring and all.
      grip.removeAttribute("data-pointer");
      retireCue();
      wake();
    };

    grip.addEventListener("pointerdown", onDown);
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
    grip.addEventListener("wheel", onWheel, { passive: false });
    grip.addEventListener("keydown", onKey);

    /* The window's length is the one measurement everything else is derived
       from, and it changes without a pointer ever touching the card: crossing
       601 turns the instrument, a phone rotates, `--u` rescales the frame at
       every width past 1440. Re-derive the reading point and repaint when it
       does — the tape is transformed, not laid out, so nothing else here
       reacts to a resize on its own. */
    const ro = new ResizeObserver(() => {
      sync();
      paint();
    });
    ro.observe(box);

    paint();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(wheelTimer);
      window.clearTimeout(cueTimer);
      ro.disconnect();
      io?.disconnect();
      reduce.removeEventListener("change", onReduce);
      grip.removeEventListener("pointerdown", onDown);
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
      grip.removeEventListener("wheel", onWheel);
      grip.removeEventListener("keydown", onKey);
    };
  }, []);

  const shown = entries[entry.i];

  return (
    /* `--read` is where the marker sits, and it is declared here rather than in
       the stylesheet because three things have to agree on it — the focus
       mask, the marker, and the transform the loop writes — and only one of
       them is CSS's to own. */
    <div
      className={styles.card}
      ref={cardRef}
      data-prox-card=""
      data-card="timeline"
      style={{ "--read": `${READ_Y}px` } as React.CSSProperties}
    >
      <div className={styles.ruler}>
        {/* The clip, and the only highlight there is. The mask inside it is a
            static gradient centred on the marker: sharp there, softening with
            distance, gone at both ends. Static because the marker is — which
            is the dividend the inversion pays. */}
        <div className={styles.window} ref={windowRef}>
          <div
            className={styles.scale}
            ref={scaleRef}
            style={{
              height: `${SCALE_H}px`,
              transform: `translate3d(0, ${tapeY(start)}px, 0)`,
            }}
            aria-hidden="true"
          >
            {Array.from({ length: YEARS + 1 }, (_, i) => {
              const year = FIRST + i;
              return (
                <div
                  key={year}
                  className={styles.group}
                  style={{ top: `${i * STEP}px` }}
                  /* Two ways to be quiet, one look. Before day one is Figma's
                     own — it draws the -1 group at 40%. Past `max` is the same
                     statement about the other end: scale that exists to fill
                     the window and cannot be reached. */
                  data-dim={year < 0 || year > max ? "" : undefined}
                >
                  <span className={styles.milestone} />
                  <span className={styles.number}>{year}</span>

                  {i < YEARS &&
                    Array.from({ length: 11 }, (_, m) => (
                      <span
                        key={m + 1}
                        /* Figma's third tier: the half year is longer than a
                           month and shorter than a year. It is the only
                           landmark between two numbers, and it is what stops
                           eleven identical hairlines reading as one block. */
                        className={m === 5 ? styles.middle : styles.filler}
                        style={{ top: `${(m + 1) * TICK}px` }}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Figma's dragger, and the entire indicator. It points at the scale
            across the 8px Figma leaves between them, and there is deliberately
            nothing else: no bar across the tape, no bead at each moment, no
            glow. A triangle aimed at a mark has already said it.

            Inline rather than an <img> so `currentColor` reaches it: as a
            document of its own it would keep whichever orange was baked into
            the file, which is the wrong one in half the themes.

            Keyed on the entry so React remounts it — and CSS replays `tick` —
            each time the marker crosses into another moment. That is the
            detent you can see, and mid-drag it is the only one there is. */}
        <span className={styles.marker} key={entry.i} aria-hidden="true">
          <svg
            className={styles.glyph}
            width="14"
            height="14"
            viewBox="0 0 8.9186 9.47191"
            fill="none"
          >
            <path
              d="M2.65607 1.10557C3.39312 -0.368525 5.49673 -0.368523 6.23378 1.10557L8.70683 6.05166C9.56465 7.76732 7.66261 9.70204 5.76114 9.44956C4.8962 9.33471 4.05122 9.32983 3.18699 9.436C1.27682 9.67065 -0.649586 7.71689 0.211088 5.99554L2.65607 1.10557Z"
              fill="currentColor"
            />
          </svg>
        </span>

        {/* The handle. Wider than the scale it covers, because the scale is
            80px of hairlines and the thing you grab should not be.

            `data-cursor="native"` takes this element out of the site's drawn
            cursor and hands it back to the OS, so `--native-cursor` in the
            stylesheet is what the visitor actually sees. */}
        <div
          className={styles.grip}
          ref={gripRef}
          data-cursor="native"
          role="slider"
          tabIndex={0}
          aria-label="Career timeline"
          aria-orientation={horizontal ? "horizontal" : "vertical"}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Math.round(entry.at * 12) / 12}
          aria-valuetext={`${countAt(entry.at)} ${unit}, ${yearAt(entry.at)} — ${shown.title}, ${shown.context}`}
        />
      </div>

      {/* Figma's Content block, node 244:9482, at its own left inset and its
          own rhythm: 12px between the three groups, 2px inside them. The count
          and the date are the loop's, not React's — see REST_COUNT. */}
      <div className={styles.content}>
        <p className={styles.years} data-zero={start <= 0 ? "" : undefined}>
          <span ref={countRef}>{REST_COUNT}</span>
          <span className={styles.unit}>{unit}</span>
        </p>

        <p className={styles.date} ref={dateRef}>
          {REST_YEAR}
        </p>

        <hr className={styles.separator} />

        {/* Keyed, so a changed entry mounts fresh and plays its swap. */}
        <div key={entry.i} className={styles.entry} data-dir={entry.dir}>
          <p className={styles.context}>{shown.context}</p>
          <p className={styles.title}>{shown.title}</p>
        </div>
      </div>
    </div>
  );
}
