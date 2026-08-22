"use client";

import type { PaletteEntry } from "@/content/palette";
import type { Answer } from "../answers";
import styles from "./CommandPalette.module.css";

export function AnswerPanel({
  answer,
  onPick,
}: {
  answer: Answer;
  onPick: (entry: PaletteEntry) => void;
}) {
  return (
    <div className={styles.answer}>
      <h2 className={styles.answerTitle}>{answer.title}</h2>
      {answer.lead && <p className={styles.answerLead}>{answer.lead}</p>}

      <dl className={styles.answerRows}>
        {answer.rows.map((row, i) => {
          /* One label per group of rows that share it.

             "What have you shipped?" lists three outcome tiles from the same
             study, and printing its title beside each of them read as three
             separate projects that happened to have the same name. The label
             is a heading for the rows under it, so it is written once and the
             repeats are left blank — the eye groups them without a rule or a
             box. Still announced on every row: `dt`/`dd` pairs are what tell a
             screen reader which value belongs to which label, and an empty
             `dt` would break that, so the repeated ones are visually hidden
             rather than dropped.

             The hiding goes on a span *inside* the `dt`, never on the `dt`
             itself: `.srOnly` is absolutely positioned, and on a grid item
             that takes the cell out of flow — the value then slides left into
             the label's column and every row after it is misaligned. */
          const repeated = i > 0 && answer.rows[i - 1].label === row.label;

          const body = (
            <>
              <dt className={styles.answerLabel}>
                {repeated ? (
                  <span className="srOnly">{row.label}</span>
                ) : (
                  row.label
                )}
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
              onClick={() =>
                onPick({
                  id: `answer-row-${i}`,
                  group: "do",
                  label: row.label,
                  to: row.to!,
                })
              }
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

      {answer.footnote && (
        <p className={styles.answerFoot}>{answer.footnote}</p>
      )}
    </div>
  );
}
