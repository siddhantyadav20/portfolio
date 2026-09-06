#!/usr/bin/env node
/**
 * Read the cues against each other.
 *
 *   node scripts/measure-sfx.mjs
 *
 * WHAT THIS IS ACTUALLY FOR, AND IT IS NOT QUALITY CONTROL
 *
 * No number here says whether a recording is any good. That judgement is made
 * by ear, in `/dev/sounds`, by someone who can hear it. What this answers is
 * the question ears are *bad* at and which is the actual complaint about this
 * board: DO THESE CUES SOUND LIKE EACH OTHER?
 *
 * A person auditioning twenty sounds one at a time, over an afternoon, cannot
 * hold their relative brightness in mind — and "everything sounds the same"
 * is a statement about relationships, not about any single cue. The last
 * synthesis pass had the photograph at 12.1kHz and the coin at 13.1kHz: two
 * different objects, indistinguishable in brightness, and nobody caught it
 * until it was measured.
 *
 * So: the whole board on one page, sorted by brightness, with the gaps shown.
 * Cues that cluster are cues that will be confused.
 *
 *   centroid  where the energy sits. The single best predictor of whether two
 *             cues read as the same material. WANT THESE SPREAD OUT.
 *   rise      onset to peak. What separates a crack from a swell. Measured
 *             from the onset, never from the start of the file.
 *   t20       how long it hangs around after it has happened. Interface cues
 *             want this short; a long tail is a performance.
 *   peak/rms  crest factor. High is transient, low is texture.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { centroid, db, decode, peakOf, requireTools, rise, rmsOf, RATE, t20 } from "./lib/pcm.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "sfx");

/**
 * How close two cues may sit before they are heard as the same object.
 *
 * NOT CENTROID ALONE, and the first version of this was and said so loudly:
 * with the whole board recalibrated onto real recordings it flagged nearly
 * every adjacent pair, because real foley of small objects genuinely lives
 * between about 2 and 3.5kHz and there is nothing wrong with that. Brightness
 * is where the synthesised board failed — everything at 12-13kHz — but it is
 * not, on its own, what tells two real objects apart.
 *
 * A football strike and a page riffle measure within 1% on centroid. Nobody
 * would confuse them, because one is a 24.6dB transient gone in 61ms and the
 * other a 12.6dB texture lasting 1.1 seconds. So the distance is taken across
 * the four dimensions that actually carry identity, each normalised to roughly
 * "one unit is an audible difference":
 *
 *   brightness  centroid, in octaves
 *   attack      crest factor, per 6dB
 *   length      duration, in octaves
 *   decay       t20, in octaves
 */
const CONFUSABLE = 1.0;

function distance(a, b) {
  const oct = (x, y) => Math.abs(Math.log2(Math.max(1, x) / Math.max(1, y)));
  return Math.hypot(
    oct(a.hz, b.hz),
    Math.abs(a.crest - b.crest) / 6,
    oct(a.ms, b.ms) * 0.6,
    oct(Math.max(20, a.t20), Math.max(20, b.t20)) * 0.6,
  );
}

requireTools();

if (!existsSync(DIR) || readdirSync(DIR).filter((f) => f.endsWith(".m4a")).length === 0) {
  console.log(
    "\nNo recordings yet — public/sfx is empty.\n\n" +
    "Every cue is still playing its synthesised version, which is the intended\n" +
    "state until sounds are chosen. Fill in samples.config.mjs and run\n" +
    "`node scripts/build-samples.mjs` first.",
  );
  process.exit(0);
}

const rows = readdirSync(DIR)
  .filter((f) => f.endsWith(".m4a"))
  .map((file) => {
    const samples = decode(join(DIR, file));
    const { riseMs, onsetMs } = rise(samples);
    const peak = peakOf(samples);
    const rms = rmsOf(samples);
    return {
      file,
      cue: file.replace(/-\d+\.m4a$/, ""),
      ms: (samples.length / RATE) * 1000,
      kb: statSync(join(DIR, file)).size / 1024,
      hz: centroid(samples),
      riseMs,
      onsetMs,
      t20: t20(samples) * 1000,
      crest: peak > 0 && rms > 0 ? db(peak / rms) : 0,
    };
  })
  .sort((a, b) => a.hz - b.hz);

const pad = (s, n) => String(s).padEnd(n);
const num = (v, n, d = 0) => String(v.toFixed(d)).padStart(n);

console.log(
  `\n  ${pad("cue", 22)}${"centroid".padStart(10)}${"ms".padStart(8)}${"rise".padStart(8)}${"t20".padStart(8)}${"crest".padStart(8)}${"KB".padStart(7)}`,
);
console.log("  " + "-".repeat(71));

for (const r of rows) {
  console.log(
    `  ${pad(r.cue, 22)}${num(r.hz, 8)}Hz${num(r.ms, 8)}${num(r.riseMs, 7, 1)}${num(r.t20, 8)}${num(r.crest, 7, 1)}dB${num(r.kb, 6, 1)}`,
  );
}

/* Every pair, not just neighbours in this ordering: two cues can be adjacent
   on brightness and far apart in every other respect, and two that are far
   apart on brightness can still collide once decay and attack are counted. */
const collisions = [];
for (let i = 0; i < rows.length; i += 1) {
  for (let j = i + 1; j < rows.length; j += 1) {
    if (rows[i].cue === rows[j].cue) continue;
    const d = distance(rows[i], rows[j]);
    if (d < CONFUSABLE) collisions.push({ a: rows[i], b: rows[j], d });
  }
}
collisions.sort((x, y) => x.d - y.d);

if (collisions.length === 0) {
  console.log("\n  No two cues are confusable. Every pair differs on at least one of");
  console.log("  brightness, attack, length or decay by an audible margin.");
} else {
  console.log(`\n  ${collisions.length} confusable pair${collisions.length === 1 ? "" : "s"} — same object, twice:`);
  for (const c of collisions.slice(0, 10)) {
    console.log(
      `    ${c.d.toFixed(2)}  ${c.a.cue} / ${c.b.cue}` +
      `   (${c.a.hz.toFixed(0)}/${c.b.hz.toFixed(0)}Hz, ${c.a.crest.toFixed(0)}/${c.b.crest.toFixed(0)}dB, ${c.a.t20.toFixed(0)}/${c.b.t20.toFixed(0)}ms)`,
    );
  }
}

const total = rows.reduce((a, r) => a + r.kb, 0);
const span = rows.length > 1 ? Math.log2(rows[rows.length - 1].hz / rows[0].hz) : 0;

console.log(`\n  ${rows.length} files, ${total.toFixed(1)}KB, spanning ${span.toFixed(1)} octaves.`);
if (span < 2 && rows.length > 4) {
  console.log("  Under two octaves across the whole board is a monoculture — that is the");
  console.log("  measurement of \"everything sounds the same\".");
}
