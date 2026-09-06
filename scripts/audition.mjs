#!/usr/bin/env node
/**
 * Measure every candidate against what its cue actually needs.
 *
 *   node scripts/audition.mjs              the whole board
 *   node scripts/audition.mjs book-page    one cue, verbosely
 *
 * Ranks by `scripts/lib/targets.mjs` and prints the trim each candidate would
 * get, so the shortlist can go straight into samples.config.mjs.
 *
 * WHAT THIS DOES NOT DO: decide. It narrows five search results to the one or
 * two that are the right object at the right scale, which is a question about
 * measurable properties. Whether a page turn sounds like *this* book is a
 * question for ears, and that happens in /dev/sounds.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { centroid, db, decode, peakOf, requireTools, rise, rmsOf, RATE, t20 } from "./lib/pcm.mjs";
import { KEEP, KEEP_DEFAULT, LOOP_SECONDS, TARGETS, score } from "./lib/targets.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "samples-src");

/** Everything below this, relative to the file's peak, is not the sound. */
const FLOOR_DB = -42;
/** A gap longer than this ends the event rather than sitting inside it. */
const GAP_MS = 90;
/** Kept before the onset, so the attack is never clipped by the trim itself. */
const LEAD_MS = 6;

requireTools();

/**
 * Find the sound inside the file.
 *
 * Library recordings are not cues: they have leading silence, trailing room,
 * and often several takes in a row. Measuring a whole file therefore measures
 * mostly the room — a half-second page turn inside five seconds of silence
 * reads as a five-second sound with a very low crest factor, and would be
 * rejected for being something it is not.
 *
 * So: an energy envelope, the loudest contiguous event in it, and a window
 * around that. This is the same onset reasoning as `rise()` in pcm.mjs, one
 * level up — measure the sound, never the silence around it.
 */
function findEvent(samples, { sustained }) {
  const hop = Math.floor((5 / 1000) * RATE);
  const frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
    energy[f] = Math.sqrt(sum / hop);
  }

  let loudest = 0;
  for (const e of energy) loudest = Math.max(loudest, e);
  if (loudest === 0) return { start: 0, end: samples.length };
  const floor = loudest * Math.pow(10, FLOOR_DB / 20);

  /* A sustained cue wants the longest continuous stretch of sound, not the
     loudest moment in it — the whole point is that nothing in it is an event. */
  const gap = Math.ceil((sustained ? 250 : GAP_MS) / 5);

  const runs = [];
  let open = null;
  let quiet = 0;
  for (let f = 0; f < frames; f += 1) {
    if (energy[f] >= floor) {
      if (open === null) open = f;
      quiet = 0;
    } else if (open !== null && (quiet += 1) > gap) {
      runs.push([open, f - quiet]);
      open = null;
    }
  }
  if (open !== null) runs.push([open, frames - 1]);
  if (runs.length === 0) return { start: 0, end: samples.length };

  const best = runs
    .map(([a, b]) => {
      let sum = 0;
      for (let f = a; f <= b; f += 1) sum += energy[f];
      // Longest for a texture, loudest for an event.
      return { a, b, rank: sustained ? b - a : sum / Math.max(1, b - a) };
    })
    .sort((x, y) => y.rank - x.rank)[0];

  const lead = Math.floor((LEAD_MS / 1000) * RATE);
  return {
    start: Math.max(0, best.a * hop - lead),
    end: Math.min(samples.length, (best.b + 1) * hop),
  };
}

function measure(window) {
  const { riseMs } = rise(window);
  const peak = peakOf(window);
  const rms = rmsOf(window);
  return {
    ms: (window.length / RATE) * 1000,
    hz: centroid(window),
    crest: peak > 0 && rms > 0 ? db(peak / rms) : 0,
    riseMs,
    t20: t20(window) * 1000,
  };
}

const write = process.argv.includes("--write");
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const cues = Object.keys(TARGETS).filter((c) => only.length === 0 || only.includes(c));

const chosen = {};
/* A file may only win one cue. "To Hell With Vinyl.wav" ranked first for both
   `needle-drop` and `needle-lift`, and the two cues came out byte-identical —
   which is not "they sound similar", it is one sound playing for two different
   events. Nothing downstream could have caught it: the manifest was valid, the
   files existed, and the measurements agreed perfectly because they were the
   same measurements. */
const claimed = new Set();

for (const cue of cues) {
  const dir = join(SRC, cue);
  if (!existsSync(dir)) continue;

  const target = TARGETS[cue];
  const sustained = Boolean(target.loop);
  const meta = existsSync(join(dir, "candidates.json"))
    ? JSON.parse(readFileSync(join(dir, "candidates.json"), "utf8"))
    : [];

  const rows = [];
  for (const file of readdirSync(dir).filter((f) => /\.(mp3|wav|aif|aiff|flac|m4a)$/i.test(f))) {
    let samples;
    try {
      samples = decode(join(dir, file));
    } catch {
      continue;
    }
    if (samples.length < RATE * 0.01) continue;

    const { start, end } = findEvent(samples, { sustained });
    const window = samples.subarray(start, end);
    if (window.length < RATE * 0.01) continue;
    /* A sustaining cue needs enough material that the ear cannot find the lap.
       Under a second there is nothing to loop, however well it measures. */
    if (sustained && window.length < RATE) continue;

    const m = measure(window);
    const title = meta.find((x) => x.file === file)?.title ?? file;
    rows.push({
      file,
      title,
      start: start / RATE,
      duration: window.length / RATE,
      ...m,
      penalty: score(target, m, title),
    });
  }

  if (rows.length === 0) {
    console.log(`\n${cue} — nothing to measure`);
    continue;
  }

  rows.sort((a, b) => a.penalty - b.penalty);
  for (const r of rows) r.taken = claimed.has(r.file);

  const t = target;
  console.log(
    `\n${cue}  ·  want ${t.ms[0]}-${t.ms[1]}ms, ${t.hz[0]}-${t.hz[1]}Hz, crest ${t.crest[0]}-${t.crest[1]}dB${t.rise ? `, rise <${t.rise[1]}ms` : ""}`,
  );
  for (const r of rows) {
    const flag = r.taken ? "↑" : r.penalty === 0 ? "✓" : r.penalty < 0.35 ? "·" : " ";
    console.log(
      `  ${flag} ${String(r.penalty.toFixed(2)).padStart(5)}  ${r.file.padEnd(12)}` +
        `${r.ms.toFixed(0).padStart(6)}ms ${r.hz.toFixed(0).padStart(6)}Hz ` +
        `${r.crest.toFixed(1).padStart(5)}dB ${r.riseMs.toFixed(1).padStart(5)}ms rise   ${r.title.slice(0, 34)}`,
    );
  }

  /* The top three regardless of score, rather than only those inside every
     window. A cue whose candidates are all imperfect still needs a proposal —
     the windows narrow the field, they do not have a veto, and the last call
     is made by ear in /dev/sounds either way. Anything genuinely hopeless is
     visible as a large penalty in the table above. */
  chosen[cue] = rows.filter((r) => !r.taken).slice(0, KEEP[cue] ?? KEEP_DEFAULT);
  for (const r of chosen[cue]) claimed.add(r.file);
}

/* --- The proposed config ------------------------------------------------- */
const usable = Object.entries(chosen).filter(([, rows]) => rows.length > 0);

/**
 * Replace one cue's entry, whatever shape it currently has.
 *
 * By counting braces rather than by regex. A first attempt matched
 * `^  "cue": \{[\s\S]*?\n  \},$`, which silently failed on the single-line
 * form the file starts out in — every entry was appended instead of replaced,
 * and because a later duplicate key wins in an object literal the result still
 * worked, which is exactly the kind of wrong that survives review.
 */
function splice(source, cue, next) {
  const head = source.indexOf(`  "${cue}": {`);
  if (head === -1) return source.replace(/^};$/m, `${next}\n};`);

  let depth = 0;
  let at = source.indexOf("{", head);
  for (; at < source.length; at += 1) {
    if (source[at] === "{") depth += 1;
    else if (source[at] === "}" && (depth -= 1) === 0) break;
  }
  // Take the trailing comma with it.
  const tail = source[at + 1] === "," ? at + 2 : at + 1;
  return source.slice(0, head) + next + source.slice(tail);
}

function entry(cue, rows) {
  /* A loop is capped by its own budget rather than by the target's ceiling:
     the window says how long a *usable* texture is, this says how much of one
     is worth downloading. */
  const cap = LOOP_SECONDS[cue] ?? TARGETS[cue].ms[1] / 1000;
  const takes = rows
    .map((r) => {
      const seconds = Math.min(r.duration, cap);
      return `      { src: "${cue}/${r.file}", start: ${r.start.toFixed(3)}, duration: ${seconds.toFixed(3)} },`;
    })
    .join("\n");
  const loop = TARGETS[cue].loop ? "loop: true, " : "";
  return `  "${cue}": { gain: 1, ${loop}takes: [\n${takes}\n  ] },`;
}

if (write) {
  /* Rewrite only the cue entries, leaving every comment in samples.config.mjs
     where it is: those comments are the design reasoning for each cue and are
     worth more than the numbers they sit above, which are regenerated on every
     run. */
  const path = join(ROOT, "samples.config.mjs");
  let config = readFileSync(path, "utf8");
  for (const [cue, rows] of usable) config = splice(config, cue, entry(cue, rows));
  writeFileSync(path, config);
  console.log(`\n  Wrote ${usable.length} cues into samples.config.mjs.`);
} else if (usable.length > 0) {
  console.log(`\n\n/* --- paste into samples.config.mjs, or re-run with --write --- */`);
  for (const [cue, rows] of usable) console.log(entry(cue, rows));
}

const empty = cues.filter((c) => !(chosen[c]?.length > 0));
if (empty.length > 0) {
  console.log(`\n  No candidate inside the window for: ${empty.join(", ")}`);
  console.log(`  Widen the search in scripts/fetch-sounds.mjs, or the target in scripts/lib/targets.mjs.`);
}
