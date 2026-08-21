"use client";

import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import RemarkFinder from "@/components/interaction/RemarkFinder";
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
 * away and searches. Both halves read the same rows out of `content/remarks.ts`,
 * so the comparison cannot cheat, and the field is real afterwards: type in it
 * and the same matcher runs. See `RemarkFinder`.
 *
 * The card still cannot be an anchor — it holds a real input, and an input
 * inside a link is neither — so the heading carries the case-study destination
 * the way it always did.
 */
export default function SearchExperience() {
  const { Modal, open, closing, close, onLinkClick, prefetch } =
    useStudyModal(study);

  return (
    <>
      <CardShell radius={48} className={styles.card}>
        <div className={styles.heading}>
          <h2 className={styles.title}>
            <a
              href={search.href}
              className={styles.titleLink}
              onMouseEnter={prefetch}
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
            open || !study.hero
              ? undefined
              : { viewTransitionName: study.hero.morphName }
          }
        >
          <RemarkFinder cue />
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
