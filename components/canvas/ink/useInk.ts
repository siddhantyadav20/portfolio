"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extendStroke, paintStroke, renderSheet, type Pen, type Pt, type Stroke } from "./ink";

/* ===========================================================================
   A sheet you can draw on — strokes, undo, redo, clear, export.

   STROKES LIVE IN SHEET UNITS, NOT PIXELS. The Studio's paper is sized to the
   viewport and changes with it; a drawing stored in screen pixels would be
   cropped or stranded by a resize. Here every point is in a fixed 1000-unit
   square and the canvas maps it to whatever size it is drawn at, at the
   screen's DPR — so a resize, or a phone rotating, redraws the same sketch.
   =========================================================================== */

/** The sheet's side, in its own units. */
export const SHEET = 1000;

export type Tool = { color: string; size: number; erasing: boolean };

export function useInk({
  canvasRef,
  tool,
  onStrokeStart,
  onMove,
  sound,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Colour and nib, the nib in sheet units. */
  tool: Tool;
  onStrokeStart?: (e: React.PointerEvent) => void;
  /** Every move over the sheet, drawing or not — for a brush-ring cursor. */
  onMove?: (e: React.PointerEvent) => void;
  /** Pen speed, px/ms of the pointer, for a pencil sound. */
  sound?: (speed: number) => void;
}) {
  const history = useRef<Stroke[]>([]);
  const redoStack = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const pen = useRef<Pen>({ last: { x: 0, y: 0 }, lastMid: { x: 0, y: 0 } });
  // Client-space speed tracker; reset per stroke so a new pen-down never
  // reads as a leap across the sheet.
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /** The canvas's context, transformed so sheet units land on its pixels. */
  const context = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return null;
    const k = c.width / SHEET;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    return ctx;
  }, [canvasRef]);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    const k = c.width / SHEET;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    for (const st of history.current) paintStroke(ctx, st);
  }, [canvasRef]);

  /* The backing store follows the displayed size. A hidden sheet measures
     zero and shrinks to a pixel; showing it again refits and redraws, and the
     strokes were never in the bitmap to begin with. */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const px = Math.max(1, Math.round(r.width * dpr));
      if (c.width !== px) {
        c.width = px;
        c.height = px;
      }
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [canvasRef, redraw]);

  const toSheet = useCallback(
    (e: { clientX: number; clientY: number }): Pt => {
      const r = canvasRef.current!.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * SHEET,
        y: ((e.clientY - r.top) / r.height) * SHEET,
      };
    },
    [canvasRef],
  );

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Without capture the stroke ends at the edge. Not worth throwing over.
    }
    onStrokeStart?.(e);
    const p = toSheet(e);
    pen.current = { last: p, lastMid: p };
    current.current = {
      mode: tool.erasing ? "erase" : "draw",
      color: tool.color,
      size: tool.size,
      points: [p],
    };
    const ctx = context();
    if (ctx) paintStroke(ctx, current.current); // the dot a tap leaves
  }

  function onPointerMove(e: React.PointerEvent) {
    onMove?.(e);
    const st = current.current;
    if (!st) return;
    e.stopPropagation();
    e.preventDefault();

    if (sound) {
      const t = performance.now();
      const was = lastMove.current;
      lastMove.current = { x: e.clientX, y: e.clientY, t };
      // Guarded against a zero delta: two events can share a timestamp.
      if (was && t - was.t > 0) sound(Math.hypot(e.clientX - was.x, e.clientY - was.y) / (t - was.t));
    }

    const ctx = context();
    if (!ctx) return;
    const native = e.nativeEvent as PointerEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const batch = coalesced.length > 0 ? coalesced : [native];
    extendStroke(ctx, st, pen.current, batch.map(toSheet));
  }

  function end(e: React.PointerEvent) {
    lastMove.current = null;
    e.stopPropagation();
    const st = current.current;
    if (!st) return;
    history.current.push(st);
    current.current = null;
    redoStack.current = []; // a fresh stroke invalidates redo
    setCanUndo(true);
    setCanRedo(false);
  }

  const undo = useCallback(() => {
    const popped = history.current.pop();
    if (popped) {
      redoStack.current.push(popped);
      setCanRedo(true);
    }
    setCanUndo(history.current.length > 0);
    redraw();
  }, [redraw]);

  const redo = useCallback(() => {
    const restored = redoStack.current.pop();
    if (restored) {
      history.current.push(restored);
      setCanUndo(true);
    }
    setCanRedo(redoStack.current.length > 0);
    redraw();
  }, [redraw]);

  const clear = useCallback(() => {
    history.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
    redraw();
  }, [redraw]);

  /** The sheet as a PNG, `px` square, with `under` painted beneath the ink. */
  const exportSheet = useCallback(
    (px: number, paper: string, under?: (ctx: CanvasRenderingContext2D) => void) =>
      renderSheet(history.current, { sheet: SHEET, px, paper, under }),
    [],
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    exportSheet,
  };
}
