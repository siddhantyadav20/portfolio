"use client";

import { useRef } from "react";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import ThemingInstrument, {
  PRESETS,
  REST_MODE,
  REST_NAME,
} from "@/components/interaction/ThemingInstrument";
import { useIsLiveCard } from "@/components/work/StudyCardMode";
import { useStudyModal } from "@/components/work/useStudyModal";
import { designSystem as designSystemCopy } from "@/content/site";
import { designSystem as study } from "@/content/work/design-system";
import styles from "./DesignSystemExperience.module.css";

/**
 * The Design System card.
 *
 * It used to be a photograph of a Figma window — the one card in the
 * composition that only claimed something instead of doing it, on the page's
 * strongest piece of work. What sits in the frame now is the system actually
 * running: sweep the cursor across the card and the primary walks the six
 * semantic presets; move down it and a diagonal seam slides between the light
 * and dark colour modes. One variable, forty-five elements, no component
 * touched. See `ThemingInstrument`.
 *
 * The card is the control surface, not just the frame — `track` hands the
 * instrument this element, so the gesture is the whole 386x578 rather than the
 * 346px window you watch it in.
 *
 * And no `cue`. The instrument can play an unattended tour of the six presets
 * on its own, and the specimen inside the study does; here it would be wrong
 * twice over. The homepage should not have six cards demonstrating themselves
 * the moment it settles, which is the thing being fixed — and on this card the
 * hover *is* the animation, so a tour would be cancelled by the first pointer
 * move that reached it anyway. Untouched, it sits at rest: a real still of the
 * system, the way the Inspection card sits on a frame of its recording.
 *
 * The anchor underneath all of it is still real: `/work/design-system` exists,
 * and a plain left click is upgraded to the morph rather than replacing the
 * navigation.
 */
export default function DesignSystemExperience() {
  /* A copy of this card in another study's footer keeps every interaction
     and gives up the two things only the original can own — the morph name
     and the modal. See `StudyCardMode`. */
  const live = useIsLiveCard();

  const { Modal, open, closing, close, onLinkClick, prefetch } =
    useStudyModal(study, live);

  const cardRef = useRef<HTMLAnchorElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);

  return (
    <>
      <CardShell
        as="a"
        ref={cardRef}
        href={designSystemCopy.href}
        radius={48}
        data-card="design-system"
        className={styles.card}
        aria-label={`${designSystemCopy.eyebrow} ${designSystemCopy.title} ${designSystemCopy.subtitle} — open case study`}
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
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{designSystemCopy.eyebrow}</p>
          <h2 className={styles.title}>{designSystemCopy.title}</h2>
          <p className={styles.eyebrow}>{designSystemCopy.subtitle}</p>
        </div>

        {/* The morph name is on this frame and *not* on what it contains, which
            is what stops the artwork flying out of the card and snapping back
            every time the modal closed. A named element is lifted out of its
            ancestors for the transition and so is not clipped by them; the
            preview inside is wider than the frame and had nothing holding it
            for the length of the animation. A frame's snapshot carries its own
            clip, so there is nothing left to escape — the same reasoning
            DeviceMockup's header sets out for the Inspection card, arrived at
            from the other direction.

            Released while the modal owns the name: two live elements sharing
            one aborts the transition for both. */}
        <span
          className={styles.shotFrame}
          style={
            open || !live || !study.hero
              ? undefined
              : { viewTransitionName: study.hero.morphName }
          }
        >
          <ThemingInstrument
            track={cardRef}
            readouts={{ label: labelRef, dots: dotsRef, mode: modeRef }}
          />
        </span>

        {/* Indicators, not controls. The card is a real anchor and cannot hold
            interactive children — and a row of buttons would invite clicking
            one instead of opening the study, which is what the card is for. */}
        <div className={styles.presets}>
          <span className={styles.dots} ref={dotsRef}>
            {PRESETS.map((preset) => (
              <span
                key={preset.name}
                className={styles.dot}
                style={{ background: preset.hex }}
                data-on={preset.name === REST_NAME ? "" : undefined}
              />
            ))}
          </span>
          <span className={styles.presetName} ref={labelRef}>
            {REST_NAME}
          </span>
          {/* The other axis. Its swatch is the two real `background/default`
              values meeting on the same diagonal the preview draws. */}
          <span className={styles.presetMode} ref={modeRef}>
            {REST_MODE}
          </span>
        </div>

        <GlassChip className={styles.chip}>
          <p className={styles.stat}>{designSystemCopy.stat}</p>
          <p className={styles.statDetail}>{designSystemCopy.statDetail}</p>
        </GlassChip>
      </CardShell>

      {/* Absent until something asks for it — see `useLazyStudyModal`. */}
      {Modal && (
        <Modal open={open} closing={closing} onClose={close} study={study} />
      )}
    </>
  );
}
