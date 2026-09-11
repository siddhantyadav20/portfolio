/* ===========================================================================
   Ink — how a mark is drawn, shared.

   The board's drawing canvas and the Brief Studio draw the same way: round
   caps, a quadratic through the midpoints of the raw points (a polyline shows
   every hand tremor as a corner), erasing as `destination-out`. One copy of
   that, here, rather than two that drift.

   The Studio also draws boxes, arrows and words. A brief is a screen, and a
   screen is mostly rectangles and labels — freehand with a mouse, those were
   the slowest and wobbliest things to get down in sixty seconds. They are
   marks like any stroke: one undo each, the eraser rubs them out, and the
   export repaints them as vectors with everything else.
   =========================================================================== */

import type { Pt } from "./local";

export type { Pt };
export type Stroke = { mode: "draw" | "erase"; color: string; size: number; points: Pt[] };
/** Dragged from `a` to `b`. `size` is the line width. */
export type Shape = { kind: "box" | "arrow"; color: string; size: number; a: Pt; b: Pt };
/** A typed word. `size` is the font size, `at` its top-left, `font` the
 *  family it was typed in — kept on the mark so the export sets it the same. */
export type Label = { kind: "text"; color: string; size: number; at: Pt; text: string; font: string };
export type Mark = Stroke | Shape | Label;

/** A whole stroke, as it rests. */
export function paintStroke(ctx: CanvasRenderingContext2D, st: Stroke) {
  ctx.save();
  ctx.globalCompositeOperation = st.mode === "erase" ? "destination-out" : "source-over";
  ctx.strokeStyle = st.color;
  ctx.fillStyle = st.color;
  ctx.lineWidth = st.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const pts = st.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, st.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
  } else {
    // Quadratic through midpoints: raw points become control points and the
    // curve passes through the midpoints between them.
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(
        pts[i].x,
        pts[i].y,
        (pts[i].x + pts[i + 1].x) / 2,
        (pts[i].y + pts[i + 1].y) / 2,
      );
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The two ends of an arrowhead's barbs. Proportional to the nib so a marker
 * arrow does not wear a pin's head, and never more than 45% of the shaft, so
 * a short arrow is still mostly arrow.
 */
export function arrowHead(a: Pt, b: Pt, size: number): [Pt, Pt] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const head = Math.min(len * 0.45, Math.max(22, size * 3));
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const spread = Math.PI / 7;
  return [
    { x: b.x - head * Math.cos(angle - spread), y: b.y - head * Math.sin(angle - spread) },
    { x: b.x - head * Math.cos(angle + spread), y: b.y - head * Math.sin(angle + spread) },
  ];
}

/** Shift held: a box becomes a square, an arrow snaps to the nearest 45°. */
export function constrain(kind: Shape["kind"], a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (kind === "box") {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: a.x + Math.sign(dx || 1) * side, y: a.y + Math.sign(dy || 1) * side };
  }
  const len = Math.hypot(dx, dy);
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: a.x + Math.cos(angle) * len, y: a.y + Math.sin(angle) * len };
}

function paintShape(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  if (s.kind === "box") {
    const x = Math.min(s.a.x, s.b.x);
    const y = Math.min(s.a.y, s.b.y);
    const w = Math.abs(s.b.x - s.a.x);
    const h = Math.abs(s.b.y - s.a.y);
    // A drawn box, so a pencil's corner rather than a ruled one.
    const r = Math.min(14, w / 4, h / 4);
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  } else {
    const [l, r] = arrowHead(s.a, s.b, s.size);
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.lineTo(r.x, r.y);
  }

  ctx.stroke();
  ctx.restore();
}

function paintLabel(ctx: CanvasRenderingContext2D, l: Label) {
  ctx.save();
  ctx.fillStyle = l.color;
  ctx.font = `600 ${l.size}px ${l.font}`;
  ctx.textBaseline = "top";
  ctx.fillText(l.text, l.at.x, l.at.y);
  ctx.restore();
}

/** Any mark, as it rests. */
export function paintMark(ctx: CanvasRenderingContext2D, m: Mark) {
  if (!("kind" in m)) paintStroke(ctx, m);
  else if (m.kind === "text") paintLabel(ctx, m);
  else paintShape(ctx, m);
}

/** Where a live stroke has got to — the last raw point and the last midpoint. */
export type Pen = { last: Pt; lastMid: Pt };

/**
 * Extend a live stroke by one pointer event's worth of points.
 *
 * Only the new segment is drawn, so a long stroke costs the same per frame
 * as a short one. Coalesced events recover the sub-frame points the OS
 * batched — a fast stroke is visibly smoother for it, especially at 120Hz.
 */
export function extendStroke(ctx: CanvasRenderingContext2D, st: Stroke, pen: Pen, pts: readonly Pt[]) {
  ctx.save();
  ctx.globalCompositeOperation = st.mode === "erase" ? "destination-out" : "source-over";
  ctx.strokeStyle = st.color;
  ctx.lineWidth = st.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of pts) {
    const mid = { x: (pen.last.x + p.x) / 2, y: (pen.last.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(pen.lastMid.x, pen.lastMid.y);
    ctx.quadraticCurveTo(pen.last.x, pen.last.y, mid.x, mid.y);
    ctx.stroke();
    st.points.push(p);
    pen.last = p;
    pen.lastMid = mid;
  }
  ctx.restore();
}

/**
 * The sheet as a PNG data URL, `px` square.
 *
 * Paper first, then whatever sits under the ink (a device frame), then every
 * mark re-drawn as vectors at the export's own resolution — sharper than
 * scaling the screen bitmap, and the same at any DPR. Marks go onto a layer
 * of their own before being laid down, so the eraser removes ink and never
 * punches through to the paper or the frame.
 */
export function renderSheet(
  marks: readonly Mark[],
  opts: { sheet: number; px: number; paper: string; under?: (ctx: CanvasRenderingContext2D) => void },
): string {
  const k = opts.px / opts.sheet;
  const out = document.createElement("canvas");
  out.width = out.height = opts.px;
  const ctx = out.getContext("2d")!;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = opts.paper;
  ctx.fillRect(0, 0, opts.sheet, opts.sheet);
  opts.under?.(ctx);

  const layer = document.createElement("canvas");
  layer.width = layer.height = opts.px;
  const lc = layer.getContext("2d")!;
  lc.setTransform(k, 0, 0, k, 0, 0);
  for (const m of marks) paintMark(lc, m);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  return out.toDataURL("image/png");
}
