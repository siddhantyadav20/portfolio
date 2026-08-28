"use client";

import styles from "./CarouselScroller.module.css";

type Props = {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** What one step is, for the buttons' accessible names — "Exploration",
   *  "Case study". Rendered as `${item} ${n} of ${count}`. */
  item: string;
  /**
   * Draws a step arrow either side of the counter — Figma 818:1136 and
   * 818:1139.
   *
   * Optional because the two carousels that use this differ in exactly one
   * way: the explorations card is wide enough to hang 40px arrows outside its
   * own edges, and the case-study column is not, so its arrows live in the
   * scroller with the counter between them.
   */
  arrows?: boolean;
  className?: string;
};

/**
 * Figma 757:12720 and 798:884 — the same control in both carousels.
 *
 * Not a row of dots. The slide you are on expands into a counter ("1/3") and
 * the rest stay 6px dots, which is one control doing two jobs: a position in a
 * sequence you can read without counting them, and a set of targets you can
 * click.
 *
 * Shared rather than copied because the file draws it twice and the two would
 * drift the first time either carousel was touched — which is the whole
 * argument, since the second one arrived a fortnight after the first.
 */
export default function CarouselScroller({
  count,
  index,
  onSelect,
  item,
  arrows = false,
  className,
}: Props) {
  if (count < 2) return null;

  return (
    <div
      className={`${styles.scroller} ${className ?? ""}`}
      data-arrows={arrows ? "" : undefined}
    >
      {arrows && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.prev}`}
          onClick={() => onSelect(index - 1)}
          disabled={index === 0}
          aria-label={`Previous ${item.toLowerCase()}`}
        >
          <Chevron />
        </button>
      )}

      <span className={styles.steps}>
      {Array.from({ length: count }, (_, i) =>
        i === index ? (
          /* The current slide, as a counter rather than a filled dot — it is
             the only one that can say where you are without being counted
             against its neighbours. Not a button: it is the thing you are
             already on. */
          <span key={i} className={styles.counter}>
            {index + 1}/{count}
          </span>
        ) : (
          <button
            key={i}
            type="button"
            className={styles.dot}
            onClick={() => onSelect(i)}
            aria-label={`${item} ${i + 1} of ${count}`}
          >
            {/* The 6px circle is this span, not the button — the button is
                20px tall so it is a real target, and a 6px one is not. */}
            <span aria-hidden="true" />
          </button>
        ),
      )}
      </span>

      {arrows && (
        <button
          type="button"
          className={`${styles.arrow} ${styles.next}`}
          onClick={() => onSelect(index + 1)}
          disabled={index === count - 1}
          aria-label={`Next ${item.toLowerCase()}`}
        >
          <Chevron />
        </button>
      )}
    </div>
  );
}

/** Masked rather than inlined, so it takes the button's own colour and
 *  survives a theme switch — the same glyph the explorations carousel uses. */
function Chevron() {
  return (
    <span
      className={`inkIcon ${styles.chevron}`}
      style={{ ["--icon" as string]: "url(/icons/chevron-right.svg)" }}
      aria-hidden="true"
    />
  );
}
