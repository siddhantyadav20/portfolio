"use client";

import { useState } from "react";

import { story as ep } from "@/content/found/story";
import { all, has, sessionVars } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import AppBar from "./AppBar";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./More.module.css";

/**
 * The city, reporting on what the player did. Some paragraphs are only true
 * for this player — the photo they restored, the receipts they switched off,
 * the reply they sent — because the police are reading the same phone.
 */
export default function News({ state }: AppProps) {
  const vars = sessionVars(ep, state);
  const t = (x: string) => say(x, state.cast, vars);
  const list = ep.headlines.filter((h) => all(state, h.requires)).reverse();
  const [open, setOpen] = useState<string | null>(null);
  const story = list.find((h) => h.id === open);

  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>News</h2>
        {list.length === 0 ? (
          <p className={app.empty}>No new stories. Background refresh is off in Low Power Mode.</p>
        ) : (
          <ul className={styles.news}>
            {list.map((h) => (
              <li key={h.id}>
                <button type="button" className={styles.newsItem} onClick={() => setOpen(h.id)}>
                  <span className={styles.newsSource}>City Desk · {h.at}</span>
                  <span className={styles.newsTitle}>{t(h.title)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {story && (
        <section className={app.view}>
          <AppBar title="City Desk" onBack={() => setOpen(null)} backLabel="News" />
          <div className={app.body}>
            <p className={styles.newsSource}>{story.at}</p>
            <h2 className={styles.articleTitle}>{t(story.title)}</h2>
            {story.lines
              .filter((l) => all(state, l.requires) && !(l.unless ?? []).some((f) => has(state, f)))
              .map((l) => (
                <p key={l.text} className={styles.para}>
                  {t(l.text)}
                </p>
              ))}
          </div>
        </section>
      )}
    </section>
  );
}
