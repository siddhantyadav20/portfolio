"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  OLD_PATH,
  OLD_PATH_TAPS,
  SAMPLE_NOTE,
  TAXONOMY,
  searchRemarks,
  spreadOf,
  type Hit,
} from "@/content/remarks";
import { search as copy } from "@/content/site";
import { arrived, chan, frameDelta, omegaFor, settle } from "@/lib/spring";
import styles from "./RemarkFinder.module.css";

/* ===========================================================================
   The demonstration, once, for both surfaces that make it.

   The Search card used to be the Figma "Default" state: a field that could not
   search, over a `Select category` control that was disabled — which is to say
   the one live thing on a card arguing for search-first was the old paradigm,
   greyed out. It now runs the argument.

   What it does, in order:

     THE OLD WAY   A drill-down, pushed panel by panel the way the app did it.
                   Eight categories, then four subcategories, then four remarks
                   alphabetically. Three taps, counted on the pips.

     THE COLLAPSE  Those panels fold away and the field takes the frame.

     THE NEW WAY   `crack` types itself and the matcher runs — the real one, on
                   the same rows the drill-down was walking. Sixteen remarks,
                   spread across seven categories, ordered by what this
                   inspector actually reaches for. Zero taps.

   The sting is in the numbers rather than the copy. The drill-down lands you in
   Roofing > Shingles, and the remark this inspector has used twenty-six times
   is in Structure > Foundation. No amount of navigating gets you that set,
   because the tree is organised around where a defect lives and the person
   typing is describing what they saw.

   After the cue the field is a real field. That is the difference from
   ThemingInstrument, which is a picture you sweep: this one you can type into,
   and it answers with the same function. See the reduced-motion note in the
   effect for what that changes.
   =========================================================================== */

/** What the cue types. Short, and it crosses seven categories — see the file
 *  header for why that is the whole point. */
const CUE_QUERY = "crack";

/**
 * The unattended demonstration, as keyframes of `[seconds, open, step, chars]`.
 *
 *   open   how present the old drill-down is, 0..1
 *   step   which panel it has pushed to, 0..3
 *   chars  how much of CUE_QUERY has been typed
 *
 * Same bargain the Design System card strikes: most visitors will never touch
 * this, and an argument that only fires on interaction has not been made. So it
 * makes it once, by itself, the first time it is scrolled into view.
 *
 * The pauses are doing work. Each tap holds long enough to be read as a tap,
 * and the beat at 3.0 sits on the alphabetical list — the moment the old flow
 * has spent three taps and still not found the remark — before the collapse.
 */
const CUE: readonly (readonly [number, number, number, number])[] = [
  [0.0, 0, 0, 0],
  [0.4, 1, 0, 0],
  [1.1, 1, 1, 0],
  // Tap: Roofing. Tap: Shingles. `step` is a panel index and there are three
  // panels, so it stops at 2 — the third tap picks a remark off the list it has
  // arrived at, and pushes nothing.
  [1.8, 1, 2, 0],
  // The beat the whole card is built around: three steps spent, an alphabetical
  // list on screen, and the remark this inspector reaches for twenty-six times
  // is in Structure, not here.
  [3.0, 1, 2, 0],
  [3.9, 0, 0, 0],
  [4.9, 0, 0, CUE_QUERY.length],
  [5.4, 0, 0, CUE_QUERY.length],
];

const CUE_END = CUE[CUE.length - 1][0];

/**
 * Where the cue is at `t` seconds: the two channel targets and the character
 * count, interpolated between the surrounding keyframes.
 *
 * Pulled out of the loop as a pure function for the reason `skinAt` is one —
 * the loop should hold the integration and nothing else, and a keyframe table
 * is the kind of thing worth being able to read back a second at a time
 * without a running browser in front of you.
 */
export function cueAt(t: number): {
  open: number;
  step: number;
  chars: number;
} {
  const end = CUE[CUE.length - 1];
  if (t >= CUE_END) return { open: end[1], step: end[2], chars: end[3] };

  for (let i = 1; i < CUE.length; i++) {
    if (t > CUE[i][0]) continue;
    const [t0, o0, s0, c0] = CUE[i - 1];
    const [t1, o1, s1, c1] = CUE[i];
    const k = (t - t0) / (t1 - t0);
    return {
      open: o0 + (o1 - o0) * k,
      step: s0 + (s1 - s0) * k,
      chars: Math.round(c0 + (c1 - c0) * k),
    };
  }

  return { open: CUE[0][1], step: CUE[0][2], chars: CUE[0][3] };
}

/**
 * The staged dictation, as `[seconds, words transcribed]`.
 *
 * Pressing the mic does not open a microphone. It plays this, and then runs the
 * result through the same `searchRemarks` everything else uses — the query and
 * the results are real, the capture is staged, and the readout says so in as
 * many words while it plays. A portfolio card that asks for microphone
 * permission on first scroll is a worse thing than an honest demonstration.
 *
 * The phrase is chosen to argue for voice rather than to flatter it: it is long,
 * it is what an inspector would actually say out loud, and it is the last thing
 * anyone wants to thumb-type standing in a crawlspace.
 */
const VOICE_PHRASE = "standing water in the crawlspace";
const VOICE_WORDS = VOICE_PHRASE.split(" ");
const VOICE: readonly (readonly [number, number])[] = [
  [0.0, 0],
  [0.7, 0],
  [2.1, VOICE_WORDS.length],
  [2.8, VOICE_WORDS.length],
];
const VOICE_END = VOICE[VOICE.length - 1][0];

/** How many words have been transcribed at `t` seconds into the dictation. */
export function voiceAt(t: number): number {
  for (let i = 1; i < VOICE.length; i++) {
    if (t > VOICE[i][0]) continue;
    const [t0, w0] = VOICE[i - 1];
    const [t1, w1] = VOICE[i];
    return Math.round(w0 + ((w1 - w0) * (t - t0)) / (t1 - t0));
  }
  return VOICE[VOICE.length - 1][1];
}

/** Settling times. `open` is the slower of the two because it is the gesture
 *  being read; `step` is a push transition and should feel crisp. */
const OPEN_SETTLE = 380;
const STEP_SETTLE = 300;

/** Below what could move a pixel or change a rounded readout, so the loop stops
 *  at the first frame that could not have changed anything. Same reasoning as
 *  ThemingInstrument, and the same reason it matters: this is one of four cards
 *  animating on a page that also runs a proximity field. */
const EPS = 1e-3;
const EPS_VEL = 1e-2;

/**
 * A result row's height, and the gap under it, from the stylesheet.
 *
 * How many rows fit is measured rather than passed in, for the reason
 * ThemingInstrument gives for measuring its own scale: this instrument is drawn
 * at three sizes that have nothing to do with each other — a 346px card that is
 * also fluid past 1440, a 420px figure in prose, and a hero as tall as the
 * reading column happens to be — and a row count per call site is a magic
 * number that goes stale. A row that is cut through the middle of its text
 * reads as a bug rather than as "there are more", and the legend already says
 * exactly how many more there are.
 *
 * The two numbers here are the only thing the measurement needs, and they are
 * fixed: `.rowText` is clamped to a single line, so every row is the same
 * height whatever it says.
 */
const ROW_HEIGHT = 51;
const ROW_GAP = 2;

/** Drawn before the first measurement, and by anything that never measures —
 *  the server, and a browser with no ResizeObserver. Deliberately small: too
 *  few rows for a moment is invisible, too many is a clipped one. */
const ROWS_BEFORE_MEASURE = 4;

/**
 * How many rows each drill panel shows.
 *
 * Eight, which is every category — the first panel is meant to be full, because
 * how much there was to choose between is the argument, and a panel showing
 * five of eight makes the tree look smaller than it was. The later panels come
 * up short of this and should: a drill-down narrowing is exactly what they are
 * a picture of.
 */
const DRILL_ROWS = 8;

type Props = {
  /** Play the unattended demonstration once, when scrolled into view. */
  cue?: boolean;
  /** An upper bound on the result rows drawn. How many actually fit is
   *  measured — see ROW_HEIGHT. */
  rows?: number;
  className?: string;
};

/* --- The rest state, derived the way the loop derives it -------------------
   Rendered on the server, so the first paint has to be what the first frame
   would have written. */

const REST_HITS = searchRemarks("");

export const REST_COUNT = `Your library · ${REST_HITS.length} remarks · ${SAMPLE_NOTE}`;
export const REST_SCOPE = `${TAXONOMY.length} categories`;

/** The three panels the old flow pushed through, and the rows in each. */
const DRILL_PANELS = (() => {
  const category = TAXONOMY.find((c) => c.name === OLD_PATH.category);
  const sub = category?.subcategories.find(
    (s) => s.name === OLD_PATH.subcategory,
  );
  return [
    {
      crumb: "All categories",
      rows: TAXONOMY.map((c) => c.name),
      chosen: OLD_PATH.category,
      unit: "categories",
      total: TAXONOMY.length,
    },
    {
      crumb: OLD_PATH.category,
      rows: category?.subcategories.map((s) => s.name) ?? [],
      chosen: OLD_PATH.subcategory,
      unit: "subcategories",
      total: category?.subcategories.length ?? 0,
    },
    {
      crumb: `${OLD_PATH.category} › ${OLD_PATH.subcategory}`,
      rows: sub?.remarks.map((r) => r.text) ?? [],
      chosen: null,
      unit: "remarks, A–Z",
      total: sub?.remarks.length ?? 0,
    },
  ];
})();

export default function RemarkFinder({
  cue: wantCue = false,
  rows = Infinity,
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  /* The two elements that actually read the per-frame properties. See the note
     beside `--open` in the stylesheet: they are registered `inherits: false`,
     so writing them onto the root would set nothing. */
  const drillRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);

  /* The legend belongs to the instrument rather than to the card around it.
     ThemingInstrument takes refs from its caller because there the legend is
     card furniture, positioned against a fixed 386x578 — the numbers below are
     not that. They are the running thing saying what it just did, and every
     surface that shows the finder wants them, so it draws them itself. */
  const pips = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const scope = useRef<HTMLSpanElement>(null);

  /* The field's value, and the only React state that changes while the cue
     plays. It changes once per character rather than once per frame, which is
     what keeps a list of rows out of the animation loop — everything that moves
     per frame below is written imperatively. */
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

  /** How many rows the box in front of us can actually hold. */
  const [fits, setFits] = useState(ROWS_BEFORE_MEASURE);

  /*
   * This is layout, not motion, so it runs for everyone — including the paths
   * that never start the loop at all. A still frame is only correct if it is
   * the right size.
   *
   * Layout effect rather than a plain one: the measurement changes what is
   * rendered, and doing that after paint would show the wrong number of rows
   * for a frame on every resize.
   */
  useLayoutEffect(() => {
    const list = resultsRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (!h) return;
      // The last row has no gap under it, so the gap is added to both sides of
      // the division rather than multiplied into the row.
      setFits(Math.max(1, Math.floor((h + ROW_GAP) / (ROW_HEIGHT + ROW_GAP))));
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  const hits = useMemo(() => searchRemarks(query), [query]);
  const spread = useMemo(() => spreadOf(hits), [hits]);

  /* The loop reads these, and they change on renders it does not control.
     Refs rather than dependencies: re-running the effect would restart the cue
     on the first keystroke. */
  const hitsRef = useRef(hits);
  const spreadRef = useRef(spread);
  const queryRef = useRef(query);

  // After every render rather than during one. The loop reads these on its
  // next frame, which is always after commit, so it never sees a stale set.
  useEffect(() => {
    hitsRef.current = hits;
    spreadRef.current = spread;
    queryRef.current = query;
  });

  /** Lets the pointer/keyboard interrupt a cue that is mid-flight. */
  const stopCueRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const drillEl = drillRef.current;
    const trackEl = trackRef.current;
    const nowEl = nowRef.current;
    if (!root || !drillEl || !trackEl || !nowEl) return;

    /*
     * Reduced motion does not turn this off, it turns the *performance* off.
     *
     * ThemingInstrument returns early here and leaves a still, which is right
     * for a thing whose only purpose is to move. This is a working search
     * field, and someone who asked for less motion still gets to use it — so
     * what the check gates is the unattended cue and nothing else. Same for a
     * coarse pointer: a phone gets the field, typed into with a keyboard, which
     * is the interface this whole case study was about.
     */
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const open = chan(0);
    const step = chan(0);
    const openOmega = omegaFor(OPEN_SETTLE);
    const stepOmega = omegaFor(STEP_SETTLE);

    let openTo = 0;
    let stepTo = 0;

    /** Seconds into the cue, or -1 once finished or interrupted. */
    let clock = -1;
    /** Seconds into the staged dictation, or -1. */
    let voice = -1;

    let frame = 0;
    let last = 0;
    let running = false;

    /* The last values actually written, so a moving channel does not re-set
       properties it already holds. */
    let wroteOpen = "";
    let wroteStep = "";
    let wroteCount = "";
    let wroteScope = "";
    let wroteTaps = -1;
    let wroteChars = -1;
    let wroteWords = -1;

    function writeReadouts(taps: number) {
      /* What the numbers say depends on which flow is on screen, and both are
         counted rather than asserted — the drill panels report the real width
         of the real tree, and the search line reports what the matcher just
         returned. */
      let countText: string;
      let scopeText: string;

      if (voice >= 0) {
        countText = "Listening — staged for this demo";
        scopeText = "Voice";
      } else if (open.v > 0.5) {
        const panel = DRILL_PANELS[Math.min(Math.round(step.v), 2)];
        countText = `${panel.total} ${panel.unit}`;
        scopeText = `Step ${taps} of ${OLD_PATH_TAPS}`;
      } else if (queryRef.current) {
        const n = hitsRef.current.length;
        const mine = hitsRef.current.filter((h) => h.remark.used > 0).length;
        countText = `${n} ${n === 1 ? "remark" : "remarks"} · ${mine} yours · 0 taps`;
        scopeText = `${spreadRef.current} ${
          spreadRef.current === 1 ? "category" : "categories"
        }`;
      } else {
        countText = REST_COUNT;
        scopeText = REST_SCOPE;
      }

      if (countText !== wroteCount) {
        wroteCount = countText;
        if (count?.current) count.current.textContent = countText;
      }
      if (scopeText !== wroteScope) {
        wroteScope = scopeText;
        if (scope?.current) scope.current.textContent = scopeText;
      }
    }

    function tick(now: number) {
      const dt = frameDelta(now, last);
      last = now;

      /* The cue drives the same targets an interaction does, so there is no
         second code path and nothing to hand over when it is interrupted — it
         simply stops writing them. */
      if (clock >= 0) {
        clock += dt;
        if (clock >= CUE_END) {
          clock = -1;
        } else {
          const at = cueAt(clock);
          openTo = at.open;
          stepTo = at.step;
          if (at.chars !== wroteChars) {
            wroteChars = at.chars;
            setQuery(CUE_QUERY.slice(0, at.chars));
          }
        }
      }

      /* The staged dictation, on its own clock for the same reason: it moves
         one target (the field's value) and stops. */
      if (voice >= 0) {
        voice += dt;
        if (voice >= VOICE_END) {
          voice = -1;
          setListening(false);
        } else {
          const words = voiceAt(voice);
          if (words !== wroteWords) {
            wroteWords = words;
            setQuery(VOICE_WORDS.slice(0, words).join(" "));
          }
        }
      }

      settle(open, openTo, openOmega, dt);
      settle(step, stepTo, stepOmega, dt);

      /* Two decimals is finer than a pixel at any width this is drawn, and it
         bounds how many distinct values the compositor is asked for. */
      const openText = open.v.toFixed(3);
      if (openText !== wroteOpen) {
        wroteOpen = openText;
        drillEl!.style.setProperty("--open", openText);
        /* And the new flow, going the other way.

           Without this the two lists are both legible through each other for
           the length of the collapse, because the drill's plate is translucent
           over a `backdrop-filter` — which made the one moment the card exists
           to show read as a dissolve between two things rather than as one
           being replaced by the other. Set straight on the element rather than
           through a custom property: opacity is composited, so this costs a
           layer swap and no style invalidation at all, and `--open` is
           registered `inherits: false` and could not have reached in here
           anyway.

           Gone by the midpoint rather than at the end, so the two flows are
           never both legible — the drill picks the crossing up from there. */
        nowEl!.style.opacity = Math.max(0, 1 - open.v * 2).toFixed(3);
      }

      const stepText = step.v.toFixed(3);
      if (stepText !== wroteStep) {
        wroteStep = stepText;
        trackEl!.style.setProperty("--step", stepText);
      }

      /* Which of the old flow's three steps is on screen. `step` indexes the
         panels, and the step someone is *on* is one past the panel they are
         looking at: the category list is where choice one gets made. Discrete
         by definition — you are on a step or you are not — so this is the one
         thing rounded rather than interpolated. */
      const taps =
        open.v > 0.5 ? Math.min(Math.round(step.v) + 1, OLD_PATH_TAPS) : 0;
      if (taps !== wroteTaps) {
        wroteTaps = taps;
        const row = pips?.current?.children;
        if (row) {
          for (let i = 0; i < row.length; i++) {
            (row[i] as HTMLElement).toggleAttribute("data-on", i < taps);
          }
        }
      }

      writeReadouts(taps);

      /* Nothing is playing and both channels are where they were asked to be,
         so the next frame could only write what is already there. */
      if (
        clock < 0 &&
        voice < 0 &&
        arrived(open, openTo, EPS, EPS_VEL) &&
        arrived(step, stepTo, EPS, EPS_VEL)
      ) {
        running = false;
        last = 0;
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      // Not carried over from whenever the loop last stopped: `frameDelta`
      // would read the gap between then and now as one enormous frame.
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    /* One pass so the readouts are written even when nothing will ever move —
       reduced motion, or a visitor who types before the cue has fired. */
    start();

    /** Called from the input and the mic: whatever the cue was mid-way through
     *  saying, the person is now saying something themselves. */
    function interrupt() {
      clock = -1;
      openTo = 0;
      stepTo = 0;
      start();
    }
    stopCueRef.current = interrupt;

    /* --- The cue ---------------------------------------------------------- */

    // Once, and only if it is actually on screen. Demonstrating itself out of
    // view has done nothing except spend a frame budget.
    let io: IntersectionObserver | undefined;
    if (wantCue && !still && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          // Somebody has already typed something. The card has nothing left to
          // prove to them and taking the field away to prove it would be rude.
          // Not while the dictation is running, and not over something
          // somebody typed. Pressing the mic before this had ever been
          // scrolled to would otherwise have the card interrupt itself.
          if (clock < 0 && voice < 0 && !queryRef.current) {
            clock = 0;
            start();
          }
          io?.disconnect();
        },
        { threshold: 0.55 },
      );
      io.observe(root);
    }

    /* --- The mic ---------------------------------------------------------- */

    function onVoice() {
      if (voice >= 0) {
        // Pressed again mid-sentence: stop, and leave what was heard.
        voice = -1;
        setListening(false);
        return;
      }
      interrupt();
      wroteWords = -1;
      voice = 0;
      setListening(true);
      setQuery("");
      start();
    }
    root.addEventListener("remarkfinder:voice", onVoice);

    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
      root.removeEventListener("remarkfinder:voice", onVoice);
      stopCueRef.current = null;
    };
  }, [wantCue]);

  const shown = hits.slice(0, Math.min(rows, fits));

  return (
    <div
      className={[styles.finder, className].filter(Boolean).join(" ")}
      ref={rootRef}
      data-listening={listening ? "" : undefined}
    >
      {/* The frame the two flows share. The drill is laid over this and not
          over the whole instrument, so the readout below it survives the
          swap — during the drill it is counting taps, which is the one number
          that has to be legible exactly while the old flow is on screen. */}
      <div className={styles.frame}>
        {/* --- The way it used to work ------------------------------------
          Presentational. It is a recreation of a flow, not a flow — nothing
          in here is focusable, and it is out of the accessibility tree, so
          the field below is the only thing a screen reader or a tab key
          finds. */}
        <div className={styles.drill} ref={drillRef} aria-hidden="true">
          <div className={styles.drillTrack} ref={trackRef}>
            {DRILL_PANELS.map((panel, i) => (
              <div className={styles.panel} key={panel.crumb}>
                <p className={styles.crumb}>{panel.crumb}</p>
                <ul className={styles.panelRows}>
                  {panel.rows.slice(0, DRILL_ROWS).map((row) => (
                    <li
                      className={styles.panelRow}
                      key={row}
                      data-chosen={row === panel.chosen ? "" : undefined}
                    >
                      <span className={styles.panelText}>{row}</span>
                      {i < 2 && (
                        <span className={styles.chevron} aria-hidden="true" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* --- The way it works now ---------------------------------------- */}
        <div className={styles.now} ref={nowRef}>
          <div className={`${styles.plate} squircle`}>
            <div className={styles.inputRow}>
              <span className={styles.icon} aria-hidden="true">
                <span
                  className="inkIcon"
                  style={{
                    ["--icon" as string]: "url(/icons/search.svg)",
                    width: 19,
                    height: 20,
                  }}
                />
              </span>
              <input
                id="remark-search"
                type="search"
                className={styles.input}
                placeholder={copy.placeholder}
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  stopCueRef.current?.();
                  setQuery(e.target.value);
                }}
              />

              {/* Staged, and labelled as such the moment it runs — see VOICE. */}
              <button
                type="button"
                className={styles.mic}
                aria-pressed={listening}
                title="Play a staged dictation"
                onClick={() =>
                  rootRef.current?.dispatchEvent(
                    new CustomEvent("remarkfinder:voice"),
                  )
                }
              >
                <span className="srOnly">
                  {listening
                    ? "Stop the staged dictation"
                    : "Play a staged dictation"}
                </span>
                <span
                  className={`inkIcon ${styles.micIcon}`}
                  style={{
                    ["--icon" as string]: "url(/icons/mic.svg)",
                    width: 12,
                    height: 18,
                  }}
                  aria-hidden="true"
                />
                <span className={styles.meter} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            </div>
          </div>

          {/* --- What it found ------------------------------------------------
          `role="list"` survives the `list-style: none` that strips the
          implicit role in Safari. The region announces its own count because
          the count is the answer. */}
          <ul className={styles.results} ref={resultsRef} role="list">
            {shown.map((hit) => (
              <ResultRow key={hit.remark.text} hit={hit} />
            ))}
          </ul>
        </div>
      </div>

      {/* --- What it just did ---------------------------------------------
          The pips are the tap counter, and they are the argument in one line:
          three of them fill as the old flow drills, and all three empty at the
          collapse. Indicators, not controls. */}
      <p className={styles.legend}>
        <span className={styles.pips} ref={pips}>
          {Array.from({ length: OLD_PATH_TAPS }, (_, i) => (
            <span className={styles.pip} key={i} />
          ))}
        </span>
        <span className={styles.count} ref={count}>
          {REST_COUNT}
        </span>
        {/* Where `Select category` used to be a disabled button. It is a
            readout now: after a search it reports how many categories the
            answer was spread across, which is the number the old flow made you
            guess before you had it. */}
        <span className={styles.scope} ref={scope}>
          {REST_SCOPE}
        </span>
      </p>
    </div>
  );
}

/**
 * One result.
 *
 * The taxonomy path is on every row on purpose. It is the evidence for the
 * claim the card is making — a list of matches whose paths disagree with each
 * other is a list the old flow could not have produced, and you can read that
 * off the card without being told it.
 */
function ResultRow({ hit }: { hit: Hit }) {
  const { remark, marks, viaPath } = hit;

  return (
    <li className={styles.row} data-mine={remark.used > 0 ? "" : undefined}>
      <p className={styles.rowText}>{highlight(remark.text, marks)}</p>
      <p className={styles.rowMeta}>
        <span className={styles.path}>
          {remark.category} › {remark.subcategory}
        </span>
        {viaPath && <span className={styles.viaPath}>matched here</span>}
        <span className={styles.used}>
          {remark.used > 0 ? `used ${remark.used}×` : "not yours yet"}
        </span>
      </p>
    </li>
  );
}

/** The matched ranges, marked. `searchRemarks` already worked out where they
 *  are, so this is a split rather than a second pass over the text. */
function highlight(
  text: string,
  marks: readonly (readonly [number, number])[],
) {
  if (marks.length === 0) return text;

  const out: (string | React.ReactElement)[] = [];
  let at = 0;
  marks.forEach(([start, len], i) => {
    if (start < at) return;
    if (start > at) out.push(text.slice(at, start));
    out.push(
      <mark className={styles.mark} key={i}>
        {text.slice(start, start + len)}
      </mark>,
    );
    at = start + len;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export { OLD_PATH_TAPS };
