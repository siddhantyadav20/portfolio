"use client";

import { GROUP_LABELS, type PaletteEntry, type PaletteGroup, type PaletteHit } from "@/content/palette";
import styles from "./CommandPalette.module.css";

/** The row id an `aria-activedescendant` points at. Shared with the shell,
 *  which has to name the same element it highlighted. */
export function rowId(entry: PaletteEntry) {
  return `palette-${entry.id.replace(/[^a-z0-9]+/gi, "-")}`;
}

export type ResultsProps = {
  sections: { group: PaletteGroup; hits: PaletteHit[]; offset: number }[];
  ordered: PaletteHit[];
  active: number;
  query: string;
  suggestion?: string;
  onHover: (i: number) => void;
  onPick: (entry: PaletteEntry) => void;
  onSuggest: (q: string) => void;
};

export function Results({
  ref,
  sections,
  ordered,
  active,
  query,
  suggestion,
  onHover,
  onPick,
  onSuggest,
}: ResultsProps & { ref: React.Ref<HTMLDivElement> }) {
  if (ordered.length === 0) {
    return (
      <div className={styles.empty} ref={ref}>
        <p className={styles.emptyLead}>Nothing here matches “{query}”.</p>
        {suggestion && (
          <button
            type="button"
            className={styles.suggest}
            onClick={() => onSuggest(suggestion)}
          >
            Did you mean <em>{suggestion}</em>?
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      id="palette-results"
      role="listbox"
      aria-label="Results"
      className={styles.results}
    >
      {sections.map((section) => (
        <div key={section.group} role="group" aria-label={GROUP_LABELS[section.group]}>
          <div className={styles.groupLabel} aria-hidden="true">
            {GROUP_LABELS[section.group]}
          </div>
          {section.hits.map((hit, j) => {
            const i = section.offset + j;
            return (
              <Row
                key={hit.entry.id}
                hit={hit}
                active={i === active}
                onHover={() => onHover(i)}
                onPick={() => onPick(hit.entry)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Row({
  hit,
  active,
  onHover,
  onPick,
}: {
  hit: PaletteHit;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <div
      id={rowId(hit.entry)}
      role="option"
      aria-selected={active}
      data-active={active}
      className={styles.row}
      onPointerMove={onHover}
      onClick={onPick}
    >
      <span className={styles.label}>
        <Marked text={hit.entry.label} marks={hit.marks} />
      </span>
      {hit.entry.hint && <span className={styles.hint}>{hit.entry.hint}</span>}
    </div>
  );
}

/**
 * The label, with the matched letters lit.
 *
 * Rendered from the `marks` the matcher returned rather than by searching the
 * string again — re-running the match here is how the highlight and the
 * ranking drift apart, and it is why `matchFields` returns ranges at all.
 */
function Marked({
  text,
  marks,
}: {
  text: string;
  marks: readonly (readonly [number, number])[];
}) {
  if (marks.length === 0) return <>{text}</>;

  const out: React.ReactNode[] = [];
  let at = 0;

  for (const [start, len] of marks) {
    // Overlapping ranges would otherwise emit a negative slice and duplicate
    // text; the matcher does not produce them, but this is cheap insurance.
    if (start < at) continue;
    if (start > at) out.push(text.slice(at, start));
    out.push(
      <mark key={start} className={styles.mark}>
        {text.slice(start, start + len)}
      </mark>,
    );
    at = start + len;
  }
  out.push(text.slice(at));

  return <>{out}</>;
}
