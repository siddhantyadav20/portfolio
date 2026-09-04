"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { scratch as data } from "@/content/canvas";
import { externalLinkProps } from "@/lib/externalLink";
import { readTheme, serverTheme, subscribeTheme } from "@/lib/theme";
import { Coin, Wizard } from "./art";
import { useVisible } from "@/lib/visible";
import { rasp, reveal } from "./rasp";
import styles from "./ScratchCard.module.css";

/* ===========================================================================
   Scratch to play.

   Ported from references/canvas/Chess.tsx, which is a scratch card whatever
   its filename says. Everything it does is here: the brushed foil with its
   chess motif and the sheen that sweeps while idle, `destination-out`
   scratching with interpolated dabs, dust kicked up under the coin, a
   progress ring around the card, the wizard springing up from below at 60%,
   the mirrored PLAY lettering, confetti, the card's bounce, and the coin
   cursor that wobbles while you scratch.

   Three adaptations, all forced by where it now lives:

   - The reference was a 300x300 card floating inside a 380x420 frame, with
     the hint pill above it and the CTA below. The slot is 320x320 now, so the
     card fills it and both move inside.

   - It repaints for the active theme. A black foil on a light desk was the
     "patchy" look — light mode is brushed aluminium, its own material rather
     than a tinted version of the dark one.

   - Scratching only begins once the pointer has travelled a few px. On a
     canvas you pan by dragging, a press that turns into a pan was starting a
     scratch on the way past. That is the bug where it "scratched on scroll".
   =========================================================================== */

const SIZE = 320;
/** Radius of one dab, in card px. */
const NIB = 38;
/** Fraction of foil removed before the prize pops. */
const THRESHOLD = 60;
/** Travel before a press counts as a scratch rather than a pan. */
const SCRATCH_SLOP = 4;

const ACCENT = "#3B5FBF";

const MOTIF = [
  [22, 48, -18, 36, "♟"], [78, 28, 8, 28, "♞"], [145, 42, -6, 40, "♛"],
  [210, 22, 14, 30, "♝"], [265, 52, -22, 34, "♜"], [42, 105, 20, 32, "♔"],
  [118, 92, -10, 38, "♘"], [188, 108, 16, 28, "♙"], [252, 88, -8, 36, "♕"],
  [18, 168, 6, 30, "♗"], [88, 155, -24, 40, "♚"], [162, 172, 12, 32, "♟"],
  [228, 150, -16, 28, "♞"], [275, 170, 18, 36, "♛"], [52, 228, -12, 34, "♝"],
  [122, 218, 8, 30, "♜"], [192, 235, -20, 38, "♔"], [258, 222, 14, 28, "♘"],
  [28, 288, 16, 32, "♙"], [102, 278, -8, 36, "♕"], [172, 300, 10, 30, "♗"],
  [240, 292, -18, 34, "♚"],
] as const;

type Palette = {
  bg: string;
  base: [string, string, string, string];
  ink: string;
  grain: string;
  motif: string;
  sheen: string;
};

const DARK: Palette = {
  bg: "#222222",
  base: ["#2e2e2e", "#202020", "#262626", "#171717"],
  ink: "217,217,217",
  grain: "rgba(217,217,217,0.025)",
  motif: "rgba(217,217,217,0.09)",
  sheen: "217,217,217",
};

/* Brushed aluminium. A light grey that is merely "less dark" reads as a
   rendering error next to real paper; this is its own material. */
const LIGHT: Palette = {
  bg: "#f2f0eb",
  base: ["#dedbd4", "#c9c5bc", "#d5d1c9", "#b6b1a7"],
  ink: "42,40,36",
  grain: "rgba(0,0,0,0.035)",
  motif: "rgba(0,0,0,0.10)",
  sheen: "255,255,255",
};

type Particle = { id: number; x: number; y: number; dx: number; dy: number; size: number };
type Confetti = {
  id: number; left: number; color: string; xEnd: number;
  rot: number; delay: number; dur: number; size: number; round: boolean;
};

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

  const [started, setStarted] = useState(false);
  const [pct, setPct] = useState(0);
  const [wizardUp, setWizardUp] = useState(false);
  const [ready, setReady] = useState(false);
  const [bounced, setBounced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inside, setInside] = useState(false);
  const [active, setActive] = useState(false);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [dust, setDust] = useState<Particle[]>([]);
  const [confetti, setConfetti] = useState<Confetti[]>([]);

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

      ctx.fillStyle = p.motif;
      for (const [x, y, r, s, glyph] of MOTIF) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((r * Math.PI) / 180);
        ctx.font = `${s}px serif`;
        ctx.fillText(glyph, 0, 0);
        ctx.restore();
      }

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

  /* --- The reveal ----------------------------------------------------------
     Fired from the scratch that crosses the threshold rather than from an
     effect watching `wizardUp`. The confetti is a consequence of an event,
     not of a state value settling — and reacting to the state meant setting
     state synchronously inside an effect, which React 19 refuses. */

  const pop = useCallback(() => {
    reveal();
    setWizardUp(true);
    setBounced(true);
    window.setTimeout(() => setBounced(false), 800);
    window.setTimeout(() => setReady(true), 550);

    const swatches = [`rgb(${palette.ink})`, "#ffffff", ACCENT, "#5b7fe0", "#8c8c8c"];
    setConfetti(
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: 50 + (Math.random() * 60 - 30),
        color: swatches[i % swatches.length],
        xEnd: (Math.random() * 2 - 1) * 160,
        rot: (Math.random() * 2 - 1) * 720,
        delay: Math.random() * 0.15,
        dur: 1.6 + Math.random() * 1.1,
        size: 6 + Math.random() * 7,
        round: Math.random() > 0.5,
      })),
    );
    window.setTimeout(() => setConfetti([]), 3000);
  }, [palette.ink]);

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

  const reset = useCallback(() => {
    popped.current = false;
    lastPos.current = null;
    scratching.current = false;
    idle.current = true;
    setStarted(false);
    setWizardUp(false);
    setReady(false);
    setPct(0);
    setConfetti([]);
    setDust([]);
    runIdle();
  }, [runIdle]);

  const ringR = SIZE / 2 - 16;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = Math.min(pct / THRESHOLD, 1);

  return (
    <div
      className={styles.root}
      data-canvas-interactive=""
      style={{
        ["--accent" as string]: ACCENT,
        ["--fg" as string]: `rgb(${palette.ink})`,
        ["--fg-rgb" as string]: palette.ink,
        ["--bg" as string]: palette.bg,
      }}
    >
      <span className={styles.glow} aria-hidden="true" />

      <div
        className={`${styles.card} squircle`}
        // The coin is the pointer here. See CanvasCursor.
        data-cursor="none"
        data-bounced={bounced ? "" : undefined}
        data-hovered={hovered && !bounced ? "" : undefined}
        data-idle={!started && !hovered ? "" : undefined}
        onMouseEnter={() => {
          setHovered(true);
          setInside(true);
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

        {wizardUp && <span className={styles.wizardGlow} aria-hidden="true" />}

        {pct > 2 && (
          <>
            <span className={styles.playTop} data-float={hovered && wizardUp ? "" : undefined}>
              PLAY
            </span>
            <span className={styles.playBottom} data-float={hovered && wizardUp ? "" : undefined}>
              PLAY
            </span>
          </>
        )}

        <span className={styles.wizard} data-up={wizardUp ? "" : undefined}>
          <Wizard />
        </span>

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

        {started && !ready && (
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
          <>
            {data.href ? (
              <a className={styles.cta} href={data.href} {...externalLinkProps(data.href)}>
                PLAY NOW <span className={styles.arrow}>→</span>
              </a>
            ) : (
              <span className={styles.cta} data-placeholder="">
                PLAY NOW <span className={styles.arrow}>→</span>
              </span>
            )}
            <button type="button" className={styles.reset} onClick={reset} aria-label="Scratch again">
              ↺
            </button>
          </>
        )}

        {confetti.map((c) => (
          <span
            key={c.id}
            className={styles.confetti}
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.round ? c.size : c.size * 0.4,
              background: c.color,
              borderRadius: c.round ? "50%" : 2,
              ["--xe" as string]: `${c.xEnd}px`,
              ["--rot" as string]: `${c.rot}deg`,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
