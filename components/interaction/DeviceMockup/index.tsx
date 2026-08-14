"use client";

import PrototypeScreen from "@/components/interaction/PrototypeScreen";
import styles from "./DeviceMockup.module.css";

/**
 * The one shared element in the card → modal transition: the card itself, which
 * expands into the modal's mockup. The device rides inside that picture rather
 * than being a hero of its own.
 *
 * That was the fix for the screen appearing to break out of the card on close.
 * A view-transition hero is lifted out of its container and is therefore *not*
 * clipped by the card's `overflow: hidden`; in flight it is a free-floating
 * rectangle, and with the card's device rotated -15.06deg at rest the
 * interpolated box is briefly wider than the card. Naming only the container
 * makes that impossible — a card's snapshot carries its own clip.
 *
 * Only ever on one element at a time: two live elements sharing a name abort
 * the transition, and the card stays mounted behind the modal.
 */
export const FRAME_MORPH = "inspection-frame";

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
      <img src="/media/inspection-hand.png" alt="" className={styles.hand} />
      <PrototypeScreen
        className={styles.screen}
        play={play}
        rewindOnStop={rewindOnStop}
        restartSignal={restartSignal}
      />
    </div>
  );
}
