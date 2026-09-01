"use client";

import { useEffect, useMemo, useState } from "react";
import { notoSerifDevanagari } from "@/app/fonts-devanagari";
import type { about } from "@/content/site";
import styles from "./AboutModal.module.css";

type Items = (typeof about)["greetings"];

/**
 * Where the line is in its loop.
 *
 * `held` is the resting state and the only one that can be paused — stopping
 * halfway through a word would read as a bug rather than as a pause.
 */
type Phase = "held" | "glitch" | "erasing" | "typing";

const HOLD_MS = 2400;
const GLITCH_MS = 300;
/** The beat on the empty line, between the last delete and the first key. */
const BEAT_MS = 240;
const ERASE_MS = 42;
const TYPE_MS = 92;

/**
 * The greeting, typed and retyped in one language after another — Figma
 * 886:7397.
 *
 * IT IS A TYPEWRITER, AND THE ORDER IS THE POINT. The word sits finished for a
 * couple of seconds, glitches — three hundred milliseconds of jitter and a
 * chromatic split, the line losing its grip on which language it is in — and
 * only then backspaces itself away, key by key, before the next language types
 * in over the empty line. The glitch is what makes the erase read as a decision
 * rather than as a loop starting over.
 *
 * WHY IT IS ONE TEXT NODE AND NOT A SPAN PER LETTER. A typewriter renders a
 * *prefix* of the word, which is a single string the shaper sees whole. That is
 * what makes नमस्ते survive: it is न + म + स + ् + त + े, and the halant joins
 * the last three into one conjunct that a span boundary would break into a
 * stray mark nobody typed. Cutting the string on grapheme boundaries — what
 * `Intl.Segmenter` returns, not what `[...word]` returns — types Devanagari
 * exactly the way a person typing Devanagari sees it appear.
 *
 * WHY EVERYTHING SITS ON ONE LINE. The word, the caret and the comma are three
 * inline boxes in a single line box, so they share its baseline by definition
 * rather than by arithmetic — which is the fix for Hindi riding a few pixels
 * high when each language was its own block. The stylesheet holds that baseline
 * still; see `.greetingWord`'s `line-height`.
 *
 * A BUTTON, because hovering pauses the loop at rest and a click takes the next
 * language now — somebody who wants to read a word can stop it, and somebody who
 * missed one can get it back. Both reachable from a keyboard. The line itself is
 * `aria-hidden` and the button carries the English greeting as its label: a live
 * region here would announce a new word every three seconds forever, which is
 * the accessibility of a fire alarm.
 *
 * Reduced motion keeps the languages and drops the typing — the word is
 * replaced whole, on the same clock. See the stylesheet for the rest.
 */
export default function Greeting({ items }: { items: Items }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("held");
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  /** Every language, pre-split into the units a keystroke adds or removes. */
  const cells = useMemo(() => items.map((i) => graphemes(i.word)), [items]);

  /** How many of the current word's cells are on screen. */
  const [count, setCount] = useState(() => cells[0].length);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  /**
   * The loop, as one scheduled step at a time.
   *
   * Every phase answers the same question — what happens next, and how long
   * from now — so there is exactly one timer alive and React's own cleanup is
   * what cancels it. An unmount, a pause or a click that changes the phase all
   * tear the pending step down on the way past; nothing has to remember to.
   */
  useEffect(() => {
    if (items.length < 2) return;

    if (reduced) {
      if (paused) return;
      const t = window.setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
      }, HOLD_MS + GLITCH_MS);
      return () => window.clearTimeout(t);
    }

    let delay: number;
    let step: () => void;

    switch (phase) {
      case "held":
        if (paused) return;
        delay = HOLD_MS;
        step = () => setPhase("glitch");
        break;

      case "glitch":
        delay = GLITCH_MS;
        step = () => setPhase("erasing");
        break;

      case "erasing":
        if (count > 0) {
          /* Backspace is a held key, so it is faster than typing and more
             even — but not perfectly even, or it reads as a progress bar. */
          delay = ERASE_MS + Math.random() * 26;
          step = () => setCount((c) => c - 1);
        } else {
          delay = BEAT_MS;
          step = () => {
            setIndex((i) => (i + 1) % items.length);
            setPhase("typing");
          };
        }
        break;

      case "typing":
        if (count < cells[index].length) {
          /* Hands are uneven. A metronome here is the tell that this is a
             loop and not somebody typing. */
          delay = TYPE_MS + Math.random() * 80 - 24;
          step = () => setCount((c) => c + 1);
        } else {
          delay = 140;
          step = () => setPhase("held");
        }
        break;
    }

    const timer = window.setTimeout(step, delay);
    return () => window.clearTimeout(timer);
  }, [phase, count, index, paused, reduced, items.length, cells]);

  /** Take the next language now, from wherever the loop happens to be. */
  function next() {
    if (items.length < 2) return;
    if (reduced) {
      setIndex((i) => (i + 1) % items.length);
      return;
    }
    // Mid-word, the loop is already on its way somewhere; only a resting line
    // has a hold left to skip.
    if (phase === "held") setPhase("glitch");
  }

  const item = items[index];
  const word = reduced ? item.word : cells[index].slice(0, count).join("");
  /** The word is whole — which is when the comma is worth having. */
  const settled = reduced || phase === "held" || phase === "glitch";

  return (
    <p className={`${styles.greeting} ${notoSerifDevanagari.variable}`}>
      <button
        type="button"
        className={styles.greetingButton}
        onClick={next}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-label={`${items[0].word}, — say it in another language`}
      >
        {/* One line box: three inline boxes on a shared baseline. */}
        <span
          className={styles.greetingWord}
          lang={item.lang}
          /* The glitch's two ghosts are pseudo-elements, and this is the only
             way to give them the text to draw. */
          data-text={word}
          data-glitch={phase === "glitch" ? "" : undefined}
          aria-hidden="true"
        >
          {word}
        </span>
        {/* The comma stays glued to the word, ahead of the caret, because the
            file draws "Hello," as one thing — a caret wedged between them
            pushes the comma seven pixels off the o and the line stops being
            the one in Figma. It dims rather than leaves while the word is in
            pieces: punctuation belongs to a finished word. */}
        <span
          className={styles.greetingComma}
          data-settled={settled ? "" : undefined}
          aria-hidden="true"
        >
          ,
        </span>
        <span
          className={styles.greetingCaret}
          data-blink={settled ? "" : undefined}
          aria-hidden="true"
        />
      </button>
    </p>
  );
}

/**
 * A word, split where a keystroke would split it.
 *
 * `[...word]` splits on code points, which is wrong for every script that
 * combines them: it would type नमस्ते as न, म, स, ्, त, े — six keys, two of
 * them marks that cannot stand alone, and a halant left hanging on screen for
 * two frames of the animation. `Intl.Segmenter` returns grapheme clusters,
 * which is what a caret moves over and what a backspace deletes.
 *
 * The fallback is the wrong split, and that is deliberate: it is reached only
 * on a browser old enough to lack `Intl.Segmenter` (pre-2024 Firefox, roughly),
 * where a slightly odd Devanagari animation beats no greeting at all.
 */
function graphemes(word: string): string[] {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) return [...word];
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...segmenter.segment(word)].map((s) => s.segment);
}
