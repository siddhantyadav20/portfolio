"use client";

import { useCallback, useRef } from "react";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import RemarkFinder from "@/components/interaction/RemarkFinder";
import { useIsLiveCard } from "@/components/work/StudyCardMode";
import { useStudyModal } from "@/components/work/useStudyModal";
import { search } from "@/content/site";
import { search as study } from "@/content/work/search";
import styles from "./SearchExperience.module.css";

/** Anything inside the card that answers a press itself. Kept in step with
 *  `CONTROL` in `CanvasCursor`, which decides where the badge stops. */
const CARD_CONTROL =
  'a[href], button, select, textarea, input, label, [role="button"], [contenteditable="true"]';

/**
 * The Search card — Figma 869:6921.
 *
 * It used to be the Figma "Default" state and nothing else: a field that could
 * not search, a send button that was disabled, and a `Select category` control
 * that was also disabled — which meant the only live thing on a card arguing
 * for search-first was the old paradigm, greyed out.
 *
 * Then it ran a recreation of the old drill-down, because the results state it
 * was arguing *for* had never been designed and showing what search replaced
 * was the only way to make the case. 869:6921 designs the results, and the
 * argument moved into them: the card now plays the four states the file draws —
 * the field, the inspector's own library ranked under it, the search, and the
 * findings — and every row of that comes out of `content/remarks.ts` through
 * the matcher the field runs on a keystroke. See `RemarkFinder`.
 *
 * It plays on hover rather than on arrival. Six cards demonstrating themselves
 * the moment the homepage settles is six things moving at once and no way to
 * tell which one you asked for; the card is handed to `RemarkFinder` as the
 * thing to watch, so pointing anywhere on it — not just at the results list —
 * sets it off. Inside a case study the same instrument plays on scroll, where a
 * reader has arrived to read it. See `RemarkFinder`'s `cue`.
 *
 * The chip below carries the before. `~51m saved` is a field number from the
 * real product and nothing on this card could prove it, so it says what it is
 * and then gets out of the way: the file slides it off the right edge the
 * moment a search starts, which is the card handing the floor from its claim to
 * its evidence. See `.chip` in the stylesheet.
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

  /**
   * The card's dead space opens the study.
   *
   * Which it has to, now that the card wears the "View Project" badge: a cursor
   * that names a destination and a press that does nothing is worse than no
   * cursor at all. The other two study cards get this for free by being anchors
   * — this one cannot be, because it holds a real `<input>` and an input inside
   * a link is neither.
   *
   * So it is a click handler with two things it declines to act on. A press
   * that landed on a control belongs to that control; `CanvasCursor` uses the
   * same rule to decide where to stop drawing the badge, so what you saw under
   * the pointer and what happens when you press it cannot disagree. And a click
   * that ends a text selection is somebody reading, not somebody navigating.
   */
  const onCardClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(CARD_CONTROL)) return;
      if (window.getSelection()?.isCollapsed === false) return;
      onLinkClick(e);
    },
    [onLinkClick],
  );

  return (
    <>
      <CardShell
        ref={cardRef}
        radius={48}
        className={styles.card}
        data-card="search"
        /* The glass "View Project" disc, the same one the other two study cards
           wear. `CanvasCursor` drops back to the plain arrow over anything
           inside here that is its own click target — the field, the library
           picker, a suggestion, an Add button — so the badge only ever appears
           where the promise below is the one that gets kept. */
        data-cursor="view-project"
        onPointerDown={live ? prefetch : undefined}
        onMouseEnter={live ? prefetch : undefined}
        onClick={onCardClick}
      >
        <div className={styles.heading}>
          <h2 className={styles.title}>
            <a
              href={search.href}
              className={styles.titleLink}
              /* The one control on this card that keeps the badge.

                 `CanvasCursor` hands the plain arrow to anything inside a
                 `data-cursor` element that is its own click target — which is
                 right for Send and for an Add button, and exactly wrong here:
                 this link *is* the View Project the badge is naming. Declaring
                 the variant again is how a control opts back in, because the
                 cursor resolves the nearest `[data-cursor]` ancestor and this
                 anchor becomes its own. Nothing in CanvasCursor knows about
                 this card.

                 Worth knowing it covers more than the words: `.titleLink::after`
                 stretches the hit area over the whole heading block, so the
                 subtitle under it is this anchor too. */
              data-cursor="view-project"
              /* `pointerdown` as well as hover, and this is the phone fix.

                 Warming was hover-only, so a touch device never warmed anything: the
                 modal's chunk and its hero were both fetched inside the click, and
                 the click then hands React a whole case study to render
                 synchronously inside a view transition. That stall is the lag.

                 `pointerdown` fires at finger-down, which buys the length of the tap
                 before `click` lands — usually enough for the chunk, and it costs a
                 mouse visitor nothing since hover has already warmed by then. */
              onPointerDown={live ? prefetch : undefined}
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
