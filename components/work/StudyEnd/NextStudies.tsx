"use client";

import { useState } from "react";
import DesignSystemExperience from "@/components/home/DesignSystemExperience";
import InspectionExperience from "@/components/home/InspectionExperience";
import SearchExperience from "@/components/home/SearchExperience";
import CarouselScroller from "@/components/work/CarouselScroller";
import { StudyCardModeProvider } from "@/components/work/StudyCardMode";
import type { CaseStudy } from "@/content/work";
import styles from "./StudyEnd.module.css";

type Props = { studies: readonly CaseStudy[] };

/**
 * Figma 798:901 — the other case studies, one at a time.
 *
 * These are the homepage's own cards, not thumbnails of them. That is the
 * whole point: the Inspection card flies its device out on hover and plays the
 * real recording in it, the Design System card runs the theming instrument
 * under your cursor, and the Search card searches. A flat screenshot of any of
 * them is a picture of a thing that does something, which is the argument the
 * Design System study spends a section making.
 *
 * They are rendered in `"link"` mode, which gives up exactly two things and
 * keeps everything else — see `StudyCardMode`. The card is still a real
 * `<a href="/work/...">`, so a click here leaves for the study rather than
 * opening a modal inside a modal.
 *
 * SIZE. Each card lays itself out in `--u`, the homepage's design pixel, and
 * that is what makes them portable: setting `--u` on the slot to a fraction of
 * its own width renders the card at the design's proportions, whatever the
 * column happens to be. The three have different natural widths — 420 for
 * Inspection, 386 for the other two — so the divisor is per card and the slot
 * comes out the same width either way.
 */
export default function NextStudies({ studies }: Props) {
  /* The slide, and which way the last move went — one piece of state, because
     a re-render that paired a new index with the previous direction would be a
     card arriving from the side it just left. */
  const [{ index, dir }, setAt] = useState({ index: 0, dir: 1 });

  const study = studies[index];
  const Card = study && CARDS[study.slug];
  if (!study || !Card) return null;

  return (
    <div className={styles.next}>
      <h2 className="srOnly">Other case studies</h2>

      <StudyCardModeProvider value="link">
        {/* Keyed on the slug so React replaces the card rather than editing it
            — which is what lets the entry animation run again on every step
            instead of only on mount. */}
        <div
          key={study.slug}
          className={styles.slot}
          data-dir={dir}
          style={{ ["--u" as string]: `calc(100cqw / ${NATURAL_WIDTH[study.slug]})` }}
        >
          <Card />
        </div>
      </StudyCardModeProvider>

      <CarouselScroller
        count={studies.length}
        index={index}
        onSelect={(next) =>
          setAt((at) =>
            next === at.index ? at : { index: next, dir: next > at.index ? 1 : -1 },
          )
        }
        item="Case study"
        arrows
        className={styles.nextScroller}
      />
    </div>
  );
}

/**
 * Slug to card.
 *
 * Named rather than carried on the study, for the reason `StudyLive` and
 * `StudyExhibit` give: `content/work` is imported by a server route and has to
 * stay serialisable data. A study that has no card here simply is not offered.
 */
const CARDS: Record<string, (() => React.ReactElement) | undefined> = {
  "inspection-photos": InspectionExperience,
  "design-system": DesignSystemExperience,
  search: SearchExperience,
};

/** What each card is wide in its own design pixels — see SIZE above. */
const NATURAL_WIDTH: Record<string, number> = {
  "inspection-photos": 420,
  "design-system": 386,
  search: 386,
};
