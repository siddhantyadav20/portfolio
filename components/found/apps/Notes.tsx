"use client";

import { useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import type { AppId, Deduction } from "@/content/found/types";
import { caseFile, deductionOpen, has, lockAvailable } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import AppBar from "./AppBar";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Notes.module.css";

const SOURCE: Record<AppId, string> = {
  lock: "Lock screen",
  messages: "Messages",
  photos: "Photos",
  calculator: "Vault",
  health: "Health",
  settings: "Settings",
  maps: "Maps",
  memos: "Voice Memos",
  notes: "Case file",
};

/**
 * The case file: the player's own note on this phone. Everything they've
 * looked at is here, the open questions ask them to prove something with it,
 * and "Think" is three hints deep, ending in the answer. Nobody should quit
 * because they're stuck; the funnel will say where they needed it.
 */
export default function Notes({ state, nav }: AppProps) {
  const t = (x: string) => say(x, state.cast);
  const [picking, setPicking] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [replies, setReplies] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [hints, setHints] = useState<Record<string, string>>({});

  const found = caseFile(ep, state);
  const open = ep.deductions.filter((d) => deductionOpen(state, d));
  const solved = ep.deductions.filter((d) => has(state, `solved:${d.id}`));
  const vault = ep.locks.find((l) => l.id === "vault");
  const vaultCard =
    vault && lockAvailable(state, vault) && !has(state, `lock:${vault.id}`) && vault.clues.some((c) => has(state, `seen:${c}`));

  const think = (id: string) => {
    const h = play.hint(id);
    if (h) setHints((x) => ({ ...x, [id]: t(h) }));
  };

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const present = (d: Deduction) => {
    const r = play.answer(d.id, [...picked]);
    if (!r) return;
    setReplies((x) => ({ ...x, [d.id]: { ok: r.ok, text: t(r.reply) } }));
    if (r.ok) {
      setPicking(null);
      setPicked(new Set());
    }
  };

  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>Case file</h2>
        <p className={styles.who}>
          {state.cast.name} {ep.surname}, 19. Missing since Friday night.
        </p>

        {open.map((d) => (
          <article key={d.id} className={styles.card}>
            <p className={styles.eyebrow}>Open question</p>
            <h3 className={styles.question}>{t(d.question)}</h3>
            <p className={styles.ask}>{t(d.ask)}</p>
            {replies[d.id] && !replies[d.id].ok && <p className={styles.nudge}>{replies[d.id].text}</p>}
            {hints[d.id] && <p className={styles.hint}>{hints[d.id]}</p>}

            {picking === d.id ? (
              <div className={styles.pick}>
                {found.length === 0 && <p className={styles.nudge}>Nothing found yet.</p>}
                <ul className={styles.pickList}>
                  {found.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={styles.pickRow}
                        data-on={picked.has(e.id) || undefined}
                        onClick={() => toggle(e.id)}
                      >
                        <span className={styles.check} aria-hidden="true" />
                        <span>{t(e.label)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className={styles.actions}>
                  <button type="button" className={styles.primary} disabled={picked.size === 0} onClick={() => present(d)}>
                    Show
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => {
                      setPicking(null);
                      setPicked(new Set());
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.actions}>
                {d.answer.kind === "place" ? (
                  <button type="button" className={styles.primary} onClick={() => nav.go("maps", `pin:${d.id}`)}>
                    Pin it on the map
                  </button>
                ) : (
                  <button type="button" className={styles.primary} onClick={() => setPicking(d.id)}>
                    Show evidence
                  </button>
                )}
                <button type="button" className={styles.secondary} onClick={() => think(d.id)}>
                  Think
                </button>
              </div>
            )}
          </article>
        ))}

        {vaultCard && vault && (
          <article className={styles.card}>
            <p className={styles.eyebrow}>Locked</p>
            <h3 className={styles.question}>{t("{name} hid something on this phone.")}</h3>
            {hints[vault.id] && <p className={styles.hint}>{hints[vault.id]}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => think(vault.id)}>
                Think
              </button>
            </div>
          </article>
        )}

        {solved.length > 0 && <p className={app.groupLabel}>Solved</p>}
        {solved.map((d) => (
          <article key={d.id} className={styles.solved}>
            <h3 className={styles.solvedQ}>{t(d.question)}</h3>
            <p className={styles.solvedA}>{t(d.right)}</p>
          </article>
        ))}

        <p className={app.groupLabel}>Found ({found.length})</p>
        {found.length === 0 ? (
          <p className={styles.emptyNote}>Nothing yet. Look around the phone: what you open, you keep.</p>
        ) : (
          <ul className={app.group}>
            {[...found].reverse().map((e) => (
              <li key={e.id} className={styles.item}>
                <span className={styles.itemLabel}>{t(e.label)}</span>
                <span className={styles.itemDetail}>{t(e.detail)}</span>
                <span className={styles.itemSource}>{SOURCE[e.app]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
