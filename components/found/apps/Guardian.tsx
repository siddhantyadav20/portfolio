"use client";

import { story as ep } from "@/content/found/story";
import { has, morning } from "@/lib/found/engine";
import AppBar from "./AppBar";
import GuardianCard from "./GuardianCard";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./More.module.css";

/**
 * Mum's monitoring app, on page two of the home screen where it's sat since
 * {name} was fifteen. In Episode 1 it's a boring settings screen that happens
 * to be counting you. In Episode 2 it's Monday's report.
 */
export default function Guardian({ state }: AppProps) {
  const ep2 = has(state, "ep:2");
  const ms = Object.entries(state.usage)
    .filter(([k]) => k.startsWith("1:"))
    .reduce((n, [, v]) => n + v, 0);
  const top = Object.entries(state.usage)
    .filter(([k]) => k.startsWith("1:"))
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    .slice(2);
  const unlocked = state.at["lock:passcode"];

  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>Guardian</h2>
        <p className={styles.lede}>This phone is monitored by {ep.guardian.owner}.</p>
        <ul className={app.group}>
          <li className={app.row}>
            <span className={app.rowMain}>
              <span className={app.rowTitle}>Monitoring since</span>
            </span>
            <span className={app.rowMeta}>{ep.guardian.since}</span>
          </li>
          <li className={app.row}>
            <span className={app.rowMain}>
              <span className={app.rowTitle}>Daily activity report</span>
            </span>
            <span className={app.rowMeta}>On</span>
          </li>
          <li className={app.row}>
            <span className={app.rowMain}>
              <span className={app.rowTitle}>Location</span>
            </span>
            <span className={app.rowMeta}>On</span>
          </li>
        </ul>

        {ep2 ? (
          <>
            <p className={app.groupLabel}>Monday&apos;s report</p>
            <GuardianCard state={state} />
            <p className={styles.small}>Viewed by Anjali · Mon 11:40</p>
          </>
        ) : (
          <>
            <p className={app.groupLabel}>Today so far</p>
            <ul className={app.group}>
              <li className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>First pickup</span>
                </span>
                <span className={app.rowMeta}>{unlocked ? morning(state, unlocked) : "—"}</span>
              </li>
              <li className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>On screen</span>
                </span>
                <span className={app.rowMeta}>{Math.max(1, Math.round(ms / 60_000))} min</span>
              </li>
              <li className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>Most used</span>
                </span>
                <span className={app.rowMeta}>{top ?? "—"}</span>
              </li>
            </ul>
            <p className={styles.small}>Reports are sent to Anjali every day at 11:00.</p>
          </>
        )}
      </div>
    </section>
  );
}
