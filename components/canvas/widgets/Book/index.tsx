"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMediaQuery, useMounted } from "@/lib/clientValue";
import type { Widget } from "@/content/canvas";
import Spread from "./Spread";
import styles from "./Book.module.css";

/* ===========================================================================
   A book.

   Ported from references/canvas/Book.tsx: a real 3D box — front board, back
   board, spine, and three page edges — built with `preserve-3d` and a 900px
   perspective, thickness 20% of the shorter side. Mouse-follow parallax, a
   bookmark ribbon that slips out of the pages, one-book-at-a-time, Escape to
   close, and the reading spread with its hinging cover and drop cap.

   One deliberate change from the reference, at your request. Hovering used to
   nudge the box 10 degrees and show a dark tooltip. Now the front board hinges
   open on its spine and the **first page** is underneath: title, author,
   rating, pages, year, genre and what I took from it, set in the reading
   serif on cream stock. Clicking still opens the full spread.

   That makes hover an act of opening the book rather than a label about it —
   and it means the page is the thing you read, not a tooltip.
   =========================================================================== */

type BookWidget = Extract<Widget, { kind: "book" }>;

const DRAG_THRESHOLD = 8;

/** Broadcast so only one book is ever open. */
const OPEN_EVENT = "sy-book-open";

export default function Book({ book }: { book: BookWidget }) {
  const id = useId();
  const mounted = useMounted();
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const rootRef = useRef<HTMLDivElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  const W = book.w;
  const H = book.h;
  /** Thickness. The reference's 20% of the shorter side. */
  const D = Math.round(Math.min(W, H) * 0.2);

  useEffect(() => {
    function onOther(e: Event) {
      if ((e as CustomEvent).detail !== id) setOpen(false);
    }
    window.addEventListener(OPEN_EVENT, onOther);
    return () => window.removeEventListener(OPEN_EVENT, onOther);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Claim Escape before the canvas does, or reading a book and pressing
      // Escape closes the whole board.
      e.stopPropagation();
      setOpen(false);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    setOpen(true);
  }

  /** The cover's hinge angle. Hovering cracks it open; the page is beneath. */
  const coverAngle = hovered && !open && !reduced && canHover ? -104 : 0;
  const scene = `translateZ(-${D}px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-canvas-interactive=""
      style={{ width: W, height: H }}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Open ${book.title} by ${book.author}`}
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const d = down.current;
        down.current = null;
        // A pan that started on a book is not a click on it.
        if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_THRESHOLD) {
          return;
        }
        toggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      onMouseEnter={() => canHover && setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setTilt({ x: 0, y: 0 });
      }}
      onMouseMove={(e) => {
        if (!canHover || reduced || !rootRef.current) return;
        const r = rootRef.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setTilt({ x: -py * 10, y: px * 12 });
      }}
    >
      <div
        className={styles.box}
        data-hovered={hovered ? "" : undefined}
        style={{
          transform: scene,
          opacity: open ? 0 : 1,
          ["--d" as string]: `${D}px`,
          ["--w" as string]: `${W}px`,
          ["--h" as string]: `${H}px`,
          ["--binding" as string]: book.binding,
          ["--board" as string]: book.board,
        }}
      >
        {/* The first page — sits at the front board's depth, revealed as the
            board hinges away from it. */}
        <div className={`${styles.page} squircle`}>
          <FirstPage book={book} />
        </div>

        {/* Front board, hinged on the spine. */}
        <div
          className={`${styles.front} squircle`}
          style={{ transform: `translateZ(${D}px) rotateY(${coverAngle}deg)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={book.cover} alt={book.title} className={styles.coverArt} />
          <span className={styles.sheen} aria-hidden="true" />
          {/* The inside of the board, seen once it swings past 90deg. */}
          <span className={styles.boardBack} aria-hidden="true" />
        </div>

        {/* Bookmark ribbon, slipping further out of the pages on hover. */}
        <span className={styles.ribbon} aria-hidden="true" />

        <span className={styles.back} aria-hidden="true" />

        <span className={styles.spine} aria-hidden="true">
          {D >= 22 && H >= 150 && (
            <span className={styles.spineTitle}>{book.title}</span>
          )}
        </span>

        <span className={styles.edgeFore} aria-hidden="true" />
        <span className={styles.edgeTop} aria-hidden="true" />
        <span className={styles.edgeBottom} aria-hidden="true" />
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key={id}
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
                onClick={() => setOpen(false)}
              >
                <Spread
                  book={book}
                  reduced={reduced}
                  onClose={() => setOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/**
 * The recto page under the front board.
 *
 * Everything a reader would want before committing to the book, set as a
 * title page rather than as a data sheet: the title in the reading serif, the
 * rest as a ruled colophon underneath.
 */
function FirstPage({ book }: { book: BookWidget }) {
  return (
    <div className={styles.pageInner}>
      <p className={styles.pageEyebrow}>{book.status}</p>
      <h3 className={styles.pageTitle}>{book.title}</h3>
      <p className={styles.pageAuthor}>{book.author}</p>

      <span className={styles.pageRule} />

      <dl className={styles.colophon}>
        <div>
          <dt>Rating</dt>
          <dd>{book.rating.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Pages</dt>
          <dd>{book.pages}</dd>
        </div>
        <div>
          <dt>Released</dt>
          <dd>{book.year}</dd>
        </div>
        <div>
          <dt>Genre</dt>
          <dd>{book.genres[0]}</dd>
        </div>
      </dl>

      <span className={styles.pageRule} />

      <p className={styles.learntLabel}>What I learnt</p>
      {book.learnt ? (
        <p className={styles.learnt}>{book.learnt}</p>
      ) : (
        <p className={styles.learntOwed}>— a line still to be written</p>
      )}
    </div>
  );
}
