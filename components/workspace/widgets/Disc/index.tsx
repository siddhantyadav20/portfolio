"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMediaQuery, useMounted } from "@/lib/clientValue";
import {
  currentlyPlaying,
  noneServerSide,
  stopAll,
  subscribePlaying,
  toggleTrack,
} from "@/lib/audio";
import styles from "./Disc.module.css";

/* ===========================================================================
   A record.

   Ported from references/canvas/Disc Player.tsx, keeping its proportions and
   its spring: the vinyl sits centred behind the sleeve and slides out by 42%
   of the widget's width when the track plays, spinning at 4s a revolution
   with the animation *paused* rather than removed when it stops — so pressing
   play again resumes the groove where it left off instead of snapping to 0deg.

   The 8px drag threshold is the original's and matters more here than it did
   in Framer: this sits on a canvas you pan by dragging, so a click has to mean
   a click. Anything past 8px of travel is a pan and never toggles playback.

   Single-owner playback lives in lib/audio rather than the original's window
   CustomEvent — same guarantee, and it also lets the now-playing card know
   which record is running.
   =========================================================================== */

const DRAG_THRESHOLD = 8;
const SPIN_SECONDS = 4;

export default function Disc({
  id,
  title,
  artist,
  cover,
  src,
}: {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string | null;
}) {
  const playingId = useSyncExternalStore(
    subscribePlaying,
    currentlyPlaying,
    noneServerSide,
  );
  const playing = playingId === id;

  const [hovered, setHovered] = useState(false);
  const down = useRef<{ x: number; y: number } | null>(null);

  const mounted = useMounted();
  // Hover states are for pointers that can hover. On touch the tooltip would
  // appear on tap and stay there, which is worse than not having it.
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  return (
    <div
      className={styles.root}
      data-canvas-interactive=""
      role="button"
      tabIndex={0}
      aria-label={`${playing ? "Stop" : "Play"} ${title} by ${artist}`}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const d = down.current;
        down.current = null;
        if (!d || !src) return;
        // A pan that happens to start on a record is not a click on it.
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_THRESHOLD) return;
        toggleTrack(id, src);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && src) {
          e.preventDefault();
          toggleTrack(id, src);
        }
      }}
      onMouseEnter={() => canHover && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The vinyl. 82% of the widget, centred, sliding out 42% on play. */}
      <motion.div
        className={styles.vinylWrap}
        animate={{ x: playing ? "42%" : "0%" }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        <div
          className={styles.vinyl}
          style={{
            animationDuration: `${SPIN_SECONDS}s`,
            animationPlayState: playing ? "running" : "paused",
          }}
        >
          <span className={styles.grooves} />
          <span
            className={styles.centreLabel}
            style={{ backgroundImage: `url(${cover})` }}
          >
            <span className={styles.spindle} />
          </span>
        </div>
      </motion.div>

      {/* The sleeve. */}
      <div
        className={`${styles.sleeve} squircle`}
        style={{ backgroundImage: `url(${cover})` }}
      />

      <AnimatePresence>
        {hovered && !playing && canHover && (
          <motion.div
            className={styles.tooltip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <span className={styles.tipSong}>{title}</span>
            <span className={styles.tipArtist}>{artist}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Now playing, pinned bottom-right. Portalled to <body> so the
          transformed world cannot scale or clip it, and kept clear of the
          canvas's own controls in the opposite corner. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {playing && (
              <motion.div
                key={id}
                className={styles.nowPlaying}
                initial={{ opacity: 0, x: 24, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 24, y: 8 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                <span
                  className={styles.npCover}
                  style={{ backgroundImage: `url(${cover})` }}
                />
                <span className={styles.npText}>
                  <span className={styles.npLabel}>
                    <Equalizer />
                    Now playing
                  </span>
                  <span className={styles.npSong}>{title}</span>
                  <span className={styles.npArtist}>{artist}</span>
                </span>
                <button
                  type="button"
                  className={styles.npStop}
                  onClick={(e) => {
                    e.stopPropagation();
                    stopAll();
                  }}
                  aria-label="Stop"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <rect x="1.5" y="1" width="3.2" height="10" rx="1" />
                    <rect x="7.3" y="1" width="3.2" height="10" rx="1" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function Equalizer() {
  return (
    <span className={styles.eq} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
