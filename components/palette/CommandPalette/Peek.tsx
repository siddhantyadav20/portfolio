"use client";

import type { PalettePreview } from "@/content/palette";
import styles from "./CommandPalette.module.css";

/**
 * The panel beside the list.
 *
 * Keyed on the title so React tears the old one down and mounts a new one
 * rather than mutating text in place: the whole point of this column is that
 * it *changes* as you arrow, and a cross-fade reads as one thing replacing
 * another where an in-place text swap reads as a glitch.
 *
 * A row with nothing worth showing gets an empty column and not a placeholder
 * card. Actions — "Copy email", "Switch theme" — are the honest case: there is
 * no picture of copying an email, and inventing a frame for one would be
 * decoration pretending to be information.
 */
export function Peek({ preview }: { preview?: PalettePreview }) {
  if (!preview) return <div className={styles.peek} aria-hidden="true" />;

  return (
    <div
      className={styles.peek}
      // Not announced: everything in here is already in the row's own label
      // and hint, and a screen reader walking the list should hear each option
      // once, not twice.
      aria-hidden="true"
      key={preview.title}
      {...(preview.tint ? { "data-tint": preview.tint } : {})}
    >
      <div className={styles.peekInner}>
        {preview.figure && (
          <div className={styles.figure}>
            <span className={styles.figureValue}>{preview.figure.value}</span>
            <span className={styles.figureLabel}>{preview.figure.label}</span>
            {preview.figure.note && (
              <span className={styles.figureNote}>{preview.figure.note}</span>
            )}
          </div>
        )}

        {preview.image && !preview.figure && (
          /* Plain <img>, not next/image. These are decorative, they change on
             every arrow press, and the point is that the *next* one is already
             there — an optimiser that swaps in a placeholder first would put a
             grey box between every keystroke. They are all in `public/` and
             already sized for the page. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.peekImage}
            src={preview.image.src}
            alt=""
            /* Eager, not lazy. The browser only lazy-loads what is off-screen,
               and this element is on-screen the instant it exists — so `lazy`
               bought nothing and cost a beat of empty frame on every arrow
               press, which is the one thing a preview column must not do.
               Nothing is fetched until a row with a picture is highlighted,
               which is the saving that actually mattered. */
            loading="eager"
            decoding="async"
            fetchPriority="low"
          />
        )}

        <div className={styles.peekText}>
          {preview.subtitle && (
            <p className={styles.peekEyebrow}>{preview.subtitle}</p>
          )}
          <h3 className={styles.peekTitle}>{preview.title}</h3>
          {preview.body && <p className={styles.peekBody}>{preview.body}</p>}
        </div>

        {preview.facts && preview.facts.length > 0 && (
          <dl className={styles.peekFacts}>
            {preview.facts.map(([label, value]) => (
              <div key={label} className={styles.peekFact}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
