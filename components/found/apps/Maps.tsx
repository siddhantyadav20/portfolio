"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import { has } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import type { AppProps } from "./types";
import styles from "./Maps.module.css";

/* A hand-drawn district on a 100 × 140 sheet: the sea to the west, three
   east–west roads, the flyover, and the railway curving down past the mills.
   No map library — the whole city is these lines. */
const ROADS = [
  "M8 20 H96",
  "M10 60 H96",
  "M11 100 H96",
  "M24 0 V140",
  "M62 0 C60 40 66 80 62 140",
  "M88 0 V140",
  "M40 52 L74 72",
];
const LANES = ["M8 40 H96", "M10 80 H96", "M11 122 H96", "M44 0 V60", "M76 60 V140", "M36 100 V140"];
const RAIL = "M54 0 C52 40 58 70 50 100 C46 114 36 128 30 140";

export default function Maps({ state, nav, arg }: AppProps) {
  const pinFor = arg?.startsWith("pin:") ? arg.slice(4) : null;
  const question = pinFor ? ep.deductions.find((d) => d.id === pinFor) : undefined;
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const sharing = has(state, "fired:cliff-share");
  const t = (x: string) => say(x, state.cast);

  useEffect(() => {
    play.seeAll(ep.searches.map((s) => s.evidence));
  }, []);

  const tap = (id: string) => {
    setSelected(id);
    if (!question || result?.ok) return;
    const r = play.answer(question.id, id);
    if (r) setResult({ ok: r.ok, text: t(r.reply) });
  };

  const srm = ep.places.find((p) => p.id === "srm");
  const station = ep.places.find((p) => p.id === "station");

  return (
    <section className={styles.maps}>
      <svg viewBox="0 0 100 140" className={styles.map} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map">
        <rect width="100" height="140" className={styles.land} />
        <path d="M0 0 H8 C12 30 6 60 10 90 C13 110 8 125 11 140 H0 Z" className={styles.sea} />
        <ellipse cx="34" cy="28" rx="7" ry="5" className={styles.park} />
        {LANES.map((d) => (
          <path key={d} d={d} className={styles.lane} />
        ))}
        {ROADS.map((d) => (
          <path key={d} d={d} className={styles.road} />
        ))}
        <path d={RAIL} className={styles.railBed} />
        <path d={RAIL} className={styles.rail} />

        {ep.places.map((p) => (
          <g
            key={p.id}
            className={styles.place}
            data-on={selected === p.id || undefined}
            transform={`translate(${p.x} ${p.y})`}
            onClick={() => tap(p.id)}
            role="button"
            aria-label={p.label}
          >
            <circle r="7" className={styles.hit} />
            <circle r="4" className={styles.ring} />
            <circle r="2.1" className={styles.pin} />
            <text y="-4.6" className={styles.label}>
              {p.label}
            </text>
          </g>
        ))}

        {sharing && srm && station && (
          <g transform={`translate(${srm.x} ${srm.y})`}>
            <g
              className={styles.k}
              style={{ "--fx": `${station.x - srm.x}px`, "--fy": `${station.y - srm.y}px` } as CSSProperties}
            >
              <circle r="5" className={styles.kPulse} />
              <circle r="2.4" className={styles.kDot} />
              <text y="7.4" className={styles.kLabel}>
                K.
              </text>
            </g>
          </g>
        )}
      </svg>

      <div className={styles.sheet}>
        {question ? (
          <>
            <p className={styles.eyebrow}>{result?.ok ? "Solved" : "Pin it"}</p>
            <p className={styles.question}>{t(question.question)}</p>
            <p className={styles.reply} data-ok={result?.ok || undefined}>
              {result ? result.text : t(question.ask)}
            </p>
            <button type="button" className={styles.button} onClick={() => nav.go("notes")}>
              {result?.ok ? "Back to the case file" : "Cancel"}
            </button>
          </>
        ) : (
          <>
            {sharing && <p className={styles.sharing}>K. is sharing their location with you.</p>}
            <p className={styles.eyebrow}>Recents</p>
            <ul className={styles.recents}>
              {ep.searches.map((s) => (
                <li key={s.query}>
                  <button
                    type="button"
                    className={styles.recent}
                    onClick={() => s.place && setSelected(s.place)}
                  >
                    <span className={styles.recentQuery}>{s.query}</span>
                    <span className={styles.recentAt}>{s.at}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
