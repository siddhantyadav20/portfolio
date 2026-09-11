"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { scratch as data, widgets } from "@/content/canvas";
import {
  briefNumber,
  landStudio,
  noHandedServerSide,
  openStudio,
  readHanded,
  readTable,
  redeal,
  subscribeHanded,
  subscribeTable,
  tableServerSide,
} from "@/lib/brief";
import { TAPE_TILT, worldPose } from "@/lib/briefFlight";
import { useMediaQuery } from "@/lib/clientValue";
import { play, warm } from "@/lib/sfx";
import { tapeMeta } from "@/components/canvas/studio/frames";
import Leaf, { type Flight } from "./Leaf";
import { readTheme, serverTheme, subscribeTheme } from "@/lib/theme";
import { Coin } from "./art";
import { useVisible } from "@/lib/visible";
import { rasp, reveal } from "./rasp";
import styles from "./ScratchCard.module.css";

/* ===========================================================================
   Scratch for a brief.

   The foil hides a design brief — a problem, one constraint, a time limit —
   and "Sketch it" tears it off and carries it up into the Brief Studio,
   where it is sketched on a sheet the size of the screen (studio/Studio.tsx).
   It used to hide a chess game with nowhere to go: a wizard, a mirrored PLAY,
   confetti, and a PLAY NOW that was an inert placeholder. A scratch card on a
   designer's board should deal the one thing a designer is asked for all day.

   THE TICKET IS UNDER THE FOIL FROM THE START, not mounted at the reveal. So
   scratching uncovers the brief a word at a time, and the reveal is the foil
   letting go of something you have already half read — rather than a prize
   swapped in behind a curtain.

   What survives from the port of references/canvas/Chess.tsx: the brushed
   foil and the sheen that sweeps while idle, `destination-out` scratching with
   interpolated dabs, dust under the coin, the progress ring, the card's
   bounce, the coin cursor that wobbles while you scratch. Its motif is
   designer marks now — frame corners, anchors and handles, a crosshair — drawn
   as strokes rather than set as glyphs, so they do not depend on a font.

   Two adaptations that predate the rebuild and still apply:

   - It repaints for the active theme. A black foil on a light desk was the
     "patchy" look — light mode is brushed aluminium, its own material rather
     than a tinted version of the dark one.

   - Scratching only begins once the pointer has travelled a few px. On a
     canvas you pan by dragging, a press that turns into a pan was starting a
     scratch on the way past. That is the bug where it "scratched on scroll".
   =========================================================================== */

const SIZE = 320;
/** Radius of one dab, in card px. Wider than it was: a reveal is the start of
 *  the experience, not the experience. */
const NIB = 44;
/** Fraction of foil removed before the rest peels away by itself. It was 60,
 *  about ten seconds of scrubbing before anything happened. */
const THRESHOLD = 45;
/** The foil coming off as one sheet, ms. */
const PEEL_MS = 520;
/** Travel before a press counts as a scratch rather than a pan. */
const SCRATCH_SLOP = 4;

type Mark = "frame" | "handle" | "cross" | "cursor" | "measure" | "grid";

/** x, y, rotation°, size, mark — scattered by hand, not by a lattice. */
const MOTIF: readonly (readonly [number, number, number, number, Mark])[] = [
  [22, 48, -18, 36, "frame"], [78, 28, 8, 28, "handle"], [145, 42, -6, 40, "cross"],
  [210, 22, 14, 30, "cursor"], [265, 52, -22, 34, "measure"], [42, 105, 20, 32, "grid"],
  [118, 92, -10, 38, "frame"], [188, 108, 16, 28, "handle"], [252, 88, -8, 36, "cross"],
  [18, 168, 6, 30, "cursor"], [88, 155, -24, 40, "measure"], [162, 172, 12, 32, "grid"],
  [228, 150, -16, 28, "frame"], [275, 170, 18, 36, "handle"], [52, 228, -12, 34, "cross"],
  [122, 218, 8, 30, "cursor"], [192, 235, -20, 38, "measure"], [258, 222, 14, 28, "grid"],
  [28, 288, 16, 32, "handle"], [102, 278, -8, 36, "frame"], [172, 300, 10, 30, "cross"],
  [240, 292, -18, 34, "cursor"],
];

/** One mark, centred on the origin, `s` across. */
function drawMark(ctx: CanvasRenderingContext2D, mark: Mark, s: number) {
  const h = s / 2;
  ctx.beginPath();
  switch (mark) {
    case "frame": {
      // The four corners of a selected frame, nothing between them.
      const w = h;
      const v = h * 0.72;
      const k = s * 0.22;
      ctx.moveTo(-w, -v + k); ctx.lineTo(-w, -v); ctx.lineTo(-w + k, -v);
      ctx.moveTo(w - k, -v); ctx.lineTo(w, -v); ctx.lineTo(w, -v + k);
      ctx.moveTo(w, v - k); ctx.lineTo(w, v); ctx.lineTo(w - k, v);
      ctx.moveTo(-w + k, v); ctx.lineTo(-w, v); ctx.lineTo(-w, v - k);
      ctx.stroke();
      break;
    }
    case "handle": {
      // An anchor with its two control handles out.
      const a = s * 0.09;
      ctx.moveTo(-h, 0); ctx.lineTo(h, 0);
      ctx.stroke();
      ctx.strokeRect(-a, -a, a * 2, a * 2);
      for (const x of [-h, h]) {
        ctx.beginPath();
        ctx.arc(x, 0, a * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "cross": {
      const g = h * 0.3;
      ctx.moveTo(-h, 0); ctx.lineTo(-g, 0); ctx.moveTo(g, 0); ctx.lineTo(h, 0);
      ctx.moveTo(0, -h); ctx.lineTo(0, -g); ctx.moveTo(0, g); ctx.lineTo(0, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, g, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "cursor": {
      ctx.moveTo(-h * 0.5, -h);
      ctx.lineTo(-h * 0.5, h * 0.55);
      ctx.lineTo(-h * 0.1, h * 0.2);
      ctx.lineTo(h * 0.2, h * 0.85);
      ctx.lineTo(h * 0.4, h * 0.75);
      ctx.lineTo(h * 0.1, h * 0.1);
      ctx.lineTo(h * 0.6, h * 0.1);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case "measure": {
      // A redline: the span, and a tick at each end.
      const t = s * 0.12;
      ctx.moveTo(-h, -t); ctx.lineTo(-h, t);
      ctx.moveTo(h, -t); ctx.lineTo(h, t);
      ctx.moveTo(-h, 0); ctx.lineTo(h, 0);
      ctx.stroke();
      break;
    }
    case "grid": {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.arc(i * h * 0.6, j * h * 0.6, s * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }
}

type Palette = {
  bg: string;
  base: [string, string, string, string];
  ink: string;
  grain: string;
  motif: string;
  sheen: string;
};

/* The ticket is warm paper in both themes, so it reads as a ticket rather
   than one more dark square on a board of them. The foil over it keeps its
   own metal. */
const DARK: Palette = {
  bg: "#29251f",
  base: ["#2e2e2e", "#202020", "#262626", "#171717"],
  ink: "238,230,216",
  grain: "rgba(217,217,217,0.025)",
  // A hairline stroke carries far less ink than a glyph did; lifted to match.
  motif: "rgba(217,217,217,0.13)",
  sheen: "217,217,217",
};

/* Brushed aluminium. A light grey that is merely "less dark" reads as a
   rendering error next to real paper; this is its own material. */
const LIGHT: Palette = {
  bg: "#f4ecdc",
  base: ["#dedbd4", "#c9c5bc", "#d5d1c9", "#b6b1a7"],
  ink: "58,48,36",
  grain: "rgba(0,0,0,0.035)",
  motif: "rgba(0,0,0,0.14)",
  sheen: "255,255,255",
};

type Particle = { id: number; x: number; y: number; dx: number; dy: number; size: number };

export default function ScratchCard() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const palette = theme === "dark" ? DARK : LIGHT;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useVisible(canvasRef);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const scratching = useRef(false);
  const popped = useRef(false);
  const idle = useRef(true);
  const raf = useRef(0);
  const lastDust = useRef(0);
  /* Its own tracker rather than reading `lastPos`: that one is the drawing
     path and gets nulled on every up and cancel, and a speed derived from it
     would spike to infinity on the first move of each new stroke. */
  const lastRasp = useRef<{ x: number; y: number; t: number } | null>(null);
  const particleId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  /* Under the foil before anyone touches it. Read through a store because
     `/canvas` is server-rendered and the pick is random — see `lib/brief`. */
  const brief = useSyncExternalStore(subscribeTable, readTable, tableServerSide);
  /** What has been handed in, by brief — the stub shows yours. */
  const handed = useSyncExternalStore(subscribeHanded, readHanded, noHandedServerSide);
  const [peeling, setPeeling] = useState(false);
  const [started, setStarted] = useState(false);
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);
  const [bounced, setBounced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inside, setInside] = useState(false);
  const [active, setActive] = useState(false);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [dust, setDust] = useState<Particle[]>([]);
  /** The brief has been torn off and sent to the paper; the stub stays. */
  const [torn, setTorn] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);

  /* --- The foil ------------------------------------------------------------ */

  const drawFoil = useCallback(
    (sheen: number | null) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const p = palette;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, SIZE, SIZE);

      const base = ctx.createLinearGradient(0, 0, SIZE, SIZE);
      base.addColorStop(0, p.base[0]);
      base.addColorStop(0.4, p.base[1]);
      base.addColorStop(0.6, p.base[2]);
      base.addColorStop(1, p.base[3]);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Brushing: diagonal hairlines. What stops the gradient reading flat.
      ctx.strokeStyle = p.grain;
      ctx.lineWidth = 1;
      for (let i = -10; i < 32; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 14, 0);
        ctx.lineTo(i * 14 + 64, SIZE);
        ctx.stroke();
      }

      ctx.save();
      ctx.strokeStyle = p.motif;
      ctx.fillStyle = p.motif;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [x, y, r, s, mark] of MOTIF) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((r * Math.PI) / 180);
        drawMark(ctx, mark, s);
        ctx.restore();
      }
      ctx.restore();

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${p.ink},0.85)`;
      ctx.font = "700 19px var(--font-ui), system-ui, sans-serif";
      ctx.fillText("SCRATCH HERE", SIZE / 2, SIZE / 2);
      ctx.fillStyle = `rgba(${p.ink},0.4)`;
      ctx.font = "600 11px var(--font-ui), system-ui, sans-serif";
      ctx.fillText("• • •", SIZE / 2, SIZE / 2 + 22);
      ctx.restore();

      // The attract sweep. Only while idle — once scratching starts it would
      // just be light moving under the hand.
      if (sheen !== null) {
        const g = ctx.createLinearGradient(sheen - 130, 0, sheen + 130, SIZE);
        g.addColorStop(0, `rgba(${p.sheen},0)`);
        g.addColorStop(0.45, `rgba(${p.sheen},0)`);
        g.addColorStop(0.5, `rgba(${p.sheen},0.28)`);
        g.addColorStop(0.55, `rgba(${p.sheen},0)`);
        g.addColorStop(1, `rgba(${p.sheen},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
    },
    [palette],
  );

  const runIdle = useCallback(() => {
    const start = performance.now();
    const loop = (t: number) => {
      if (!idle.current) return;
      const period = 3.2;
      const pos = -150 + (((t - start) / 1000) % period) / period * 600;
      drawFoil(pos);
      raf.current = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  }, [drawFoil]);

  useEffect(() => {
    // The foil sheen is a continuous rAF loop. Off-screen or in a background
    // tab it was still repainting the whole coin layer every frame; a static
    // foil is the correct thing to leave behind.
    if (idle.current && visible) runIdle();
    else drawFoil(null);
    return () => cancelAnimationFrame(raf.current);
  }, [runIdle, drawFoil, visible]);

  /* A fresh foil is painted before the browser paints at all. "New brief"
     re-mounts the canvas in the same commit that swaps the ticket underneath,
     and an unpainted canvas is transparent — without this the next brief
     showed for a frame before the idle loop's first rAF covered it. */
  useLayoutEffect(() => {
    if (!ready) drawFoil(null);
  }, [ready, drawFoil]);

  /* --- The reveal ----------------------------------------------------------
     Fired from the scratch that crosses the threshold rather than from an
     effect watching `pct` — the reveal is a consequence of an event, and
     setting state synchronously inside an effect is what React 19 refuses. */

  const pop = useCallback(() => {
    reveal();
    // The rest of the foil comes away as one sheet rather than vanishing.
    play("scratch-peel", { level: 0.6 });
    setPeeling(true);
    setBounced(true);
    window.setTimeout(() => setBounced(false), 800);
    window.setTimeout(() => setReady(true), PEEL_MS);
  }, []);

  /* --- Scratching ---------------------------------------------------------- */

  const spawnDust = useCallback((x: number, y: number) => {
    const now = performance.now();
    if (now - lastDust.current < 45) return;
    lastDust.current = now;
    const batch = Array.from({ length: 3 }, () => ({
      id: particleId.current++,
      x,
      y,
      dx: (Math.random() * 2 - 1) * 34,
      dy: -10 - Math.random() * 28,
      size: 3 + Math.random() * 4,
    }));
    setDust((p) => [...p.slice(-20), ...batch]);
    const ids = new Set(batch.map((b) => b.id));
    window.setTimeout(() => setDust((p) => p.filter((q) => !ids.has(q.id))), 650);
  }, []);

  const scratchAt = useCallback((x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";

    const dab = (px: number, py: number) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, NIB);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.5, "rgba(0,0,0,0.95)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(px, py, NIB, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    };

    dab(x, y);
    const prev = lastPos.current;
    if (prev) {
      const steps = Math.ceil(Math.hypot(x - prev.x, y - prev.y) / 6);
      for (let i = 1; i < steps; i++) {
        dab(prev.x + (x - prev.x) * (i / steps), prev.y + (y - prev.y) * (i / steps));
      }
    }
    lastPos.current = { x, y };

    // Sample every 20th pixel's alpha. The number drives a ring and a
    // threshold; reading all 102,400 on every pointermove is what makes
    // scratch cards stutter.
    const buf = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let clear = 0;
    for (let i = 3; i < buf.length; i += 80) if (buf[i] < 128) clear++;
    const next = (clear / ((SIZE * SIZE) / 20)) * 100;
    setPct(next);

    if (next > THRESHOLD && !popped.current) {
      popped.current = true;
      pop();
    }
  }, [pop]);

  function toCard(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SIZE,
      y: ((e.clientY - r.top) / r.height) * SIZE,
    };
  }

  /** The next brief, dealt straight onto the ticket. Scratching is the
   *  first-time ritual; making someone scrub a whole foil again to browse
   *  briefs was a toll. The ticket flips in (see `.ticket`'s animation). */
  const again = useCallback(() => {
    redeal();
    setTorn(false);
    play("book-page", { level: 0.4 });
  }, []);

  /** Back to this brief in the Studio — the take if it was handed in. */
  const backToStudio = useCallback(() => {
    openStudio(brief, { phase: handed[brief.id] ? "take" : "draw" });
  }, [brief, handed]);

  /** The leaf has arrived: the Studio's tape takes over from it. */
  const land = useCallback(() => {
    landStudio();
    play("photo-settle", { level: 0.8 });
    setFlight(null);
  }, []);

  /**
   * Tear the brief off and take it to the Studio.
   *
   * The Studio opens with its tape laid out but hidden; the leaf is measured
   * from where the ticket is drawn on screen (its place on the board through
   * the camera's transform) to where that tape is, and flies between them.
   * The camera stays put — the board dims behind the sheet instead.
   */
  const sketch = useCallback(() => {
    const slot = rootRef.current?.closest<HTMLElement>("[data-widget]");
    const world = slot?.parentElement;
    const surface = world?.parentElement;
    const perf = perfRef.current;
    const from = widgets.find((w) => w.id === "scratch");

    if (reduced || !world || !surface || !perf || !from) {
      openStudio(brief);
      setTorn(true);
      return;
    }

    openStudio(brief, { landed: false });
    play("scratch-peel", { level: 0.7 });
    const lifted = hovered ? -4 : 0; // the card's hover lift, so the leaf starts where the ticket is drawn

    /* A timeout rather than a frame: a tab with no frames still has to get
       the brief onto the tape. By the time it fires the Studio has committed
       and its hidden tape has a box to read. */
    window.setTimeout(() => {
      const tape = surface.querySelector<HTMLElement>("[data-studio-tape]");
      if (!tape) {
        landStudio();
        setTorn(true);
        return;
      }
      // The camera: a uniform scale and a translate, written by CanvasSurface.
      const cam = new DOMMatrixReadOnly(getComputedStyle(world).transform);
      const s = cam.a;
      const leafH = perf.offsetTop;
      const onBoard = worldPose(from, { x: 0, y: lifted, w: SIZE, h: leafH });
      const box = surface.getBoundingClientRect();
      const t = tape.getBoundingClientRect();
      // The stub gives up its top half in the same commit the leaf appears in,
      // so there is no frame with neither.
      setTorn(true);
      setFlight({
        container: surface,
        from: { cx: onBoard.cx * s + cam.e, cy: onBoard.cy * s + cam.f, rot: onBoard.rot },
        to: {
          cx: t.left + t.width / 2 - box.left,
          cy: t.top + t.height / 2 - box.top,
          rot: TAPE_TILT,
        },
        s0: s,
        leafW: SIZE,
        leafH,
        tapeW: tape.offsetWidth,
        tapeH: tape.offsetHeight,
      });
    }, 60);
  }, [brief, hovered, reduced]);

  /* The keyboard way in. With the card focused (the Tab tour brings you
     here), Enter or Space peels the foil; once the brief is showing, the same
     key tears it off to the Studio. Stopped here so Space doesn't also lift
     the camera off the board. */
  useEffect(() => {
    const slot = rootRef.current?.closest<HTMLElement>("[data-widget]");
    if (!slot) return;
    function onKey(e: KeyboardEvent) {
      if (e.target !== slot) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      if (!popped.current) {
        popped.current = true;
        idle.current = false;
        cancelAnimationFrame(raf.current);
        setStarted(true);
        pop();
      } else if (ready && !torn) {
        sketch();
      } else if (torn) {
        backToStudio();
      }
    }
    slot.addEventListener("keydown", onKey);
    return () => slot.removeEventListener("keydown", onKey);
  }, [pop, sketch, backToStudio, ready, torn]);

  const ringR = SIZE / 2 - 16;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = Math.min(pct / THRESHOLD, 1);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-canvas-interactive=""
      style={{
        ["--fg" as string]: `rgb(${palette.ink})`,
        ["--fg-rgb" as string]: palette.ink,
        ["--bg" as string]: palette.bg,
      }}
    >
      <span className={styles.glow} aria-hidden="true" />

      <div
        className={`${styles.card} squircle`}
        // The coin is the pointer while there is foil to scratch. See
        // CanvasCursor. Once the foil is gone the buttons need a real one.
        data-cursor={ready ? undefined : "none"}
        data-ready={ready ? "" : undefined}
        data-bounced={bounced ? "" : undefined}
        data-hovered={hovered && !bounced ? "" : undefined}
        data-idle={!started && !hovered ? "" : undefined}
        onMouseEnter={() => {
          setHovered(true);
          setInside(true);
          // The tear and the landing are recordings; fetch them on approach.
          warm("scratch-peel", "photo-settle");
        }}
        onMouseLeave={() => {
          setHovered(false);
          setInside(false);
        }}
      >
        {!started && (
          <span className={styles.hint} aria-hidden="true">
            {data.label.toUpperCase()}
          </span>
        )}

        {/* The ticket. Hidden from assistive tech until the foil is off, or
            a screen reader would read out the brief the card is hiding. */}
        <div key={brief.id} className={styles.ticket} aria-hidden={ready ? undefined : true} aria-live="polite">
          <div className={styles.top}>
            {/* The half that tears off. Hidden, not removed, once it has —
                it keeps the stub's layout exactly where it was. */}
            <div className={styles.leaf} data-gone={torn ? "" : undefined}>
              <div className={styles.head}>
                <span>{data.eyebrow}</span>
                <span className={styles.serial}>№{briefNumber(brief)}</span>
              </div>
              <p className={styles.brief}>{brief.brief}</p>
            </div>
            {/* Where it went. An outline of what was torn off, and the way to
                it — a used ticket should say where its other half is. */}
            {/* Where it went. A used ticket should say where its other half is —
                and once it has been handed in, show what you made of it. */}
            {torn && (
              <button
                type="button"
                className={styles.ghost}
                onClick={backToStudio}
                data-handed={handed[brief.id] ? "" : undefined}
              >
                {handed[brief.id] ? (
                  <>
                    {/* The visitor's own thumbnail, a data URL. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.ghostThumb} src={handed[brief.id]} alt="" />
                    <span>
                      Handed in ✓ · <span className={styles.ghostLink}>see the take</span>
                    </span>
                  </>
                ) : (
                  <>
                    Back to the paper <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div ref={perfRef} className={styles.perf} aria-hidden="true" />
          <dl className={styles.terms}>
            <div>
              <dt>Constraint</dt>
              <dd>{brief.constraint}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{brief.seconds} sec</dd>
            </div>
          </dl>
        </div>

        {dust.map((d) => (
          <span
            key={d.id}
            className={styles.dust}
            style={{
              left: d.x,
              top: d.y,
              width: d.size,
              height: d.size,
              ["--dx" as string]: `${d.dx}px`,
              ["--dy" as string]: `${d.dy}px`,
            }}
          />
        ))}

        {!ready && (
          <canvas
            ref={canvasRef}
            className={styles.foil}
            data-peeling={peeling ? "" : undefined}
            width={SIZE}
            height={SIZE}
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Without capture a scratch stops at the edge. Not fatal.
              }
              downAt.current = { x: e.clientX, y: e.clientY };
              lastPos.current = null;
            }}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });

              const d = downAt.current;
              if (!d) return;

              // The slop gate. A press that becomes a pan must not leave a
              // scratch behind it — this is the "scratched on scroll" bug.
              if (!scratching.current) {
                if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < SCRATCH_SLOP) return;
                scratching.current = true;
                setActive(true);
                if (idle.current) {
                  idle.current = false;
                  cancelAnimationFrame(raf.current);
                  drawFoil(null);
                  setStarted(true);
                }
              }

              const p = toCard(e);
              scratchAt(p.x, p.y);
              spawnDust(e.clientX - r.left, e.clientY - r.top);

              /* px/ms since the last move, which is what the grain density and
                 brightness are driven by. Guarded against a zero delta: two
                 pointer events can share a timestamp, and dividing by it sends
                 the speed to Infinity and the filter to a NaN it never
                 recovers from. */
              const t = performance.now();
              const was = lastRasp.current;
              lastRasp.current = { x: e.clientX, y: e.clientY, t };
              if (was) {
                const dt = t - was.t;
                if (dt > 0) {
                  rasp(Math.hypot(e.clientX - was.x, e.clientY - was.y) / dt);
                }
              }
            }}
            onPointerUp={() => {
              downAt.current = null;
              scratching.current = false;
              setActive(false);
              lastPos.current = null;
              lastRasp.current = null;
            }}
            onPointerCancel={() => {
              downAt.current = null;
              scratching.current = false;
              setActive(false);
              lastPos.current = null;
            }}
          />
        )}

        {started && !ready && !peeling && (
          <svg className={styles.ring} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={ringR} className={styles.ringTrack} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={ringR}
              className={styles.ringFill}
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - ringPct)}
            />
          </svg>
        )}

        {inside && !ready && (
          <span
            className={styles.coin}
            data-wobble={active ? "" : undefined}
            style={{ left: cursor.x, top: cursor.y }}
          >
            <Coin />
          </span>
        )}

        {ready && (
          <div className={styles.actions}>
            <button type="button" className={styles.again} onClick={again}>
              <span aria-hidden="true">↺</span> {data.reset}
            </button>
            {!torn && (
              <button type="button" className={styles.cta} onClick={sketch}>
                {data.cta} <span className={styles.arrow} aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </div>

      {flight &&
        createPortal(
          <Leaf
            flight={flight}
            brief={brief}
            eyebrow={data.eyebrow}
            serial={briefNumber(brief)}
            meta={tapeMeta(brief)}
            tokens={{
              ["--fg" as string]: `rgb(${palette.ink})`,
              ["--fg-rgb" as string]: palette.ink,
              ["--bg" as string]: palette.bg,
            }}
            onDone={land}
          />,
          flight.container,
        )}
    </div>
  );
}
