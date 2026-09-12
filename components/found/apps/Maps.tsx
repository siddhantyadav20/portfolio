"use client";

import { useEffect, useState } from "react";

import { story as ep } from "@/content/found/story";
import { all, has, sessionVars } from "@/lib/found/engine";
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

/**
 * Maps. Its Recents are {name}'s Friday, and — once you've pinned the mill —
 * your Monday, right underneath. At the end of Episode 1 it shows who else
 * can see this phone: the dot that's sharing with K. is you.
 */
export default function Maps({ state, nav, arg }: AppProps) {
  const pinFor = arg?.startsWith("pin:") ? arg.slice(4) : null;
  const question = pinFor ? ep.deductions.find((d) => d.id === pinFor) : undefined;
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const exposed = has(state, "fired:cliff-you");
  const vars = sessionVars(ep, state);
  const t = (x: string) => say(x, state.cast, vars);
  const searches = ep.searches.filter((s) => all(state, s.requires));

  useEffect(() => {
    play.seeAll(ep.searches.map((s) => s.evidence));
  }, []);

  const tap = (id: string) => {
    setSelected(id);
    if (!question || result?.ok) return;
    const r = play.answer(question.id, id);
    if (r) setResult({ ok: r.ok, text: t(r.reply) });
  };

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

        {/* This phone, 14 km north. The one K. has been watching. */}
        {exposed && (
          <g transform="translate(90 7)">
            <g className={styles.you}>
              <circle r="4.6" className={styles.youPulse} />
              <circle r="2.3" className={styles.youDot} />
              <path d="M-1.6 -6.2 L0 -8.4 L1.6 -6.2" className={styles.youArrow} />
              <text x="-4.6" y="1.2" className={styles.youLabel}>
                You · 14 km
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
            {exposed && <p className={styles.sharing}>This phone is sharing its location with K. The blue dot is you.</p>}
            <p className={styles.eyebrow}>Recents</p>
            <ul className={styles.recents}>
              {searches.map((s) => (
                <li key={`${s.query}:${s.at}`}>
                  <button type="button" className={styles.recent} onClick={() => s.place && setSelected(s.place)}>
                    <span className={styles.recentQuery}>{s.query}</span>
                    <span className={styles.recentAt}>
                      {t(s.at)}
                      {s.byYou && <span className={styles.byYou}>this phone, after it reached you</span>}
                    </span>
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
