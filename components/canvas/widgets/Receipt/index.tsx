"use client";

import { useState, useSyncExternalStore } from "react";
import { print } from "./printer";
import { receipt as data } from "@/content/canvas";
import styles from "./Receipt.module.css";

/* ===========================================================================
   The design receipt.

   Ported from references/canvas/Design Receipt.tsx. The original priced each
   skill from a jittered PRNG at render time; the prices here are the ones the
   live canvas actually shows, lifted into content/canvas.ts. That is not a
   simplification — a receipt whose totals change on reload is a receipt nobody
   can screenshot, and the numbers are content now rather than an accident of
   the seed.

   Two things still have to be generated rather than authored: the torn paper
   edges and the barcode. Both use a fixed-seed PRNG at module scope, so the
   server and the client draw the same paper and React has nothing to correct.
   =========================================================================== */

const WIDTH = 280;
const EDGE_H = 8;
const TEETH = 38;

/** mulberry32 — small, fast, and identical on both sides of hydration. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A torn edge: a jagged run of points along one side, flat along the other,
 * filled with the paper colour so it eats into whatever is behind it.
 */
function tornEdge(seed: number, top: boolean) {
  const rand = mulberry32(seed);
  const step = WIDTH / TEETH;
  const pts: string[] = [];
  for (let i = 0; i <= TEETH; i++) {
    const x = +(i * step).toFixed(1);
    const y = top ? +(rand() * 7).toFixed(1) : +(EDGE_H - rand() * 7).toFixed(1);
    pts.push(`L${x},${y}`);
  }
  return top
    ? `M0,${EDGE_H} ${pts.join(" ")} L${WIDTH},${EDGE_H} Z`
    : `M0,0 ${pts.join(" ")} L${WIDTH},0 Z`;
}

const TOP_EDGE = tornEdge(9271, true);
const BOTTOM_EDGE = tornEdge(4517, false);

/** Code128-flavoured: alternating ink and gap in 1–3px modules. Not a real
 *  barcode and not pretending to be — it reads as one at a glance, which is
 *  the whole job. */
const BARS = (() => {
  const rand = mulberry32(20240042);
  // x is resolved here rather than accumulated during render — a running total
  // mutated inside JSX is a variable outliving its render, which React 19
  // rightly refuses.
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  let ink = true;
  while (x < WIDTH - 48) {
    const w = 1 + Math.floor(rand() * 3);
    if (ink) bars.push({ x, w });
    x += w;
    ink = !ink;
  }
  return bars;
})();

const money = (n: number) => `$${n.toFixed(2)}`;

export default function Receipt() {
  const [stamped, setStamped] = useState(false);

  // Empty on the server, the local clock on the client. A receipt printed
  // "just now" is the joke, but `new Date()` during render is a guaranteed
  // hydration mismatch: the two clocks are never the same millisecond and
  // frequently not the same timezone.
  const printedAt = useSyncExternalStore(subscribePrinted, printedNow, () => null);

  return (
    <div
      className={styles.paper}
      data-canvas-interactive=""
      onClick={() => {
        // Both directions: the head travels to stamp it and travels to clear it.
        print();
        setStamped((s) => !s);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setStamped((s) => !s);
        }
      }}
      aria-label="Design receipt — press to stamp"
    >
      <svg className={styles.edgeTop} viewBox={`0 0 ${WIDTH} ${EDGE_H}`} aria-hidden="true">
        <path d={TOP_EDGE} />
      </svg>

      <div className={styles.body}>
        <p className={styles.stars}>★ ★ ★</p>
        <h3 className={styles.title}>{data.title}</h3>
        <p className={styles.sub}>{data.subtitle}</p>

        <p className={styles.meta}>ORDER #{data.order}</p>
        {/* Reserves its line before the clock arrives, so the paper doesn't
            jump a row on hydration. */}
        <p className={styles.meta}>{printedAt ?? " "}</p>

        <Rule dashed />

        <p className={styles.name}>{data.name}</p>
        <p className={styles.role}>{data.role}</p>

        <Rule dashed />

        <Section label="Items" />
        {data.items.map((it) => (
          <Row key={it.label} left={it.label} right={money(it.price)} />
        ))}

        <Rule dashed />

        <Section label="Tools used" />
        {data.tools.map((t) => (
          <Row key={t} left={t} right={data.toolFrequency} muted />
        ))}

        <Rule dashed />

        {data.stats.map((s) => (
          <Row key={s.label} left={s.label.toUpperCase()} right={s.value} small />
        ))}

        <Rule />

        <Row left="SUBTOTAL" right={money(data.subtotal)} />
        <Row left="CREATIVITY TAX" right={data.creativityTax.toUpperCase()} muted />
        <Row left="TOTAL XP" right={data.total.toUpperCase()} strong />

        <Rule dashed />

        <p className={styles.footer}>{data.footer[0]}</p>
        <p className={styles.footer}>{data.footer[1]}</p>
        <p className={styles.stars}>★ ★ ★</p>

        <svg
          className={styles.barcode}
          viewBox={`0 0 ${WIDTH - 48} 46`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {BARS.map((b) => (
            <rect key={b.x} x={b.x} y={0} width={b.w} height={46} />
          ))}
        </svg>
        <p className={styles.barcodeNo}>{data.barcode}</p>

        {/* The stamp. Rotated, oversized, and slammed down on click — the one
            moment of theatre on an otherwise deadpan object. */}
        <span className={styles.stamp} data-on={stamped ? "" : undefined} aria-hidden="true">
          {data.stamp[0]}
          <br />
          {data.stamp[1]}
        </span>
      </div>

      <svg className={styles.edgeBottom} viewBox={`0 0 ${WIDTH} ${EDGE_H}`} aria-hidden="true">
        <path d={BOTTOM_EDGE} />
      </svg>
    </div>
  );
}

/* The timestamp, as a client-only external value.

   Cached at module scope because getSnapshot must return a stable reference —
   formatting a fresh Date on every call would hand React a new string each
   render and spin it. The receipt is stamped once, when the page loads, which
   is exactly what a printed receipt does. */
let printed: string | null = null;

function printedNow() {
  if (printed === null) {
    const now = new Date();
    const date = now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    printed = `${date} · ${time}`;
  }
  return printed;
}

/** Never changes after first paint, so there is nothing to subscribe to. */
const subscribePrinted = () => () => {};

function Rule({ dashed }: { dashed?: boolean }) {
  return <span className={styles.rule} data-dashed={dashed ? "" : undefined} />;
}

function Section({ label }: { label: string }) {
  return <p className={styles.section}>{label.toUpperCase()}</p>;
}

function Row({
  left,
  right,
  muted,
  strong,
  small,
}: {
  left: string;
  right: string;
  muted?: boolean;
  strong?: boolean;
  small?: boolean;
}) {
  return (
    <p
      className={styles.row}
      data-muted={muted ? "" : undefined}
      data-strong={strong ? "" : undefined}
      data-small={small ? "" : undefined}
    >
      <span>{left}</span>
      {/* The leader dots are a pseudo-element on this span, so the two ends
          stay locked to the paper's edges however long the label runs. */}
      <span>{right}</span>
    </p>
  );
}
