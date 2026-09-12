"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { story as ep } from "@/content/found/story";
import type { CaseState } from "@/lib/found/engine";
import { keyTap, refuse } from "@/lib/found/buzz";
import { say } from "@/lib/found/voice";
import * as play from "./actions";
import { drag } from "./drag";
import styles from "./LockScreen.module.css";

const LOCK = ep.locks.find((l) => l.id === "passcode");
const LENGTH = LOCK?.answer.length ?? 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
/** Lifted this far (px), or flicked, the lock screen lets go and asks for the code. */
const LET_GO = 90;

/** What piled up while it was dead, grouped the way a lock screen stacks it. */
const BACKLOG: { from: string; text: string }[] = [
  ...ep.threads
    .map((t) => ({ from: t.contact, n: t.messages.filter((m) => m.requires?.includes("ep:2")).length }))
    .filter((r) => r.n > 0)
    .map((r) => ({ from: r.from, text: `${r.n} new message${r.n === 1 ? "" : "s"}` })),
  { from: "City Desk", text: `${ep.headlines.filter((h) => h.requires?.includes("ep:2")).length} stories` },
];

/**
 * The first puzzle. The notifications say someone is frightened, and the
 * newest says not to unlock it; the passcode pad offers Emergency, like every
 * real phone does; and Emergency shows a Medical ID with a birthday on it.
 *
 * Nobody should be stuck here for long, least of all someone who has never
 * owned an iPhone. "Forgot passcode?" is three hints deep and says so ("Still
 * stuck?"); from the second wrong code on, each miss brings the next hint
 * unasked; and once a hint has named Emergency, Emergency pulses.
 *
 * The lock screen lifts away with a swipe up, as a phone's does; a tap still
 * works, for a mouse.
 *
 * After Episode 2's restart it asks again, as a phone does, over three days
 * of backlog. By then the player knows the code by heart.
 */
export default function LockScreen({
  state,
  mode,
  clock,
}: {
  state: CaseState;
  mode: "first" | "restart";
  clock: string;
}) {
  const [screen, setScreen] = useState<"glance" | "pad" | "medical">("glance");
  const [code, setCode] = useState("");
  const [shakes, setShakes] = useState(0);
  const [asked, setAsked] = useState(false);
  const [lift, setLift] = useState(0);
  const [dragging, setDragging] = useState(false);
  const t = (x: string) => say(x, state.cast);
  const med = ep.lockscreen.medical;
  const notes = mode === "restart" ? BACKLOG : ep.lockscreen.notifications;
  const tier = state.hints.passcode ?? 0;
  const hint = asked && tier > 0 ? LOCK?.hints?.[tier - 1] : undefined;

  const ask = () => {
    play.hint("passcode");
    setAsked(true);
  };

  const press = (digit: string) => {
    if (code.length >= LENGTH) return;
    keyTap();
    const next = code + digit;
    setCode(next);
    if (next.length !== LENGTH) return;
    const ok = mode === "restart" ? play.unlockAfterRestart(next) : play.unlock("passcode", next);
    if (ok) return;
    refuse();
    const misses = shakes + 1;
    window.setTimeout(() => {
      setCode("");
      setShakes(misses);
    }, 220);
    if (misses >= 2 && tier < Math.min(3, misses - 1)) ask();
  };

  const erase = () => setCode((c) => c.slice(0, -1));

  const openMedical = () => {
    setScreen("medical");
    play.see(med.evidence);
  };

  const liftUp = (e: React.PointerEvent) =>
    drag(e, {
      engage: (dx, dy) => dy < 0 && -dy > Math.abs(dx),
      move: (_dx, dy) => {
        setDragging(true);
        setLift(Math.max(0, -dy));
      },
      end: ({ dy, vy }) => {
        setDragging(false);
        if (-dy < LET_GO && vy > -0.45) {
          setLift(0);
          return;
        }
        setLift(480);
        window.setTimeout(() => {
          setScreen("pad");
          setLift(0);
        }, 200);
      },
    });

  useEffect(() => {
    if (screen !== "pad") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") erase();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (screen === "medical") {
    return (
      <div className={styles.medical}>
        <div className={styles.medHead}>
          <span className={styles.medStar} aria-hidden="true">
            ✱
          </span>
          <h2>Medical ID</h2>
          <button type="button" className={styles.done} onClick={() => setScreen("pad")}>
            Done
          </button>
        </div>
        <p className={styles.medName}>{t(med.name)}</p>
        <dl className={styles.medList}>
          <div>
            <dt>Date of birth</dt>
            <dd>{med.born}</dd>
          </div>
          <div>
            <dt>Blood type</dt>
            <dd>{med.blood}</dd>
          </div>
          <div>
            <dt>Emergency contact</dt>
            <dd>{med.contact}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (screen === "pad") {
    return (
      <div className={styles.lock} data-dim>
        <p className={styles.padTitle}>Enter passcode</p>
        {mode === "restart" && <p className={styles.restart}>Your passcode is required after the phone restarts</p>}
        <div key={shakes} className={styles.dots} data-shake={shakes > 0 || undefined}>
          {Array.from({ length: LENGTH }, (_, i) => (
            <span key={i} className={styles.dot} data-on={i < code.length || undefined} />
          ))}
        </div>
        {hint ? (
          <p key={tier} className={styles.hint} data-new>
            {t(hint)}
          </p>
        ) : (
          <p className={styles.hint} />
        )}
        <div className={styles.keys}>
          {KEYS.map((k) => (
            <button type="button" key={k} className={styles.key} onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button
            type="button"
            className={styles.word}
            data-point={(asked && tier === 2) || undefined}
            onClick={openMedical}
          >
            Emergency
          </button>
          <button type="button" className={styles.key} onClick={() => press("0")}>
            0
          </button>
          <button type="button" className={styles.word} onClick={code ? erase : () => setScreen("glance")}>
            {code ? "Delete" : "Cancel"}
          </button>
        </div>
        {!(asked && tier >= 3) && (
          <button type="button" className={styles.forgot} onClick={ask}>
            {asked ? "Still stuck?" : "Forgot passcode?"}
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.lock}
      data-dragging={dragging || undefined}
      style={{ "--lift": `${lift}px`, "--fade": String(Math.max(0, 1 - lift / 240)) } as CSSProperties}
      onClick={() => setScreen("pad")}
      onPointerDown={liftUp}
    >
      <span className={styles.slide}>
        <span className={styles.top}>
          <span className={styles.day}>Monday</span>
          <span className={styles.clock}>{clock}</span>
        </span>
        <span className={styles.notes}>
          {notes.map((n) => (
            <span key={`${n.from}:${n.text}`} className={styles.note}>
              <span className={styles.noteFrom}>{n.from}</span>
              <span className={styles.noteText}>{t(n.text)}</span>
            </span>
          ))}
        </span>
        <span className={styles.swipe}>Swipe up to unlock</span>
      </span>
    </button>
  );
}
