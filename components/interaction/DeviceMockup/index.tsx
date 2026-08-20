"use client";

import Image from "next/image";
import PrototypeScreen from "@/components/interaction/PrototypeScreen";
import styles from "./DeviceMockup.module.css";

/**
 * The device is deliberately *not* a view-transition hero of its own — it rides
 * inside the card's picture, and the card is what carries the name.
 *
 * That was the fix for the screen appearing to break out of the card on close.
 * A view-transition hero is lifted out of its container and is therefore *not*
 * clipped by the card's `overflow: hidden`; in flight it is a free-floating
 * rectangle, and with the card's device rotated -15.06deg at rest the
 * interpolated box is briefly wider than the card. Naming only the container
 * makes that impossible — a card's snapshot carries its own clip.
 *
 * The name itself used to be a constant here. It moved to the study data as
 * `StudyMorphName` once a second card needed one: a name has to be unique
 * across the live document, and two elements sharing one aborts the transition
 * for both. See `content/work/types.ts`.
 */

type Props = {
  /** The hand's own rect, and any rotation — the only thing a surface sets. */
  className?: string;
  /** Whether the recording should be running right now. */
  play: boolean;
  /** Send the loop back to its first frame when it stops. */
  rewindOnStop?: boolean;
  /** Bump to replay from the top. */
  restartSignal?: number;
};

/**
 * Figma's device, defined once — see the module for the geometry and why it is
 * expressed as fractions of the hand.
 *
 * The card and the modal render this same component; the card's copy is smaller
 * and rotated purely because the element it is placed in is smaller and rotated.
 * Before this, both surfaces carried their own derived percentages for the
 * screen, and they had drifted about a pixel apart.
 */
export default function DeviceMockup({
  className,
  play,
  rewindOnStop,
  restartSignal,
}: Props) {
  return (
    <div className={[styles.device, className].filter(Boolean).join(" ")}>
      {/* 1114x1608 as exported, and painted at most ~700 wide (the modal's
          mockup) or ~457 (the card). Left as a raw <img> it was the single
          heaviest file on the homepage at 939KB; through the optimiser it is
          an AVIF a fraction of that. `fill` because the surface sizes the
          device and the hand simply occupies it. */}
      <Image
        src="/media/inspection-hand.png"
        alt=""
        fill
        sizes="(max-width: 900px) 100vw, 700px"
        priority
        className={styles.hand}
      />
      <PrototypeScreen
        className={styles.screen}
        play={play}
        rewindOnStop={rewindOnStop}
        restartSignal={restartSignal}
      />
    </div>
  );
}
