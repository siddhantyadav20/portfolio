import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyTimeline as Timeline } from "@/content/work";
import { TimelineDrawing } from "./Drawing";
import styles from "./StudyTimeline.module.css";
import TimelinePan from "./TimelinePan";

type Props = {
  timeline: Timeline;
  caption: StudyCaption;
  className?: string;
};

/**
 * Figma 1617:9129 — the project laid out on a dotted canvas, wider than the
 * frame it sits in, with a "Scroll to move" pill in the corner.
 *
 * The canvas is as wide as the furthest bar or card on it plus the file's 24
 * of margin, and the frame scrolls sideways over it. The scrolling is native —
 * a trackpad pans it and a phone swipes it — and `TimelinePan` adds what a
 * mouse is missing. `overscroll-behavior-x` keeps a fling that reaches the
 * end from turning into the browser's back gesture.
 *
 * The drawing stays server-rendered and is handed to the pan island as
 * children; only the frame's behaviour ships as JavaScript.
 *
 * When it arrives it assembles in the order you would draw it: the months
 * tick across, the legacy bars wipe in along them, the arrow drops, the phase
 * cards land on the site's spring — and the pill, last, says it moves.
 */
export default function StudyTimeline({ timeline, caption, className }: Props) {
  return (
    <figure
      className={`${styles.block} ${className ?? ""}`}
      data-reveal=""
    >
      <TimelinePan
        label={caption.label}
        classes={{
          frame: `${styles.frame} squircle`,
          scroller: styles.scroller,
          hint: styles.hint,
          hintIcon: styles.hintIcon,
        }}
      >
        <TimelineDrawing timeline={timeline} />
      </TimelinePan>

      <FigureLabel caption={caption} />
    </figure>
  );
}
