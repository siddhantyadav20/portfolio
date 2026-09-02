import styles from "./FlowArrow.module.css";

/**
 * One connector in a drawn diagram, and the unit every diagram is drawn in.
 *
 * Lifted out of `SplitFlow` when a second diagram — the governance loop in the
 * Design System study — needed the same three things: a 1px rule, a head made
 * of two 4px arms, and coordinates expressed in the frame's own scaling unit.
 * Two copies of this arithmetic would have drifted the first time one of them
 * was nudged.
 *
 * Figma exports connectors as filled paths with `#222222` at 50% baked in,
 * which is a hole in the layout the moment the page is dark. So they are drawn
 * here as strokes in `currentColor`, and the diagram that contains them sets
 * the colour once.
 */

/**
 * A coordinate in the diagram's frame, as a CSS length.
 *
 * `--u` is one Nth of the container's width, where N is the frame's own width
 * — so at the design's size a unit is exactly 1px and every number in a
 * diagram is the number it was drawn at. See the note at the top of any
 * diagram's stylesheet.
 */
export const u = (n: number) => `calc(${n} * var(--u))`;

export type ArrowSpec = {
  /** The line's own coordinate — its centre, not the SVG box's corner. */
  x: number;
  y: number;
  len: number;
  dir: "right" | "left" | "up" | "down";
  /** A plain rule with no head: a route being traced rather than a step. */
  plain?: boolean;
};

/**
 * The SVG box is 8 units on its short side and the line runs down its middle,
 * which is why every arrow is offset by 4 from the coordinate it is given.
 */
export default function Arrow({ x, y, len, dir, plain }: ArrowSpec) {
  const horizontal = dir === "right" || dir === "left";
  const w = horizontal ? len : 8;
  const h = horizontal ? 8 : len;

  const line = horizontal ? `M0 4H${len}` : `M4 0V${len}`;
  const head = {
    right: `M${len - 4.5} 0.5 L${len - 0.5} 4 L${len - 4.5} 7.5`,
    left: `M4.5 0.5 L0.5 4 L4.5 7.5`,
    down: `M0.5 ${len - 4.5} L4 ${len - 0.5} L7.5 ${len - 4.5}`,
    up: `M0.5 4.5 L4 0.5 L7.5 4.5`,
  }[dir];

  return (
    <svg
      className={styles.arrow}
      style={{
        left: u(horizontal ? x : x - 4),
        top: u(horizontal ? y - 4 : y),
        width: u(w),
        height: u(h),
      }}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d={plain ? line : `${line} ${head}`}
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
