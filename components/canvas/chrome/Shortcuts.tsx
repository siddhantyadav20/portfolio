"use client";

import { AnimatePresence, motion } from "motion/react";
import styles from "./Shortcuts.module.css";

/* ===========================================================================
   The shortcuts sheet.

   The keymap is the reference's own, from CommandPalette.tsx — it was tuned
   there and there is no reason to invent a second one. `/` opens it as well as
   `?`, because that is what Siddhant asked for and `/` needs no shift.
   =========================================================================== */

export const KEYS: readonly (readonly [string, string])[] = [
  ["Drag / two fingers", "Pan the board"],
  ["⌘ / Ctrl + scroll", "Zoom"],
  ["Pinch", "Zoom, on a trackpad or touch"],
  ["+ / −", "Zoom in and out"],
  ["R", "Back to the middle"],
  ["Tab", "Walk the board, one thing at a time"],
  ["Space", "Lift off"],
  ["C", "Confetti"],
  ["/ or ?", "This list"],
  ["Esc", "Close the canvas"],
];

export default function Shortcuts({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
        >
          <motion.div
            className={`${styles.sheet} squircle`}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.title}>Shortcuts</h2>
            <dl className={styles.list}>
              {KEYS.map(([key, what]) => (
                <div key={key} className={styles.row}>
                  <dt className={styles.what}>{what}</dt>
                  <dd>
                    <kbd className={styles.key}>{key}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
