"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FRAME_H,
  TimelineDrawing,
  TimelineHint,
} from "@/components/work/StudyTimeline/Drawing";
import type { StudyJourney, StudyTimeline } from "@/content/work";
import { findScrollRoot, scrollMetrics } from "@/lib/scrollRoot";
import styles from "./StudyMap.module.css";

type Props = {
  journey: StudyJourney;
  /** The drawing the map is converted from, carried for the flight. */
  timeline?: StudyTimeline;
};

/** One stop to the next: a 61px card, 13 down to a 16px arrow, 12 down to
 *  the next card — Figma 1617:9773 and the connector under it. */
const STEP = 102;

/** The docked card — Figma 1617:9636 — and the pill it folds into. */
const CARD = { w: 320, h: 240, r: 24 };
const PILL_H = 44;
/** The inset every control on the reader keeps from its edge. */
const INSET = 32;

/* The reader's choice to fold the map away, remembered across visits. A
   store rather than state read in an effect, the way `lib/clientValue` reads
   the browser: the server renders it unfolded, and every access is wrapped
   because `localStorage` throws outright when storage is blocked. */
const STORAGE = "study-map:minimised";
const listeners = new Set<() => void>();

function readFolded(): boolean {
  try {
    return localStorage.getItem(STORAGE) === "1";
  } catch {
    return false;
  }
}

function writeFolded(next: boolean) {
  try {
    localStorage.setItem(STORAGE, next ? "1" : "0");
  } catch {}
  listeners.forEach((fn) => fn());
}

function subscribeFolded(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Figma 1617:9636 — the journey map, and the timeline turning into it.
 *
 * THE CONVERSION. The map is not a second thing that appears when the
 * timeline leaves; it is the timeline, leaving. As the timeline's frame
 * starts to go off the top of the screen, this element takes its exact box —
 * same size, same corner, same 40% paper, carrying a copy of the drawing at
 * the same pan — and the original steps out of the way (`data-lifted`). From
 * there every pixel of scroll is a step of the flight: the box shrinks and
 * travels to the bottom-right corner, the drawing fades as it gets too small
 * to read, and the map's own frost, hairline and stops fade in as it lands.
 * Scroll back up and it flies home into the frame, because the whole thing is
 * a function of the scroll position rather than a timed animation — the
 * reader is holding it the entire way.
 *
 * THE MAP. The stops hang in a column on the same dotted paper, and the card
 * is a window onto it. The stop you are at is the file's card — white, with
 * the accent arrow out of it towards what comes next — the stops ahead are
 * the road ahead, and the one behind you stays in view, faded, to go back to.
 * Reading on moves the camera down the column, so the map travels rather than
 * relabelling. "Where you are" is the rule the rail on the left uses — the
 * last section whose top has passed 40% of the scrollport — so the two never
 * disagree.
 *
 * MINIMISED. The card folds into a pill that still says where you are — the
 * accent dot and the stop's name — with a chevron pointing up at the card it
 * opens back into. The choice is remembered, and a minimised map converts
 * from the timeline straight into the pill: a reader who put it away is not
 * handed it again on every visit.
 *
 * It leaves when the closing band arrives — there is no journey left there.
 */
export default function StudyMap({ journey, timeline }: Props) {
  const ref = useRef<HTMLElement>(null);
  const drawingRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<() => void>(() => {});
  const [active, setActive] = useState(0);
  const minimised = useSyncExternalStore(
    subscribeFolded,
    readFolded,
    () => false,
  );
  // The scroll loop reads this between renders — kept in step below.
  const minimisedRef = useRef(minimised);

  useEffect(() => {
    const map = ref.current;
    if (!map) return;

    const root = findScrollRoot(map);
    const target: HTMLElement | Window = root ?? window;
    const quiet = matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = matchMedia("(width < 700px)");
    let frame = 0;
    let lastActive = -1;

    const measure = () => {
      frame = 0;
      const { viewport } = scrollMetrics(root);
      const origin = root ? root.getBoundingClientRect().top : 0;
      const width = root
        ? root.clientWidth
        : document.documentElement.clientWidth;

      // Where you are.
      let found = 0;
      journey.stops.forEach((stop, i) => {
        if (!stop.section) return;
        const el = document.getElementById(stop.section);
        if (el && el.getBoundingClientRect().top - origin <= viewport * 0.4) {
          found = i;
        }
      });
      if (found !== lastActive) {
        lastActive = found;
        setActive(found);
      }

      const frameEl = document
        .getElementById(journey.after)
        ?.querySelector<HTMLElement>("[data-timeline-frame]");
      if (!frameEl || narrow.matches) {
        map.dataset.phase = "hidden";
        if (frameEl) delete frameEl.dataset.lifted;
        return;
      }

      /* How far through the conversion: none of it while the frame's top is
         on screen, all of it by the time its bottom is a quarter of the way
         down. A reader looking at the timeline keeps it; one reading past it
         watches it go. */
      const src = frameEl.getBoundingClientRect();
      const top = src.top - origin;
      const run = Math.max(src.height - viewport * 0.25, 200);
      let p = Math.min(Math.max(-top / run, 0), 1);
      // Reduced motion: no flight. The card is simply there once the timeline
      // has gone, and the frame never leaves its place.
      if (quiet.matches) p = src.bottom - origin < 0 ? 1 : 0;
      // Ease in and out of the flight, so the lift-off hugs the frame and the
      // landing settles rather than stops.
      const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;

      // Where it is going: the card, or the pill if it has been put away.
      const min = minimisedRef.current;
      const dw = min ? Math.ceil(pillRef.current?.scrollWidth ?? 160) : CARD.w;
      const dh = min ? PILL_H : CARD.h;
      const dr = min ? PILL_H / 2 : CARD.r;
      const dx = width - INSET - dw;
      const dy = viewport - INSET - dh;

      const lerp = (a: number, b: number) => a + (b - a) * e;
      const w = lerp(src.width, dw);
      map.style.left = `${lerp(src.left, dx)}px`;
      map.style.top = `${lerp(top, dy)}px`;
      map.style.width = `${w}px`;
      map.style.height = `${lerp(src.height, dh)}px`;
      map.style.setProperty("--r", `${lerp(24, dr)}px`);
      map.style.setProperty("--t", String(e));

      // The copy of the drawing, scaled with the box and panned to wherever
      // the reader left the real one.
      const drawing = drawingRef.current;
      if (drawing) {
        const pan =
          frameEl.querySelector<HTMLElement>("[role=region]")?.scrollLeft ?? 0;
        drawing.style.width = `${src.width}px`;
        drawing.style.transform = `scale(${w / src.width})`;
        drawing.style.setProperty("--pan", `${-pan}px`);
      }

      const phase = p <= 0 ? "hidden" : p < 1 ? "morph" : "docked";
      map.dataset.phase = phase;

      const end = document.getElementById("comments");
      const ended = end
        ? end.getBoundingClientRect().top - origin < viewport
        : false;
      if (phase === "docked" && ended) map.dataset.ended = "";
      else delete map.dataset.ended;

      if (phase !== "hidden" && !quiet.matches) frameEl.dataset.lifted = "";
      else delete frameEl.dataset.lifted;
    };
    measureRef.current = measure;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Sections settle as their images load, and the frame moves with them.
    const resize = new ResizeObserver(onScroll);
    resize.observe(root ?? document.documentElement);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document
        .querySelectorAll<HTMLElement>("[data-timeline-frame][data-lifted]")
        .forEach((el) => delete el.dataset.lifted);
    };
  }, [journey]);

  /* A new stop changes the pill's width and a fold changes the target box.
     Both are a re-measure, and the docked transition does the moving. */
  useEffect(() => {
    minimisedRef.current = minimised;
    measureRef.current();
  }, [active, minimised]);

  const fold = useCallback((next: boolean) => {
    minimisedRef.current = next;
    writeFolded(next);
  }, []);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const here = journey.stops[active];
  const top = Math.max(active - 1, 0);

  return (
    <nav
      ref={ref}
      className={styles.map}
      data-phase="hidden"
      data-minimised={minimised ? "" : undefined}
      aria-label="Project journey"
    >
      {/* The two papers: the timeline frame's 40% white, and the map's frost
          and hairline. One becomes the other over the flight. */}
      <span className={styles.paperFrame} aria-hidden="true" />
      <span className={styles.paperGlass} aria-hidden="true" />

      {timeline && (
        <div className={styles.drawingLayer} aria-hidden="true">
          <div
            ref={drawingRef}
            className={styles.drawing}
            style={{ height: FRAME_H }}
          >
            <div className={styles.drawingPan}>
              <TimelineDrawing timeline={timeline} />
            </div>
            <TimelineHint />
          </div>
        </div>
      )}

      <div className={styles.card} inert={minimised}>
        <div className={styles.window}>
          <div
            className={styles.track}
            style={{
              ["--at" as string]: active,
              ["--stops" as string]: journey.stops.length,
              ["--step" as string]: `${STEP}px`,
            }}
          >
            <ol className={styles.stops}>
              {journey.stops.map((stop, i) => {
                const state =
                  i < active ? "past" : i === active ? "here" : "ahead";
                // What the window can show — see the camera in the stylesheet.
                const inView = i >= top && i <= top + 2;
                const body = (
                  <>
                    <span className={styles.label}>{stop.label}</span>
                    <span className={styles.note}>{stop.note}</span>
                  </>
                );

                return (
                  <li
                    key={stop.label}
                    className={styles.stop}
                    data-state={state}
                    style={{ ["--i" as string]: i }}
                  >
                    {stop.section ? (
                      <button
                        type="button"
                        className={styles.stopCard}
                        onClick={() => go(stop.section!)}
                        aria-current={state === "here" ? "step" : undefined}
                        tabIndex={inView ? undefined : -1}
                      >
                        {body}
                      </button>
                    ) : (
                      <span className={styles.stopCard}>{body}</span>
                    )}

                    {i < journey.stops.length - 1 && (
                      <span className={styles.arrow} aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <button
          type="button"
          className={styles.fold}
          onClick={() => fold(true)}
          aria-label="Minimise the journey map"
          title="Minimise"
        >
          <span
            className={`inkIcon ${styles.chevron}`}
            data-dir="down"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* The pill: where you are, and the way back to the card. */}
      <button
        type="button"
        className={styles.pill}
        onClick={() => fold(false)}
        inert={!minimised}
        aria-label={`Show the journey map. You are at ${here?.label}.`}
        title="Show the journey map"
      >
        <span ref={pillRef} className={styles.pillBody}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.pillLabel}>{here?.label}</span>
          <span className={styles.pillOpen} aria-hidden="true">
            <span className={`inkIcon ${styles.chevron}`} data-dir="up" />
          </span>
        </span>
      </button>
    </nav>
  );
}
