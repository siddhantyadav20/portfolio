"use client";

import ThemeToggle from "@/components/home/ThemeToggle";
import ModalSurface from "@/components/primitives/ModalSurface";
import StudyReader from "@/components/work/StudyReader";
import StudyShare from "@/components/work/StudyShare";
import type { CaseStudy } from "@/content/work";

export type { CaseStudy };

type Props = {
  open: boolean;
  /** Playing the exit animation — only ever true on the no-morph path. */
  closing?: boolean;
  onClose: () => void;
  study: CaseStudy;
};

/**
 * The case-study reader as a modal — Figma "Case Study - Modal", node 62:3688.
 *
 * Nothing is left here, and that is the change. Everything about *being* a
 * modal — the portal, Escape, focus containment and restore, the plate's entry
 * and exit, the two control clusters — belongs to `ModalSurface`. Everything
 * about being a case study — the helpers line, the title, the outcomes, the
 * hero and its running prototype, every section, the progress bar and the rail
 * — belongs to `StudyReader`, which the `/work/<slug>` route renders too. The
 * Share button was the last thing this file owned, and it is now `StudyShare`,
 * because the route needs the same control and could not import it out of a
 * `"use client"` module that drags the whole modal in with it.
 *
 * That is the point of the split rather than a side effect of it. The link
 * this modal copies opens a page built from the same components, so pasting it
 * produces the study someone was actually looking at, with the same controls
 * around it, instead of a plainer second layout of the same content.
 */
export default function CaseStudyModal({
  open,
  closing = false,
  onClose,
  study,
}: Props) {
  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={onClose}
      label={study.title}
      /* The study's own hue, not the homepage's — and scoped to the plate, so
         the page underneath it stays orange while both are on screen. It picks
         the selection tint too: see the note on the route, which used to set a
         violet `selectionTint` beside this and no longer needs one. */
      accent={study.accent ?? "blue"}
      /* Figma 258:9690 — Share is on its own at the top left, opposite the
         theme toggle and the close. */
      leading={<StudyShare />}
      actions={<ThemeToggle />}
    >
      <StudyReader study={study} />
    </ModalSurface>
  );
}
