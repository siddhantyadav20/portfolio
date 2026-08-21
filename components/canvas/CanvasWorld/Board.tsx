import { widgetLabel, widgets, WORLD_H, WORLD_W, type Widget } from "@/content/canvas";
import styles from "./CanvasWorld.module.css";

/* ===========================================================================
   The board's geometry, with nothing in it.

   This module exists to keep the *live* widgets out of the homepage. The
   Canvas card renders the board as stills, and the canvas renders it as live
   components — but both need the same 3000x3000 layer and the same absolutely
   positioned slot at the same coordinates, and that shared arrangement is the
   only reason the morph is an interpolation rather than a crossfade.

   Before this split, one component held both paths, so the static import of
   twelve live widgets — a terminal with a Levenshtein matcher, a drawing
   canvas with an SVG filter loop, a scratch card — travelled with the card
   into the homepage bundle: 213KB of JavaScript that cannot run until someone
   opens the canvas.

   Nothing here imports a widget. That is the point, and it is worth keeping.
   =========================================================================== */

export function Board({
  className,
  style,
  ref,
  preview = false,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  /** Read by the stylesheet, which cancels the slots' arrival animation: the
   *  card's preview is a picture of the board, not an arrival at it. */
  preview?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={ref}
      className={[styles.world, className].filter(Boolean).join(" ")}
      data-preview={preview ? "" : undefined}
      style={{ width: WORLD_W, height: WORLD_H, ...style }}
    >
      {children}
    </div>
  );
}

/** Every widget, in the order they are authored — which is reading order. */
export { widgets };
export type { Widget };

export function Slot({
  widget: w,
  index,
  preview,
  children,
}: {
  widget: Widget;
  index: number;
  preview: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={styles.slot}
      data-widget={w.id}
      // Walked by Tab, and the camera follows — see CanvasSurface. A board
      // you can only reach by dragging is a keyboard dead end, and this is
      // the cheapest way out of that: focus order *is* a guided tour.
      tabIndex={preview ? -1 : 0}
      /* And a tour needs the stops named. In the preview these are decoration
         behind a single link, so they stay out of the tree entirely. */
      role={preview ? undefined : "group"}
      aria-label={preview ? undefined : widgetLabel(w)}
      aria-hidden={preview ? true : undefined}
      style={{
        // Staggered by band, so arriving reads as the board being laid out
        // rather than switched on. Index-based: the data is authored in
        // reading order, which is the order it should appear in.
        animationDelay: preview ? undefined : `${Math.min(index * 26, 620)}ms`,
        left: w.x,
        top: w.y,
        width: w.w,
        height: w.h,
        // `rotate` rather than a transform, so a widget's own transform —
        // a hover lift, a click spring — can't wipe out its resting angle.
        rotate: w.rotate ? `${w.rotate}deg` : undefined,
      }}
    >
      {children}
    </div>
  );
}
