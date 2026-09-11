"use client";

import type { PaletteEntry } from "@/content/palette";
import type { Answer, AnswerRow } from "../answers";
import styles from "./CommandPalette.module.css";

type Open = (row: AnswerRow, i: number) => void;

export function AnswerPanel({
  answer,
  onPick,
}: {
  answer: Answer;
  onPick: (entry: PaletteEntry) => void;
}) {
  const open: Open = (row, i) => {
    if (!row.to) return;
    onPick({ id: `answer-row-${i}`, group: "do", label: row.label, to: row.to });
  };

  // An answer made of numbers is drawn as numbers.
  const figured = answer.rows.some((r) => r.figure);

  return (
    <div className={styles.answer}>
      <h2 className={styles.answerTitle}>{answer.title}</h2>
      {answer.lead && <p className={styles.answerLead}>{answer.lead}</p>}

      {figured ? <Wall rows={answer.rows} onOpen={open} /> : <List rows={answer.rows} onOpen={open} />}

      {answer.footnote && <p className={styles.answerFoot}>{answer.footnote}</p>}
    </div>
  );
}

/**
 * "What I've shipped", as the homepage shows a number: in the stat chip.
 *
 * It was a two-column table — study name in grey on the left, "*40 minutes
 * inspection time" in body text on the right — which made the most important
 * answer on the site look like a settings screen. The homepage never shows a
 * number that way. "281 Reusable Token / Used across 12 products" is a
 * green-edged chip with the number set first and the context under it in
 * green, and that is what each outcome is here: the value as the hero in the
 * display face, what it counts under it, the qualification in green.
 *
 * Grouped by study, with the study's name once over its chips — the grouping
 * the table did with blank cells, done with space instead.
 */
function Wall({ rows, onOpen }: { rows: readonly AnswerRow[]; onOpen: Open }) {
  const groups: { label: string; rows: [AnswerRow, number][] }[] = [];
  rows.forEach((row, i) => {
    const last = groups[groups.length - 1];
    if (last && last.label === row.label) last.rows.push([row, i]);
    else groups.push({ label: row.label, rows: [[row, i]] });
  });

  return (
    <div className={styles.wall}>
      {groups.map((group) => (
        <section key={group.label} className={styles.wallGroup} aria-label={group.label}>
          <h3 className={styles.wallTitle}>{group.label}</h3>
          <div className={styles.wallStats}>
            {group.rows.map(([row, i]) => (
              <button
                key={i}
                type="button"
                className={`${styles.stat} squircle`}
                data-plain={row.figure ? undefined : ""}
                disabled={!row.to}
                onClick={() => onOpen(row, i)}
              >
                {row.figure && <span className={styles.statValue}>{row.figure}</span>}
                <span className={styles.statLabel}>{row.value}</span>
                {row.note && <span className={styles.statNote}>{row.note}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Every other answer — status, where, email — is a list of facts. */
function List({ rows, onOpen }: { rows: readonly AnswerRow[]; onOpen: Open }) {
  return (
    <dl className={styles.answerRows}>
      {rows.map((row, i) => {
        /* One label per group of rows that share it. The label is a heading
           for the rows under it, so it is written once and the repeats are
           visually hidden — still announced on every row, because `dt`/`dd`
           pairs are what tell a screen reader which value belongs to which
           label. The hiding goes on a span *inside* the `dt`: `.srOnly` is
           absolutely positioned, and on a grid item that takes the cell out
           of flow and misaligns every row after it. */
        const repeated = i > 0 && rows[i - 1].label === row.label;

        const body = (
          <>
            <dt className={styles.answerLabel}>
              {repeated ? <span className="srOnly">{row.label}</span> : row.label}
            </dt>
            <dd className={styles.answerValue}>
              {row.value}
              {row.note && <span className={styles.answerNote}>{row.note}</span>}
            </dd>
          </>
        );

        return row.to ? (
          <button
            key={i}
            type="button"
            className={`${styles.answerRow} ${styles.answerRowGo}`}
            onClick={() => onOpen(row, i)}
          >
            {body}
          </button>
        ) : (
          <div key={i} className={styles.answerRow}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}
