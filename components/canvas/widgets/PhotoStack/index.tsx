"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { photoCategories as cats } from "@/content/canvas";
import { useMediaQuery } from "@/lib/clientValue";
import styles from "./PhotoStack.module.css";

/* ===========================================================================
   The photo stack.

   Ported from references/canvas/Photo Carousel.tsx, keeping the whole of its
   interaction model:

   - story-style tap zones (the left 28% steps back, the rest advances)
   - swipe in both directions, 42px of travel with horizontal dominance, and a
     completed swipe suppresses the tap so one gesture never counts twice
   - rolling across categories in both directions: past the last photo goes to
     the next category's first, before the first goes to the previous
     category's last
   - keyboard: left/right step photos across that roll, up/down change
     category, Enter and Space advance
   - the loader holds for a minimum on-screen time so it cannot flicker, and
     neighbours are warmed in both directions plus the next category's first
   - the label counts "Cats 2/4", the dots double as position, and the
     category pill's highlight slides on a spring

   The ~200 lines of colour parsing are gone for the same reason as the
   terminal's: Framer could hand those props any format including a CSS
   variable a canvas context cannot resolve. Here the palette is two tokens
   that follow the board.
   =========================================================================== */

const SWIPE_PX = 42;
/** Left fraction of the card that steps back rather than forward. */
const BACK_ZONE = 0.28;
/** Minimum time the loader stays up, so a cached image cannot flash it. */
const MIN_LOADER_MS = 260;

const TAB = 36;
const GAP = 2;
const PAD = 5;

const ICONS: Record<string, React.ReactNode> = {
  person: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    </>
  ),
  paw: (
    <>
      <circle cx="6.5" cy="11" r="1.7" />
      <circle cx="10" cy="7.5" r="1.7" />
      <circle cx="14" cy="7.5" r="1.7" />
      <circle cx="17.5" cy="11" r="1.7" />
      <path d="M8.5 15.5c0-2 1.6-3.2 3.5-3.2s3.5 1.2 3.5 3.2c0 2-1.6 3-3.5 3s-3.5-1-3.5-3z" />
    </>
  ),
  sparkle: (
    <path d="M12 3.5c.7 4.4 1.6 5.3 6 6-4.4.7-5.3 1.6-6 6-.7-4.4-1.6-5.3-6-6 4.4-.7 5.3-1.6 6-6z" />
  ),
  pin: (
    <>
      <path d="M12 21c3.6-4 5.5-6.8 5.5-9.6A5.5 5.5 0 0 0 12 6a5.5 5.5 0 0 0-5.5 5.4C6.5 14.2 8.4 17 12 21z" />
      <circle cx="12" cy="11" r="1.9" />
    </>
  ),
  heart: (
    <path d="M12 19.5C6.8 16 4 12.9 4 9.8 4 7.4 5.9 5.7 8.1 5.7c1.5 0 2.9.8 3.9 2.2 1-1.4 2.4-2.2 3.9-2.2 2.2 0 4.1 1.7 4.1 4.1 0 3.1-2.8 6.2-8 9.7z" />
  ),
  star: (
    <path d="M12 4l2.3 4.9 5.2.6-3.9 3.6 1 5.2L12 16.3 7.4 18.9l1-5.2L4.5 10l5.2-.6L12 4z" />
  ),
  camera: (
    <>
      <path d="M4 8.5h3l1.4-2h7.2L17 8.5h3v10H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
};

function Icon({ name, size = 14 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.camera}
    </svg>
  );
}

export default function PhotoStack() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [catIndex, setCatIndex] = useState(0);
  /** One cursor per category, so switching back returns you where you were. */
  const [positions, setPositions] = useState<number[]>(() => cats.map(() => 0));
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  /** Which way the last move went — the photo transition slides with it. */
  const [dir, setDir] = useState(1);

  const safeCat = cats.length ? catIndex % cats.length : 0;
  const category = cats[safeCat];
  const photoCount = category?.photos.length ?? 0;
  const photoIndex = photoCount ? (positions[safeCat] ?? 0) % photoCount : 0;
  const current = category?.photos[photoIndex] ?? null;
  const currentSrc = current?.src ?? null;
  const loading = currentSrc !== null && !loaded.has(currentSrc);

  /* --- Loading -------------------------------------------------------------
     `loading` is derived, not stored: an image is loading exactly while it is
     not yet in `loaded`. Storing it meant setting state synchronously in this
     effect for the already-cached case, which React 19 rightly refuses — and
     the derived form cannot drift from the set it describes.

     The set is only added to after MIN_LOADER_MS, so a cached image cannot
     flash the loader on and straight back off. */
  useEffect(() => {
    if (!currentSrc || loaded.has(currentSrc)) return;
    const started = Date.now();
    let cancelled = false;
    let timer = 0;

    const img = new Image();
    const done = () => {
      if (cancelled) return;
      timer = window.setTimeout(
        () => {
          if (cancelled) return;
          setLoaded((s) => new Set(s).add(currentSrc));
        },
        Math.max(0, MIN_LOADER_MS - (Date.now() - started)),
      );
    };
    img.onload = done;
    img.onerror = done;
    img.src = currentSrc;
    if (img.complete) done();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentSrc, loaded]);

  /* Warm the neighbours in both directions, plus the next category's first —
     swiping goes both ways, so preloading only forward halves its use. */
  useEffect(() => {
    if (!cats.length) return;
    const warm = (src?: string) => {
      if (src && !loaded.has(src)) new Image().src = src;
    };
    if (photoIndex < photoCount - 1) warm(category?.photos[photoIndex + 1]?.src);
    else warm(cats[(safeCat + 1) % cats.length]?.photos[0]?.src);

    if (photoIndex > 0) warm(category?.photos[photoIndex - 1]?.src);
    else {
      const prev = cats[(safeCat - 1 + cats.length) % cats.length];
      warm(prev?.photos[prev.photos.length - 1]?.src);
    }
  }, [category, safeCat, photoIndex, photoCount, loaded]);

  /* --- Navigation ---------------------------------------------------------- */

  const advance = useCallback(() => {
    setDir(1);
    if (photoIndex >= photoCount - 1) {
      const next = (safeCat + 1) % cats.length;
      setCatIndex(next);
      setPositions((p) => {
        const n = [...p];
        n[next] = 0;
        return n;
      });
    } else {
      setPositions((p) => {
        const n = [...p];
        n[safeCat] = (n[safeCat] ?? 0) + 1;
        return n;
      });
    }
  }, [photoIndex, photoCount, safeCat]);

  const retreat = useCallback(() => {
    setDir(-1);
    if (photoIndex <= 0) {
      const prev = (safeCat - 1 + cats.length) % cats.length;
      setCatIndex(prev);
      setPositions((p) => {
        const n = [...p];
        n[prev] = Math.max(0, cats[prev].photos.length - 1);
        return n;
      });
    } else {
      setPositions((p) => {
        const n = [...p];
        n[safeCat] = (n[safeCat] ?? 0) - 1;
        return n;
      });
    }
  }, [photoIndex, safeCat]);

  const goToPhoto = useCallback(
    (i: number) => {
      setDir(i >= photoIndex ? 1 : -1);
      setPositions((p) => {
        const n = [...p];
        n[safeCat] = i;
        return n;
      });
    },
    [photoIndex, safeCat],
  );

  const selectCategory = useCallback(
    (i: number) => {
      setDir(i >= safeCat ? 1 : -1);
      setCatIndex(i);
    },
    [safeCat],
  );

  /* --- Gestures ------------------------------------------------------------
     Pointer-based so mouse drag works too. A completed swipe raises a flag the
     click handler consumes, so one gesture never advances twice. */
  const swipe = useRef({ x: 0, y: 0, active: false });
  const swiped = useRef(false);

  if (!cats.length) return null;

  const indicatorX = PAD + safeCat * (TAB + GAP);
  const barVisible = hovered;

  return (
    <div className={styles.root} data-canvas-interactive="">
      <motion.div
        className={`${styles.card} squircle`}
        role="button"
        tabIndex={0}
        aria-label={`${category.name}, photo ${photoIndex + 1} of ${photoCount}. Activate for the next photo; the left edge or a right swipe goes back.`}
        whileTap={reduced ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY, active: true };
        }}
        onPointerUp={(e) => {
          if (!swipe.current.active) return;
          swipe.current.active = false;
          const dx = e.clientX - swipe.current.x;
          const dy = e.clientY - swipe.current.y;
          // Horizontal dominance, so a diagonal drag meant as a pan is not a
          // swipe on the photo.
          if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.4) {
            swiped.current = true;
            if (dx < 0) advance();
            else retreat();
          }
        }}
        onPointerCancel={() => {
          swipe.current.active = false;
        }}
        onClick={(e) => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          const fx = (e.clientX - r.left) / Math.max(1, r.width);
          if (fx < BACK_ZONE) retreat();
          else advance();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            advance();
          } else if (e.key === "ArrowRight") advance();
          else if (e.key === "ArrowLeft") retreat();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            selectCategory((safeCat + 1) % cats.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectCategory((safeCat - 1 + cats.length) % cats.length);
          }
        }}
      >
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={currentSrc ?? "none"}
            className={styles.layer}
            custom={dir}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, scale: 1.08, x: dir * 26 }
            }
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.02, x: dir * -20, filter: "blur(3px)" }
            }
            transition={{ duration: reduced ? 0.001 : 0.46, ease: [0.22, 1, 0.36, 1] }}
          >
            {currentSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSrc}
                alt={current?.alt ?? ""}
                draggable={false}
                decoding="async"
                className={styles.photo}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Scrims: top carries the label, bottom carries the bar. */}
        <span className={styles.scrim} data-strong={barVisible ? "" : undefined} />

        <AnimatePresence>
          {loading && (
            <motion.span
              className={styles.loadBar}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.i
                initial={{ x: "-45%" }}
                animate={{ x: "150%" }}
                transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
              />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Label — "Cats 2/4" */}
        <div className={styles.label}>
          <Icon name={category.icon} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${safeCat}-${photoIndex}`}
              className={styles.labelText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <span className={styles.catName}>{category.name}</span>
              <span className={styles.count}>
                {photoIndex + 1}
                <span className={styles.countTotal}>/{photoCount}</span>
              </span>
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Back and next affordances. The back one is quieter — it marks a
            zone people do not expect, rather than inviting the main action. */}
        <AnimatePresence>
          {barVisible && (
            <motion.span
              className={`${styles.chev} ${styles.chevBack}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 0.65, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.25 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {barVisible && (
            <motion.span
              className={`${styles.chev} ${styles.chevNext}`}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.25 }}
            >
              <motion.svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                animate={reduced ? undefined : { x: [0, 2.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </motion.span>
          )}
        </AnimatePresence>

        {/* Bottom bar: dots for position, pill for category. */}
        <AnimatePresence>
          {barVisible && (
            <motion.div
              className={styles.bottom}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              {photoCount > 1 && (
                <div className={styles.dots}>
                  {Array.from({ length: photoCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.dot}
                      data-on={i === photoIndex ? "" : undefined}
                      onClick={() => goToPhoto(i)}
                      aria-label={`Photo ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className={styles.pill}>
                {/* Transform only — no layout projection, so nothing here can
                    trigger a reflow inside the transformed world. */}
                <motion.span
                  className={styles.indicator}
                  animate={{ x: indicatorX }}
                  transition={{ type: "spring", stiffness: 520, damping: 36 }}
                  style={{ width: TAB, height: TAB, top: PAD }}
                />
                {cats.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    className={styles.tab}
                    data-on={i === safeCat ? "" : undefined}
                    style={{ width: TAB, height: TAB }}
                    onClick={() => selectCategory(i)}
                    aria-label={c.name}
                    aria-pressed={i === safeCat}
                  >
                    <Icon name={c.icon} size={17} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
