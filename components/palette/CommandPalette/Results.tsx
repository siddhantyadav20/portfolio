"use client";

import Image from "next/image";
import { GROUP_LABELS, type PaletteEntry, type PaletteGroup, type PaletteHit } from "@/content/palette";
import { profile } from "@/content/canvas";
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
  /** Offered when nothing matches — see Ask.tsx. Absent when answers are off. */
  onAsk?: () => void;
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
  onAsk,
}: ResultsProps & { ref: React.Ref<HTMLDivElement> }) {
  if (ordered.length === 0) {
    /* A spelling suggestion is for a mistyped word, not a sentence: "have you
       ever worked with…" was offered "Did you mean never?". Once the query is
       a question and there is someone to ask, the offer is the answer. */
    const sentence = query.trim().split(/\s+/).length >= 3;
    return (
      <div className={styles.empty} ref={ref}>
        <p className={styles.emptyLead}>Nothing here matches “{query}”.</p>
        {suggestion && !(sentence && onAsk) && (
          <button
            type="button"
            className={styles.suggest}
            onClick={() => onSuggest(suggestion)}
          >
            Did you mean <em>{suggestion}</em>?
          </button>
        )}
        {/* The question the index could not answer, handed to the one who
            can — with his face on the button, in the homepage's pill, because
            it is him answering. Enter does the same from the field. */}
        {onAsk && (
          <button type="button" className={styles.askOffer} onClick={onAsk}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatar} alt="" width={26} height={26} />
            <span>Ask me instead</span>
            <kbd className={styles.peekCtaKey}>↵</kbd>
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
              of it, which is the one moment you did not need answering.

              "Start here" wears the accent, like the homepage's "Currently
              Building": it is the one heading that is an invitation rather
              than an index. */}
          <div
            className={styles.groupLabel}
            data-lead={section.group === "start" ? "" : undefined}
            aria-hidden="true"
          >
            {GROUP_LABELS[section.group]}
          </div>
          {section.hits.map((hit, j) => {
            const i = section.offset + j;
            return (
              <Row
                key={hit.entry.id}
                hit={hit}
                order={j}
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
  order,
  active,
  delay,
  onHover,
  onPick,
}: {
  hit: PaletteHit;
  /** Position within its section — the 01–04 of "Start here". */
  order: number;
  active: boolean;
  delay: number | null;
  onHover: () => void;
  onPick: (newTab: boolean) => void;
}) {
  const figure = hit.entry.preview?.figure;
  /* An evidence row's label opens with its own number — "52 fewer clicks" —
     and the number is the chip in front of it now, so the words start after
     it rather than saying it twice. The match marks shift with them. */
  const from =
    figure && hit.entry.label.startsWith(`${figure.value} `) ? figure.value.length + 1 : 0;

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
      <Lead hit={hit} order={order} />

      <span className={styles.rowText}>
        <span className={styles.label}>
          <Marked text={hit.entry.label} marks={hit.marks} from={from} />
        </span>
        {hit.entry.hint && <span className={styles.hint}>{hit.entry.hint}</span>}
      </span>
    </div>
  );
}

/**
 * What stands in front of a row: the thing itself, wherever there is one.
 *
 * WHY NOT A GLYPH ON EVERY ROW. The first version put a drawn mark in a grey
 * tile in front of everything, which is what Raycast and Linear do — and four
 * identical sparkles down "Start here" was the single most generated-looking
 * thing on the site. This site's own language is the opposite: the homepage
 * shows the photo, the device, the number. So a study leads with its photo, an
 * outcome with its number in the homepage's stat chip, and the four opening
 * questions with 01–04 in the accent — the "5 yr" voice. Only rows with
 * nothing to show fall back to a mark, and that mark sits bare.
 */
function Lead({ hit, order }: { hit: PaletteHit; order: number }) {
  const { entry } = hit;
  const preview = entry.preview;

  if (hit.group === "start") {
    return (
      <span className={styles.leadNum} aria-hidden="true">
        {String(order + 1).padStart(2, "0")}
      </span>
    );
  }

  if (preview?.figure) {
    return (
      <span className={styles.leadFigure} aria-hidden="true">
        {preview.figure.value}
      </span>
    );
  }

  /* Studies only: their stills are local and the optimiser serves a 36px crop
     of each, where a raw hero PNG would be a megabyte per row. Board covers
     come from hosts the optimiser is not configured for, so they keep a mark
     here and show their cover in the peek. */
  if (preview?.image && entry.to.kind === "study") {
    return (
      <Image
        className={styles.leadThumb}
        src={preview.image.src}
        alt=""
        width={36}
        height={36}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={styles.rowIcon} aria-hidden="true">
      <Glyph name={glyphFor(entry)} />
    </span>
  );
}

/**
 * The label, with the matched letters lit, from `from` onwards.
 *
 * Rendered from the `marks` the matcher returned rather than by searching the
 * string again — re-running the match here is how the highlight and the
 * ranking drift apart, and it is why `matchFields` returns ranges at all.
 */
function Marked({
  text,
  marks,
  from = 0,
}: {
  text: string;
  marks: readonly (readonly [number, number])[];
  from?: number;
}) {
  const shown = text.slice(from);
  if (marks.length === 0) return <>{shown}</>;

  const out: React.ReactNode[] = [];
  let at = 0;

  for (const [s, l] of marks) {
    // Into the shown part: a mark on the cut-off number is clipped, not lost.
    let start = s - from;
    let len = l;
    if (start < 0) {
      len += start;
      start = 0;
    }
    // Overlapping ranges would otherwise emit a negative slice and duplicate
    // text; the matcher does not produce them, but this is cheap insurance.
    if (len <= 0 || start < at) continue;
    if (start > at) out.push(shown.slice(at, start));
    out.push(
      <mark key={start} className={styles.mark}>
        {shown.slice(start, start + len)}
      </mark>,
    );
    at = start + len;
  }
  out.push(shown.slice(at));

  return <>{out}</>;
}
