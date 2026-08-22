"use client";

import { useCallback, useState } from "react";
import DeviceMockup from "@/components/interaction/DeviceMockup";
import styles from "./StudyHero.module.css";

type Props = {
  plate: string;
  plateAlt: string;
};

/**
 * The Inspection hero: a photographic plate with the device composited over
 * it, playing the real recording.
 *
 * The only client island in the reader, and the only part of it that differs
 * between the two surfaces — which is to say it no longer does. This used to
 * live in `CaseStudyModal`, with the `/work/<slug>` route rendering a flat
 * still in its place on the argument that a shared link should not pay for a
 * 9MB video. It doesn't: `PrototypeScreen` sets `preload="none"` and the file
 * is faststart, so the first frame lands after a header and a chunk. What the
 * still actually cost was the thing a shared link is *for* — someone opening
 * the case study from a message and seeing a screenshot where the person who
 * sent it saw a prototype.
 */
export default function PrototypeHero({ plate, plateAlt }: Props) {
  const [playing, setPlaying] = useState(true);
  const [restart, setRestart] = useState(0);

  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);
  const replay = useCallback(() => {
    setPlaying(true);
    setRestart((n) => n + 1);
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element --
          the plate is `object-fit: cover` inside a fixed-ratio frame and is
          scaled 3.5% past it; `next/image` with `fill` would work, but this
          element is also the view-transition hero's only painted pixel and the
          optimiser's placeholder swap is one more thing in flight. */}
      <img src={plate} alt={plateAlt} className={styles.plate} />
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
    </>
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
