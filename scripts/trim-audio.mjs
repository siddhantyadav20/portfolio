#!/usr/bin/env node
/**
 * Cut the tracks in `public/audio/` down to previews.
 *
 * WHY THIS EXISTS
 *
 * The site was shipping eight full-length commercial recordings — 35MB in
 * `public/`, 3.5 to 6.2MB each. That is a licensing posture as much as a weight
 * problem: a personal site serving complete copies of other people's records is
 * a liability whatever the intent, and the music player only ever needed enough
 * of a track to say "this is what I listen to".
 *
 * WHY THERE IS NO ENCODER HERE
 *
 * An MP3 is a stream of independent frames, each carrying its own header and a
 * fixed number of samples. Cutting one is a matter of finding a frame boundary
 * and stopping — no decode, no re-encode, no generation loss, and no dependency
 * on a toolchain this machine may not have. (It does not: there is no Homebrew
 * here and so no ffmpeg. That constraint turned out to produce the better
 * answer anyway — a re-encode would have thrown away quality to do a job that
 * needs none.)
 *
 * The originals are kept in `references/music player/`, so this is reversible.
 *
 * USAGE
 *
 *   node scripts/trim-audio.mjs --dry-run    report what it would do
 *   node scripts/trim-audio.mjs              do it
 *
 * The one thing worth tuning is `START` below: which second of each track the
 * preview opens on. It defaults to zero, which is safe rather than good — a
 * song's first twenty seconds are often the part nobody would recognise. Set an
 * offset per track and re-run; the operation is idempotent against the
 * originals, not against the output, so re-running reads `references/` again.
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** How long a preview runs. Long enough to recognise, short enough not to be
 *  a copy of the record. */
const PREVIEW_SECONDS = 25;

/**
 * Where each preview starts, in seconds into the original.
 *
 * Zero is the default and is a placeholder for a taste decision, not a
 * recommendation — see the note at the top of the file.
 */
const START = {
  "cant-stop.mp3": 0,
  "chala-jaata-hoon.mp3": 0,
  "i-feel-it-coming.mp3": 0,
  "ode-to-the-mets.mp3": 0,
  "read-my-mind.mp3": 0,
  "safe-and-sound.mp3": 0,
  "somewhere-only-we-know.mp3": 0,
  "wavin-flag.mp3": 0,
};

/**
 * The original of each shipped file, under `references/music player/`.
 *
 * Named by hand because the reference filenames are whatever the download gave
 * them — "cant-stop-official-music-video (1).mp3", a Kishore Kumar track whose
 * filename is the entire 1972 credit block — and guessing a mapping from those
 * to the site's slugs would be a source of silent, wrong pairings.
 *
 * `chala-jaata-hoon.mp3` is the odd one: its source is the `mere-jeevan-saathi`
 * file, which is the film the song is from.
 */
const SOURCE = {
  "cant-stop.mp3": "cant-stop-official-music-video (1).mp3",
  "chala-jaata-hoon.mp3":
    "mere-jeevan-saathi-1972--rajesh-khanna-tanuja--kishore-kumar--rd-burman.mp3",
  "i-feel-it-coming.mp3": "I Feel it Coming.mp3",
  "ode-to-the-mets.mp3": "Ode to the Mets.mp3",
  "read-my-mind.mp3": "Read my Mind.mp3",
  "safe-and-sound.mp3": "safe-and-sound.mp3",
  "somewhere-only-we-know.mp3": "somewhere-only-we-know-official-music-video.mp3",
  "wavin-flag.mp3": "Waving Flag.mp3",
};

/* --- The frame reader -----------------------------------------------------
   Enough of the MPEG audio spec to walk a Layer III stream and no more. */

/** Bitrates in kbps by index, for Layer III. */
const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], // MPEG 1
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // MPEG 2 / 2.5
};

/** Sample rates in Hz by index, keyed by the header's version field. */
const RATES = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

/**
 * Read the frame beginning at `at`, or null if there is no valid one there.
 *
 * Validity is checked rather than assumed: a byte pair that looks like a sync
 * word turns up inside ID3 art and inside the audio itself, and following one
 * blindly desynchronises the whole read.
 */
function frameAt(buf, at) {
  if (at + 4 > buf.length) return null;
  if (buf[at] !== 0xff || (buf[at + 1] & 0xe0) !== 0xe0) return null;

  const version = (buf[at + 1] >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const layer = (buf[at + 1] >> 1) & 0x03; // 1 = Layer III
  if (version === 1 || layer !== 1) return null;

  const bitrateIndex = (buf[at + 2] >> 4) & 0x0f;
  const rateIndex = (buf[at + 2] >> 2) & 0x03;
  const padding = (buf[at + 2] >> 1) & 0x01;
  if (bitrateIndex === 0 || bitrateIndex === 0x0f || rateIndex === 3) {
    return null;
  }

  const mpeg1 = version === 3;
  const bitrate = BITRATES[mpeg1 ? 1 : 2][bitrateIndex] * 1000;
  const rate = RATES[version][rateIndex];
  const samples = mpeg1 ? 1152 : 576;
  const length =
    Math.floor(((mpeg1 ? 144 : 72) * bitrate) / rate) + padding;

  if (length < 4 || at + length > buf.length) return null;
  return { length, seconds: samples / rate };
}

/** Where the audio starts: past an ID3v2 tag if there is one. */
function audioStart(buf) {
  if (buf.length < 10) return 0;
  if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return 0; // "ID3"
  // A syncsafe integer: four bytes, seven bits each.
  const size =
    (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
  return 10 + size;
}

/**
 * Is this frame a Xing/Info header rather than audio?
 *
 * The first frame of most encoded files is metadata — a duration and a seek
 * table for the whole recording. Carried into a 25-second excerpt it would
 * describe a file that no longer exists, so it is dropped and players fall back
 * to estimating from the bitrate, which for these constant-rate files is exact.
 */
function isXing(buf, at, length) {
  const tag = buf.subarray(at + 4, at + Math.min(length, 64)).toString("latin1");
  return tag.includes("Xing") || tag.includes("Info");
}

/** Every frame in the file, as offsets and durations. */
function frames(buf) {
  const out = [];
  let at = audioStart(buf);

  while (at < buf.length) {
    const frame = frameAt(buf, at);
    if (!frame) {
      at++; // Not a frame boundary. Slide forward and resynchronise.
      continue;
    }
    out.push({ at, ...frame, xing: out.length === 0 && isXing(buf, at, frame.length) });
    at += frame.length;
  }

  return out;
}

/* --- The cut --------------------------------------------------------------- */

function trim(buf, startSeconds, lengthSeconds) {
  const all = frames(buf).filter((f) => !f.xing);
  if (all.length === 0) throw new Error("no MPEG frames found");

  let elapsed = 0;
  let from = null;
  let to = null;
  let kept = 0;

  for (const frame of all) {
    if (from === null && elapsed >= startSeconds) {
      from = frame.at;
    }
    if (from !== null) {
      kept += frame.seconds;
      to = frame.at + frame.length;
      if (kept >= lengthSeconds) break;
    }
    elapsed += frame.seconds;
  }

  // A start offset past the end of the track: keep the tail rather than
  // writing an empty file.
  if (from === null) {
    const tail = all.slice(-Math.ceil(lengthSeconds / all[0].seconds));
    from = tail[0].at;
    to = tail[tail.length - 1].at + tail[tail.length - 1].length;
    kept = tail.reduce((n, f) => n + f.seconds, 0);
  }

  return { data: buf.subarray(from, to), seconds: kept };
}

/* --- Run ------------------------------------------------------------------- */

const dryRun = process.argv.includes("--dry-run");
const rows = [];

for (const [name, source] of Object.entries(SOURCE)) {
  const target = join(ROOT, "public", "audio", name);
  const original = join(ROOT, "references", "music player", source);

  // Prefer the reference copy, so re-running never trims an already-trimmed
  // file down again. Fall back to what is in `public/` if references are gone.
  const from = existsSync(original) ? original : target;
  if (!existsSync(from)) {
    rows.push({ name, note: "source missing — skipped" });
    continue;
  }

  const before = statSync(from).size;
  const { data, seconds } = trim(
    readFileSync(from),
    START[name] ?? 0,
    PREVIEW_SECONDS,
  );

  if (!dryRun) writeFileSync(target, data);

  rows.push({
    name,
    before,
    after: data.length,
    seconds: Math.round(seconds),
    reference: from === original,
  });
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)}MB`;
const kb = (n) => `${Math.round(n / 1024)}KB`;

console.log(dryRun ? "\nDry run — nothing written.\n" : "\nTrimmed.\n");
let before = 0;
let after = 0;

for (const row of rows) {
  if (row.note) {
    console.log(`  ${row.name.padEnd(30)} ${row.note}`);
    continue;
  }
  before += row.before;
  after += row.after;
  console.log(
    `  ${row.name.padEnd(30)} ${mb(row.before).padStart(8)} → ${kb(
      row.after,
    ).padStart(6)}   ${String(row.seconds).padStart(3)}s${
      row.reference ? "" : "   (from public/, not references/)"
    }`,
  );
}

console.log(
  `\n  ${"total".padEnd(30)} ${mb(before).padStart(8)} → ${mb(after).padStart(
    6,
  )}\n`,
);
console.log(
  "  The `duration` values in content/site.ts and the disc widgets in\n" +
    "  content/canvas.ts are fallbacks only — the player prefers the decoded\n" +
    "  duration — but they should be set to the seconds above.\n",
);
