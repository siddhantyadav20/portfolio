"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { Widget } from "@/content/canvas";
import styles from "./Spread.module.css";

type BookWidget = Extract<Widget, { kind: "book" }>;

/**
 * The open spread: the cover hinging open on the left, the reading column on
 * the right. Ported from the reference's `Spread`.
 *
 * The cover swings in from -55deg on a 170/21 spring, which is the detail that
 * makes it read as a board opening rather than a panel appearing.
 */
export default function Spread({
  book,
  reduced,
  onClose,
}: {
  book: BookWidget;
  reduced: boolean;
  onClose: () => void;
}) {
  const meta = [String(book.year), `${book.pages} pp`, book.genres.join(", ")];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${book.title} by ${book.author}`}
      className={styles.spread}
      style={{ ["--binding" as string]: book.binding }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>

      <motion.div
        className={`${styles.cover} squircle`}
        initial={reduced ? { opacity: 0 } : { rotateY: -55, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 170,
          damping: 21,
          delay: reduced ? 0 : 0.05,
        }}
      >
        {/* Through the optimiser, same as the closed board's. */}
        <Image
          src={book.cover}
          alt={book.title}
          fill
          sizes="600px"
          className={styles.coverArt}
        />
        {/* The fold. Without it the cover reads as a floating card. */}
        <span className={styles.gutter} aria-hidden="true" />
      </motion.div>

      <div className={styles.column}>
        <p className={styles.eyebrow}>
          <ReadingDots />
          {book.status}
        </p>

        <h2 className={styles.title}>{book.title}</h2>
        <p className={styles.author}>{book.author}</p>

        <div className={styles.metaRow}>
          <Stars value={book.rating} reduced={reduced} />
          <span className={styles.ratingValue}>{book.rating.toFixed(1)}</span>
          {meta.map((m) => (
            <span key={m} className={styles.chip}>
              {m}
            </span>
          ))}
        </div>

        <span className={styles.rule} />

        <p className={styles.excerpt}>
          <span className={styles.dropCap}>{book.excerpt.trim().charAt(0)}</span>
          {book.excerpt.trim().slice(1)}
        </p>

        <div className={styles.learntBlock}>
          <p className={styles.learntLabel}>What I learnt from it</p>
          {book.learnt ? (
            <p className={styles.learnt}>{book.learnt}</p>
          ) : (
            <p className={styles.learntOwed}>
              Still to be written — the one line here that is mine rather than
              the book&rsquo;s.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Three bars, pulsing — the reference's "currently reading" tell. */
function ReadingDots() {
  return (
    <span className={styles.dots} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

const STAR =
  "M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z";

/**
 * Five stars with the fill clipped to the rating.
 *
 * Drawn as two stacked rows — a dim one and a coloured one clipped to a
 * width — rather than with an SVG gradient. The reference learned this the
 * hard way: a gradient needs an `id`, hex colours put a `#` inside it, and
 * `url(#s0-#E07A3A)` is an invalid fragment reference that silently falls back
 * to black. No ids here, so nothing to collide or break.
 */
function Stars({ value, reduced }: { value: number; reduced: boolean }) {
  const pct = Math.max(0, Math.min(1, value / 5)) * 100;
  return (
    <span className={styles.stars} aria-label={`${value} out of 5`}>
      <Row className={styles.starsDim} />
      <motion.span
        className={styles.starsFill}
        initial={reduced ? { width: `${pct}%` } : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      >
        <Row className={styles.starsLit} />
      </motion.span>
    </span>
  );
}

function Row({ className }: { className: string }) {
  return (
    <span className={className}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}
