#!/usr/bin/env node
/**
 * Found's voice memos, mixed from CC0 recordings and two whispered lines.
 *
 *   node scripts/build-found-audio.mjs
 *
 * The phone's buzz is an ordinary cue (samples.config.mjs → public/sfx). The
 * memos are not cues: they are forty seconds of a place, several recordings
 * laid on one timeline, so they are built here and written to public/found.
 *
 * THE TIMELINE IS THE SCRIPT'S. Voice Memos shows the transcript one caption
 * at a time, evenly across the recording (components/found/apps/Memos.tsx),
 * so each sound lands just after its caption appears: the footsteps under
 * "[footsteps on grit]", the horn under "[a local train horn, very close]",
 * and so on. Change the transcript and the offsets below follow from it.
 *
 * WHERE IN EACH RECORDING is measured, not chosen by ear (nobody tuning this
 * can hear it; see scripts/lib/pcm.mjs): the loudest stretch of the horn, the
 * steps and the door, and the steadiest stretch of the wind for the bed.
 *
 * The whispers are macOS's own Whisper voice (`say -v Whisper`). A whisper has
 * no gender to give away, which matters when the missing person is dealt as a
 * girl or a boy at random.
 *
 * Sources live in samples-src/ (git-ignored, CC0 from Freesound; ids in the
 * folder names). What ships is the mix, at 40kbps mono: a memo recorded on a
 * phone in the dark is not a hi-fi recording, and 41s has to fit the budget.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decode, fade, normalise, RATE, requireTools, writeWav } from "./lib/pcm.mjs";

/* Each memo's length and caption count, as content/found/episode1.ts has them.
   Written out rather than imported: Node can't load the episode's TypeScript
   (it imports "./index" with no extension). tests/found.test.ts reads these
   numbers back out of this file and fails if the episode has moved on. */
const MEMOS = {
  "rec-14": { seconds: 41, captions: 6 },
  "rec-13": { seconds: 13, captions: 2 },
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "samples-src");
const OUT = join(ROOT, "public", "found");

requireTools();
mkdirSync(OUT, { recursive: true });

const gain = (db) => Math.pow(10, db / 20);

/** RMS per window, so "where does this recording actually happen" is a number. */
function envelope(s, ms) {
  const n = Math.max(1, Math.floor((RATE * ms) / 1000));
  const out = [];
  for (let i = 0; i + n <= s.length; i += n) {
    let a = 0;
    for (let j = i; j < i + n; j += 1) a += s[j] * s[j];
    out.push(Math.sqrt(a / n));
  }
  return out;
}

/** Start, in seconds, of the loudest `sec`-long stretch. */
function loudest(s, sec, ms = 100) {
  const env = envelope(s, ms);
  const w = Math.max(1, Math.round((sec * 1000) / ms));
  let sum = 0;
  let best = -1;
  let at = 0;
  for (let i = 0; i < env.length; i += 1) {
    sum += env[i];
    if (i >= w) sum -= env[i - w];
    if (i >= w - 1 && sum > best) {
      best = sum;
      at = i - w + 1;
    }
  }
  return (at * ms) / 1000;
}

/** Start of the steadiest audible stretch: a bed should not have events in it. */
function steadiest(s, sec, ms = 250) {
  const env = envelope(s, ms);
  const w = Math.round((sec * 1000) / ms);
  let best = Infinity;
  let at = 0;
  for (let i = 0; i + w <= env.length; i += 2) {
    const seg = env.slice(i, i + w);
    const mean = seg.reduce((a, b) => a + b, 0) / w;
    if (mean < 1e-4) continue;
    const spread = seg.reduce((a, b) => a + (b - mean) ** 2, 0) / w / (mean * mean);
    if (spread < best) {
      best = spread;
      at = i;
    }
  }
  return (at * ms) / 1000;
}

/** A stretch of a recording, normalised, with fades so no cut clicks. */
function take(file, sec, where, fades = [30, 250]) {
  const all = decode(join(SRC, file));
  const start = where === "loud" ? loudest(all, sec) : where === "steady" ? steadiest(all, sec) : where;
  const s = all.subarray(Math.floor(start * RATE), Math.floor((start + sec) * RATE));
  console.log(`  ${file.padEnd(40)} ${sec.toFixed(1)}s from ${start.toFixed(2)}s (${where})`);
  return fade(normalise(s, -1), fades[0], fades[1]);
}

function mix(seconds, layers) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (const { s, at, db } of layers) {
    const g = gain(db);
    const off = Math.round(at * RATE);
    for (let i = 0; i < s.length && off + i < out.length; i += 1) out[off + i] += s[i] * g;
  }
  return fade(normalise(out, -2), 20, 1500);
}

function encodeSmall(samples, out) {
  const wav = join(tmpdir(), `found-memo-${process.pid}.wav`);
  writeWav(wav, samples);
  try {
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "40000", "-c", "1", "-q", "127", wav, out], {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } finally {
    unlinkSync(wav);
  }
  console.log(`  → ${out.replace(ROOT + "/", "")} ${(statSync(out).size / 1024).toFixed(0)}KB`);
}

/** When caption `i` of a memo appears — the same arithmetic as the player. */
function cueAt(memoId, i) {
  const memo = MEMOS[memoId];
  return (memo.seconds / memo.captions) * i;
}

/* --- New Recording 14: 23:52, the mill ----------------------------------- */

console.log("New Recording 14");
const rec14 = MEMOS["rec-14"];
encodeSmall(
  mix(rec14.seconds, [
    { s: take("found-wind/455949.mp3", rec14.seconds, "steady", [900, 3000]), at: 0, db: -22 },
    { s: take("found-steps/117627.mp3", 6.2, "loud"), at: cueAt("rec-14", 0) + 0.3, db: -7 },
    { s: take("found-horn/219833.mp3", 4.6, "loud", [400, 900]), at: cueAt("rec-14", 1) + 0.25, db: -3 },
    { s: take("found-breath/388773.mp3", 6.0, "loud", [300, 600]), at: cueAt("rec-14", 2) + 0.2, db: -11 },
    { s: take("found-memo/whisper-someones-here.aiff", 1.0, 0, [20, 120]), at: cueAt("rec-14", 3) + 0.4, db: -4 },
    { s: take("found-door/93781.mp3", 1.6, "loud", [5, 500]), at: cueAt("rec-14", 4) + 0.3, db: -5 },
  ]),
  join(OUT, "memo-14.m4a"),
);

/* --- New Recording 13: Tuesday, the cinema -------------------------------- */

console.log("New Recording 13");
const rec13 = MEMOS["rec-13"];
encodeSmall(
  mix(rec13.seconds, [
    { s: take("found-wind/455949.mp3", rec13.seconds, "loud", [600, 1500]), at: 0, db: -14 },
    { s: take("found-memo/whisper-note-to-self.aiff", 6.1, 0, [20, 200]), at: cueAt("rec-13", 1) + 0.1, db: -3 },
  ]),
  join(OUT, "memo-13.m4a"),
);

/* --- The buzz, measured for samples.config.mjs ----------------------------- */

const buzz = decode(join(SRC, "found-buzz/708216.mp3"));
const env = envelope(buzz, 50);
const peak = Math.max(...env);
console.log("\nfound-buzz envelope, 50ms windows (relative to peak), first 3s:");
console.log(env.slice(0, 60).map((v) => Math.round((v / peak) * 9)).join(""));
