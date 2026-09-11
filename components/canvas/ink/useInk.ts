"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  constrain,
  extendStroke,
  paintMark,
  paintStroke,
  renderSheet,
  type Mark,
  type Pen,
  type Pt,
  type Shape,
  type Stroke,
} from "./ink";
import { frameOf, toLocal } from "./local";

/* ===========================================================================
   A sheet you can draw on — marks, undo, redo, clear, export.

   STROKES LIVE IN SHEET UNITS, NOT PIXELS. The Studio's paper is sized to the
   viewport and changes with it; a drawing stored in screen pixels would be
   cropped or stranded by a resize. Here every point is in a fixed 1000-unit
   square and the canvas maps it to whatever size it is drawn at, at the
   screen's DPR — so a resize, or a phone rotating, redraws the same sketch.

   The pointer reaches sheet units through `local.ts`, which undoes any
   rotation or scale between the canvas and the screen rather than trusting
   the bounding box — see the note there.
   =========================================================================== */

/** The sheet's side, in its own units. */
export const SHEET = 1000;

export type ToolKind = "pen" | "eraser" | "box" | "arrow" | "text";
/** Colour and nib, the nib in sheet units. */
export type Tool = { kind: ToolKind; color: string; size: number };

/** A box or an arrow shorter than this, in sheet units, was a tap. */
const MIN_DRAG = 6;

export function useInk({
  canvasRef,
  tool,
  onStrokeStart,
  onMove,
  onText,
  sound,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  tool: Tool;
  onStrokeStart?: (e: React.PointerEvent) => void;
  /** Every move over the sheet, drawing or not — for a brush-ring cursor. */
  onMove?: (e: React.PointerEvent) => void;
  /** A press with the text tool, at this point on the sheet. */
  onText?: (at: Pt) => void;
  /** Pen speed, px/ms of the pointer, for a pencil sound. */
  sound?: (speed: number) => void;
}) {
  const history = useRef<Mark[]>([]);
  const redoStack = useRef<Mark[]>([]);
  const current = useRef<Stroke | null>(null);
  const shape = useRef<Shape | null>(null);
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
    for (const m of history.current) paintMark(ctx, m);
  }, [canvasRef]);

  /* The backing store follows the displayed size. A hidden sheet measures
     zero and shrinks to a pixel; showing it again refits and redraws, and the
     marks were never in the bitmap to begin with. */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      // The layout width: the bounding box is wider whenever anything tilts.
      const px = Math.max(1, Math.round((c.offsetWidth || c.getBoundingClientRect().width) * dpr));
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

  /** Client points to sheet units, for one event's worth of them. */
  const mapper = useCallback(() => {
    const f = frameOf(canvasRef.current!);
    return (e: { clientX: number; clientY: number }): Pt => {
      const p = toLocal(f, e.clientX, e.clientY);
      return { x: (p.x / f.w) * SHEET, y: (p.y / f.h) * SHEET };
    };
  }, [canvasRef]);

  const commit = useCallback((m: Mark) => {
    history.current.push(m);
    redoStack.current = []; // a fresh mark invalidates redo
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    // Also what keeps a text field that has just opened from being blurred by
    // the mousedown that follows.
    e.preventDefault();
    if (e.button !== 0) return;
    const p = mapper()(e);

    if (tool.kind === "text") {
      onText?.(p);
      return;
    }

    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Without capture the stroke ends at the edge. Not worth throwing over.
    }
    onStrokeStart?.(e);

    if (tool.kind === "box" || tool.kind === "arrow") {
      shape.current = { kind: tool.kind, color: tool.color, size: tool.size, a: p, b: p };
      return;
    }

    pen.current = { last: p, lastMid: p };
    current.current = {
      mode: tool.kind === "eraser" ? "erase" : "draw",
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
    const sh = shape.current;
    if (!st && !sh) return;
    e.stopPropagation();
    e.preventDefault();

    if (sound) {
      const t = performance.now();
      const was = lastMove.current;
      lastMove.current = { x: e.clientX, y: e.clientY, t };
      // Guarded against a zero delta: two events can share a timestamp.
      if (was && t - was.t > 0) sound(Math.hypot(e.clientX - was.x, e.clientY - was.y) / (t - was.t));
    }

    const map = mapper();

    if (sh) {
      // A shape is one live preview: the sheet as it was, and the shape on top.
      const p = map(e);
      sh.b = e.shiftKey ? constrain(sh.kind, sh.a, p) : p;
      redraw();
      const ctx = context();
      if (ctx) paintMark(ctx, sh);
      return;
    }

    const ctx = context();
    if (!ctx || !st) return;
    const native = e.nativeEvent as PointerEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const batch = coalesced.length > 0 ? coalesced : [native];
    extendStroke(ctx, st, pen.current, batch.map(map));
  }

  function end(e: React.PointerEvent) {
    lastMove.current = null;
    e.stopPropagation();

    const sh = shape.current;
    if (sh) {
      shape.current = null;
      if (Math.hypot(sh.b.x - sh.a.x, sh.b.y - sh.a.y) >= MIN_DRAG) commit(sh);
      redraw();
      return;
    }

    const st = current.current;
    if (!st) return;
    current.current = null;
    commit(st);
  }

  /** A mark made outside the pointer — a typed label. */
  const add = useCallback(
    (m: Mark) => {
      commit(m);
      const ctx = context();
      if (ctx) paintMark(ctx, m);
    },
    [commit, context],
  );

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
    add,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    exportSheet,
  };
}
