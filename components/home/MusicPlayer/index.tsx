"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import { music } from "@/content/site";
import styles from "./MusicPlayer.module.css";

const tracks = music.tracks;

/**
 * Figma "Music Player" (node 80:7658) — the whole component set, not one frame.
 * Eight variants: four tracks x { paused, playing }, and every difference
 * between them is a state this component actually holds.
 *
 *   paused    cover under a 40% black scrim, the play disc alone, dots.
 *   playing   scrim off (the artwork is the point once it is running), the
 *             disc becomes a dark pause pill flanked by skip buttons, and a
 *             duration bar runs along the top edge.
 *
 * The transport is real. If the current track has an audio file it drives an
 * <audio> element and the bar follows `currentTime`; if it doesn't — see
 * `music.tracks` in content/site.ts — the same clock runs off the declared
 * duration, so skipping, pausing and the bar all behave identically. Nothing
 * ever autoplays: `playing` starts false and only a click sets it.
 */
export default function MusicPlayer() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  /** Seconds into the current track. A ref, not state: it moves every frame
   *  and the only thing downstream of it is one element's width. */
  const elapsed = useRef(0);

  const track = tracks[index];

  /** Wrap in both directions, so the set is a loop rather than a dead end. */
  const step = useCallback((delta: number) => {
    elapsed.current = 0;
    setIndex((i) => (i + delta + tracks.length) % tracks.length);
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    // Captured once: this body runs after commit, so it is already the element
    // belonging to `index`, and the cleanup below has to stop that same one.
    const audio = audioRef.current;
    // Read off `index` rather than the `track` above so the dependency list can
    // stay honest: two tracks of the same length are still a track change, and
    // the <audio> element under `audioRef` is a different one either side of it.
    const declared = tracks[index].duration;

    const paint = (ratio: number) => {
      if (bar) bar.style.width = `${Math.min(1, ratio) * 100}%`;
    };

    paint(elapsed.current / declared);
    if (!playing) return;

    // Rejected on a page the visitor hasn't interacted with yet, which is the
    // browser doing the right thing — the card falls back to paused rather
    // than showing a playing state with nothing coming out.
    audio?.play().catch(() => setPlaying(false));

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const total =
        audio && Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : declared;

      elapsed.current = audio?.currentTime ?? elapsed.current + (now - last) / 1000;
      last = now;

      if (elapsed.current >= total) {
        // Straight into the next one, still playing — a player that stopped
        // dead at the end of every track would be a worse player.
        step(1);
        return;
      }

      paint(elapsed.current / total);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      audio?.pause();
    };
  }, [playing, index, step]);

  return (
    <CardShell
      radius={48}
      surface="solid"
      data-card="music"
      className={`${styles.card} ${playing ? styles.playing : ""}`}
      role="group"
      aria-label="Music player"
    >
      {/* All four covers are mounted and cross-faded rather than swapped, so a
          skip is a dissolve instead of a blank frame while the next one
          decodes. Optimised to 254px they are a few tens of KB each. */}
      {tracks.map((t, i) => (
        <Image
          key={t.title}
          src={t.cover}
          alt=""
          width={254}
          height={280}
          loading={i === 0 ? "eager" : "lazy"}
          className={styles.cover}
          data-active={i === index ? "" : undefined}
        />
      ))}
      <span className={styles.scrim} aria-hidden="true" />

      {track.src ? (
        <audio key={track.title} ref={audioRef} src={track.src} preload="none" />
      ) : null}

      {/* Figma draws this as a fixed 107px bar; here it is the playhead. */}
      <span ref={barRef} className={styles.duration} aria-hidden="true" />

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.step}
          onClick={() => step(-1)}
          aria-label="Previous track"
          tabIndex={playing ? 0 : -1}
          aria-hidden={playing ? undefined : true}
        >
          <span
            className={`inkIcon ${styles.stepGlyph}`}
            style={{ ["--icon" as string]: "url(/icons/player-prev.svg)" }}
          />
        </button>

        <button
          type="button"
          className={styles.play}
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {/* Glyph only — the disc it sits on is drawn in CSS, because Figma
              blurs the artwork behind it and an SVG can't do that. */}
          <span
            className={`inkIcon ${styles.playGlyph}`}
            style={{ ["--icon" as string]: "url(/icons/player-play.svg)" }}
          />
          <span className={styles.pauseGlyph} aria-hidden="true">
            <i />
            <i />
          </span>
        </button>

        <button
          type="button"
          className={styles.step}
          onClick={() => step(1)}
          aria-label="Next track"
          tabIndex={playing ? 0 : -1}
          aria-hidden={playing ? undefined : true}
        >
          <span
            className={`inkIcon ${styles.stepGlyph}`}
            style={{ ["--icon" as string]: "url(/icons/player-next.svg)" }}
          />
        </button>
      </div>

      {/* What is playing, for anyone who cannot see the cover cross-fade.
          Skipping changed the artwork, the dots and the play button's label
          and said nothing: the covers are all `alt=""`, and a label on a
          button you are still standing on is not reliably re-announced. This
          is a permanently-mounted region whose text changes, which is the
          shape screen readers actually watch. */}
      <p className="srOnly" role="status">
        {playing ? `Playing ${track.title}` : track.title}
      </p>

      <GlassChip className={styles.chip}>
        <div className={styles.helper}>
          <span className={styles.label}>
            <span
              className={`inkIcon ${styles.labelIcon}`}
              style={{
                ["--icon" as string]: "url(/icons/music.svg)",
                width: 16,
                height: 16,
              }}
            />
            {music.label}
          </span>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.count}>
            {index + 1}/{tracks.length}
          </span>
        </div>
        <p className={styles.track}>{track.title}</p>
      </GlassChip>

      <div className={styles.bars} aria-hidden="true">
        {tracks.map((t, i) => (
          <span
            key={t.title}
            className={i === index ? styles.barActive : styles.bar}
          />
        ))}
      </div>
    </CardShell>
  );
}
