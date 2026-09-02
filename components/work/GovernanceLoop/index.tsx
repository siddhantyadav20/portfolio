import Arrow, { u, type ArrowSpec } from "@/components/work/FlowArrow";
import styles from "./GovernanceLoop.module.css";

/**
 * "How a change gets into twelve products" — the Design System study, §6.
 *
 * The one thing that section could only assert in prose. A governance model is
 * a shape: a request, a test it has to pass, two outcomes, a publish that
 * nobody is forced to take, and an audit that feeds the whole thing back into
 * itself. Written out as four paragraphs it reads as a list of good
 * intentions; drawn, it reads as a mechanism, and a reviewer can check it in
 * four seconds instead of four hundred words.
 *
 * Drawn rather than exported, for the reasons `SplitFlow` gives: a flat PNG
 * would bake one theme's ink into a figure that has to survive a mode switch,
 * and would put the whole argument out of reach of selection and a screen
 * reader. The arrows come from `FlowArrow`, shared with that diagram.
 *
 * Unlike `SplitFlow` this frame has no Figma original — it is authored here,
 * so 760x400 is chosen rather than measured: wide enough for the longest label
 * at 14px without wrapping, and wide enough that the YES branch has room for
 * its chip plus a run of rule either side. A chip that fills its own arrow
 * reads as a button sitting in a gap rather than as a label on a line.
 */

/** The frame every coordinate below is expressed in. */
const W = 760;
const H = 400;

type BoxSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: readonly string[];
  /** The two ends of the loop, drawn in the study's accent. */
  accent?: boolean;
};

const BOXES: readonly BoxSpec[] = [
  { x: 0, y: 24, w: 156, h: 84, lines: ["A product asks", "for a component"] },
  {
    x: 212,
    y: 12,
    w: 208,
    h: 108,
    lines: ["Do two products need it,", "for the same reason?"],
    accent: true,
  },
  { x: 528, y: 24, w: 232, h: 84, lines: ["Designed into", "the library"] },
  {
    x: 212,
    y: 208,
    w: 208,
    h: 84,
    lines: ["Stays in that product's", "own file"],
  },
  {
    x: 528,
    y: 164,
    w: 232,
    h: 84,
    lines: ["Published, with", "release notes"],
  },
  {
    x: 528,
    y: 304,
    w: 232,
    h: 84,
    lines: ["Each product takes it", "when it chooses"],
  },
  {
    x: 0,
    y: 304,
    w: 212,
    h: 84,
    lines: ["I audit shipped products", "against the library"],
    accent: true,
  },
];

const ARROWS: readonly ArrowSpec[] = [
  // Intake, along the top row.
  { x: 156, y: 66, len: 56, dir: "right" },
  { x: 420, y: 66, len: 108, dir: "right" },
  // The NO branch, straight down out of the test.
  { x: 316, y: 120, len: 88, dir: "down" },
  // Down the right-hand column: designed, published, adopted.
  { x: 644, y: 108, len: 56, dir: "down" },
  { x: 644, y: 248, len: 56, dir: "down" },
  // And back along the bottom into the audit, which closes the loop by
  // returning to the top — the reason this is a diagram and not a list.
  { x: 212, y: 346, len: 316, dir: "left" },
  { x: 106, y: 108, len: 196, dir: "up" },
];

type ChipSpec = { x: number; y: number; w: number; label: string };

const CHIPS: readonly ChipSpec[] = [
  { x: 452, y: 54, w: 44, label: "YES" },
  { x: 296, y: 152, w: 40, label: "NO" },
  /* On the return line, and the most important word in the diagram: an audit
     that can only correct is a rule, and teams route around rules. See the
     note this figure sits above. */
  { x: 62, y: 194, w: 88, label: "PROMOTE" },
];

export default function GovernanceLoop() {
  return (
    <div className={styles.scroll}>
      <div
        className={styles.flow}
        style={{ ["--w" as string]: W, ["--h" as string]: H }}
      >
        {ARROWS.map((a, i) => (
          <Arrow key={i} {...a} />
        ))}

        {BOXES.map((b) => (
          <div
            key={b.lines.join(" ")}
            className={styles.box}
            data-accent-box={b.accent ? "" : undefined}
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

        {CHIPS.map((c) => (
          <span
            key={c.label}
            className={styles.chip}
            style={{
              left: u(c.x),
              top: u(c.y),
              width: u(c.w),
              height: u(24),
            }}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
