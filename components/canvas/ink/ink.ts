/* ===========================================================================
   Ink — how a stroke is drawn, shared.

   The board's drawing canvas and the Brief Studio draw the same way: round
   caps, a quadratic through the midpoints of the raw points (a polyline shows
   every hand tremor as a corner), erasing as `destination-out`. One copy of
   that, here, rather than two that drift.
   =========================================================================== */

export type Pt = { x: number; y: number };
export type Stroke = { mode: "draw" | "erase"; color: string; size: number; points: Pt[] };

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
 * stroke re-drawn as vectors at the export's own resolution — sharper than
 * scaling the screen bitmap, and the same at any DPR. Strokes go onto a layer
 * of their own before being laid down, so the eraser removes ink and never
 * punches through to the paper or the frame.
 */
export function renderSheet(
  strokes: readonly Stroke[],
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
  for (const st of strokes) paintStroke(lc, st);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  return out.toDataURL("image/png");
}
