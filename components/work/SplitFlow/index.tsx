import Image from "next/image";
import Arrow, { u, type ArrowSpec } from "@/components/work/FlowArrow";
import styles from "./SplitFlow.module.css";

/**
 * Figma node 529:12119 — "The existing workflow split one job into two".
 *
 * Drawn rather than exported. A flowchart is the one figure in this study that
 * is entirely words and rules: flattened to a PNG it would bake #222 text into
 * a file that has to survive a theme switch, and it would put eleven labels —
 * the whole argument of the section — out of reach of search, selection and a
 * screen reader. So the boxes are boxes and the arrows are two path commands.
 *
 * Geometry is Figma's 644x444 frame, verbatim, in a unit the module defines as
 * one 644th of the container's width. At the design's own size that unit is
 * exactly 1px and every number below is the number in the file; narrower, the
 * whole diagram scales as one piece rather than reflowing into something the
 * designer never drew. Below the design frame it stops scaling and the panel
 * scrolls instead, because a legible small diagram and an illegible tiny one
 * are not the same trade.
 */

/** The frame every coordinate below is expressed in. */
const W = 644;
const H = 444;

type BoxSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: readonly string[];
};

/* The two halves of the job, in the order the inspector meets them. */
const CAPTURE: readonly BoxSpec[] = [
  { x: 0, y: 60, w: 123, h: 82, lines: ["The inspector", "opens camera"] },
  { x: 187, y: 72, w: 142, h: 58, lines: ["Captures a photo"] },
  {
    x: 393,
    y: 60,
    w: 218,
    h: 82,
    lines: ["Photo saved to uncategorised", "section in gallery"],
  },
  { x: 450, y: 206, w: 104, h: 58, lines: ["DONE?"] },
];

const DOCUMENT: readonly BoxSpec[] = [
  { x: 0, y: 362, w: 160, h: 82, lines: ["Global or", "Subcategory Search"] },
  { x: 224, y: 374, w: 113, h: 58, lines: ["Find Remark"] },
  { x: 401, y: 374, w: 60, h: 58, lines: ["Add"] },
  { x: 525, y: 362, w: 80, h: 82, lines: ["Attach", "Images"] },
];

const ARROWS: readonly ArrowSpec[] = [
  { x: 139, y: 101, len: 32, dir: "right" },
  { x: 345, y: 101, len: 32, dir: "right" },
  { x: 502, y: 158, len: 32, dir: "down" },
  // The NO branch: out of DONE?, back along the row, and up into Capture.
  { x: 269, y: 235, len: 165, dir: "right", plain: true },
  { x: 269, y: 146.4, len: 88, dir: "up" },
  // The YES branch: down out of DONE?, all the way back across, and into
  // the second task — which is the whole point of the diagram.
  { x: 502, y: 280, len: 34, dir: "down", plain: true },
  { x: 80, y: 314, len: 422, dir: "right", plain: true },
  { x: 80, y: 314, len: 32, dir: "down" },
  { x: 176, y: 403, len: 32, dir: "right" },
  { x: 353, y: 403, len: 32, dir: "right" },
  { x: 477, y: 403, len: 32, dir: "right" },
];

export default function SplitFlow() {
  return (
    <div className={styles.scroll}>
      <div
        className={styles.flow}
        style={{ ["--w" as string]: W, ["--h" as string]: H }}
      >
        {ARROWS.map((a, i) => (
          <Arrow key={i} {...a} />
        ))}

        {[...CAPTURE, ...DOCUMENT].map((b) => (
          <div
            key={b.lines.join(" ")}
            className={styles.box}
            style={{ left: u(b.x), top: u(b.y), width: u(b.w), height: u(b.h) }}
          >
            <p className={styles.boxText}>
              {b.lines.map((line, i) => (
                <span key={i} className={styles.boxLine}>
                  {line}
                </span>
              ))}
            </p>
          </div>
        ))}

        <span
          className={styles.chip}
          style={{ left: u(329), top: u(223), width: u(44), height: u(24) }}
        >
          NO
        </span>
        <span
          className={styles.chip}
          style={{ left: u(254), top: u(302), width: u(48), height: u(24) }}
        >
          YES
        </span>

        <Task x={0} y={0} index="TASK 1:" name="CAPTURE" />
        <Task x={34} y={252} index="TASK 2" name="DOCUMENT" />

        {/* Figma 565:12415, mirrored — the same illustration the insight panel
            carries, at a sixth of the size, standing in the gap between
            opening the camera and pressing the shutter. Decorative: it repeats
            nothing and names nothing, so it is not given alt text. */}
        <span
          className={styles.figure}
          aria-hidden="true"
          style={{ left: u(134), top: u(12), width: u(56), height: u(72) }}
        >
          <Image src="/media/inspector.png" alt="" fill sizes="72px" />
        </span>
      </div>
    </div>
  );
}

function Task({
  x,
  y,
  index,
  name,
}: {
  x: number;
  y: number;
  index: string;
  name: string;
}) {
  return (
    <div className={styles.task} style={{ left: u(x), top: u(y) }}>
      <span className={styles.taskIndex}>{index}</span>
      <span className={styles.taskName}>{name}</span>
    </div>
  );
}
