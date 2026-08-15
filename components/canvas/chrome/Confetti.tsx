"use client";

import { useEffect, useRef } from "react";
import styles from "./Confetti.module.css";

/* ===========================================================================
   Confetti.

   Ported near-verbatim from references/canvas/ConfettiLayer.tsx — the best of
   the four chrome files, and the only one that needed almost nothing done to
   it. Hand-rolled 2D physics, DPR-aware, spawning from all four edges so the
   burst frames the screen rather than raining from the top.

   Two changes. The palette was picked to read on #292D32 and is retuned here
   because the board is light by default. And it fires from a prop rather than
   a window CustomEvent, since everything that can trigger it is in one tree.
   =========================================================================== */

type Piece = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string;
  rot: number; vrot: number; tilt: number; vtilt: number;
  rect: boolean; life: number; max: number;
};

/** Per edge. Four of these is a burst; more is a mess. */
const DENSITY = 26;

export default function Confetti({ fire }: { fire: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const COLORS = ["#ea580b", "#6E78FF", "#34D7E6", "#FF7A9C", "#FFC75A", "#57E0A8"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pieces: Piece[] = [];
    let raf = 0;
    let running = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function spawn(edge: number, n: number) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (let i = 0; i < n; i++) {
        let x = 0, y = 0, vx = 0, vy = 0;
        const speed = rand(7, 15);
        if (edge === 0) { x = rand(0, w); y = -10; vx = rand(-3, 3); vy = speed * 0.7; }
        else if (edge === 1) { x = w + 10; y = rand(0, h); vx = -speed; vy = rand(-5, 2); }
        else if (edge === 2) { x = rand(0, w); y = h + 10; vx = rand(-3, 3); vy = -speed; }
        else { x = -10; y = rand(0, h); vx = speed; vy = rand(-5, 2); }
        pieces.push({
          x, y, vx, vy,
          size: rand(6, 11),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          rot: rand(0, Math.PI * 2), vrot: rand(-0.2, 0.2),
          tilt: rand(0, Math.PI * 2), vtilt: rand(0.08, 0.18),
          rect: Math.random() > 0.25,
          life: 0, max: rand(90, 150),
        });
      }
    }

    function tick() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.life++;
        p.vy += 0.16;          // gravity
        p.vx *= 0.985;         // drag
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.tilt += p.vtilt;

        const alpha = Math.min(
          Math.min(1, p.life / 8),
          Math.max(0, 1 - (p.life - p.max) / 30),
        );
        if (p.life > p.max + 30 || p.y > window.innerHeight + 40 || alpha <= 0) {
          pieces.splice(i, 1);
          continue;
        }

        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        if (p.rect) {
          // The flutter: scaling x by the tilt's cosine turns a rectangle into
          // a piece of paper turning over as it falls.
          ctx!.scale(Math.cos(p.tilt), 1);
          ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }

      if (pieces.length > 0) raf = requestAnimationFrame(tick);
      else {
        running = false;
        ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    }

    burstRef.current = () => {
      if (reduced) return;
      for (let e = 0; e < 4; e++) spawn(e, DENSITY);
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
      pieces = [];
    };
  }, []);

  // `fire` is a counter, not a boolean: pressing C twice in a row has to
  // produce two bursts, and a boolean cannot say "again".
  useEffect(() => {
    if (fire > 0) burstRef.current();
  }, [fire]);

  return <canvas ref={canvasRef} className={styles.layer} aria-hidden="true" />;
}
