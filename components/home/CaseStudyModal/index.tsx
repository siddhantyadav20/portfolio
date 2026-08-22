"use client";

import { useCallback, useState } from "react";
import ThemeToggle from "@/components/home/ThemeToggle";
import GlassAction from "@/components/primitives/GlassAction";
import ModalSurface from "@/components/primitives/ModalSurface";
import StudyReader from "@/components/work/StudyReader";
import type { CaseStudy } from "@/content/work";
import { copyToClipboard } from "@/lib/clipboard";
import styles from "./CaseStudyModal.module.css";

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
 * Almost nothing is left here, and that is the change. Everything about *being*
 * a modal — the portal, Escape, focus containment and restore, the plate's
 * entry and exit, the two control clusters — belongs to `ModalSurface`.
 * Everything about being a case study — the helpers line, the title, the hero
 * and its running prototype, the outcomes, every section, the progress bar and
 * the rail — belongs to `StudyReader`, which the `/work/<slug>` route renders
 * too. What is left in this file is the Share button and the decision to tint
 * the selection purple.
 *
 * That is the point of the split rather than a side effect of it. The link
 * this modal copies now opens a page built from the same component, so pasting
 * it produces the study someone was actually looking at instead of a plainer
 * second layout of the same content.
 */
export default function CaseStudyModal({
  open,
  closing = false,
  onClose,
  study,
}: Props) {
  const [copied, setCopied] = useState(false);
  /* The URL the copy failed on, so the fallback can show it. A string rather
     than a flag because there is nothing to read at render time: the address
     bar is rewritten by `useStudyUrl` when the modal opens, and on the server
     there is no address bar at all. */
  const [failed, setFailed] = useState<string | null>(null);

  const share = useCallback(async () => {
    // Whatever the address bar says, which `useStudyUrl` has already made
    // `/work/<slug>` — a real prerendered page with its own canonical and
    // share card. This used to build `/?study=<slug>` by hand, and that URL
    // serves the homepage to every crawler and link-preview bot: a case study
    // pasted into Slack previewed as the homepage.
    const url = window.location.href;

    if (!(await copyToClipboard(url))) {
      /* Both routes refused. The previous version swallowed this and left the
         button doing nothing at all, which is indistinguishable from a broken
         button. Say so, and hand over the URL so there is still a way to take
         it. */
      setFailed(url);
      window.setTimeout(() => setFailed(null), 8000);
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={onClose}
      label={study.title}
      selectionTint="violet"
      /* Figma 258:9690 — Share is on its own at the top left, opposite the
         theme toggle and the close. */
      leading={
        <>
          <GlassAction label="Copy a link to this case study" onClick={share}>
            {copied ? (
              <TickGlyph />
            ) : (
              <span
                className="inkIcon"
                style={{
                  ["--icon" as string]: "url(/icons/export.svg)",
                  width: 24,
                  height: 24,
                }}
              />
            )}
          </GlassAction>

          {/* Only drawn when the copy was refused — the browser can deny the
              clipboard and there is no asking it twice, so the URL itself is
              the fallback and it is selectable. */}
          {failed && (
            <span className={styles.fallback}>
              <span className={styles.fallbackLabel}>
                Your browser blocked the copy. Here is the link:
              </span>
              <code className={styles.fallbackUrl}>{failed}</code>
            </span>
          )}

          {/* The confirmation, in a region that exists before there is
              anything to say. The button's own name never changes — a label
              changing underneath the control you are already focused on is
              not reliably re-read. */}
          <span className="srOnly" role="status">
            {copied ? "Link copied to clipboard" : ""}
            {failed ? `Copying was blocked. The link is ${failed}` : ""}
          </span>
        </>
      }
      actions={<ThemeToggle />}
    >
      <StudyReader study={study} />
    </ModalSurface>
  );
}

/** Shown for two seconds after a copy. Inline because it swaps in and out of
 *  the same button as the export glyph, and a changing `src` flickers. */
function TickGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M8.06 14.2a.94.94 0 0 1-.66-.28l-3.2-3.2a.94.94 0 1 1 1.33-1.32l2.53 2.53 6.4-6.4a.94.94 0 1 1 1.33 1.33l-7.07 7.06a.94.94 0 0 1-.66.28z"
        fill="currentColor"
      />
    </svg>
  );
}
