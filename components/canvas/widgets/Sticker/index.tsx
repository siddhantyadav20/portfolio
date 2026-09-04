"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useMediaQuery } from "@/lib/clientValue";
import { buildFlight, FLIGHT_DURATION, TRACKS, type Track } from "./effects";
import { playSticker } from "./sounds";
import styles from "./Sticker.module.css";

/* ===========================================================================
   A die-cut sticker.

   Each one moves like the thing it is a picture of — see effects.ts. Hovering
   plays it once; hovering again while it is still going does nothing, so you
   cannot stack them.

   No foil on any of them. The holographic sheen was a masked `plus-lighter`
   layer over the artwork, and on the Counter-Strike sticker in particular it
   read as a grey haze sitting off the die-cut rather than as light on it —
   so it is gone, and the move is the whole interaction.

   Nothing clips: the rocket's arc leaves the widget's box by 150px in each
   direction, and the board's slots have no overflow rule so that it can.
   =========================================================================== */

export type Effect = "flight" | "bicycle" | "recoil" | "hadouken";

const SHADOW_OPACITY = 0.28;

export default function Sticker({
  label,
  art,
  effect,
}: {
  label: string;
  art: string;
  effect: Effect;
}) {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [lit, setLit] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const body = useAnimationControls();
  const shadow = useAnimationControls();

  const play = useCallback(async () => {
    if (reduced || running.current) return;
    running.current = true;
    setBusy(true);
    // On the same frame the animation starts — the offsets in `sounds` are
    // measured into these tracks, so the two have to leave together.
    playSticker(effect);

    if (effect === "flight") {
      const f = buildFlight({ shadowOpacity: SHADOW_OPACITY });
      await Promise.all([
        body.start({
          x: f.x,
          y: f.y,
          rotate: f.rotate,
          scale: f.scale,
          transition: { duration: FLIGHT_DURATION, times: f.times, ease: f.ease },
        }),
        shadow.start({
          x: f.shX,
          scale: f.shScale,
          opacity: f.shOpacity,
          transition: { duration: FLIGHT_DURATION, times: f.times, ease: f.ease },
        }),
      ]);
    } else {
      const t: Track = TRACKS[effect];
      await Promise.all([
        body.start({
          ...(t.x ? { x: t.x } : {}),
          ...(t.y ? { y: t.y } : {}),
          rotate: t.rotate,
          scale: t.scale,
          transition: { duration: t.duration, times: t.times, ease: t.ease },
        }),
        // The shadow only reacts where there is height to react to.
        t.y
          ? shadow.start({
              scale: t.y.map((v) => 1 - Math.min(0.45, Math.abs(v) / 110)),
              opacity: t.y.map(
                (v) => SHADOW_OPACITY * (1 - Math.min(0.7, Math.abs(v) / 70)),
              ),
              transition: { duration: t.duration, times: t.times, ease: t.ease },
            })
          : Promise.resolve(),
      ]);
    }

    setBusy(false);
    running.current = false;
  }, [effect, reduced, body, shadow]);

  return (
    <div
      className={styles.root}
      data-canvas-interactive=""
      data-busy={busy ? "" : undefined}
      onMouseEnter={() => {
        if (!canHover) return;
        setLit(true);
        void play();
      }}
      onMouseLeave={() => setLit(false)}
    >
      <motion.span
        className={styles.shadow}
        animate={shadow}
        initial={{ opacity: SHADOW_OPACITY, scale: 1, x: 0 }}
      />

      <motion.div
        className={styles.body}
        animate={body}
        initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
      >
        {/* Through the optimiser, not raw. `sticker-rocket.png` is a 2198px
            PNG and this box is 200 world-px — at the canvas's 2.4x ceiling on
            a 2x screen it needs 960, and it was shipping all 419KB of the
            original. `fill` because `.body` is already a sized, positioned
            box, so nothing about the layout moves. */}
        <Image
          src={art}
          alt={label}
          fill
          sizes="480px"
          className={styles.art}
          draggable={false}
        />

      </motion.div>

      <AnimatePresence>
        {lit && !busy && (
          <motion.span
            className={styles.tip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
