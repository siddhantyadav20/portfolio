"use client";

import { useEffect, useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import * as play from "../FoundPhone/actions";
import AppBar from "./AppBar";
import app from "./App.module.css";
import styles from "./Health.module.css";

const PEAK = Math.max(1, ...ep.health.flatMap((d) => d.hours));

/**
 * Steps, by day. It opens on the latest day, which is a flat line; Friday is
 * one tap back, and Friday doesn't stop at ten o'clock.
 */
export default function Health() {
  const [index, setIndex] = useState(ep.health.length - 1);
  const day = ep.health[index];
  const total = day.hours.reduce((a, b) => a + b, 0);

  useEffect(() => {
    play.see(day.evidence);
  }, [day]);

  return (
    <section className={app.view}>
      <AppBar title="Steps" />
      <div className={app.body}>
        <div className={styles.segment} role="tablist">
          {ep.health.map((d, i) => (
            <button
              type="button"
              key={d.day}
              role="tab"
              aria-selected={i === index}
              className={styles.seg}
              data-on={i === index || undefined}
              onClick={() => setIndex(i)}
            >
              {d.day}
            </button>
          ))}
        </div>

        <p className={styles.label}>Total</p>
        <p className={styles.total}>
          {total.toLocaleString("en-IN")}
          <span> steps</span>
        </p>

        <div className={styles.chart} aria-hidden="true">
          {day.hours.map((h, i) => (
            <span key={i} className={styles.col}>
              <span className={styles.bar} style={{ height: `${(h / PEAK) * 100}%` }} data-late={i >= 22 || undefined} />
            </span>
          ))}
        </div>
        <div className={styles.axis} aria-hidden="true">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
        </div>

        {day.walk ? (
          <div className={styles.walk}>
            <p className={styles.walkKind}>Walking</p>
            <p className={styles.walkKm}>
              {day.walk.km}
              <span> km</span>
            </p>
            <p className={styles.walkTime}>
              {day.walk.from} – {day.walk.to}
            </p>
          </div>
        ) : total === 0 ? (
          <p className={styles.none}>No data recorded.</p>
        ) : null}
      </div>
    </section>
  );
}
