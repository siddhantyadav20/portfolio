"use client";

import { useRef } from "react";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import RemarkFinder from "@/components/interaction/RemarkFinder";
import { useIsLiveCard } from "@/components/work/StudyCardMode";
import { useStudyModal } from "@/components/work/useStudyModal";
import { search } from "@/content/site";
import { search as study } from "@/content/work/search";
import styles from "./SearchExperience.module.css";

/**
 * The Search card.
 *
 * It used to be the Figma "Default" state and nothing else: a field that could
 * not search, a send button that was disabled, and a `Select category` control
 * that was also disabled — which meant the only live thing on a card arguing
 * for search-first was the old paradigm, greyed out. Under it, a chip struck
 * "Navigation first" through and claimed fifty-one minutes, with nothing on
 * the card to back either.
 *
 * What sits there now runs the change. It plays the old drill-down once when
 * scrolled into view — eight categories, four subcategories, four remarks
 * alphabetically, three taps counted off on the pips — then folds those panels
 * away, searches, and takes the top result into the report. Both halves read
 * the same rows out of `content/remarks.ts`, so the comparison cannot cheat,
 * and everything it just did is real afterwards: type in the field and the same
 * matcher runs, pick a row and it joins the report with what that row would
 * have cost down the tree, press the tap counter and the old flow plays again.
 * See `RemarkFinder`.
 *
 * It plays on hover rather than on arrival. Six cards demonstrating
 * themselves the moment the homepage settles is six things moving at once and
 * no way to tell which one you asked for; the card is handed to `RemarkFinder`
 * as the thing to watch, so pointing anywhere on it — not just at the results
 * list — sets it off. Inside a case study the same instrument still plays on
 * scroll, where a reader has arrived to read it. See `RemarkFinder`'s `cue`.
 *
 * That ending is why the chip below can stay as it is. `~51m saved` is a field
 * number from the real product and nothing on this card could prove it — but
 * the line above it now reports the same arithmetic at the scale of one visit,
 * counted off the rows on screen, so the chip reads as the same claim at scale
 * rather than as an assertion the card left unsupported.
 *
 * The card still cannot be an anchor — it holds a real input, and an input
 * inside a link is neither — so the heading carries the case-study destination
 * the way it always did.
 */
export default function SearchExperience() {
  /* A copy of this card in another study's footer keeps every interaction
     and gives up the two things only the original can own — the morph name
     and the modal. See `StudyCardMode`. */
  const live = useIsLiveCard();

  const { Modal, open, closing, close, onLinkClick, prefetch } =
    useStudyModal(study, live);

  /* Handed to the instrument as its hover target — see the note above. */
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <CardShell
        ref={cardRef}
        radius={48}
        className={styles.card}
        data-card="search"
      >
        <div className={styles.heading}>
          <h2 className={styles.title}>
            <a
              href={search.href}
              className={styles.titleLink}
              onMouseEnter={live ? prefetch : undefined}
              onClick={onLinkClick}
            >
              {search.title}
            </a>
          </h2>
          <p className={styles.subtitle}>{search.subtitle}</p>
        </div>

        {/* The frame carries the morph name and not what it contains: a named
            element is lifted out of its ancestors for the transition and so is
            not clipped by them, and the results list inside is taller than the
            frame. A frame's snapshot carries its own clip, so there is nothing
            left to escape — the same reasoning the Design System card sets out.

            Released while the modal owns the name: two live elements sharing
            one aborts the transition for both. */}
        <div
          className={styles.stage}
          style={
            open || !live || !study.hero
              ? undefined
              : { viewTransitionName: study.hero.morphName }
          }
        >
          <RemarkFinder cue="hover" track={cardRef} />
        </div>

        <GlassChip className={styles.chip}>
          <div className={styles.compare}>
            <span className={styles.before}>{search.before}</span>
            <span className={styles.after}>{search.after}</span>
          </div>
          <span className={styles.delta}>{search.delta}</span>
        </GlassChip>
      </CardShell>

      {/* Absent until something asks for it — see `useLazyStudyModal`. */}
      {Modal && (
        <Modal open={open} closing={closing} onClose={close} study={study} />
      )}
    </>
  );
}
