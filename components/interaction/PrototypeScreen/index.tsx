"use client";

import { useEffect, useRef, useState } from "react";
import { inspection } from "@/content/site";
import styles from "./PrototypeScreen.module.css";

/** How long the pointer has to be away before the loop is sent back to the top.
 *  See `rewindOnStop` — this exists because leaving and re-entering is not
 *  always a deliberate act. */
const REWIND_GRACE = 150;

type Props = {
  /** Positioning and size — the caller owns the geometry. */
  className?: string;
  /** Whether the recording should be running right now. */
  play: boolean;
  /**
   * Send the loop back to its first frame when it stops. True on the card,
   * where every hover should start the walkthrough from the top; false in the
   * modal, where the pause button means pause, not rewind.
   */
  rewindOnStop?: boolean;
  /** Bump to send the recording back to the top and play it from there. */
  restartSignal?: number;
};

/**
 * The device's screen: the app still, the prototype recording over it, and
 * Figma's own screen-outline mask cutting both to the shape of the phone in
 * the photograph underneath.
 *
 * Shared because the card and the modal show the same device at two sizes, and
 * because the corner shape is the fiddly part — getting it wrong is instantly
 * visible as a sliver of bezel, and it should only ever be got right once.
 *
 * ---------------------------------------------------------------------------
 * Playback notes, because this did not work for two rounds and every one of
 * these was a way it could fail:
 *
 *   `src` is declarative. Assigning `video.src` and calling `play()` in the
 *   same tick races the resource selection algorithm; Chrome tolerates it and
 *   Safari rejects it outright. `preload="none"` still means nothing is
 *   fetched until we ask.
 *
 *   Play is `load()` first, then retry once. A media element that has never
 *   loaded is at readyState 0, and asking it to play from there is the case
 *   that fails quietly.
 *
 *   The fetch happens once. The first hover pays for it — the file is
 *   faststart, so `loadeddata` lands after the header and a chunk rather than
 *   after all 9MB — and every hover after that finds it already loaded.
 *
 *   Stopping does not rewind immediately. ProximityField scales the card under
 *   the pointer, which can retrigger leave/enter; rewinding on every leave
 *   turned that churn into a video permanently stuck on frame 0.
 *
 *   Failures are reported. The previous `.catch(() => {})` is the reason none
 *   of the above was noticed.
 */
export default function PrototypeScreen({
  className,
  play,
  rewindOnStop = false,
  restartSignal = 0,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    // 0 is the initial value, not a request — only a change is a replay.
    if (!video || restartSignal === 0) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [restartSignal]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!play) {
      video.pause();
      if (!rewindOnStop) return;

      const timer = window.setTimeout(() => {
        if (video.readyState > 0) video.currentTime = 0;
      }, REWIND_GRACE);
      return () => window.clearTimeout(timer);
    }

    // A looping video is motion nobody asked for; under reduced motion the
    // still is the whole treatment.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    async function start(retry: boolean) {
      if (cancelled || !video) return;
      if (video.readyState === 0) video.load();
      try {
        await video.play();
      } catch (error) {
        if (cancelled) return;
        if (retry) {
          video.load();
          void start(false);
          return;
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("[PrototypeScreen] could not play the recording", error);
        }
      }
    }

    void start(true);
    return () => {
      cancelled = true;
    };
  }, [play, rewindOnStop]);

  return (
    <div className={[styles.screen, className].filter(Boolean).join(" ")}>
      <img src="/media/inspection-screen.png" alt="" className={styles.poster} />
      <video
        ref={videoRef}
        className={styles.video}
        src={inspection.video}
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        aria-hidden="true"
        // `loadeddata` rather than `canplay`: there is a frame to show well
        // before there is enough buffered to play through, and holding the
        // poster until then is what made a working video look broken.
        onLoadedData={() => setReady(true)}
        onError={(e) => {
          if (process.env.NODE_ENV !== "production") {
            console.error(
              "[PrototypeScreen] recording failed to load",
              e.currentTarget.error,
            );
          }
        }}
        {...(ready && (play || !rewindOnStop) ? { "data-show": "" } : {})}
      />
      <img
        src="/media/inspection-screen-chrome.png"
        alt=""
        className={styles.chrome}
      />
    </div>
  );
}
