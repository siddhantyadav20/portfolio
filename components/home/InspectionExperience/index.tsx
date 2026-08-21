"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import { EXIT_MS } from "@/components/primitives/ModalSurface";
import { useLazyStudyModal } from "@/components/home/CaseStudyModal/lazy";
import DeviceMockup from "@/components/interaction/DeviceMockup";
import { inspection } from "@/content/site";
import { inspectionPhotos } from "@/content/work/inspection-photos";
import { useStudyUrl } from "@/components/work/useStudyUrl";
import { canMorph, morph, warm } from "@/lib/viewTransition";
import styles from "./InspectionExperience.module.css";

/**
 * Everything the modal paints that the card does not already have on screen.
 *
 * These have to be decoded *before* the transition starts — see `warm`. That is
 * why only the screen used to look like it was animating: its poster was the
 * one file already cached, from the card.
 *
 * Read off the study rather than written twice, so changing the hero art can't
 * leave the warm list pointing at a file the modal no longer paints.
 */
const MODAL_ASSETS =
  inspectionPhotos.hero?.kind === "prototype"
    ? [inspectionPhotos.hero.plate]
    : [];

/**
 * The Inspection case-study card, both Figma variants in one component.
 *
 * The hover state is entirely CSS — see the module, which holds Figma's two
 * transforms for the hand and the device. React only tracks whether the
 * pointer is on the card, because the recording has to be told to run, and
 * that is not something a stylesheet can say.
 *
 * `data-cursor="view-project"` is what swaps the site cursor for the glass
 * "View Project" disc — see CanvasCursor. Nothing else on the page carries it.
 */
export default function InspectionExperience() {
  /**
   * The pointer, and only the pointer.
   *
   * This used to be driven by focus as well, and the modal restores focus to
   * whatever opened it — so closing the case study handed focus back to this
   * card and started the recording again with the pointer nowhere near it.
   * Closing with the cross made that invisible too: focus restored after a
   * mouse interaction doesn't match `:focus-visible`, so the card sat at rest
   * with the video running behind the still.
   */
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const { Modal, setModal, load, warmModal } = useLazyStudyModal(open);

  const openStudy = useCallback(async () => {
    // The modal's own code, resolved before anything moves — same reason as
    // the assets below, and the same guarantee. See `useLazyStudyModal`.
    const Loaded = await load();
    // Cleared alongside the open so the card isn't left playing behind the
    // modal. Safe under a view transition: the "old" snapshot is taken before
    // this callback runs, so it still catches the card hovered.
    const update = () => {
      setModal(() => Loaded);
      setHovered(false);
      setOpen(true);
    };
    if (!canMorph()) {
      update();
      return;
    }
    // Hovering will normally have finished this long ago; awaiting is the
    // guarantee, not the mechanism. See MODAL_ASSETS.
    await Promise.all(MODAL_ASSETS.map(warm));
    morph(update);
  }, [load, setModal]);

  /**
   * Click handler for the card's real `<a href="/work/inspection-photos">`.
   *
   * The card was a `<button>` until now, which meant the one study the
   * homepage leads with was the one study you could not cmd-click, could not
   * open in a new tab, and no crawler could reach — `inspection.href` had been
   * sitting in `content/site.ts` unreferenced the whole time. The other two
   * study cards have always been anchors. Only a plain left click is upgraded
   * to the morph; modified clicks stay ordinary clicks and get the route.
   */
  const onLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      void openStudy();
    },
    [openStudy],
  );

  // Deep links, Back, and keeping `/work/inspection-photos` in the address bar
  // while this is open. The one part of the modal plumbing this card does not
  // need its own copy of.
  useStudyUrl(inspectionPhotos.slug, open, setOpen);

  const close = useCallback(() => {
    if (canMorph()) {
      // Land the device where hovering leaves it, not at its resting tilt: the
      // phone should travel back to the card first and settle afterwards, as
      // two beats. Releasing `hovered` once the transition resolves hands the
      // last beat to the card's own 820ms ease (`--shift`).
      setHovered(true);
      morph(() => setOpen(false), () => setHovered(false));
      return;
    }
    // No morph to play, so the modal has to animate itself out — otherwise
    // closing is an instant pop, which is half of why this felt abrupt.
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
  }, []);

  return (
    <>
      <CardShell
        as="a"
        href={inspection.href}
        radius={48}
        surface="none"
        className={styles.card}
        // The card itself is the thing that expands into the modal's mockup —
        // released the moment the modal owns it, since two live elements
        // sharing a name abort the transition.
        style={
          open || !inspectionPhotos.hero
            ? undefined
            : { viewTransitionName: inspectionPhotos.hero.morphName }
        }
        data-cursor="view-project"
        onMouseEnter={() => {
          setHovered(true);
          // The moment before a click: start the modal's code and its images
          // now, so the transition never has to wait for either.
          warmModal();
          MODAL_ASSETS.forEach(warm);
        }}
        onMouseLeave={() => setHovered(false)}
        onClick={onLinkClick}
        aria-label={`${inspection.title} — open case study`}
      >
        <Image
          src="/media/inspection-bg.jpg"
          alt=""
          width={750}
          height={1000}
          className={styles.bg}
          priority
        />
        <div className={styles.scrim} />

        <h2 className={styles.title}>{inspection.title}</h2>

        <GlassChip className={styles.chip}>
          <p className={styles.stat}>{inspection.stat}</p>
        </GlassChip>

        {/* Figma's device, at the card's size and tilt. */}
        <DeviceMockup className={styles.device} play={hovered} rewindOnStop />
      </CardShell>

      {/* Absent until something asks for it — see `useLazyStudyModal`. */}
      {Modal && (
        <Modal
          open={open}
          closing={closing}
          onClose={close}
          study={inspectionPhotos}
        />
      )}
    </>
  );
}
