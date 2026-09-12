/* ===========================================================================
   The voice memo, synthesised, until it is recorded.

   The plan is a real recording (CC0 foley and a recorded whisper, through
   samples.config.mjs). Until that exists the captions are the memo, and each
   caption gets a sketch of its sound: enough that pressing play in a dark
   room is still a thing you hear rather than read. `cue()` is matched on the
   caption's words, so the script stays the one source of what happens.
   =========================================================================== */

import { acquire, burst, prefersQuiet, resonator, stage, type Voice } from "@/lib/sound";

const PEAK = 0.12;

/* --- The real recordings ------------------------------------------------------
   Played through the site's bus rather than an <audio> element, so the mute
   in the palette silences a memo like everything else. Not gated on reduced
   motion: pressing play on a recording is asking to hear it (the same call
   lib/sound makes for the music). */

const RECORDING_LEVEL = 0.9;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let current: AudioBufferSourceNode | null = null;

function load(ctx: AudioContext, src: string): Promise<AudioBuffer | null> {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => null);
    buffers.set(src, p);
  }
  return p;
}

/** Play a recording from `offset` seconds. Resolves false if it can't. */
export async function playRecording(src: string, offset: number): Promise<boolean> {
  stopRecording();
  const voice = acquire();
  if (!voice) return false;
  voice.wake();
  const buffer = await load(voice.ctx, src);
  if (!buffer) return false;
  const node = voice.ctx.createBufferSource();
  node.buffer = buffer;
  node.connect(stage(voice, RECORDING_LEVEL));
  node.start(voice.ctx.currentTime + 0.02, Math.min(offset, Math.max(0, buffer.duration - 0.05)));
  current = node;
  return true;
}

export function stopRecording(): void {
  try {
    current?.stop();
  } catch {
    // Already finished.
  }
  current = null;
}

/** lib/sound sleeps after two quiet seconds; a playing memo keeps it up. */
export function keepAwake(): void {
  if (current) acquire()?.wake();
}

export function cue(caption: string): void {
  if (prefersQuiet()) return;
  const voice = acquire();
  if (!voice) return;
  voice.wake();
  const line = caption.toLowerCase();
  if (line.includes("footsteps")) footsteps(voice);
  else if (line.includes("train")) horn(voice);
  else if (line.includes("breathing")) breath(voice);
  else if (line.includes("door")) door(voice);
  else if (line.includes("wind")) wind(voice);
  else if (line.startsWith("“")) whisper(voice);
}

function footsteps(voice: Voice) {
  const { ctx } = voice;
  const out = stage(voice, PEAK);
  for (let i = 0; i < 9; i++) {
    const at = ctx.currentTime + 0.05 + i * 0.52 + (i % 2) * 0.04;
    burst(ctx, out, { at, seconds: 0.12, level: 0.7, type: "bandpass", hz: [900, 380], q: 0.9, colour: "pink" });
    burst(ctx, out, { at: at + 0.02, seconds: 0.08, level: 0.35, type: "highpass", hz: 3200, colour: "white" });
  }
}

/** A local train's two-tone horn, near: a detuned pair through a warm filter. */
function horn(voice: Voice) {
  const { ctx } = voice;
  const out = stage(voice, PEAK * 0.9);
  const t = ctx.currentTime + 0.05;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + 0.25);
  env.gain.setValueAtTime(1, t + 1.5);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  lp.connect(env).connect(out);
  for (const hz of [311, 370, 313]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(hz * 1.02, t);
    osc.frequency.linearRampToValueAtTime(hz, t + 0.3);
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + 2.5);
  }
  burst(ctx, out, { at: t, seconds: 2.6, level: 0.25, type: "lowpass", hz: 300, colour: "brown", attack: 0.6 });
}

function breath(voice: Voice) {
  const { ctx } = voice;
  const out = stage(voice, PEAK * 0.6);
  for (const i of [0, 1, 2]) {
    burst(ctx, out, { at: ctx.currentTime + 0.1 + i * 1.3, seconds: 0.9, level: 0.6, type: "bandpass", hz: [700, 1500], q: 0.8, colour: "pink", attack: 0.35 });
  }
}

function whisper(voice: Voice) {
  const { ctx } = voice;
  const out = stage(voice, PEAK * 0.8);
  const t = ctx.currentTime + 0.1;
  // Three syllables of breath in the consonant band: "some-one's here".
  [0, 0.28, 0.62].forEach((o, i) =>
    burst(ctx, out, { at: t + o, seconds: i === 2 ? 0.5 : 0.24, level: 0.8, type: "bandpass", hz: [5200, 2600], q: 1.2, colour: "white", attack: 0.04 }),
  );
}

function door(voice: Voice) {
  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const t = ctx.currentTime + 0.05;
  const ring = resonator(ctx, out, { hz: 220, q: 30, level: 0.9 });
  const ring2 = resonator(ctx, out, { hz: 587, q: 26, level: 0.5 });
  burst(ctx, ring, { at: t, seconds: 0.5, level: 1, type: "lowpass", hz: 2000, colour: "brown" });
  burst(ctx, ring2, { at: t, seconds: 0.4, level: 1, type: "lowpass", hz: 2000, colour: "brown" });
  burst(ctx, out, { at: t, seconds: 0.2, level: 0.5, type: "lowpass", hz: 900, colour: "brown" });
}

function wind(voice: Voice) {
  const { ctx } = voice;
  const out = stage(voice, PEAK * 0.7);
  burst(ctx, out, { at: ctx.currentTime + 0.05, seconds: 3.5, level: 0.7, type: "bandpass", hz: [400, 900], q: 0.7, colour: "pink", attack: 1.2 });
}
