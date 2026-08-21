"use client";

import { useCallback, useState } from "react";
import ThemeToggle from "@/components/home/ThemeToggle";
import ModalSurface, {
  MODAL_VT,
  modalAction,
} from "@/components/primitives/ModalSurface";
import DeviceMockup from "@/components/interaction/DeviceMockup";
import StudyLiveBlock from "@/components/work/StudyLiveBlock";
import StudySections from "@/components/work/StudySections";
import type { CaseStudy } from "@/content/work";
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
 * The case-study reader — Figma "Case Study - Modal", node 62:3688.
 *
 * Everything about *being* a modal — the portal, Escape, focus containment and
 * restore, the plate's entry and exit — belongs to ModalSurface. What is left
 * here is this case study's own content, and the running prototype that the
 * card morphs into.
 *
 * The hero is pluggable (see `StudyHero`). Only the Inspection study has a
 * recording, so only it pays for `DeviceMockup` and the playback controls —
 * the other two render a still or no hero at all.
 *
 * The morph name comes off the study rather than being a constant, because
 * more than one card carries one at rest and a shared `view-transition-name`
 * aborts the transition for *both* of them. See `StudyMorphName`.
 */
export default function CaseStudyModal({
  open,
  closing = false,
  onClose,
  study,
}: Props) {
  const [playing, setPlaying] = useState(true);
  const [restart, setRestart] = useState(0);
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    // Whatever the address bar says, which `useStudyUrl` has already made
    // `/work/<slug>` — a real prerendered page with its own canonical and
    // share card. This used to build `/?study=<slug>` by hand, and that URL
    // serves the homepage to every crawler and link-preview bot: a case study
    // pasted into Slack previewed as the homepage.
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — nothing useful to say to anyone, and the address
      // bar now carries the same URL, so there is a way through regardless.
    }
  }, []);

  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);
  const replay = useCallback(() => {
    setPlaying(true);
    setRestart((n) => n + 1);
  }, []);

  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={onClose}
      label={study.title}
      selectionTint="violet"
      actions={
        <>
          <ThemeToggle />

          <button
            type="button"
            className={`${modalAction} liquid`}
            onClick={share}
          >
            {copied ? (
              <TickGlyph />
            ) : (
              <span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/share.svg)", width: 20, height: 20 }} />
            )}
            {/* The button's own name, which stays put. Swapping this text was
                the whole of the previous announcement, and a label changing
                underneath the control you are already focused on is not
                reliably re-read. */}
            <span className="srOnly">Copy a link to this case study</span>
          </button>

          {/* The confirmation, in a region that exists before there is
              anything to say. The comment on `share`'s catch has always
              claimed "the link is announced below for screen readers" — this
              is the region that finally makes that true. */}
          <span className="srOnly" role="status">
            {copied ? "Link copied to clipboard" : ""}
          </span>
        </>
      }
    >
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.intro}>
            <div className={styles.titleBlock} data-stage="title" style={MODAL_VT.title}>
              <h1 className={styles.title}>{study.title}</h1>
              <p className={styles.subtitle}>{study.subtitle}</p>
            </div>

            {/* Figma's "Mockup" frame, rebuilt from its layers so the device's
                screen can hold the running prototype. */}
            {study.hero?.kind === "prototype" && (
              <div
                className={`${styles.mockup} squircle`}
                data-stage="hero"
                style={{ viewTransitionName: study.hero.morphName }}
              >
                <img
                  src={study.hero.plate}
                  alt={study.hero.plateAlt}
                  className={styles.plate}
                />
                <DeviceMockup
                  className={styles.device}
                  play={playing}
                  restartSignal={restart}
                />

                <div className={styles.playback}>
                  <button
                    type="button"
                    className={`${styles.playToggle} liquid`}
                    onClick={replay}
                  >
                    <ReplayGlyph />
                    <span className="srOnly">Replay from the start</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.playToggle} liquid`}
                    onClick={togglePlaying}
                  >
                    {playing ? <PauseGlyph /> : <PlayGlyph />}
                    <span className="srOnly">
                      {playing ? "Pause the prototype" : "Play the prototype"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {study.hero?.kind === "image" && (
              <div
                className={`${styles.mockup} squircle`}
                data-stage="hero"
                style={{ viewTransitionName: study.hero.morphName }}
              >
                <img
                  src={study.hero.src}
                  alt={study.hero.alt}
                  width={study.hero.width}
                  height={study.hero.height}
                  className={styles.plate}
                />
              </div>
            )}

            {/* The far end of the Design System card's morph. The card is a
                346px window onto the same running shell, so this does not
                cross-fade a thumbnail into a photograph — the drawing grows,
                and is still live when it arrives. */}
            {study.hero?.kind === "live" && (
              <div
                className={`${styles.mockup} squircle`}
                data-stage="hero"
                style={{ viewTransitionName: study.hero.morphName }}
              >
                <StudyLiveBlock view={study.hero.view} bare />
              </div>
            )}

            {study.body && (
              <p className={styles.body} data-stage="body" style={MODAL_VT.body}>
                {study.body}
              </p>
            )}
          </div>

          <div className={styles.separator} data-stage="rule" />

          <dl className={styles.meta} data-stage="meta" style={MODAL_VT.meta}>
            {study.meta.map((item) => (
              <div key={item.label} className={styles.metaItem}>
                <dt className={styles.metaLabel}>{item.label}</dt>
                {/* An em dash, not an empty cell: the row is part of the
                    study's scaffold and should stay legible while unwritten. */}
                <dd
                  className={styles.metaValue}
                  data-placeholder={item.value ? undefined : ""}
                >
                  {item.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>

          <StudySections
            sections={study.sections}
            className={styles.sections}
          />
        </div>
      </div>
    </ModalSurface>
  );
}

/* Inline rather than /icons/*.svg like the rest of the site: this pair swaps on
   every click, and two files behind a changing `src` flickers on the first
   swap. Nothing else needs them. */

function PauseGlyph() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
      <rect width="4" height="16" rx="1.5" fill="currentColor" />
      <rect x="10" width="4" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
      <path
        d="M13.2 6.9a1.3 1.3 0 0 1 0 2.2l-11 6.6A1.3 1.3 0 0 1 .3 14.6V1.4A1.3 1.3 0 0 1 2.2.3z"
        fill="currentColor"
      />
    </svg>
  );
}

function TickGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M8.06 14.2a.94.94 0 0 1-.66-.28l-3.2-3.2a.94.94 0 1 1 1.33-1.32l2.53 2.53 6.4-6.4a.94.94 0 1 1 1.33 1.33l-7.07 7.06a.94.94 0 0 1-.66.28z"
        fill="currentColor"
      />
    </svg>
  );
}

function ReplayGlyph() {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" aria-hidden="true">
      <path
        d="M8.5 1.7V0L5.9 2.4l2.6 2.4V3.1a4.9 4.9 0 1 1-4.9 4.9H1.9a6.6 6.6 0 1 0 6.6-6.3z"
        fill="currentColor"
      />
    </svg>
  );
}
