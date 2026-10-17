"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type Props = {
  /** The drawing — rendered on the server and passed straight through. */
  children: ReactNode;
  label: string;
  classes: {
    frame: string;
    scroller: string;
    hint: string;
    hintIcon: string;
  };
};

/** How much of its speed a released fling keeps per 16ms frame. */
const FRICTION = 0.94;
/** Below this many px/ms the fling has stopped, as far as anyone can see. */
const REST = 0.02;
/** Movement under this is a click that wobbled, not a drag. */
const SLOP = 3;

/**
 * The timeline's frame, with the two ways of moving the drawing that a native
 * scroller does not give a mouse.
 *
 * DRAG TO PAN. A trackpad already pans the canvas and a phone swipes it, but
 * a mouse wheel scrolls the page, and a canvas you can only move with Shift
 * held down is one most people will never move. So a mouse or a pen can grab
 * it and throw it: the drag writes `scrollLeft` directly, and letting go keeps
 * the last velocity and bleeds it off with friction, the way the trackpad's
 * own momentum would. Touch is left to the browser, which already does all of
 * this and does it better.
 *
 * THE PILL IS A BUTTON. "Scroll to move" is the canvas telling you it moves;
 * pressing it shows you — the drawing glides to the far end, or home again if
 * it is already past halfway.
 *
 * Both write `scrollLeft` on the real scroller, so the keyboard, the
 * scrollbar and the trackpad keep working exactly as they did, and nothing
 * here owns the position.
 *
 * `data-touched` goes on the frame the first time the drawing moves by any
 * means, and the pill's arrows stop nudging: the hint has done its job.
 */
export default function TimelinePan({ children, label, classes }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fling = useRef(0);

  const stopFling = useCallback(() => {
    if (fling.current) cancelAnimationFrame(fling.current);
    fling.current = 0;
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const scroller = scrollerRef.current;
    if (!frame || !scroller) return;

    /* Grab cursor only when there is somewhere to go — at a width where the
       whole drawing fits, a hand that cannot move anything is a lie. */
    const measure = () => {
      if (scroller.scrollWidth > scroller.clientWidth + 1) {
        scroller.dataset.pannable = "";
      } else {
        delete scroller.dataset.pannable;
      }
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(scroller);

    const onScroll = () => {
      frame.dataset.touched = "";
      scroller.removeEventListener("scroll", onScroll);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    /* Any input of the reader's own ends a fling rather than fighting it. */
    scroller.addEventListener("wheel", stopFling, { passive: true });
    scroller.addEventListener("touchstart", stopFling, { passive: true });

    return () => {
      resize.disconnect();
      stopFling();
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("wheel", stopFling);
      scroller.removeEventListener("touchstart", stopFling);
    };
  }, [stopFling]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const scroller = scrollerRef.current;
      if (!scroller || event.pointerType === "touch" || event.button !== 0) return;
      if (!("pannable" in scroller.dataset)) return;

      stopFling();
      const startX = event.clientX;
      const startLeft = scroller.scrollLeft;
      let lastX = startX;
      let lastT = event.timeStamp;
      let velocity = 0;
      let dragging = false;

      const move = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        if (!dragging) {
          if (Math.abs(dx) < SLOP) return;
          dragging = true;
          scroller.setPointerCapture(event.pointerId);
          scroller.dataset.dragging = "";
        }
        scroller.scrollLeft = startLeft - dx;

        // Velocity over the last move, smoothed so one jittery sample at
        // release does not decide the whole throw.
        const dt = Math.max(e.timeStamp - lastT, 1);
        const v = -(e.clientX - lastX) / dt;
        velocity = velocity * 0.6 + v * 0.4;
        lastX = e.clientX;
        lastT = e.timeStamp;
      };

      const up = (e: PointerEvent) => {
        scroller.removeEventListener("pointermove", move);
        scroller.removeEventListener("pointerup", up);
        scroller.removeEventListener("pointercancel", up);
        if (!dragging) return;
        if (scroller.hasPointerCapture(e.pointerId)) {
          scroller.releasePointerCapture(e.pointerId);
        }
        delete scroller.dataset.dragging;

        // A pause before letting go is a placement, not a throw.
        if (e.timeStamp - lastT > 80) return;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let prev = performance.now();
        const step = (now: number) => {
          const dt = now - prev;
          prev = now;
          scroller.scrollLeft += velocity * dt;
          velocity *= Math.pow(FRICTION, dt / 16);
          const max = scroller.scrollWidth - scroller.clientWidth;
          const atEdge = scroller.scrollLeft <= 0 || scroller.scrollLeft >= max;
          fling.current =
            Math.abs(velocity) > REST && !atEdge ? requestAnimationFrame(step) : 0;
        };
        fling.current = requestAnimationFrame(step);
      };

      scroller.addEventListener("pointermove", move);
      scroller.addEventListener("pointerup", up);
      scroller.addEventListener("pointercancel", up);
    },
    [stopFling],
  );

  const glide = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    stopFling();
    const max = scroller.scrollWidth - scroller.clientWidth;
    scroller.scrollTo({
      left: scroller.scrollLeft > max / 2 ? 0 : max,
      behavior: "smooth",
    });
  }, [stopFling]);

  return (
    <div ref={frameRef} className={classes.frame} data-timeline-frame="">
      <div
        ref={scrollerRef}
        className={classes.scroller}
        tabIndex={0}
        role="region"
        aria-label={label}
        onPointerDown={onPointerDown}
      >
        {children}
      </div>

      {/* Figma 1617:9377 — pinned to the frame, not the canvas, so it stays
          in the corner while the drawing moves under it. */}
      <button type="button" className={classes.hint} onClick={glide}>
        <span
          className={`inkIcon ${classes.hintIcon}`}
          style={{ ["--icon" as string]: "url(/icons/scroll-arrows.svg)" }}
          aria-hidden="true"
        />
        Scroll to move
      </button>
    </div>
  );
}
