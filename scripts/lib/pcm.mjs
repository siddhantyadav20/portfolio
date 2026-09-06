/**
 * Raw audio, in and out, plus the measurements that stand in for ears.
 *
 * WHY MEASUREMENT AND NOT LISTENING
 *
 * The person tuning these cues cannot hear them. That is a real constraint and
 * not a temporary one, so the tuning loop has to close on numbers: two cues
 * that measure the same are the same, however different their file names are.
 *
 * That is not a theory. The last synthesis pass measured the photo slide at a
 * 12.1kHz spectral centroid and the coin on the scratch panel at 13.1kHz — two
 * different objects arriving at the same brightness, which is exactly the
 * "everything sounds the same" the whole exercise is about. Nobody heard that;
 * the number showed it.
 *
 * TWO TRAPS, BOTH ALREADY PAID FOR ONCE:
 *
 *   - Measure rise time from ONSET, not from the start of the buffer. Every
 *     variant reads about 14ms otherwise, because what is being measured is
 *     the leading silence rather than the attack.
 *   - Do not decimate the DFT. Stepping the bin loop by two aliases the top of
 *     the spectrum down and reported a 12kHz centroid as 2.4kHz.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const RATE = 32000;

/**
 * Core Audio's own converter, which ships with macOS.
 *
 * NOT ffmpeg, and that is deliberate rather than a fallback. This machine has
 * no Homebrew and no ffmpeg, and asking for a system-wide install to cut
 * twenty short sounds is a poor trade — but the better argument is that
 * `afconvert` is the *right* tool anyway: its AAC encoder is Apple's, which is
 * the best one there is, and the target here is an .m4a played by
 * `decodeAudioData`.
 *
 * What it costs: no `-ss`/`-t`, so trimming happens in JavaScript on decoded
 * samples instead of in the decoder. At ten seconds a file that is free.
 */
export function requireTools() {
  /* Tested by existence rather than by running it: `afconvert --help` exits
     non-zero, so probing it the usual way reports a missing tool that is
     sitting right there. */
  if (!existsSync("/usr/bin/afconvert")) {
    console.error(
      "afconvert is missing — it ships with macOS at /usr/bin/afconvert.\nEvery step here decodes or encodes audio; there is no fallback.",
    );
    process.exit(1);
  }
}

/**
 * Decode any audio file to mono float samples at `RATE`.
 *
 * Mono because every cue on this site is a point event on a small speaker, and
 * a stereo image on a 60ms scrape is bytes spent on something nobody can
 * localise.
 */
export function decode(file, { start = 0, duration = null } = {}) {
  const tmp = join(tmpdir(), `sfx-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
  try {
    execFileSync("afconvert", ["-f", "WAVE", "-d", `LEF32@${RATE}`, "-c", "1", file, tmp], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const all = readWav(readFileSync(tmp));
    const from = Math.floor(start * RATE);
    const to = duration === null ? all.length : Math.min(all.length, from + Math.floor(duration * RATE));
    return all.subarray(Math.min(from, all.length), to);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      // Already gone, or never written because the convert failed.
    }
  }
}

/**
 * Pull the samples out of a RIFF file.
 *
 * WALKS THE CHUNKS rather than assuming the 44-byte canonical header, because
 * `afconvert` does not write one: it inserts an `FLLR` padding chunk between
 * `fmt ` and `data` to page-align the audio. Reading from a fixed offset gets
 * four kilobytes of zeroes and then everything measured off by that much —
 * which looks like a sound with a very long silent lead-in rather than like a
 * parsing bug, and would have quietly poisoned every onset measurement.
 */
function readWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }

  let at = 12;
  let format = null;
  while (at + 8 <= buffer.length) {
    const id = buffer.toString("ascii", at, at + 4);
    const size = buffer.readUInt32LE(at + 4);
    const body = at + 8;

    if (id === "fmt ") {
      let tag = buffer.readUInt16LE(body);
      /* WAVE_FORMAT_EXTENSIBLE. `afconvert` writes a plain float header on the
         way out of an mp3 and an extensible one on the way out of an m4a, so
         both shapes turn up in the same pipeline. The real format is the first
         two bytes of the SubFormat GUID, 24 bytes into the chunk. */
      if (tag === 0xfffe && size >= 40) tag = buffer.readUInt16LE(body + 24);
      format = { tag, bits: buffer.readUInt16LE(body + 14) };
    } else if (id === "data") {
      if (!format) throw new Error("data chunk before fmt chunk");
      if (format.tag !== 3 || format.bits !== 32) {
        throw new Error(`expected 32-bit float, got tag ${format.tag} / ${format.bits} bits`);
      }
      const count = Math.floor(Math.min(size, buffer.length - body) / 4);
      // Copied rather than viewed: a Buffer from readFileSync is a slice of a
      // shared pool and need not be four-byte aligned, which Float32Array
      // refuses.
      const out = new Float32Array(count);
      for (let i = 0; i < count; i += 1) out[i] = buffer.readFloatLE(body + i * 4);
      return out;
    }

    // Chunks are word-aligned; an odd size is followed by a pad byte.
    at = body + size + (size % 2);
  }
  throw new Error("no data chunk");
}

/** A 32-bit float WAV, which is what ffmpeg will read back without loss. */
export function writeWav(file, samples, rate = RATE) {
  const bytes = samples.length * 4;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + bytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); // IEEE float
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(32, 34);
  header.write("data", 36);
  header.writeUInt32LE(bytes, 40);

  const body = Buffer.from(samples.buffer, samples.byteOffset, bytes);
  writeFileSync(file, Buffer.concat([header, body]));
}

/**
 * AAC-LC in an .m4a.
 *
 * Not Opus, though Opus is smaller: `decodeAudioData` takes AAC everywhere
 * including Safari, and Opus-in-WebM does not have that history. At these
 * lengths the difference is a few hundred bytes.
 *
 * 96kbps rather than the 48 that would be plenty for speech. Low-bitrate AAC
 * smears transients — pre-echo — and a transient is the entire content of most
 * of these cues. 96k mono puts a 200ms one-shot at roughly 2.5KB.
 */
export function encode(wav, out) {
  execFileSync("afconvert", [
    "-f", "m4af",
    "-d", "aac",
    "-b", "96000",
    "-c", "1",
    "-q", "127",
    wav, out,
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

/* ===========================================================================
   Shaping
   =========================================================================== */

/** Peak-normalise to a target in dBFS. Not loudnorm: EBU R128 wants three
 *  seconds of programme and these are sixty milliseconds, so it measures
 *  nonsense and applies it confidently. */
export function normalise(samples, targetDb = -1) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return samples;
  const gain = Math.pow(10, targetDb / 20) / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = samples[i] * gain;
  return out;
}

/** Short fades at the trim points. Without these every cut is a click, and a
 *  click is the one sound nobody chose. */
export function fade(samples, inMs = 2, outMs = 8) {
  const a = Math.min(Math.floor((inMs / 1000) * RATE), samples.length >> 1);
  const b = Math.min(Math.floor((outMs / 1000) * RATE), samples.length >> 1);
  const out = Float32Array.from(samples);
  for (let i = 0; i < a; i += 1) out[i] *= i / a;
  for (let i = 0; i < b; i += 1) out[out.length - 1 - i] *= i / b;
  return out;
}

/**
 * Make a segment loop seamlessly, by wrapping its tail over its head.
 *
 * A sustaining cue — the coin on foil, the pencil — is one recording played
 * round and round, and the join is the whole problem: fade both ends and you
 * get an audible dip once per lap, which is a metronome nobody asked for.
 *
 * An equal-power crossfade of the last `ms` onto the first `ms` removes the
 * join entirely. Equal-power rather than linear because two decorrelated
 * copies of noise sum in power, not in amplitude, and a linear fade dips about
 * 3dB in the middle — which is the dip this exists to remove.
 */
export function loopWrap(samples, ms = 120) {
  const n = Math.min(Math.floor((ms / 1000) * RATE), samples.length >> 2);
  if (n < 16) return samples;

  const body = samples.length - n;
  const out = new Float32Array(body);
  out.set(samples.subarray(0, body));

  for (let i = 0; i < n; i += 1) {
    const x = i / n;
    const head = Math.cos((x * Math.PI) / 2);
    const tail = Math.sin((x * Math.PI) / 2);
    out[i] = out[i] * head + samples[body + i] * tail;
  }
  return out;
}

/* ===========================================================================
   Measuring
   =========================================================================== */

/** Iterative radix-2 FFT, in place, on interleaved re/im arrays. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len >> 1; k += 1) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + (len >> 1)] * cr - im[i + k + (len >> 1)] * ci;
        const vi = re[i + k + (len >> 1)] * ci + im[i + k + (len >> 1)] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + (len >> 1)] = ur - vr;
        im[i + k + (len >> 1)] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const FRAME = 2048;

/**
 * Where the energy sits, in Hz.
 *
 * Averaged over Hann-windowed frames rather than one DFT of the whole file: a
 * single transform of a four-second loop is both slow and wrong, because it
 * reports the average of a sound that changes. Every bin is summed — see the
 * decimation trap at the top of this file.
 */
export function centroid(samples) {
  const hop = FRAME >> 1;
  let weighted = 0;
  let total = 0;

  const window = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME - 1)));
  }

  for (let start = 0; start + FRAME <= samples.length; start += hop) {
    const re = new Float32Array(FRAME);
    const im = new Float32Array(FRAME);
    for (let i = 0; i < FRAME; i += 1) re[i] = samples[start + i] * window[i];
    fft(re, im);

    for (let k = 1; k < FRAME >> 1; k += 1) {
      const mag = Math.hypot(re[k], im[k]);
      weighted += mag * ((k * RATE) / FRAME);
      total += mag;
    }
  }

  if (samples.length < FRAME || total === 0) return 0;
  return weighted / total;
}

export function peakOf(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  return peak;
}

export function rmsOf(samples) {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/**
 * Onset, and the rise from it to the peak, in milliseconds.
 *
 * The onset is the first sample above -40dBFS of the peak. Measuring the rise
 * from sample zero instead is the trap named at the top: it returns the length
 * of the leading silence, which is the same for every take cut from the same
 * session and tells you nothing.
 */
export function rise(samples) {
  const peak = peakOf(samples);
  if (peak === 0) return { onsetMs: 0, riseMs: 0 };

  const floor = peak * Math.pow(10, -40 / 20);
  let onset = 0;
  while (onset < samples.length && Math.abs(samples[onset]) < floor) onset += 1;

  let at = onset;
  for (let i = onset; i < samples.length; i += 1) {
    if (Math.abs(samples[i]) >= peak * 0.99) {
      at = i;
      break;
    }
  }
  return {
    onsetMs: (onset / RATE) * 1000,
    riseMs: ((at - onset) / RATE) * 1000,
  };
}

/** Seconds for the tail to fall 20dB below the peak — how long a cue hangs
 *  around after it has happened. */
export function t20(samples) {
  const peak = peakOf(samples);
  if (peak === 0) return 0;
  const target = peak * Math.pow(10, -20 / 20);
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    if (Math.abs(samples[i]) > target) return i / RATE;
  }
  return 0;
}

export const db = (x) => (x <= 0 ? -Infinity : 20 * Math.log10(x));
