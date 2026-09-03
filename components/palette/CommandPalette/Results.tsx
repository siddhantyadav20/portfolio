"use client";

import { GROUP_LABELS, type PaletteEntry, type PaletteGroup, type PaletteHit } from "@/content/palette";
import { Glyph, glyphFor } from "./Glyph";
import styles from "./CommandPalette.module.css";

/** The row id an `aria-activedescendant` points at. Shared with the shell,
 *  which has to name the same element it highlighted. */
export function rowId(entry: PaletteEntry) {
  return `palette-${entry.id.replace(/[^a-z0-9]+/gi, "-")}`;
}

/**
 * How long the whole opening cascade takes, and the step between rows.
 *
 * The rows arrive in sequence when the panel opens and land all at once when
 * you type. That asymmetry is the entire design of it: opening is a moment
 * with room in it, and a cascade there reads as the list assembling itself.
 * Re-running the same cascade on every keystroke turns a search box into a
 * slot machine — the rows you are trying to read are always mid-flight, and
 * the eighth character of a query is not a moment that wants ceremony.
 *
 * Capped so a long list does not end with rows still arriving after the reader
 * has already started down it.
 */
const STAGGER_MS = 22;
const STAGGER_CAP = 8;

export type ResultsProps = {
  sections: { group: PaletteGroup; hits: PaletteHit[]; offset: number }[];
  ordered: PaletteHit[];
  active: number;
  query: string;
  suggestion?: string;
  onHover: (i: number) => void;
  onPick: (entry: PaletteEntry, newTab: boolean) => void;
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

  // Only before anything is typed — see `STAGGER_MS`.
  const cascade = query === "";

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
          {/* Sticky, so the heading is still there when the arrows have walked
              you six rows into a section. A list that scrolls its own headings
              away answers "what am I looking at" only while you are at the top
              of it, which is the one moment you did not need answering. */}
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
                delay={cascade ? Math.min(i, STAGGER_CAP) * STAGGER_MS : null}
                onHover={() => onHover(i)}
                onPick={(newTab) => onPick(hit.entry, newTab)}
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
  delay,
  onHover,
  onPick,
}: {
  hit: PaletteHit;
  active: boolean;
  delay: number | null;
  onHover: () => void;
  onPick: (newTab: boolean) => void;
}) {
  return (
    <div
      id={rowId(hit.entry)}
      role="option"
      aria-selected={active}
      data-active={active}
      className={styles.row}
      style={delay === null ? undefined : { animationDelay: `${delay}ms` }}
      data-cascade={delay === null ? undefined : ""}
      onPointerMove={onHover}
      /* The modifier is read off the click as well as off Enter, because a
         palette that honours ⌘↵ and not ⌘-click has taught the shortcut and
         then broken the habit at the first mouse. `metaKey || ctrlKey` covers
         both platforms; `run` ignores the flag on the rows that have no URL to
         open. */
      onClick={(e) => onPick(e.metaKey || e.ctrlKey)}
    >
      {/* The tile, not a bare glyph.

          A 16px stroke sitting loose against a 14px label is a speck; the same
          stroke centred in a 26px ground is an anchor, and it gives the active
          row somewhere to put its accent that is not the text. */}
      <span className={styles.rowIcon} aria-hidden="true">
        <Glyph name={glyphFor(hit.entry)} />
      </span>

      <span className={styles.rowText}>
        <span className={styles.label}>
          <Marked text={hit.entry.label} marks={hit.marks} />
        </span>
        {hit.entry.hint && <span className={styles.hint}>{hit.entry.hint}</span>}
      </span>

      {/* Drawn on every row and revealed on the active one, rather than
          mounted when a row becomes active. Mounting it would widen the text
          column by 22px on whichever row you happened to be standing on, so
          every label would reflow as you arrowed past it — the list would
          breathe. It costs one hidden span per row and buys a list that holds
          still. */}
      <span className={styles.rowEnter} aria-hidden="true">
        ↵
      </span>
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
