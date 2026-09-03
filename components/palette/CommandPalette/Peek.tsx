"use client";

import type { PaletteEntry } from "@/content/palette";
import { Glyph, glyphFor } from "./Glyph";
import { verbFor } from "../run";
import styles from "./CommandPalette.module.css";

/**
 * The panel beside the list.
 *
 * Keyed on the entry so React tears the old one down and mounts a new one
 * rather than mutating text in place: the whole point of this column is that
 * it *changes* as you arrow, and a cross-fade reads as one thing replacing
 * another where an in-place text swap reads as a glitch. It was keyed on the
 * preview's title, which collapsed two different rows onto one node whenever
 * two previews happened to be titled the same — the column then sat still on
 * an arrow press, which looks exactly like a dropped keystroke.
 *
 * The column is a two-row grid — content, then a bar pinned to the bottom edge
 * — and the bar is the fix for the thing that made this whole panel read as a
 * draft. Sixty percent of the surface was white space held open by a
 * three-line paragraph, with the eye falling off the bottom of it into
 * nothing. A floor that says what Enter will do closes the shape *and* is the
 * one piece of information the column was missing.
 *
 * Actions — "Copy email", "Switch theme" — have no picture, and inventing a
 * frame for one would be decoration pretending to be information. They get the
 * row's own glyph at size instead: not a placeholder, the same mark the row
 * wears, drawn large enough to be the subject.
 */
export function Peek({ entry }: { entry?: PaletteEntry }) {
  if (!entry) return <div className={styles.peek} aria-hidden="true" />;

  const preview = entry.preview;

  return (
    <div
      className={styles.peek}
      // Not announced: everything in here is already in the row's own label
      // and hint, and a screen reader walking the list should hear each option
      // once, not twice.
      aria-hidden="true"
      key={entry.id}
      {...(preview?.tint ? { "data-tint": preview.tint } : {})}
    >
      {preview ? (
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
      ) : (
        <div className={styles.peekBare}>
          <span className={styles.peekBareIcon}>
            <Glyph name={glyphFor(entry)} />
          </span>
          <p className={styles.peekBareLabel}>{entry.label}</p>
          {entry.hint && <p className={styles.peekBareHint}>{entry.hint}</p>}
        </div>
      )}

      <div className={styles.peekBar}>
        <span className={styles.peekBarIcon}>
          <Glyph name={glyphFor(entry)} />
        </span>
        <span className={styles.peekBarVerb}>{verbFor(entry.to)}</span>
        <kbd className={styles.peekBarKey}>↵</kbd>
      </div>
    </div>
  );
}
