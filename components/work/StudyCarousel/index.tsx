"use client";

import Image from "next/image";
import { useCallback, useId, useState } from "react";
import CarouselScroller from "@/components/work/CarouselScroller";
import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudySlide } from "@/content/work";
import styles from "./StudyCarousel.module.css";

type Props = {
  slides: readonly StudySlide[];
  caption: StudyCaption;
};

/**
 * Figma 757:12676 — the explorations carousel.
 *
 * One card at a time: an exploration is a screen, what it tried, why it was
 * rejected and what survived into the next one, and three of those stacked
 * down the page is 1700px of near-identical layout that nobody reads to the
 * bottom of. The carousel makes the reader compare them, which is the point of
 * showing three.
 *
 * The scroller under it is the design's own indicator and it is not a row of
 * dots — the slide you are on expands into a counter ("1/3") and the rest stay
 * 6px dots. That is one control doing two jobs: a position in a sequence you
 * can read without counting, and a set of targets you can click. Figma 757:12720.
 *
 * Only the cards that are written are interactive prose; a slide with nothing
 * under its eyebrow says so, rather than being dropped — the lead beside this
 * carousel says there were three explorations, and a carousel of one would
 * contradict it.
 */
export default function StudyCarousel({ slides, caption }: Props) {
  /* The slide, and which way the last move went. One piece of state rather
     than two: they always change together, and holding them apart let a
     re-render pair a new index with the previous direction — which is a card
     arriving from the side it just left. */
  const [{ index, dir }, setAt] = useState({ index: 0, dir: 1 });
  const id = useId();

  const count = slides.length;
  const go = useCallback(
    (next: number) =>
      setAt((at) => {
        const clamped = Math.min(Math.max(next, 0), count - 1);
        return clamped === at.index
          ? at
          : { index: clamped, dir: clamped > at.index ? 1 : -1 };
      }),
    [count],
  );

  const slide = slides[index];
  if (!slide) return null;

  return (
    <figure className={styles.block} role="group" aria-roledescription="carousel">
      <div className={styles.stage}>
        {/* Keyed on the index so React replaces the card rather than editing
            it in place — which is what lets the entry animation run again on
            every move instead of only on mount. `data-dir` is what tells it
            which edge to come in from. */}
        <div
          key={index}
          className={styles.card}
          data-dir={dir}
          id={`${id}-slide`}
          aria-live="polite"
        >
          {slide.image ? (
            <Image
              src={slide.image.src}
              alt={slide.image.alt}
              width={slide.image.width}
              height={slide.image.height}
              className={styles.screen}
              loading="lazy"
              sizes="236px"
            />
          ) : (
            <div className={styles.slot} data-placeholder="">
              <span className="srOnly">
                The screen for this exploration, not yet exported
              </span>
            </div>
          )}

          <div className={styles.column}>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>{slide.eyebrow}</p>

              {slide.body.map((paragraph) => (
                <p key={paragraph} className={styles.body}>
                  {paragraph}
                </p>
              ))}

              {slide.points && slide.points.length > 0 && (
                <ol className={styles.list}>
                  {slide.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ol>
              )}
            </div>

            {slide.rejected.length + slide.worked.length === 0 ? (
              <p className={styles.pending} data-placeholder="">
                This exploration is still being written up.
              </p>
            ) : (
              <>
                <div className={styles.rule} />

                <div className={styles.verdict}>
                  <Verdict
                    title="Why it was rejected"
                    tone="rejected"
                    points={slide.rejected}
                  />
                  <Verdict
                    title="What worked well"
                    tone="worked"
                    points={slide.worked}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.prev}`}
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-controls={`${id}-slide`}
              aria-label="Previous exploration"
            >
              <Chevron />
            </button>

            <button
              type="button"
              className={`${styles.arrow} ${styles.next}`}
              onClick={() => go(index + 1)}
              disabled={index === count - 1}
              aria-controls={`${id}-slide`}
              aria-label="Next exploration"
            >
              <Chevron />
            </button>
          </>
        )}
      </div>

      <div className={styles.footer}>
        <CarouselScroller
          count={count}
          index={index}
          onSelect={go}
          item="Exploration"
          className={styles.scroller}
        />

        <FigureLabel caption={caption} className={styles.label} />
      </div>
    </figure>
  );
}

/** One of the two columns under the rule. Both are always drawn: an
 *  exploration with no trade-off is one that was never tested. */
function Verdict({
  title,
  tone,
  points,
}: {
  title: string;
  tone: "rejected" | "worked";
  points: readonly string[];
}) {
  return (
    <div className={styles.verdictColumn}>
      <p className={styles.verdictTitle} data-tone={tone}>
        {title}
      </p>
      <ol className={styles.list}>
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ol>
    </div>
  );
}

/** Figma 757:12722. Masked rather than inlined so it takes the button's own
 *  colour and survives a theme switch. */
function Chevron() {
  return (
    <span
      className={`inkIcon ${styles.chevron}`}
      style={{ ["--icon" as string]: "url(/icons/chevron-right.svg)" }}
      aria-hidden="true"
    />
  );
}
