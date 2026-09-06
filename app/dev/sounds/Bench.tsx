"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { copyToClipboard } from "@/lib/clipboard";
import { CUES, SFX } from "@/lib/sfx-manifest";
import { play, ready, sustain, warm, type Sustain } from "@/lib/sfx";
import { setSoundOn, soundOn } from "@/lib/sound";

import { BOARD, type Row, type Stop } from "./board";
import styles from "./Bench.module.css";

/** Long enough to hear one cue end before the next begins, short enough that
 *  the run still reads as one board rather than as twenty auditions. */
const RUN_GAP_MS = 750;
/** How long a sustained cue is held for during a full run. */
const HOLD_MS = 1100;

export default function Bench() {
  const [gains, setGains] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  /** Whatever is currently sounding, so a second press stops the first. */
  const held = useRef<{ synth?: Stop; sample?: Sustain }>({});
  const run = useRef<number[]>([]);

  useEffect(() => {
    warm(...CUES);

    /* Polled rather than pushed. `lib/sfx` deliberately exposes readiness as a
       synchronous predicate — the real callers are pointer handlers that
       cannot await anything — so there is no event to subscribe to, and a
       400ms poll on a development page is cheaper than an API the site itself
       would never use.

       The mute rides along on the same timer rather than being read once on
       mount: it is stored in localStorage and shared with the command palette,
       so it can change from outside this page, and reading it during render
       would disagree with the server's default and trip hydration. */
    const timer = window.setInterval(() => {
      setAvailable(new Set(CUES.filter((cue) => ready(cue))));
      setMuted(!soundOn());
    }, 400);
    return () => window.clearInterval(timer);
  }, []);

  const release = useCallback(() => {
    held.current.synth?.();
    held.current.sample?.stop();
    held.current = {};
  }, []);

  const stopRun = useCallback(() => {
    for (const t of run.current) window.clearTimeout(t);
    run.current = [];
    release();
    setRunning(null);
  }, [release]);

  useEffect(() => () => stopRun(), [stopRun]);

  const fireSynth = useCallback(
    (row: Row) => {
      release();
      const stop = row.synth?.();
      if (typeof stop === "function") held.current.synth = stop;
    },
    [release],
  );

  const fireSample = useCallback(
    (row: Row) => {
      if (!row.cue) return;
      release();
      if (row.sustained) {
        const handle = sustain(row.cue);
        if (handle) {
          handle.level(gains[row.id] ?? 0.6);
          held.current.sample = handle;
        }
      } else {
        play(row.cue, { level: gains[row.id] ?? 1 });
      }
    },
    [gains, release],
  );

  /** The whole board, in order. The only way to hear whether two cues are the
   *  same object — which is the actual complaint this page exists to answer. */
  const playBoard = useCallback(
    (source: "synth" | "sample") => {
      stopRun();
      let at = 0;
      for (const row of BOARD) {
        if (source === "sample" && !row.cue) continue;
        if (source === "sample" && !available.has(row.cue!)) continue;

        run.current.push(
          window.setTimeout(() => {
            setRunning(row.id);
            if (source === "synth") fireSynth(row);
            else fireSample(row);
            if (row.sustained) {
              run.current.push(window.setTimeout(release, HOLD_MS));
            }
          }, at),
        );
        at += RUN_GAP_MS + (row.sustained ? HOLD_MS : 0);
      }
      run.current.push(window.setTimeout(() => setRunning(null), at));
    },
    [available, fireSample, fireSynth, release, stopRun],
  );

  const copyGains = useCallback(() => {
    /* Emitted in the shape samples.config.mjs wants, so the answer to "which
       level was right" is pasted rather than transcribed. */
    const lines = BOARD.filter((r) => r.cue && gains[r.id] !== undefined)
      .map((r) => `  "${r.cue}": { gain: ${(gains[r.id] ?? 1).toFixed(2)} },`)
      .join("\n");
    void copyToClipboard(lines || "// nothing adjusted yet");
  }, [gains]);

  return (
    <main className={styles.bench}>
      <header className={styles.head}>
        <h1>Sound bench</h1>
        <p>
          Every cue on the site, synthesised against recorded. Play the board end to end
          before judging any single row — “everything sounds the same” is a statement
          about the gaps between these, not about any one of them.
        </p>
        <div className={styles.controls}>
          <button onClick={() => playBoard("synth")}>▶ Play the board · synthesised</button>
          <button onClick={() => playBoard("sample")} disabled={available.size === 0}>
            ▶ Play the board · recorded
          </button>
          <button onClick={stopRun}>■ Stop</button>
          <button onClick={copyGains}>Copy gains</button>
          <button
            onClick={() => {
              const next = !soundOn();
              setSoundOn(next);
              setMuted(!next);
            }}
          >
            {muted ? "Unmute the site" : "Mute the site"}
          </button>
        </div>
        {muted ? (
          <p className={styles.warn}>
            The site is muted — that is the real mute, shared with the command palette, so
            nothing here will make a sound until it is off.
          </p>
        ) : null}
        {available.size === 0 ? (
          <p className={styles.warn}>
            No recordings yet. Every row falls back to its synthesised cue, which is the
            intended state until sounds are chosen — fill in <code>samples.config.mjs</code>{" "}
            and run <code>node scripts/build-samples.mjs</code>.
          </p>
        ) : (
          <p className={styles.ok}>
            {available.size} of {CUES.length} cues have a recording.
          </p>
        )}
      </header>

      <ol className={styles.rows}>
        {BOARD.map((row) => {
          const has = row.cue ? available.has(row.cue) : false;
          const takes = row.cue ? SFX[row.cue].takes.length : 0;
          return (
            <li
              key={row.id}
              className={`${styles.row} ${running === row.id ? styles.active : ""} ${
                row.abstract ? styles.abstract : ""
              }`}
            >
              <div className={styles.label}>
                <strong>{row.label}</strong>
                <span className={styles.object}>{row.object}</span>
                {row.note ? <span className={styles.note}>{row.note}</span> : null}
              </div>

              <div className={styles.buttons}>
                <button
                  onPointerDown={() => fireSynth(row)}
                  onPointerUp={row.sustained ? release : undefined}
                  onPointerLeave={row.sustained ? release : undefined}
                  disabled={!row.synth}
                >
                  {row.sustained ? "hold" : "play"} · synth
                </button>

                {row.abstract ? (
                  <span className={styles.stays}>stays synthesised</span>
                ) : (
                  <button
                    onPointerDown={() => fireSample(row)}
                    onPointerUp={row.sustained ? release : undefined}
                    onPointerLeave={row.sustained ? release : undefined}
                    disabled={!has}
                    className={styles.sample}
                  >
                    {has ? `${row.sustained ? "hold" : "play"} · recorded` : "no recording"}
                    {takes > 1 ? <em> ×{takes}</em> : null}
                  </button>
                )}
              </div>

              {row.abstract ? (
                <div className={styles.slider} />
              ) : (
                <label className={styles.slider}>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.01}
                    value={gains[row.id] ?? 1}
                    onChange={(e) =>
                      setGains((g) => ({ ...g, [row.id]: Number(e.target.value) }))
                    }
                  />
                  <span>{(gains[row.id] ?? 1).toFixed(2)}</span>
                </label>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
