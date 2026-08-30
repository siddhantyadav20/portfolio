"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  SAMPLE_NOTE,
  SEVERITY_LABEL,
  searchRemarks,
  spreadOf,
  type Hit,
} from "@/content/remarks";
import { search as copy } from "@/content/site";
import Spinner, { preloadSpinner } from "./Spinner";
import styles from "./RemarkFinder.module.css";

/* ===========================================================================
   The Search card's instrument — Figma 869:6921, all four states.

   WHAT THE FILE ASKS FOR, in the order it plays:

     DEFAULT     A field, a Send that is not armed yet, and a category filter.
                 The outcome chip sits in the corner making the card's claim.

     TYPING      The field takes a query, and under it the inspector's own
                 library comes up ranked — `Suggested Observations`, each with
                 what they have reached for it and what the firm has. The chip
                 slides off to the right: the claim has had its moment, and the
                 evidence needs the room.

     SEARCHING   The loader, and `Searching the library...`.

     RESULTS     `N Observations Found`, and the findings themselves — the
                 branch each was filed under, how it reads on the report, where
                 it was observed, and the two buttons that put it there.

   WHAT REPLACED WHAT. Until this redesign the card played a recreation of the
   *old* product: three drill-down panels pushing left, a tap counter, then a
   collapse into search. That existed because the results state had never been
   designed, so the only way to argue for search-first was to show what it
   replaced. 869:6921 designs the results, and the argument moves into them —
   an inspector's own history ranked above the library's, a spread of branches
   no single walk down the tree could have produced, and a finding that lands in
   the report in one press. The struck-through `Navigation first` on the chip is
   what carries the before, and it now leaves once the after is on screen.

   NOTHING HERE IS STAGED. Every row comes out of `content/remarks.ts` through
   the same `searchRemarks` the field runs on a keystroke, the category chip is
   that function's second argument, and the counts under `N Observations Found`
   are the length and the spread of what was actually found. The corpus is a
   disclosed sample — sixty-one remarks standing in for 104,122 — and the card
   says so in the one place it has room to.
   =========================================================================== */

type Phase = "idle" | "typing" | "searching" | "results";

/**
 * What the cue types.
 *
 * Five characters, and it crosses seven categories — which is the whole point
 * and the reason it is not the file's own `Missing Shingle on Roof`. A query
 * that lands inside one branch is a query the old drill-down could have
 * answered; this one cannot be walked to, because the tree is organised around
 * where a defect lives and the person typing is describing what they saw.
 */
const CUE_QUERY = "crack";

/**
 * The unattended demonstration, in milliseconds.
 *
 * A schedule of timeouts rather than a sampled animation loop, because every
 * moment here is discrete — a phase changes, a character lands — and there is
 * nothing in between for a spring to interpolate. The previous instrument
 * integrated per frame because it was pushing panels; this one has no panels.
 *
 * The pauses are doing work. `SUBMIT_AFTER` is long enough to read as a
 * decision rather than an autocomplete, and `SEARCH_MS` is the one number here
 * that is a lie about the product — the real query is instant — held long
 * enough that the state the file designed is legible. Anything shorter is a
 * flicker; anything longer is the card wasting a visitor's time to show off a
 * spinner.
 */
const FOCUS_AT = 420;
const TYPE_FROM = 900;
const TYPE_EVERY = 125;
const SUBMIT_AFTER = 780;

/**
 * How long the loader holds, and how it is spent.
 *
 * This is the one number on the card that is a lie about the product: the real
 * query is instant. It is held anyway, and held longer than it used to be,
 * because the loader is now the only place the library picker is visible —
 * it names each source as it goes, and a state that flashes past has told
 * nobody anything. 1.25s was enough to register that *something* happened and
 * not enough to read what.
 *
 * Two sources rather than one duration: the loader steps through the libraries
 * that are actually selected, giving each its own line, so three selected
 * sources take longer than one. The floor stops a single source from going by
 * too quickly to read.
 */
const SEARCH_PER_SOURCE = 1100;
const SEARCH_MIN_MS = 2400;

/** Every library currently being searched, in the order the loader visits. */
function activeLibraries(on: readonly string[]) {
  return copy.libraries.filter((l) => on.includes(l.id));
}

function searchMs(on: readonly string[]) {
  return Math.max(SEARCH_MIN_MS, on.length * SEARCH_PER_SOURCE);
}

/** How many suggestions the list shows — Figma 869:6044 draws five. */
const SUGGESTIONS = 5;

/** How many lines of a finding's text stand before `Show more`. */
const CLAMP_LINES = 4;

type Props = {
  /**
   * Play the unattended demonstration once, and what sets it off.
   *
   * `"view"` is scrolled into view, which is what a specimen standing in the
   * middle of a case study wants: the reader is there to read it.
   *
   * `"hover"` is the pointer arriving on the card, and it is what the homepage
   * wants. Six cards demonstrating themselves the moment the page settles is
   * six things moving at once and no way to tell which one you asked for; on
   * hover it is one card answering one gesture.
   */
  cue?: "view" | "hover";
  /**
   * What the pointer has to enter for `cue: "hover"` to fire. Defaults to the
   * instrument itself.
   *
   * The homepage card passes its own root: there the whole card is the thing
   * you point at, and a demonstration that only starts once you happen to cross
   * the field is a demonstration most people never see.
   */
  track?: RefObject<HTMLElement | null>;
  className?: string;
};

/* WHAT THE PICKER ACTUALLY CHANGES, said plainly: which libraries the loader
   names, and not what comes back. There is one disclosed sample corpus behind
   this card — see `content/remarks.ts` — and splitting it into three would mean
   inventing two more, which is the thing this site does not do. The same
   arrangement as `104,122` being the real number while the sixty-one rows under
   it are a labelled sample. */

/** The default: what this inspector has written. */
const MINE = copy.libraries[0].id;

export default function RemarkFinder({ cue, track, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  /* Per instance, because there can be more than one on a page: the Search
     study runs this specimen in its hero *and* again in the section that
     explains the three libraries, which is two of everything below. A literal
     `id` was fine while the homepage card was the only caller and became a
     duplicate the day the study got a body. */
  const fieldId = useId();

  const [phase, setPhase] = useState<Phase>("idle");
  const [query, setQuery] = useState("");
  /** Which libraries the search runs against. Never empty — see `toggleSource`. */
  const [sources, setSources] = useState<readonly string[]>([MINE]);
  const [picking, setPicking] = useState(false);

  /** The report being written, as the texts of the remarks in it — the thing
   *  the product was actually for. A finding is in it or it is not. */
  const [picked, setPicked] = useState<readonly string[]>([]);
  /** Findings whose text is open for editing, and what has been typed into
   *  them. `Edit & Add` is a real control: it opens the remark, and `Add`
   *  commits whatever is in the box. */
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  /** Findings whose text has been expanded past the clamp. */
  const [expanded, setExpanded] = useState<readonly string[]>([]);

  /** Which selected library the loader is currently naming. */
  const [visiting, setVisiting] = useState(0);

  /* Every timer the cue has in flight, so an interruption can take them all
     down at once. A single `setTimeout` handle is not enough: the schedule
     below is a chain, and interrupting between two links has to stop the next
     one from ever being made. */
  const timers = useRef<number[]>([]);
  /** True once somebody has touched the card. The cue never fires after this,
   *  including the part of it that had not run yet. */
  const taken = useRef(false);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /** Somebody is driving. Whatever the cue was mid-way through saying, it stops
   *  saying it, and the state it had reached is theirs to keep. */
  const interrupt = useCallback(() => {
    taken.current = true;
    clearTimers();
  }, [clearTimers]);

  const hits = useMemo(() => searchRemarks(query), [query]);
  const suggestions = hits.slice(0, SUGGESTIONS);
  const spread = spreadOf(hits);

  /* --- The cue -------------------------------------------------------------
     Runs once, on the first hover or the first time the card is scrolled into
     view, and never again on its own.

     Reduced motion does not turn this off, it turns the *performance* off.
     What the check gates is the unattended sequence and nothing else: the field
     below is a working search field, and someone who asked for less motion
     still gets to use it. They land on the typing state — the field with the
     library under it, which is the useful half — rather than on an empty box
     that a typing animation was going to fill. */
  useEffect(() => {
    if (!cue) return;
    const root = rootRef.current;
    if (!root) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function play() {
      if (taken.current) return;
      taken.current = true;

      if (still) {
        setPhase("typing");
        return;
      }

      // The chunk for the loader, fetched now rather than when the loader is
      // wanted — see `preloadSpinner`.
      preloadSpinner();

      after(FOCUS_AT, () => setPhase("typing"));

      for (let i = 1; i <= CUE_QUERY.length; i++) {
        after(TYPE_FROM + i * TYPE_EVERY, () => setQuery(CUE_QUERY.slice(0, i)));
      }

      const typedAt = TYPE_FROM + CUE_QUERY.length * TYPE_EVERY;
      after(typedAt + SUBMIT_AFTER, () => setPhase("searching"));
      after(typedAt + SUBMIT_AFTER + searchMs([MINE]), () =>
        setPhase("results"),
      );
    }

    if (cue === "hover") {
      const target = track?.current ?? root;
      target.addEventListener("pointerenter", play, { once: true });
      return () => target.removeEventListener("pointerenter", play);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [cue, track, after]);

  /* Nothing outlives the instrument — and `taken` goes back with it.
   *
   * The reset is there to keep the two of them in step. `taken` is a ref, so it
   * would otherwise survive a remount that its timers do not: anything that
   * tore the component down mid-cue would leave the flag saying the cue had
   * been played while every timer that was going to play it had just been
   * cancelled, and the rebuilt instrument would sit on `idle` for good.
   *
   * It is also just the right rule. `taken` means "somebody is driving this
   * instrument", and an instrument that has been torn down and rebuilt has
   * nobody driving it. */
  useEffect(
    () => () => {
      clearTimers();
      taken.current = false;
    },
    [clearTimers],
  );

  /* Walk the loader through the selected libraries while the search runs.
   *
   * One interval rather than a timeout per source: the whole thing is torn down
   * the moment the phase leaves `searching`, so there is nothing left to cancel
   * individually. Capped at the last index rather than wrapping, because a
   * loader that returns to the first library reads as a second search starting
   * rather than the one you asked for finishing. */
  useEffect(() => {
    if (phase !== "searching") return;

    const on = activeLibraries(sources);
    if (on.length < 2) return;

    const each = searchMs(sources) / on.length;
    const id = window.setInterval(
      () => setVisiting((v) => Math.min(v + 1, on.length - 1)),
      each,
    );
    return () => window.clearInterval(id);
  }, [phase, sources]);

  /* The picker closes on a press outside it or on Escape — the two gestures
     anybody tries. `pointerdown` rather than `click`, so it closes on the way
     down and the press that closed it still lands on whatever it was aimed at;
     bound only while the thing is open, because a document listener that
     outlives the panel it belongs to is how a card ends up with six of them. */
  useEffect(() => {
    if (!picking) return;

    function onDown(e: PointerEvent) {
      const t = e.target;
      if (t instanceof Node && pickerRef.current?.contains(t)) return;
      setPicking(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPicking(false);
    }

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [picking]);

  /* --- Working it yourself ------------------------------------------------- */

  /**
   * Start a search. The wait is the staged part and the only staged part; the
   * answer underneath it is computed.
   *
   * The loader's position is reset here rather than in the effect that drives
   * it, because entering `searching` is a thing that happens at a moment and
   * subscribing to it is not. Resetting inside the effect meant a `setState`
   * during commit and a second render for every search.
   */
  function beginSearch() {
    interrupt();
    setVisiting(0);
    setPhase("searching");
    // Tracked rather than loose: type again while this is in flight and the
    // interruption cancels it, so a stale search cannot land on a query that
    // has already moved on.
    after(searchMs(sources), () => setPhase("results"));
  }

  function submit() {
    if (!query.trim()) return;
    beginSearch();
  }

  function onChange(value: string) {
    interrupt();
    preloadSpinner();
    setQuery(value);
    // Editing the query puts the found set behind you: what is on screen is no
    // longer an answer to what is in the field, and leaving it there would be
    // the card lying about its own state.
    setPhase(value ? "typing" : "idle");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }
    if (event.key === "Escape" && query) {
      interrupt();
      setQuery("");
      setPhase("idle");
    }
  }

  /** Take a suggestion: it fills the field and runs, which is what tapping a
   *  suggestion does everywhere else a visitor has met one. */
  function takeSuggestion(hit: Hit) {
    setQuery(hit.remark.label);
    beginSearch();
  }

  /** Put a finding in the report, or take it back out. */
  function toggle(hit: Hit) {
    const key = hit.remark.text;
    setPicked((p) =>
      p.includes(key) ? p.filter((t) => t !== key) : [...p, key],
    );
    // Committing closes the editor, and the draft is what went in.
    setDrafts((d) => {
      if (!(key in d)) return d;
      const next = { ...d };
      delete next[key];
      return next;
    });
  }

  /** Turn a library on or off. Never leaves the set empty — see the note on the
   *  checkbox that carries the same rule for the keyboard. */
  function toggleSource(id: string) {
    interrupt();
    setSources((s) => {
      if (!s.includes(id)) return [...s, id];
      return s.length === 1 ? s : s.filter((x) => x !== id);
    });
  }

  /* One library names itself; more than one is counted. Naming all three would
     be wider than the plate at the design width, and a chip that grows as you
     tick boxes pushes the field about while you are using it. */
  const chipLabel =
    sources.length === 1
      ? (copy.libraries.find((l) => l.id === sources[0])?.label ?? "")
      : copy.librariesLabel(sources.length);

  const empty = query.trim().length > 0 && hits.length === 0;
  const armed = query.trim().length > 0;

  return (
    <div
      className={[styles.finder, className].filter(Boolean).join(" ")}
      ref={rootRef}
      data-phase={phase}
    >
      {/* --- The plate ---------------------------------------------------
          Figma 80:7698. It does not move between states — the states happen
          underneath it, which is what makes the card read as one screen doing
          something rather than four screens in a row. */}
      <div className={`${styles.plate} squircle`}>
        <div className={styles.inputRow}>
          <span
            className={`inkIcon ${styles.searchIcon}`}
            style={{ ["--icon" as string]: "url(/icons/search.svg)" }}
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            id={fieldId}
            type="search"
            className={styles.input}
            placeholder={copy.placeholder}
            autoComplete="off"
            aria-label="Search the remark library"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              interrupt();
              if (phase === "idle") setPhase("typing");
              preloadSpinner();
            }}
          />

          {/* Figma draws Send at 40% until there is something to send, and the
              searching state swaps its fill for the loader. Both of those are
              the same button in three conditions rather than three buttons. */}
          <button
            type="button"
            className={styles.send}
            data-armed={armed ? "" : undefined}
            data-busy={phase === "searching" ? "" : undefined}
            disabled={!armed || phase === "searching"}
            onClick={submit}
          >
            <span className="srOnly">
              {phase === "searching" ? "Searching" : "Search the library"}
            </span>
            {phase === "searching" ? (
              <Spinner size={14} />
            ) : (
              <span
                className={`inkIcon ${styles.sendIcon}`}
                style={{ ["--icon" as string]: "url(/icons/send.svg)" }}
                aria-hidden="true"
              />
            )}
          </button>
        </div>

        {/* The library picker. It was a disabled `Select category` button in
            the old file and the card dropped it rather than ship a control that
            did nothing. It picks sources now, and more than one at a time —
            your own library is where an inspector starts and the other two are
            where they go when it does not have the remark. */}
        <div className={styles.picker} ref={pickerRef} data-cursor="page">
          <button
            type="button"
            className={styles.category}
            data-open={picking ? "" : undefined}
            aria-expanded={picking}
            aria-haspopup="true"
            onClick={() => {
              interrupt();
              setPicking((p) => !p);
            }}
          >
            <span className={styles.categoryLabel}>{chipLabel}</span>
            <span
              className={`inkIcon ${styles.categoryChevron}`}
              style={{ ["--icon" as string]: "url(/icons/chevron-sm.svg)" }}
              aria-hidden="true"
            />
          </button>

          {picking && (
            /* Native checkboxes, hidden behind a drawn tick. Multi-select with
               a keyboard, a screen reader and a switch all work without a line
               of code here, which is not true of a `role="listbox"` built by
               hand — and this control is three rows in a card, not a
               combobox. */
            <div
              className={`${styles.sources} squircle`}
              role="group"
              aria-label="Libraries to search"
            >
              {copy.libraries.map((lib) => {
                const on = sources.includes(lib.id);
                return (
                  <label
                    className={styles.source}
                    key={lib.id}
                    data-on={on ? "" : undefined}
                  >
                    <input
                      type="checkbox"
                      className="srOnly"
                      checked={on}
                      /* The last one on cannot be turned off: a search with no
                         library to search is not a state worth being able to
                         reach, and disabling Send to describe it would be a
                         worse answer than not offering it. */
                      disabled={on && sources.length === 1}
                      onChange={() => toggleSource(lib.id)}
                    />
                    <span className={styles.tick} aria-hidden="true" />
                    {lib.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- What is under it -------------------------------------------- */}
      <div className={styles.below}>
        {phase === "typing" && (
          <div className={styles.suggestions}>
            <div className={styles.listHead}>
              <p className={styles.listTitle}>Suggested Observations</p>
              <p className={styles.usageHead}>Usage</p>
            </div>

            {empty ? (
              /* The dead end, designed rather than left as a void — and the one
                 thing search can do that the tree could not: tell you in five
                 characters that the answer is not there. */
              <p className={styles.blank}>
                Nothing in the library says that. Which took{" "}
                {query.trim().length} characters to find out.
              </p>
            ) : (
              <ul className={styles.rows}>
                {suggestions.map((hit) => (
                  <li key={hit.remark.text}>
                    <button
                      type="button"
                      className={styles.row}
                      onClick={() => takeSuggestion(hit)}
                    >
                      <span className={styles.rowTitle}>
                        <span
                          className={`inkIcon ${styles.rowIcon}`}
                          style={{
                            ["--icon" as string]: "url(/icons/search.svg)",
                          }}
                          aria-hidden="true"
                        />
                        <span className={styles.rowLabel}>
                          {mark(hit.remark.label, hit.marks)}
                        </span>
                      </span>
                      <Usage hit={hit} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {phase === "searching" && (
          /* One live region for the whole state rather than a `role="status"`
             on the spinner and changing text beside it. The visible lines cycle
             through the selected libraries, and announcing each one would read
             a visitor three sentences in three seconds; the region says once
             what is happening and the cycling is marked decorative. */
          <div className={styles.searching} role="status">
            <span className="srOnly">
              {sources.length === 1
                ? activeLibraries(sources)[0]?.searching
                : `Searching ${sources.length} libraries`}
            </span>
            <Spinner size={32} />
            <div className={styles.searchingLines} aria-hidden="true">
              {activeLibraries(sources).map((lib, i) => (
                <div
                  className={styles.searchingLine}
                  key={lib.id}
                  data-on={i === visiting ? "" : undefined}
                >
                  <p className={styles.searchingNote}>{lib.searching}</p>
                  <p className={styles.searchingSupport}>{lib.support}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "results" && (
          <div className={styles.results}>
            <div className={styles.listHead}>
              <p className={styles.listTitle}>
                {hits.length} observation{hits.length === 1 ? "" : "s"} found
              </p>
              {/* The old card's sharpest readout, kept in the space the new
                  header leaves. A found set spread across six branches is not a
                  long-list problem — it is the tree being the wrong shape for
                  the question, and you can read that off the card without being
                  told it. The sample is disclosed in the same breath, because
                  every count here is the sample's. */}
              <p className={styles.readout}>
                {spread} categor{spread === 1 ? "y" : "ies"} · {SAMPLE_NOTE}
              </p>
            </div>

            {empty ? (
              <p className={styles.blank}>
                Nothing in the library says that. Down a tree it was three taps,
                and only for the one branch you guessed.
              </p>
            ) : (
              <ul className={styles.findings}>
                {hits.map((hit) => (
                  <li className={styles.finding} key={hit.remark.text}>
                    <Finding
                      hit={hit}
                      inReport={picked.includes(hit.remark.text)}
                      draft={drafts[hit.remark.text]}
                      open={expanded.includes(hit.remark.text)}
                      onExpand={() =>
                        setExpanded((e) => [...e, hit.remark.text])
                      }
                      onEdit={() =>
                        setDrafts((d) => ({
                          ...d,
                          [hit.remark.text]:
                            d[hit.remark.text] ?? hit.remark.text,
                        }))
                      }
                      onDraft={(value) =>
                        setDrafts((d) => ({ ...d, [hit.remark.text]: value }))
                      }
                      onAdd={() => toggle(hit)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* --- One finding -----------------------------------------------------------
   Figma 869:6510. The branch it was filed under, how urgently it reads, what it
   will say, where it was seen, and the two controls that put it in the report.

   The branch line at the top is the evidence for the card's claim rather than
   decoration: a result list whose paths disagree with each other is a list no
   walk down the tree could have produced. */

function Finding({
  hit,
  inReport,
  draft,
  open,
  onExpand,
  onEdit,
  onDraft,
  onAdd,
}: {
  hit: Hit;
  inReport: boolean;
  draft: string | undefined;
  open: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onDraft: (value: string) => void;
  onAdd: () => void;
}) {
  const { remark } = hit;
  const editing = draft !== undefined;

  /* Whether the text is actually longer than the clamp.
     
     Measured rather than guessed from the string's length: the clamp is four
     lines and the card is fluid, so the same sentence overflows at 1440 and does
     not at 1600. Offering `Show more` on a paragraph that is already whole is
     the kind of small lie that makes everything next to it suspect — and the
     control is an overlay sitting on the last line, so on a short one it covered
     text it had nothing to reveal. */
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [over, setOver] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => setOver(el.scrollHeight - el.clientHeight > 1);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-measured when the clamp comes off, so collapsing again restores it.
  }, [open, remark.text]);

  return (
    <>
      <div className={styles.findingHead}>
        <div className={styles.findingTop}>
          <p className={styles.branch}>
            {remark.category} &gt;&gt; {remark.subcategory}
          </p>
          <p className={styles.severity}>
            <span
              className={`inkIcon ${styles.severityIcon}`}
              style={{ ["--icon" as string]: "url(/icons/danger.svg)" }}
              aria-hidden="true"
            />
            {SEVERITY_LABEL[remark.severity]}
          </p>
        </div>

        <p className={styles.findingTitle}>{mark(remark.label, hit.marks)}</p>

        <p className={styles.where}>
          <span
            className={`inkIcon ${styles.whereIcon}`}
            style={{ ["--icon" as string]: "url(/icons/location.svg)" }}
            aria-hidden="true"
          />
          {remark.location}
        </p>

        {editing ? (
          /* `Edit & Add` opens the remark rather than pretending to. An
             inspector rewrites the wording for the house in front of them
             before it goes in the report — that is the job — and a button that
             said so and did nothing would be the one dishonest control on a
             card about doing the work properly. */
          <textarea
            className={styles.editor}
            value={draft}
            aria-label={`Edit ${remark.label} before adding it`}
            autoFocus
            rows={CLAMP_LINES}
            onChange={(e) => onDraft(e.target.value)}
          />
        ) : (
          <p
            className={styles.body}
            ref={bodyRef}
            data-open={open ? "" : undefined}
          >
            {remark.text}
            {!open && over && (
              <button
                type="button"
                className={styles.showMore}
                onClick={onExpand}
              >
                Show more
              </button>
            )}
          </p>
        )}
      </div>

      <div className={styles.findingFoot}>
        <Usage hit={hit} />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.edit}
            onClick={onEdit}
            disabled={editing}
          >
            Edit &amp; Add
          </button>
          <button
            type="button"
            className={styles.add}
            data-in={inReport ? "" : undefined}
            onClick={onAdd}
          >
            {inReport ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </>
  );
}

/* --- The two counts --------------------------------------------------------
   Figma 869:6071. Yours, then everybody's.

   They are side by side because the interesting case is them disagreeing: a
   remark the firm leans on that you have barely touched is a prompt, and one
   you reach for constantly that nobody else does is a house style. Only the
   first of the two ranks anything — see LIBRARY_WEIGHT — and that asymmetry is
   the feature, which is why the badge carrying it is the one with a fill. */

function Usage({ hit }: { hit: Hit }) {
  const { used, global } = hit.remark;

  return (
    <span className={styles.usage}>
      <span
        className={styles.mine}
        title={
          used > 0
            ? `You have used this ${used} times`
            : "You have not used this one"
        }
      >
        <span
          className={`inkIcon ${styles.usageIcon}`}
          style={{ ["--icon" as string]: "url(/icons/person.svg)" }}
          aria-hidden="true"
        />
        {used.toLocaleString("en-US")}
      </span>
      <span className={styles.everyone} title="Used across the firm">
        <span
          className={`inkIcon ${styles.globeIcon}`}
          style={{ ["--icon" as string]: "url(/icons/globe.svg)" }}
          aria-hidden="true"
        />
        {global.toLocaleString("en-US")}
      </span>
    </span>
  );
}

/** The matched ranges, marked. `searchRemarks` already worked out where they
 *  are in the label, so this is a split rather than a second pass over it. */
function mark(text: string, marks: readonly (readonly [number, number])[]) {
  if (marks.length === 0) return text;

  const out: (string | React.ReactElement)[] = [];
  let at = 0;
  marks.forEach(([start, len], i) => {
    if (start < at) return;
    if (start > at) out.push(text.slice(at, start));
    out.push(
      <mark className={styles.hit} key={i}>
        {text.slice(start, start + len)}
      </mark>,
    );
    at = start + len;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}
