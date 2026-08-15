"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMediaQuery } from "@/lib/clientValue";
import { readTheme, serverTheme, subscribeTheme } from "@/lib/theme";
import { useSyncExternalStore } from "react";
import styles from "./DrawingCanvas.module.css";

/* ===========================================================================
   The drawing canvas.

   Ported from references/canvas/Drawing canvas.tsx. Everything it does is
   here: the ink breathing through a live feTurbulence + feDisplacementMap
   whose frequency and scale are lerped every frame toward a target set by
   whether you are drawing, hovering or idle; the cat drawing *itself* stroke
   by stroke on arrival; quadratic-midpoint smoothing fed by coalesced pointer
   events; a brush ring for a cursor; the colour popover, three sizes, eraser,
   undo/redo with ⌘Z, clear, and clipboard export with the paper filled in.

   Two notes on the details that look like accidents and are not:

   - The filter is applied to the <canvas> itself, never to a wrapping div.
     Wrapping it triggers iOS's black-fill bug, and iOS is excluded from the
     wobble entirely for the same reason.

   - The surface attaches its own non-passive touch listeners. React's are
     passive, so `preventDefault` inside the pointer handlers cannot stop the
     canvas underneath from panning while you draw on it.

   The ~200 lines of colour parsing are gone. Framer could hand those props a
   token a 2D context cannot resolve, so the original resolved everything
   through a hidden probe element; here the palette is known and themed.
   =========================================================================== */

const SIZE = 320;
const SIZES = [4, 9, 16] as const;
const SIZE_LABELS = ["Small", "Medium", "Large"] as const;

/** Wobble targets, straight from the reference's property defaults. */
const WOBBLE_IDLE = 0.3;
const WOBBLE_ACTIVE = 0.85;
const WOBBLE_SCALE = 6;

type Pt = { x: number; y: number };
type Stroke = { mode: "draw" | "erase"; color: string; size: number; points: Pt[] };

const PATHS = {
  eraser:
    "M7 17h11M16.5 6.5 9 14l3.5 3.5L20 10zM9 14 5.5 10.5a1.5 1.5 0 0 1 0-2.1l3-3a1.5 1.5 0 0 1 2.1 0L14 8.5",
  undo: "M9 7 4.5 11.5 9 16M5 11.5h9.5a4.5 4.5 0 0 1 0 9H9",
  redo: "M15 7 19.5 11.5 15 16M19 11.5H9.5a4.5 4.5 0 0 0 0 9H15",
  trash:
    "M4 7h16M9.5 7V5.2c0-.6.5-1.2 1.2-1.2h2.6c.7 0 1.2.6 1.2 1.2V7M6.5 7l.8 12c0 .8.6 1.4 1.4 1.4h6.6c.8 0 1.4-.6 1.4-1.4l.8-12",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  check: "M5 13l4 4L19 7",
};

/** The cat, as authored in the reference — drawn as strokes so the intro can
 *  reveal it point by point rather than fading a picture in. */
const CAT_PATHS = [
  "M215,158 A55,55 0 1 1 105,158 A55,55 0 1 1 215,158",
  "M118,121 L105,83 L138,103",
  "M202,115 L215,83 L182,103",
  "M147,151 A7,7 0 1 1 133,151 A7,7 0 1 1 147,151",
  "M187,151 A7,7 0 1 1 173,151 A7,7 0 1 1 187,151",
  "M155,171 L160,166 L165,171 Z",
  "M155,171 Q148,181 140,178",
  "M165,171 Q172,181 180,178",
];

function sampleCat(): Pt[][] {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const out: Pt[][] = [];
  for (const d of CAT_PATHS) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
    const len = path.getTotalLength();
    const steps = Math.max(2, Math.round(len / 3));
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = path.getPointAtLength((i / steps) * len);
      pts.push({ x: p.x, y: p.y });
    }
    out.push(pts);
    svg.removeChild(path);
  }
  return out;
}

function Ico({ d, size = 17, sw = 1.7 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function DrawingCanvas() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  /** The ink the paper expects, plus five colours that read on both. */
  const defaultInk = theme === "dark" ? "#F3F3F3" : "#222222";
  const palette = useMemo(
    () => [defaultInk, "#FF6B6B", "#FFD166", "#6BCB77", "#5B8CFF", "#C77DFF"],
    [defaultInk],
  );

  const rawId = useId();
  const filterId = `tc-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  /* iOS renders SVG filters over canvas as solid black, so the wobble is a
     desktop and Android enhancement rather than a universal one. */
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return (
      /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);
  const useWobble = !isIOS && !reduced;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const feTurb = useRef<SVGFETurbulenceElement>(null);
  const feDisp = useRef<SVGFEDisplacementMapElement>(null);

  const history = useRef<Stroke[]>([]);
  const redoStack = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const drawing = useRef(false);
  const cleared = useRef(false);
  const last = useRef<Pt>({ x: 0, y: 0 });
  const lastMid = useRef<Pt>({ x: 0, y: 0 });
  const catStrokes = useRef<Pt[][] | null>(null);
  const intro = useRef({ strokeIdx: 0, pointIdx: 0, done: false });

  const [color, setColor] = useState(defaultInk);
  const [size, setSize] = useState(9);
  const [erasing, setErasing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);

  /* --- Painting ------------------------------------------------------------ */

  const paintStroke = useCallback((ctx: CanvasRenderingContext2D, st: Stroke) => {
    ctx.save();
    ctx.globalCompositeOperation =
      st.mode === "erase" ? "destination-out" : "source-over";
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
      // curve passes through the midpoints between them. A polyline through
      // the raw points shows every hand tremor as a corner.
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
  }, []);

  /** The cat, up to a point — used by both the intro and the finished state. */
  const paintCat = useCallback(
    (ctx: CanvasRenderingContext2D, upToStroke: number, upToPoint: number) => {
      const strokes = catStrokes.current;
      if (!strokes) return;
      ctx.save();
      ctx.strokeStyle = defaultInk;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 0; i < strokes.length; i++) {
        const pts = strokes[i];
        const upto =
          i < upToStroke ? pts.length - 1 : i === upToStroke ? upToPoint : -1;
        if (upto <= 0) {
          if (i > upToStroke) break;
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let k = 1; k <= upto; k++) ctx.lineTo(pts[k].x, pts[k].y);
        ctx.stroke();
      }
      ctx.restore();
    },
    [defaultInk],
  );

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!cleared.current) {
      if (intro.current.done) paintCat(ctx, Infinity, Infinity);
      else paintCat(ctx, intro.current.strokeIdx, intro.current.pointIdx);
    }
    for (const st of history.current) paintStroke(ctx, st);
  }, [paintCat, paintStroke]);

  const redrawRef = useRef(redraw);
  useEffect(() => {
    redrawRef.current = redraw;
  }, [redraw]);

  /* --- Setup --------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawRef.current();
  }, []);

  // Repaint when the ink changes with the theme.
  useEffect(() => {
    redrawRef.current();
  }, [defaultInk]);

  /* React's touch listeners are passive, so preventDefault inside the pointer
     handlers cannot stop the canvas underneath from panning. These
     are non-passive and do. */
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, []);

  /* --- The cat draws itself ------------------------------------------------- */

  useEffect(() => {
    let strokes: Pt[][];
    try {
      strokes = sampleCat();
    } catch {
      intro.current.done = true;
      redrawRef.current();
      return;
    }
    catStrokes.current = strokes;

    if (reduced) {
      intro.current.done = true;
      redrawRef.current();
      return;
    }

    const lengths = strokes.map((p) => p.length - 1);
    let strokeIdx = 0;
    let strokeStart = performance.now();
    let pausing = false;
    let pauseStart = 0;
    const PAUSE = 110;
    let frame = 0;

    const step = (now: number) => {
      if (strokeIdx >= strokes.length) {
        intro.current.done = true;
        redrawRef.current();
        return;
      }
      const total = lengths[strokeIdx] || 1;
      // Longer strokes take longer, so the hand appears to move at one speed
      // rather than finishing every line in the same time.
      const duration = Math.max(140, total * 5.2);

      if (pausing) {
        if (now - pauseStart >= PAUSE) {
          pausing = false;
          strokeIdx += 1;
          strokeStart = now;
          intro.current.strokeIdx = strokeIdx;
          intro.current.pointIdx = 0;
        }
        redrawRef.current();
        frame = requestAnimationFrame(step);
        return;
      }

      const revealed = Math.min(
        total,
        Math.round(((now - strokeStart) / duration) * total),
      );
      intro.current.strokeIdx = strokeIdx;
      intro.current.pointIdx = revealed;
      redrawRef.current();

      if (revealed >= total) {
        pausing = true;
        pauseStart = now;
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  /* --- The living turbulence ------------------------------------------------
     Frequency and displacement are lerped every frame toward a target chosen
     by what the hand is doing, and the seed drifts continuously. That drift is
     the whole effect: a static filter looks like a texture, a moving one looks
     like wet ink. */
  useEffect(() => {
    if (!useWobble) return;
    let frame = 0;
    let seed = 0;
    let freq = 0;
    let scl = 0;
    const map = (v: number) => 0.006 + v * 0.05;

    const loop = () => {
      const targetFreq = map(
        drawing.current
          ? WOBBLE_ACTIVE
          : hovered
            ? (WOBBLE_IDLE + WOBBLE_ACTIVE) / 2
            : WOBBLE_IDLE,
      );
      const targetScl = drawing.current
        ? WOBBLE_SCALE * 1.6
        : hovered
          ? WOBBLE_SCALE
          : WOBBLE_SCALE * 0.55;

      freq += (targetFreq - freq) * 0.07;
      scl += (targetScl - scl) * 0.08;
      seed += 0.0016;

      feTurb.current?.setAttribute(
        "baseFrequency",
        `${freq.toFixed(4)} ${(freq * 1.35).toFixed(4)}`,
      );
      feTurb.current?.setAttribute("seed", (seed * 12).toFixed(2));
      feDisp.current?.setAttribute("scale", scl.toFixed(2));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [hovered, useWobble]);

  /* --- Pointer -------------------------------------------------------------- */

  const posFrom = useCallback((cx: number, cy: number): Pt => {
    const el = surfaceRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (cx - r.left) * (SIZE / r.width), y: (cy - r.top) * (SIZE / r.height) };
  }, []);

  function moveCursor(e: React.PointerEvent) {
    const ring = cursorRef.current;
    const el = surfaceRef.current;
    if (!ring || !el) return;
    const r = el.getBoundingClientRect();
    ring.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
  }

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Without capture the stroke ends at the edge. Not worth throwing over.
    }
    if (e.pointerType === "touch") setHovered(true);
    // Drawing over the intro cuts it short, as it should.
    intro.current.done = true;

    const p = posFrom(e.clientX, e.clientY);
    drawing.current = true;
    last.current = p;
    lastMid.current = p;
    current.current = {
      mode: erasing ? "erase" : "draw",
      color,
      size,
      points: [p],
    };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintStroke(ctx, current.current); // the dot a tap leaves
    setShowPicker(false);
    setHintSeen(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    moveCursor(e);
    if (!drawing.current || !current.current) return;
    e.stopPropagation();
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation =
      current.current.mode === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = current.current.color;
    ctx.lineWidth = current.current.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Coalesced events recover the sub-frame points the OS batched — a fast
    // stroke is visibly smoother for it, especially at 120Hz.
    const native = e.nativeEvent as PointerEvent;
    const batch = native.getCoalescedEvents?.() ?? [native];

    for (const ev of batch) {
      const p = posFrom(ev.clientX, ev.clientY);
      const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(lastMid.current.x, lastMid.current.y);
      ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
      ctx.stroke();
      current.current.points.push(p);
      last.current = p;
      lastMid.current = mid;
    }
    ctx.restore();
  }

  function endStroke(e: React.PointerEvent) {
    e.stopPropagation();
    if (current.current) {
      history.current.push(current.current);
      current.current = null;
      redoStack.current = []; // a fresh stroke invalidates redo
      setCanUndo(true);
      setCanRedo(false);
    }
    drawing.current = false;
  }

  /* --- Commands ------------------------------------------------------------- */

  const undo = useCallback(() => {
    const popped = history.current.pop();
    if (popped) {
      redoStack.current.push(popped);
      setCanRedo(true);
    }
    setCanUndo(history.current.length > 0);
    redrawRef.current();
  }, []);

  const redo = useCallback(() => {
    const restored = redoStack.current.pop();
    if (restored) {
      history.current.push(restored);
      setCanUndo(true);
    }
    setCanRedo(redoStack.current.length > 0);
    redrawRef.current();
  }, []);

  const clearAll = useCallback(() => {
    history.current = [];
    redoStack.current = [];
    cleared.current = true;
    intro.current.done = true;
    setCanUndo(false);
    setCanRedo(false);
    redrawRef.current();
  }, []);

  /* ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z, but only while the pointer is over the
     widget — this is one of twenty-five things on a board and claiming undo
     globally would be rude. */
  useEffect(() => {
    if (!hovered) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [hovered, undo, redo]);

  const copyImage = useCallback(async () => {
    const src = canvasRef.current;
    if (!src) return;
    const off = document.createElement("canvas");
    off.width = src.width;
    off.height = src.height;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    // Fill the paper first — a transparent PNG of dark ink is invisible
    // wherever it lands.
    ctx.fillStyle = theme === "dark" ? "#1a1a1a" : "#faf9f6";
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(src, 0, 0);

    off.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      } catch {
        // Clipboard refused — fall back to a download, which always works.
        const a = document.createElement("a");
        a.download = "drawing.png";
        a.href = off.toDataURL();
        a.click();
      }
    });
  }, [theme]);

  const barVisible = hovered;

  return (
    <div
      className={styles.root}
      data-canvas-interactive=""
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowPicker(false);
      }}
    >
      <div
        ref={surfaceRef}
        className={`${styles.surface} squircle`}
        // The brush ring is the pointer here — suppress the site cursor so the
        // two never both show. See CanvasCursor.
        data-cursor="none"
      >
        {useWobble && (
          <svg width={0} height={0} className={styles.defs} aria-hidden="true">
            <defs>
              <filter
                id={filterId}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  ref={feTurb}
                  type="turbulence"
                  baseFrequency="0.02 0.027"
                  numOctaves="2"
                  seed="2"
                  result="noise"
                />
                <feDisplacementMap
                  ref={feDisp}
                  in="SourceGraphic"
                  in2="noise"
                  scale={WOBBLE_SCALE}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
        )}

        {/* The filter goes on the canvas raster itself. Wrapping it in a
            filtered div is what triggers iOS's black-fill bug. */}
        <canvas
          ref={canvasRef}
          className={styles.ink}
          style={useWobble ? { filter: `url(#${filterId})` } : undefined}
        />

        <div
          className={styles.overlay}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerEnter={() => {
            if (cursorRef.current) cursorRef.current.style.opacity = "1";
          }}
          onPointerLeave={() => {
            if (cursorRef.current) cursorRef.current.style.opacity = "0";
          }}
        />

        {/* The brush, as a ring sized to the nib. */}
        <div
          ref={cursorRef}
          className={styles.brush}
          style={{
            width: Math.max(size, 6),
            height: Math.max(size, 6),
            borderColor: erasing ? "rgba(var(--dc-ink-rgb),0.9)" : color,
            background: erasing ? "rgba(var(--dc-ink-rgb),0.08)" : `${color}2e`,
          }}
        />
      </div>

      <div className={styles.copyWrap}>
        <Tip label={copied ? "Copied" : "Copy image"} side="bottom">
          <button
            type="button"
            className={styles.glassBtn}
            onClick={copyImage}
            aria-label="Copy image"
          >
            {copied ? (
              <span className={styles.ok}>
                <Ico d={PATHS.check} sw={2.4} size={17} />
              </span>
            ) : (
              <Ico d={PATHS.copy} sw={1.9} size={16} />
            )}
          </button>
        </Tip>
      </div>

      <AnimatePresence>
        {hovered && !hintSeen && (
          <motion.span
            className={styles.hint}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            Drag to draw
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {barVisible && (
          <motion.div
            className={styles.toolbar}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  className={styles.picker}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  {palette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={styles.swatch}
                      data-on={c === color && !erasing ? "" : undefined}
                      style={{ background: c }}
                      onClick={() => {
                        setColor(c);
                        setErasing(false);
                        setShowPicker(false);
                      }}
                      aria-label={`Colour ${c}`}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.bar}>
              <Tip label="Brush colour">
                <button
                  type="button"
                  className={styles.plainBtn}
                  onClick={() => setShowPicker((v) => !v)}
                  aria-label="Brush colour"
                >
                  <span
                    className={styles.currentColor}
                    data-dim={erasing ? "" : undefined}
                    style={{ background: color }}
                  />
                </button>
              </Tip>

              <div className={styles.sizes}>
                {SIZES.map((sz, i) => (
                  <Tip key={sz} label={SIZE_LABELS[i]}>
                    <button
                      type="button"
                      className={styles.sizeBtn}
                      onClick={() => {
                        setSize(sz);
                        setErasing(false);
                      }}
                      aria-label={`Brush ${SIZE_LABELS[i]}`}
                    >
                      {/* The nib itself, at its real relative size. */}
                      <span
                        className={styles.nib}
                        data-on={sz === size && !erasing ? "" : undefined}
                        style={{ width: sz * 0.7 + 4, height: sz * 0.7 + 4 }}
                      />
                    </button>
                  </Tip>
                ))}
              </div>

              <span className={styles.sep} />

              <Tip label="Eraser">
                <button
                  type="button"
                  className={styles.glyphBtn}
                  data-on={erasing ? "" : undefined}
                  onClick={() => setErasing((v) => !v)}
                  aria-label="Eraser"
                  aria-pressed={erasing}
                >
                  <Ico d={PATHS.eraser} />
                </button>
              </Tip>

              <Tip label="Undo">
                <button
                  type="button"
                  className={styles.glyphBtn}
                  disabled={!canUndo}
                  onClick={undo}
                  aria-label="Undo"
                >
                  <Ico d={PATHS.undo} />
                </button>
              </Tip>

              <Tip label="Redo">
                <button
                  type="button"
                  className={styles.glyphBtn}
                  disabled={!canRedo}
                  onClick={redo}
                  aria-label="Redo"
                >
                  <Ico d={PATHS.redo} />
                </button>
              </Tip>

              <Tip label="Clear">
                <button
                  type="button"
                  className={styles.glyphBtn}
                  onClick={clearAll}
                  aria-label="Clear"
                >
                  <Ico d={PATHS.trash} />
                </button>
              </Tip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** An instant tooltip — no delay, because these label icons whose meaning is
 *  the whole question. */
function Tip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom";
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className={styles.tipWrap}
      onPointerEnter={() => setShow(true)}
      onPointerLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            className={styles.tip}
            data-side={side}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
