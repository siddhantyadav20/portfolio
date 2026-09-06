#!/usr/bin/env node
/**
 * Cut, normalise and encode the recordings, then rewrite the manifest.
 *
 *   node scripts/build-samples.mjs            everything in samples.config.mjs
 *   node scripts/build-samples.mjs book-page  one cue, while choosing it
 *
 * WHAT THIS IS FOR
 *
 * Library recordings are sessions, not cues. A page-turn file is thirty
 * seconds with eight turns in it, recorded loud and clean and left long
 * because that is what a sound library is for. An interface cue is a hundred
 * milliseconds at a fixed level with no tail. Getting from one to the other by
 * hand, for twenty cues with three takes each, is sixty trips through an audio
 * editor and no record of what was done.
 *
 * So the decisions live in `samples.config.mjs` as numbers — which take, from
 * where, how long — and this turns them into files. Re-running it is free, so
 * a trim that turned out too long is one number and one command.
 *
 * The source folder is git-ignored: the originals are hundreds of megabytes of
 * someone else's library, and the licence covers using them in this work, not
 * republishing them in a public repository. What ships is the cut.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  centroid, decode, encode, fade, loopWrap, normalise,
  peakOf, requireTools, rise, RATE, t20, writeWav,
} from "./lib/pcm.mjs";
import { renderManifest } from "./lib/manifest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "samples-src");
const OUT = join(ROOT, "public", "sfx");
const MANIFEST = join(ROOT, "lib", "sfx-manifest.ts");
const TMP = join(ROOT, "node_modules", ".cache", "sfx");

/** Peak every cue is normalised to before its per-cue trim is applied.
 *
 *  Not 0dBFS: AAC is a lossy codec and its reconstruction can overshoot the
 *  samples it was given, so a file normalised to the ceiling clips on decode
 *  in a way the source never did. */
const TARGET_DB = -1;

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));

requireTools();

const config = (await import(join(ROOT, "samples.config.mjs"))).default;

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

/* Everything this run is responsible for, so files from a take that has since
   been removed from the config do not linger in `public/` forever. */
const built = new Map();
const rows = [];
const problems = [];

for (const [cue, spec] of Object.entries(config)) {
  if (only.length > 0 && !only.includes(cue)) continue;

  const files = [];

  for (const [i, take] of (spec.takes ?? []).entries()) {
    const source = join(SRC, take.src);
    if (!existsSync(source)) {
      problems.push(`${cue}: no such file — samples-src/${take.src}`);
      continue;
    }

    let samples;
    try {
      samples = decode(source, { start: take.start ?? 0, duration: take.duration ?? null });
    } catch {
      problems.push(`${cue}: afconvert could not read samples-src/${take.src}`);
      continue;
    }

    if (samples.length < RATE * 0.01) {
      problems.push(`${cue}: take ${i} is under 10ms — check start/duration`);
      continue;
    }

    /* A loop is wrapped before it is faded, because the wrap consumes the tail
       and a fade applied first would be crossfaded into the head as a dip. A
       one-shot is faded at both ends and keeps its own decay. */
    samples = spec.loop
      ? fade(loopWrap(samples), 0, 0)
      : fade(samples, take.fadeIn ?? 2, take.fadeOut ?? 8);

    samples = normalise(samples, TARGET_DB);

    const name = `${cue}-${i + 1}.m4a`;
    const wav = join(TMP, `${cue}-${i + 1}.wav`);
    writeWav(wav, samples);
    encode(wav, join(OUT, name));
    unlinkSync(wav);

    files.push(name);
    built.set(name, true);

    const { onsetMs, riseMs } = rise(samples);
    rows.push({
      cue: files.length > 1 ? `${cue} (${i + 1})` : cue,
      ms: (samples.length / RATE) * 1000,
      kb: statSync(join(OUT, name)).size / 1024,
      hz: centroid(samples),
      riseMs,
      onsetMs,
      t20: t20(samples),
      peak: peakOf(samples),
      loop: Boolean(spec.loop),
    });
  }

  config[cue].built = files;
}

/* --- Sweep ---------------------------------------------------------------
   Only when building everything: a single-cue run knows nothing about the
   files the other nineteen cues own. */
if (only.length === 0 && existsSync(OUT)) {
  for (const file of readdirSync(OUT)) {
    if (file.endsWith(".m4a") && !built.has(file)) {
      unlinkSync(join(OUT, file));
      console.log(`  removed ${file} — no longer in the config`);
    }
  }
}

/* --- Rewrite the generated half of the manifest -------------------------- */
writeFileSync(MANIFEST, renderManifest(readFileSync(MANIFEST, "utf8"), config, only));

/* --- Report -------------------------------------------------------------- */
if (rows.length === 0) {
  console.log(
    "\nNothing to build — no cue in samples.config.mjs has a take yet.\n\n" +
    "  1. drop recordings into samples-src/\n" +
    "  2. name them in samples.config.mjs with a start and a duration\n" +
    "  3. run this again\n\n" +
    "Until then every cue falls back to its synthesised version and the site is unchanged.",
  );
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const num = (v, n, d = 0) => String(v.toFixed(d)).padStart(n);
  console.log(`\n  ${pad("cue", 24)}${"ms".padStart(7)}${"KB".padStart(7)}${"centroid".padStart(10)}${"rise".padStart(8)}${"t20".padStart(8)}`);
  console.log("  " + "-".repeat(64));
  for (const r of rows) {
    console.log(
      `  ${pad(r.cue, 24)}${num(r.ms, 7)}${num(r.kb, 7, 1)}${num(r.hz, 9)}Hz${num(r.riseMs, 7, 1)}${num(r.t20 * 1000, 8)}`,
    );
  }
  const total = rows.reduce((a, r) => a + r.kb, 0);
  console.log(`\n  ${rows.length} files, ${total.toFixed(1)}KB total.`);
  console.log(`  Run \`node scripts/measure-sfx.mjs\` to read these against each other.`);
}

if (problems.length > 0) {
  console.log("\n  Problems:");
  for (const p of problems) console.log(`    ${p}`);
}
