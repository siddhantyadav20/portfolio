"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import Spinner, { preloadSpinner } from "@/components/interaction/RemarkFinder/Spinner";
import { drop, lift } from "@/lib/needle";
import {
  PREVIEW_SECONDS,
  timeLabel,
  type Queue,
  type Reaction,
  type ReactionKind,
  type Reactions,
} from "@/lib/music";
import { reactToTrack } from "./actions";
import styles from "./MusicPlayer.module.css";

/* ===========================================================================
   The transport.

   Nothing here decides what is playing — that arrives resolved from the server
   (see index.tsx). This owns four things and no more: which of the queue is
   showing, whether it is running, where the playhead is, and the two thumbs.

   THE PLAYHEAD IS A REF, NOT STATE. It moves every animation frame and the only
   things downstream of it are one element's width and one arc's dash offset,
   both written directly. Through `useState` this would be sixty renders a
   second of a card that is not otherwise changing.

   NO WRAPPING. The old version of this card looped, because four curated songs
   are a set and a set has no ends. A recently-played feed is a sequence with a
   start: wrapping from the oldest back to the newest asserts a loop that does
   not exist, and removes the only signal that you have reached the end of what
   he has actually listened to. So the ends disable, which Figma draws — the
   paused mock has its skip-back button at 40%, because it is showing the first
   track and there is nothing behind it.
   =========================================================================== */

type Unavailable = { title: string; artist: string; cover: string };

const EMPTY: Reaction = { up: 0, down: 0, mine: null };

export default function Player({
  queue,
  label,
  unavailable,
}: {
  queue: Queue;
  label: string;
  unavailable: Unavailable;
}) {
  const tracks = queue.tracks;
  const empty = tracks.length === 0;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  /* Distinct from `playing`: the moment between pressing play and the first
     byte of a thirty-second AAC arriving is real, and on a slow connection it
     is seconds long. It used to be invisible. */
  const [buffering, setBuffering] = useState(false);

  const [reactions, setReactions] = useState<Reactions | null>(null);
  const [pending, setPending] = useState(false);
  /**
   * The count that appears for a moment after a press.
   *
   * `nonce` is what makes a second press restart the fade rather than join one
   * already halfway through — the span is keyed on it, so React remounts it and
   * the CSS animation begins again. The same trick `StudyEnd/Comments.tsx` uses
   * for its burst ring, and the reason neither needs a timer: the animation
   * ends at `opacity: 0` and holds there, so nothing has to come along later
   * and clear it.
   */
  const [flash, setFlash] = useState<{
    key: string;
    kind: ReactionKind;
    nonce: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  /** Seconds into the current preview. See the note above. */
  const elapsed = useRef(0);
  const [clock, setClock] = useState("0:00");

  const track = empty ? null : tracks[index];
  const canPrev = index > 0;
  const canNext = index < tracks.length - 1;

  const step = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        if (next < 0 || next >= tracks.length) return i;
        /* Writing a ref from inside an updater, which React may call twice in
           StrictMode — safe here only because the write is `= 0` and running
           it twice says the same thing. Anything accumulating would not be. */
        elapsed.current = 0;
        return next;
      });
    },
    [tracks.length],
  );

  /* --- The thumbs, fetched on mount ---------------------------------------- */

  useEffect(() => {
    if (empty) return;
    const abort = new AbortController();
    const keys = tracks.map((t) => t.key).join(",");

    (async () => {
      try {
        const res = await fetch(`/api/music/reactions?keys=${encodeURIComponent(keys)}`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setReactions((await res.json()) as Reactions);
      } catch {
        /* Offline, or the store is unreachable. The thumbs stay disabled,
           which is the honest rendering of "nobody knows". */
        if (!abort.signal.aborted) setReactions({ configured: false, of: {} });
      }
    })();

    return () => abort.abort();
  }, [empty, tracks]);

  const react = useCallback(
    async (kind: ReactionKind) => {
      if (!track || pending || !reactions?.configured) return;
      const before = reactions.of[track.key] ?? EMPTY;

      /* Optimistic, and it has to be: a thumb that waits for a round trip
         before it fills is a thumb people press twice. */
      const withdrawing = before.mine === kind;
      const optimistic: Reaction = {
        up:
          before.up +
          (kind === "up" ? (withdrawing ? -1 : 1) : before.mine === "up" ? -1 : 0),
        down:
          before.down +
          (kind === "down" ? (withdrawing ? -1 : 1) : before.mine === "down" ? -1 : 0),
        mine: withdrawing ? null : kind,
      };

      setPending(true);
      setReactions({ ...reactions, of: { ...reactions.of, [track.key]: optimistic } });
      setFlash({ key: track.key, kind, nonce: Date.now() });

      const result = await reactToTrack(track.key, kind);
      setPending(false);

      if (result.ok) {
        setReactions((now) =>
          now
            ? {
                ...now,
                of: {
                  ...now.of,
                  [track.key]: { up: result.up, down: result.down, mine: result.mine },
                },
              }
            : now,
        );
      } else {
        /* Put it back. The guess was wrong and leaving it standing would show
           a count that no reload agrees with. */
        setReactions((now) =>
          now ? { ...now, of: { ...now.of, [track.key]: before } } : now,
        );
        setFlash(null);
      }
    },
    [pending, reactions, track],
  );

  /* --- The clock ------------------------------------------------------------ */

  useEffect(() => {
    const bar = barRef.current;
    const arc = arcRef.current;
    // Captured once: this body runs after commit, so it already belongs to
    // `index`, and the cleanup has to stop that same element.
    const audio = audioRef.current;

    const paint = (ratio: number) => {
      const at = Math.max(0, Math.min(1, ratio));
      if (bar) bar.style.width = `${at * 100}%`;
      /* `pathLength="100"` on the circle, so the offset is a percentage and
         the arc does not have to know its own circumference. */
      if (arc) arc.style.strokeDashoffset = String(100 - at * 100);
    };

    paint(elapsed.current / PREVIEW_SECONDS);
    setClock(timeLabel(elapsed.current));
    if (!playing || !audio) return;

    setBuffering(true);
    /* Rejected on a page the visitor has not interacted with yet, which is the
       browser doing the right thing — the card falls back to paused rather
       than showing a playing state with nothing coming out. No `lift()` here:
       nothing landed. */
    audio.play().catch(() => {
      setPlaying(false);
      setBuffering(false);
    });

    let raf = 0;
    let shown = -1;

    const tick = () => {
      const total =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : PREVIEW_SECONDS;

      elapsed.current = audio.currentTime;
      paint(elapsed.current / total);

      /* The label is state, so it is only written when the second changes —
         one render a second rather than sixty. */
      const whole = Math.floor(elapsed.current);
      if (whole !== shown) {
        shown = whole;
        setClock(timeLabel(whole));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      audio.pause();
    };
  }, [playing, index]);

  const toggle = useCallback(() => {
    if (!track) return;
    setPlaying((p) => {
      /* The record going on and coming off. The same mechanism as the canvas
         turntables, so deliberately the same sound — this card and those
         widgets are the same object in two places, and the one thing that
         would give that away is them disagreeing. */
      if (p) lift();
      else drop();
      return !p;
    });
  }, [track]);

  /** The end of a preview. Straight into the next one if there is one — a
   *  player that stopped dead after every track would be a worse player — and
   *  a clean stop at the end of the queue, because there is nothing after it. */
  const ended = useCallback(() => {
    elapsed.current = 0;
    if (canNext) setIndex((i) => i + 1);
    else {
      lift();
      setPlaying(false);
    }
  }, [canNext]);

  /* --- Drawing --------------------------------------------------------------- */

  const mine = track ? (reactions?.of[track.key] ?? EMPTY).mine : null;
  const counts = track ? (reactions?.of[track.key] ?? EMPTY) : EMPTY;
  const votable = Boolean(track && reactions?.configured);

  const cover = track?.cover ?? unavailable.cover;
  const title = track?.title ?? unavailable.title;
  const artist = track?.artist ?? unavailable.artist;

  return (
    <CardShell
      radius={40}
      surface="glass"
      data-card="music"
      /* The one state the stylesheet branches on. Everything the playing
         variant changes — the accent disc, the pause bars, the arc — hangs off
         this rather than off `:has()` reaching into the button for the arc's
         own attribute, which coupled the card's whole appearance to one SVG
         keeping a data attribute it happens to need for itself. */
      data-playing={playing ? "" : undefined}
      /* Separate from `data-playing`: pressed, but no audio yet. The glyphs
         come off and the loader goes on — see MusicPlayer.module.css. */
      data-buffering={playing && buffering ? "" : undefined}
      className={styles.card}
      role="group"
      aria-label="Music player"
      style={
        track?.accent
          ? ({
              "--art": track.accent,
              "--art-dark": track.accentDark ?? track.accent,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className={`${styles.cover} squircle`}>
        <Image
          // Keyed on the source so a skip swaps the element rather than
          // mutating one whose old bitmap is still painted.
          key={cover}
          src={cover}
          alt=""
          fill
          sizes="(width < 700px) 62vw, 260px"
          className={styles.art}
          /* Eager, but at low priority — the same pairing the canvas still
             uses, and for the same reason. The sleeve IS this card's content,
             so lazy-loading it means the card opens empty and the artwork
             pops in; but it sits ~185px below the fold, and anything not lazy
             goes into the document head as a preload, so without the second
             half it would compete with the hero it cannot be seen next to. */
          loading="eager"
          fetchPriority="low"
        />
        {/* Figma draws a flat 24% black over the artwork in both states. It is
            not a paused/playing signal — it is what keeps the chip and the
            sleeve from fighting on a bright cover. */}
        <span className={styles.scrim} aria-hidden="true" />
        <GlassChip className={styles.chip}>
          <span
            className={`inkIcon ${styles.chipGlyph}`}
            style={{ ["--icon" as string]: "url(/icons/music.svg)" }}
            aria-hidden="true"
          />
          <span className="srOnly">{label}</span>
        </GlassChip>
      </div>

      {track ? (
        <audio
          key={track.key}
          ref={audioRef}
          src={track.preview}
          preload="none"
          onEnded={ended}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onError={ended}
        />
      ) : null}

      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.names}>
            {track?.href ? (
              /* The title is the link, and it is not decoration: Apple's terms
                 for the preview want it sitting next to a way to reach the
                 record itself. */
              <a
                className={styles.title}
                href={track.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {title}
              </a>
            ) : (
              <p className={styles.title} data-placeholder={empty ? "" : undefined}>
                {title}
              </p>
            )}
            <p className={styles.artist}>{artist}</p>
          </div>

          <div className={styles.thumbs}>
            {(["up", "down"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                className={styles.thumb}
                data-kind={kind}
                data-mine={mine === kind ? "" : undefined}
                onClick={() => react(kind)}
                disabled={!votable}
                aria-pressed={mine === kind}
                aria-label={kind === "up" ? `Like ${title}` : `Dislike ${title}`}
              >
                <span className={styles.thumbGlyph}>
                  {/* Three boxes, one transform each, because they animate at
                      the same time and CSS has one `transform` per element:
                      the wrapper cocks back on hover, `.flip` turns the thumb
                      over for the dislike, and the glyph itself does the pop.
                      Collapsed into fewer elements, whichever ran last won and
                      the dislike flipped upright mid-press. */}
                  <span className={styles.flip}>
                    <span
                      className={`inkIcon ${styles.glyph}`}
                      style={{
                        ["--icon" as string]:
                          mine === kind ? "url(/icons/like-filled.svg)" : "url(/icons/like.svg)",
                      }}
                    />
                  </span>
                  {/* Drawn only while it is expanding, and keyed so a second
                      press starts a second ring rather than re-using one that
                      has already played. */}
                  {mine === kind ? (
                    <span
                      key={`${counts.up}-${counts.down}`}
                      className={styles.burst}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                {flash && track && flash.key === track.key && flash.kind === kind ? (
                  <span key={flash.nonce} className={styles.tally} aria-hidden="true">
                    {kind === "up" ? counts.up : counts.down}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.transport}>
          <span className={styles.rail} aria-hidden="true">
            <span ref={barRef} className={styles.fill} />
          </span>

          <div className={styles.clock} aria-hidden="true">
            <span>{clock}</span>
            <span>{timeLabel(PREVIEW_SECONDS)}</span>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.step}
              onClick={() => step(-1)}
              disabled={!canPrev}
              aria-label="Previous track"
            >
              <span
                className={`inkIcon ${styles.stepGlyph}`}
                style={{ ["--icon" as string]: "url(/icons/player-skip.svg)" }}
              />
            </button>

            <button
              type="button"
              className={styles.play}
              onClick={toggle}
              /* The loader is a Lottie behind a dynamic import — 47KB of
                 player that the homepage must not carry until somebody looks
                 like they are going to need it. Hovering the one button that
                 can start a download is that moment, and it buys the hundred
                 milliseconds the chunk takes. Idempotent. */
              onPointerEnter={preloadSpinner}
              disabled={empty}
              aria-label={playing ? `Pause ${title}` : `Play ${title}`}
            >
              <span
                className={`inkIcon ${styles.playGlyph}`}
                style={{ ["--icon" as string]: "url(/icons/player-play.svg)" }}
              />
              <span className={styles.pauseGlyph} aria-hidden="true">
                <i />
                <i />
              </span>
              {/* The site's own loader, the one the search card uses. 28 and
                  not smaller on purpose: below 24 that component never loads
                  the Lottie at all and falls back to its conic ring, because
                  a swept trim path under a couple of pixels reads as a
                  flickering dot. 28 inside a 36 disc is the smallest size that
                  still gets the real thing. */}
              {playing && buffering ? (
                <span className={styles.loader}>
                  <Spinner size={28} />
                </span>
              ) : null}
              {/* Figma's "Ellipse 85" — a ring drawn over the pause bars,
                  sweeping once as the preview runs. It used to double as the
                  buffering spinner; the Lottie above does that now, so this is
                  only ever the playhead and is hidden until there is progress
                  to report. `pathLength` normalises the circumference to 100
                  so the dash numbers are percentages. */}
              <svg
                className={styles.arc}
                viewBox="0 0 40 40"
                data-state={playing && !buffering ? "playing" : undefined}
                aria-hidden="true"
              >
                <circle ref={arcRef} cx="20" cy="20" r="19" pathLength="100" />
              </svg>
            </button>

            <button
              type="button"
              className={styles.step}
              onClick={() => step(1)}
              disabled={!canNext}
              aria-label="Next track"
            >
              <span
                className={`inkIcon ${styles.stepGlyph}`}
                style={{ ["--icon" as string]: "url(/icons/player-skip.svg)" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* What is playing, for anyone who cannot see the cover change. Skipping
          alters the artwork, the title and the play button's label and says
          nothing: the cover is `alt=""`, and a label on a button you are still
          standing on is not reliably re-announced. A permanently-mounted region
          whose text changes is the shape screen readers actually watch.

          The real length of the record lives here and nowhere else. The rail
          measures a thirty-second preview; printing "5:52" beside it would be
          a clock for a different thing. */}
      <p className="srOnly" role="status">
        {track
          ? `${playing ? "Playing a" : "A"} 30-second preview of ${title} by ${artist}${
              track.lengthMs ? ` (${timeLabel(track.lengthMs / 1000)})` : ""
            }`
          : `${title}. ${artist}.`}
      </p>
    </CardShell>
  );
}
