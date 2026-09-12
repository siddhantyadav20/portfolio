"use client";

import { useState } from "react";

import { story as ep } from "@/content/found/story";
import type { AppId, Deduction } from "@/content/found/types";
import { caseFile, deductionOpen, has, lockAvailable, sessionVars } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import AppBar from "./AppBar";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Notes.module.css";

const SOURCE: Record<AppId, string> = {
  envelope: "Envelope",
  lock: "Lock screen",
  messages: "Messages",
  photos: "Photos",
  calculator: "Vault",
  health: "Health",
  settings: "Settings",
  maps: "Maps",
  memos: "Voice Memos",
  notes: "Case file",
  guardian: "Guardian",
  nightcam: "NightCam",
  news: "News",
  food: "Dabba",
};

const REACTIONS: readonly [string, string][] = [
  ["no", "Not at all"],
  ["maybe", "I had a feeling"],
  ["yes", "Yes"],
];

const WORDS = ["none", "one", "two", "three"];

/** How many pieces of evidence a question wants shown together. */
const needed = (d: Deduction) => (d.answer.kind === "evidence" ? Math.min(...d.answer.accepts.map((c) => c.length)) : 1);

/** "Choose two", then "1 of 2 chosen": the count is part of the question. */
function chooseLabel(n: number, need: number): string {
  const word = WORDS[need] ?? String(need);
  if (n === 0) return `Choose ${word}`;
  if (n > need) return `That's more than ${word}`;
  return `${n} of ${need} chosen`;
}

/**
 * The case file: the player's own note on this phone. Everything they've
 * looked at is here, the open questions ask them to prove something with it
 * (or, once, to type the answer themselves), and "Think" is three hints deep,
 * ending in the answer. Nobody should quit because they're stuck; the funnel
 * will say where they needed it.
 *
 * Showing evidence takes exactly as many pieces as the proof needs, and says
 * how many. Ticking everything and pressing Show used to solve every
 * question; now Show waits for the right count, and the engine refuses
 * extras anyway.
 */
export default function Notes({ state, nav }: AppProps) {
  const vars = sessionVars(ep, state);
  const t = (x: string) => say(x, state.cast, vars);
  const [picking, setPicking] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [hints, setHints] = useState<Record<string, string>>({});

  const found = caseFile(ep, state);
  const open = ep.deductions.filter((d) => deductionOpen(state, d)).reverse();
  const solved = ep.deductions.filter((d) => has(state, `solved:${d.id}`)).reverse();
  const vault = ep.locks.find((l) => l.id === "vault");
  const vaultCard =
    vault && lockAvailable(state, vault) && !has(state, `lock:${vault.id}`) && vault.clues.some((c) => has(state, `seen:${c}`));
  const reacting = has(state, "solved:e2-who") && !has(state, "did:reacted");

  const think = (id: string) => {
    const h = play.hint(id);
    if (h) setHints((x) => ({ ...x, [id]: t(h) }));
  };

  // One piece of evidence behaves like a choice (tapping another swaps it);
  // two or more toggle.
  const toggle = (id: string, need: number) =>
    setPicked((p) => {
      if (need === 1) return p.has(id) ? new Set() : new Set([id]);
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const settle = (d: Deduction, pick: readonly string[] | string) => {
    const r = play.answer(d.id, pick);
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

        {reacting && (
          <article className={styles.react}>
            <p className={styles.reactEyebrow}>A question for you, not the case</p>
            <h3 className={styles.question}>Did you see that coming?</h3>
            <div className={styles.actions}>
              {REACTIONS.map(([k, label]) => (
                <button
                  type="button"
                  key={k}
                  className={styles.secondary}
                  onClick={() => {
                    play.verdict(`e2-saw:${k}`);
                    play.perform("react");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        )}

        {open.map((d) => (
          <article key={d.id} className={styles.card}>
            <p className={styles.eyebrow}>Open question</p>
            <h3 className={styles.question}>{t(d.question)}</h3>
            <p className={styles.ask}>{t(d.ask)}</p>
            {replies[d.id] && !replies[d.id].ok && <p className={styles.nudge}>{replies[d.id].text}</p>}
            {hints[d.id] && <p className={styles.hint}>{hints[d.id]}</p>}

            {d.answer.kind === "text" ? (
              <form
                className={styles.typed}
                onSubmit={(e) => {
                  e.preventDefault();
                  settle(d, typed[d.id] ?? "");
                }}
              >
                {/* The keyboard offers what this phone's owner types most. */}
                <div className={styles.suggest}>
                  {ep.keyboard.map((w) => (
                    <button type="button" key={w} className={styles.suggestion} onClick={() => setTyped((x) => ({ ...x, [d.id]: w }))}>
                      {w}
                    </button>
                  ))}
                </div>
                <div className={styles.typeRow}>
                  <input
                    className={styles.input}
                    value={typed[d.id] ?? ""}
                    onChange={(e) => setTyped((x) => ({ ...x, [d.id]: e.target.value }))}
                    placeholder="Type an answer"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-label={t(d.question)}
                  />
                  <button type="submit" className={styles.primary} disabled={!(typed[d.id] ?? "").trim()}>
                    Answer
                  </button>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.secondary} onClick={() => think(d.id)}>
                    Think
                  </button>
                </div>
              </form>
            ) : picking === d.id ? (
              <div className={styles.pick}>
                {found.length === 0 && <p className={styles.nudge}>Nothing found yet.</p>}
                <p className={styles.choose} data-over={picked.size > needed(d) || undefined}>
                  {chooseLabel(picked.size, needed(d))}
                </p>
                <ul className={styles.pickList}>
                  {found.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={styles.pickRow}
                        data-on={picked.has(e.id) || undefined}
                        onClick={() => toggle(e.id, needed(d))}
                      >
                        <span className={styles.check} aria-hidden="true" />
                        <span>{t(e.label)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={picked.size !== needed(d)}
                    onClick={() => settle(d, [...picked])}
                  >
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
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => {
                      setPicking(d.id);
                      setPicked(new Set());
                    }}
                  >
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
