import styles from "./DashedFrame.module.css";

type Props = {
  /** The parent's corner radius, in px. The stroke is centred on the box's
   *  edge, so the drawn arc is half a pixel tighter than this. */
  radius: number;
  /** `stroke-dasharray` — "6 4" is Figma's for the synthesis panel. */
  dash?: string;
  className?: string;
};

/**
 * A dashed outline around whatever contains it, at a stated dash rhythm.
 *
 * `border-style: dashed` cannot say how long a dash is: the browser derives it
 * from the border width, and on a 1px border that comes out around 2 on, 2 off
 * — a dotted hairline where Figma draws a dashed line. A straight rule can
 * state the pattern with a repeating gradient (`.dashRule` in globals.css); a
 * *rounded* box cannot, because a gradient has no corners.
 *
 * So the outline is an SVG rect. It sizes itself in real pixels rather than
 * through a `viewBox`, which is the whole trick: with no viewBox there is no
 * scaling, so `stroke-dasharray` is in CSS pixels at any width and the dashes
 * do not stretch as the panel does. `currentColor` means the parent picks the
 * colour and both themes are one declaration.
 *
 * It draws nothing that affects layout — the parent keeps its own padding, and
 * because the stroke no longer sits in the box model that padding is the
 * design's inset plus the pixel the border used to take.
 */
export default function DashedFrame({ radius, dash = "6 4", className }: Props) {
  return (
    <svg className={`${styles.frame} ${className ?? ""}`} aria-hidden="true" focusable="false">
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx={radius - 0.5}
        ry={radius - 0.5}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray={dash}
      />
    </svg>
  );
}
