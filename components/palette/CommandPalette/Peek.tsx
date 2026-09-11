"use client";

import type { CSSProperties } from "react";
import type { PaletteEntry } from "@/content/palette";
import { Glyph, glyphFor } from "./Glyph";
import { verbFor } from "../run";
import styles from "./CommandPalette.module.css";

/** "FEWER CLICKS" → "Fewer clicks". Outcome labels are stored in caps for the
 *  study's own tiles; the homepage's chips are sentence case. */
function sentence(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * The card beside the list.
 *
 * A HOMEPAGE CARD, NOT A PREVIEW PANE. It used to be a column of the panel's
 * own sheet with a title floating in the middle of 330px of nothing and a
 * status bar along the bottom — a dev tool's detail view. It is a card lifted
 * off the palette's ground now, composed the way the homepage composes one:
 * the study's photo with its headline number laid over it in the frosted
 * evidence chip ("Cut reporting time by 13 minutes…"), an eyebrow in the
 * accent, the title in the display face, the facts as pills, and a real button
 * at the foot in the style of "Search Portfolio ⌘K".
 *
 * Keyed on the entry so React mounts a new card rather than mutating text in
 * place: the whole point of this column is that it *changes* as you arrow, and
 * a cross-fade reads as one thing replacing another where an in-place swap
 * reads as a glitch.
 *
 * Actions — "Copy email", "Switch theme" — have no picture, and inventing a
 * frame for one would be decoration pretending to be information. They get the
 * row's own mark at size instead.
 */
export function Peek({
  entry,
  onOpen,
}: {
  entry?: PaletteEntry;
  onOpen: (entry: PaletteEntry) => void;
}) {
  if (!entry) return <div className={`${styles.peek} squircle`} aria-hidden="true" />;

  const preview = entry.preview;
  // A study's still is a photograph and crops like one; a book cover must not.
  const fill = entry.to.kind === "study";
  /* One row of pills under a photograph. A study has four facts, and the
     second row of them ran under the button; the ones dropped — timeline,
     team — are already in the row's own hint line. */
  const facts = preview?.image ? preview.facts?.slice(0, 2) : preview?.facts;

  return (
    <div
      className={`${styles.peek} squircle`}
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
            <div className={`${styles.figure} squircle`}>
              <span className={styles.figureValue}>{preview.figure.value}</span>
              <span className={styles.figureLabel}>{sentence(preview.figure.label)}</span>
              {preview.figure.note && (
                <span className={styles.figureNote}>{preview.figure.note}</span>
              )}
            </div>
          )}

          {preview.image && !preview.figure && (
            <div className={`${styles.peekMedia} squircle`}>
              {/* Plain <img>, not next/image. These change on every arrow
                  press, and the point is that the *next* one is already there
                  — an optimiser that swaps in a placeholder first would put a
                  grey box between every keystroke. Eager because it is on
                  screen the instant it exists; nothing is fetched until a row
                  with a picture is highlighted. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.peekImage}
                data-fill={fill ? "" : undefined}
                src={preview.image.src}
                alt=""
                loading="eager"
                decoding="async"
                fetchPriority="low"
              />
              {preview.chip && (
                <p className={`${styles.peekChip} squircle`}>
                  {preview.chip.value} {preview.chip.label}
                </p>
              )}
            </div>
          )}

          {preview.stack && preview.stack.length > 0 && (
            <div className={styles.peekStack}>
              {preview.stack.map((img, i, all) => {
                // −1, 0, 1 for three: the middle one on top, the others fanned.
                const at = i - (all.length - 1) / 2;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.src}
                    className={`${styles.peekStackCard} squircle`}
                    src={img.src}
                    alt=""
                    loading="eager"
                    decoding="async"
                    style={{ "--at": at, zIndex: 10 - Math.abs(at) } as CSSProperties}
                  />
                );
              })}
            </div>
          )}

          {preview.avatar && (
            <span className={styles.peekPerson}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.peekAvatar} src={preview.avatar.src} alt="" decoding="async" />
            </span>
          )}

          <div className={styles.peekText}>
            {preview.subtitle && <p className={styles.peekEyebrow}>{preview.subtitle}</p>}
            <h3 className={styles.peekTitle}>{preview.title}</h3>
            {preview.body && <p className={styles.peekBody}>{preview.body}</p>}
          </div>

          {facts && facts.length > 0 && (
            <dl className={styles.peekFacts}>
              {facts.map(([label, value]) => (
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
          <span className={`${styles.peekBareIcon} squircle`}>
            <Glyph name={glyphFor(entry)} />
          </span>
          <p className={styles.peekBareLabel}>{entry.label}</p>
          {entry.hint && <p className={styles.peekBareHint}>{entry.hint}</p>}
        </div>
      )}

      <div className={styles.peekFoot}>
        {/* What Enter does, as the thing you can also press — the homepage's
            "Search Portfolio ⌘K" pill, with ↵ in the key's place. Out of the
            tab order: the keyboard's way to it is Enter on the row, which is
            the same action, and the card around it is hidden from assistive
            tech for the reason above. */}
        <button
          type="button"
          tabIndex={-1}
          className={styles.peekCta}
          onClick={() => onOpen(entry)}
        >
          <span className={styles.peekCtaIcon}>
            <Glyph name={glyphFor(entry)} />
          </span>
          <span className={styles.peekCtaVerb}>{verbFor(entry.to)}</span>
          <kbd className={styles.peekCtaKey}>↵</kbd>
        </button>
      </div>
    </div>
  );
}
