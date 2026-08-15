"use client";

import { useEffect, useRef } from "react";
import { oneko } from "@/content/canvas";
import styles from "./Oneko.module.css";

/* ===========================================================================
   The cat.

   oneko: a sprite sheet that chases the pointer, sleeps when it catches up,
   and washes itself when bored. The sheet was already in the Framer canvas —
   it was the one asset I could not identify on the first pass and it turned
   out to be this.

   Deliberately outside the transformed world: the cat walks on the *screen*,
   not on the board. A cat that scaled with the zoom would be a sticker.
   =========================================================================== */

const CELL = oneko.cell;
const SPEED = 10;
/** Below this it has arrived, and chasing further is jitter. */
const ARRIVED = 24;

/** Sprite columns per state. Each entry is [col, row] in the sheet. */
const SPRITES: Record<string, [number, number][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

export default function Oneko() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let mouseX = x;
    let mouseY = y;
    let frameCount = 0;
    let idleTime = 0;
    let idleAnim: string | null = null;
    let idleFrame = 0;
    let timer = 0;

    function setSprite(name: string, frame: number) {
      const list = SPRITES[name];
      const [cx, cy] = list[frame % list.length];
      el!.style.backgroundPosition = `${cx * CELL}px ${cy * CELL}px`;
    }

    function idle() {
      idleTime += 1;
      // Bored for long enough, and not up against an edge where the animation
      // would look like it is grooming a wall.
      if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && !idleAnim) {
        idleAnim = ["sleeping", "scratchSelf"][Math.floor(Math.random() * 2)];
        idleFrame = 0;
      }
      if (!idleAnim) {
        setSprite("idle", 0);
        return;
      }
      if (idleAnim === "sleeping") {
        if (idleFrame < 8) setSprite("tired", 0);
        else setSprite("sleeping", Math.floor(idleFrame / 4));
        if (idleFrame > 192) {
          idleAnim = null;
          idleTime = 0;
        }
      } else {
        setSprite(idleAnim, idleFrame);
        if (idleFrame > 9) {
          idleAnim = null;
          idleTime = 0;
        }
      }
      idleFrame += 1;
    }

    function tick() {
      frameCount += 1;
      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.hypot(dx, dy);

      if (dist < ARRIVED) {
        idle();
        return;
      }

      idleAnim = null;
      idleTime = 0;

      // A beat of surprise before it sets off, which is most of the charm.
      if (idleTime > 1) {
        setSprite("alert", 0);
        idleTime = Math.min(idleTime, 7);
        idleTime -= 1;
        return;
      }

      let dir = "";
      dir += dy / dist > 0.5 ? "N" : dy / dist < -0.5 ? "S" : "";
      dir += dx / dist > 0.5 ? "W" : dx / dist < -0.5 ? "E" : "";
      setSprite(dir || "idle", frameCount);

      x -= (dx / dist) * SPEED;
      y -= (dy / dist) * SPEED;
      x = Math.min(Math.max(16, x), window.innerWidth - 16);
      y = Math.min(Math.max(16, y), window.innerHeight - 16);
      el!.style.transform = `translate(${x - 16}px, ${y - 16}px)`;
    }

    function onMove(e: PointerEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    el.style.transform = `translate(${x - 16}px, ${y - 16}px)`;
    document.addEventListener("pointermove", onMove, { passive: true });
    // A timer, not rAF: the cat moves on a 10fps sprite clock by design —
    // running it at 120Hz would make it glide, and oneko does not glide.
    timer = window.setInterval(tick, 100);

    return () => {
      document.removeEventListener("pointermove", onMove);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={styles.cat}
      style={{ backgroundImage: `url(${oneko.sprite})` }}
      aria-hidden="true"
    />
  );
}
