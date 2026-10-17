import type { StudyTimeline as Timeline } from "@/content/work";
import styles from "./StudyTimeline.module.css";

/** Where the months start and how far apart they are — Figma 1617:9367. */
const MONTH_X = 24;
const MONTH_STEP = 124;
const MONTH_W = 60;

/** The frame the file draws, which is the least the canvas can be. */
const FRAME_W = 1120;
export const FRAME_H = 540;

/** A phase card's width — Figma 1617:9347 hugs its longest line at 206. */
const PHASE_W = 206;

/** The canvas is as wide as the furthest thing on it, plus the file's 24. */
function canvasWidth(timeline: Timeline): number {
  return Math.max(
    FRAME_W,
    MONTH_X + (timeline.months.length - 1) * MONTH_STEP + MONTH_W + 24,
    ...timeline.bars.map((bar) => bar.x + bar.width + 24),
    ...timeline.phases.map((phase) => phase.x + PHASE_W + 24),
  );
}

/**
 * The timeline's drawing — the dotted canvas with the months, the bars, the
 * arrow and the phase cards on it.
 *
 * Its own component because it is drawn twice: once in its frame on the page,
 * and once inside the journey map, which carries a copy of it for the length
 * of the flight from the page into the corner (see StudyMap). One drawing,
 * so the copy cannot drift from the original. No hooks and no client APIs,
 * so it renders on the server for the page and in the client for the map.
 */
export function TimelineDrawing({ timeline }: { timeline: Timeline }) {
  return (
    <div
      className={styles.canvas}
      style={{ width: canvasWidth(timeline), height: FRAME_H }}
    >
      <ol className={styles.months}>
        {timeline.months.map((month, i) => (
          <li
            key={month}
            className={styles.month}
            style={{ left: MONTH_X + i * MONTH_STEP, ["--i" as string]: i }}
          >
            {month}
          </li>
        ))}
      </ol>

      {timeline.bars.map((bar, i) => (
        <div
          key={i}
          className={styles.bar}
          style={{
            left: bar.x,
            top: bar.y,
            width: bar.width,
            ["--i" as string]: i,
          }}
        >
          <span className={styles.barNote}>{bar.note}</span>
          <span className={styles.barLabel}>{bar.label}</span>
        </div>
      ))}

      {timeline.arrows?.map((arrow, i) => (
        <span
          key={i}
          className={styles.arrow}
          style={{ left: arrow.x, top: arrow.y, height: arrow.length }}
          aria-hidden="true"
        />
      ))}

      {timeline.phases.map((phase, i) => (
        <div
          key={i}
          className={styles.phase}
          style={{ left: phase.x, top: phase.y, ["--i" as string]: i }}
        >
          <p className={styles.phaseTitle}>
            <span
              className={`inkIcon ${styles.phaseIcon}`}
              style={{ ["--icon" as string]: `url(${phase.icon})` }}
              aria-hidden="true"
            />
            {phase.title}
          </p>
          <ul className={styles.phaseItems}>
            {phase.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * The "Scroll to move" pill as a picture of itself — what the map's copy of
 * the frame carries in place of the real button, which stays on the page.
 */
export function TimelineHint() {
  return (
    <span className={styles.hint} aria-hidden="true">
      <span
        className={`inkIcon ${styles.hintIcon}`}
        style={{ ["--icon" as string]: "url(/icons/scroll-arrows.svg)" }}
      />
      Scroll to move
    </span>
  );
}
