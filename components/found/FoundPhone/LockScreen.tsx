"use client";

import { useEffect, useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import type { CaseState } from "@/lib/found/engine";
import { keyTap, refuse } from "@/lib/found/buzz";
import { say } from "@/lib/found/voice";
import * as play from "./actions";
import styles from "./LockScreen.module.css";

const LENGTH = ep.locks.find((l) => l.id === "passcode")?.answer.length ?? 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * The first puzzle. The notifications say someone is frightened; the passcode
 * pad offers Emergency, like every real phone does; and Emergency shows a
 * Medical ID with a birthday on it. That is the whole trick, and it's a real
 * one, which is why it lands.
 */
export default function LockScreen({ state }: { state: CaseState }) {
  const [mode, setMode] = useState<"glance" | "pad" | "medical">("glance");
  const [code, setCode] = useState("");
  const [shakes, setShakes] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const t = (x: string) => say(x, state.cast);
  const med = ep.lockscreen.medical;

  const press = (digit: string) => {
    if (code.length >= LENGTH) return;
    keyTap();
    const next = code + digit;
    setCode(next);
    if (next.length === LENGTH && !play.unlock("passcode", next)) {
      refuse();
      window.setTimeout(() => {
        setCode("");
        setShakes((n) => n + 1);
      }, 220);
    }
  };

  const erase = () => setCode((c) => c.slice(0, -1));

  const openMedical = () => {
    setMode("medical");
    play.see(med.evidence);
  };

  useEffect(() => {
    if (mode !== "pad") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") erase();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (mode === "medical") {
    return (
      <div className={styles.medical}>
        <div className={styles.medHead}>
          <span className={styles.medStar} aria-hidden="true">✱</span>
          <h2>Medical ID</h2>
          <button type="button" className={styles.done} onClick={() => setMode("pad")}>
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

  if (mode === "pad") {
    return (
      <div className={styles.lock} data-dim>
        <p className={styles.padTitle}>Enter passcode</p>
        <div key={shakes} className={styles.dots} data-shake={shakes > 0 || undefined}>
          {Array.from({ length: LENGTH }, (_, i) => (
            <span key={i} className={styles.dot} data-on={i < code.length || undefined} />
          ))}
        </div>
        {hint ? <p className={styles.hint}>{t(hint)}</p> : <p className={styles.hint} />}
        <div className={styles.keys}>
          {KEYS.map((k) => (
            <button type="button" key={k} className={styles.key} onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button type="button" className={styles.word} onClick={openMedical}>
            Emergency
          </button>
          <button type="button" className={styles.key} onClick={() => press("0")}>
            0
          </button>
          <button type="button" className={styles.word} onClick={code ? erase : () => setMode("glance")}>
            {code ? "Delete" : "Cancel"}
          </button>
        </div>
        <button type="button" className={styles.forgot} onClick={() => setHint(play.hint("passcode"))}>
          Forgot passcode?
        </button>
      </div>
    );
  }

  return (
    <button type="button" className={styles.lock} onClick={() => setMode("pad")}>
      <span className={styles.top}>
        <span className={styles.day}>Monday</span>
        <span className={styles.clock}>08:12</span>
      </span>
      <span className={styles.notes}>
        {ep.lockscreen.notifications.map((n) => (
          <span key={n.from} className={styles.note}>
            <span className={styles.noteFrom}>{n.from}</span>
            <span className={styles.noteText}>{t(n.text)}</span>
          </span>
        ))}
      </span>
      <span className={styles.swipe}>Tap to unlock</span>
    </button>
  );
}
