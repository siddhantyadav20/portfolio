/* ===========================================================================
   One audio context, and whether the visitor wants to hear it at all.

   The synthesised cues — the LinkedIn card's bell, the Designer/Engineer
   card's jet — each built their own `AudioContext`, ran their own resume and
   suspend timers, and connected straight to their own `destination`. That
   worked while there were two of them and stops working at three:

   - A context is a claim on the audio hardware. Browsers cap how many a page
     may hold (six in Chrome, and they are not reclaimed on garbage collection
     — only `close()` frees one), so one context per sound is a budget that
     runs out.
   - Two independent masters cannot be turned down together. There was no
     level the page as a whole was under, and no single place to put a mute.

   So the context, the master, and the sleep policy live here, and a cue keeps
   only what is actually its own: its oscillators, its envelopes, its tuning.

   WHAT THIS IS NOT: a mixer. `master` sits at unity and shapes nothing. Each
   cue was tuned by ear against its own `PEAK` and putting a compressor or a
   lower ceiling under them here would retune both by remote control. It is a
   mute and a single point of attachment — the place a ceiling *could* go, not
   a ceiling.

   Reduced motion is deliberately not read here. Callers already gate on it
   before they construct anything, and the two preferences are different
   questions: one is about the page moving, this one is about it making a
   noise. Someone can reasonably want the first and not the second, which is
   the gap this file exists to close.
   =========================================================================== */

/** Mirrors `THEME_KEY` in lib/theme.ts — same owner, same shape of choice. */
export const SOUND_KEY = "sy-sound";

/**
 * Sound is ON by default, which is the behaviour this file inherited rather
 * than a fresh decision.
 *
 * It is defensible because a browser will not let a page make a noise before
 * it has had a real user gesture: a visitor who arrives, reads, and leaves
 * without clicking never hears anything no matter what this says. The cues
 * only become audible to someone who has already chosen to interact, and for
 * them the sound is part of what they came to see.
 *
 * The mute matters anyway — "I clicked once and now hovering rings a bell" is
 * a reasonable thing to want to stop.
 */
const DEFAULT_ON = true;

/** Idle this long and the context is suspended. The longest cue's own timer
 *  was 2.2s; taking the max means a shared timer can never cut a tail short. */
const SLEEP_MS = 2200;

/** Long enough not to click, short enough to feel like the same press. */
const MUTE_RAMP = 0.02;

type Listener = (on: boolean) => void;

const listeners = new Set<Listener>();
let on: boolean | null = null;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sleepTimer = 0;

function emit() {
  const value = soundOn();
  for (const fn of listeners) fn(value);
}

/** The stored choice, or the default. Reads once and caches — this is called
 *  from render paths and localStorage is synchronous disk. */
export function soundOn(): boolean {
  if (on !== null) return on;
  if (typeof window === "undefined") return DEFAULT_ON;
  try {
    const raw = window.localStorage.getItem(SOUND_KEY);
    on = raw === null ? DEFAULT_ON : raw === "on";
  } catch {
    // Private mode, or storage disabled. Not a reason to be silent.
    on = DEFAULT_ON;
  }
  return on;
}

/** Always `true` on the server, so the first client render agrees with the
 *  HTML and nothing has to be suppressed. The real value arrives in an effect,
 *  and a wrong icon for one frame is cheaper than a hydration mismatch. */
export const soundOnServerSide = () => DEFAULT_ON;

export function subscribeSound(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setSoundOn(next: boolean) {
  if (soundOn() === next) return;
  on = next;

  try {
    window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
  } catch {
    // The choice still holds for this page; it just will not outlive it.
  }

  if (master && ctx) {
    // Ramped rather than assigned: a gain step mid-tail is a click, and a
    // click is the one sound nobody chose.
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(next ? 1 : 0, t + MUTE_RAMP);
  }

  // Muting is also a good moment to let go of the hardware.
  if (!next && ctx && ctx.state === "running") {
    window.clearTimeout(sleepTimer);
    sleepTimer = window.setTimeout(() => {
      if (ctx && ctx.state === "running") void ctx.suspend().catch(() => {});
    }, MUTE_RAMP * 1000 + 50);
  }

  emit();
}

/**
 * Someone who asked for less motion asked for less of this too.
 *
 * The cards each wrote this query out themselves, which was fine at two and is
 * a typo waiting to happen at six — a mis-spelled media feature does not throw,
 * it just quietly matches nothing and the cue plays for someone who asked it
 * not to. One definition, and the failure becomes impossible.
 *
 * It stays a predicate the cues call rather than a gate inside `acquire`: the
 * bus is also what the *music* runs through, and a record someone deliberately
 * pressed play on is not motion they failed to opt out of.
 */
export function prefersQuiet(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Two seconds of white noise, made once per context and shared.
 *
 * Three cues want noise — a needle's surface hiss, a cover's paper sweep, the
 * room's air — and each generating its own would be three 88KB float arrays
 * for the same statistically identical signal. Played back at different rates,
 * through different filters, from a random offset, one buffer is every one of
 * them. The offset is the load-bearing part: started at zero each time, the
 * same 2s of noise reads as a loop.
 */
const NOISE_SECONDS = 2;
let noise: AudioBuffer | null = null;

export function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const frames = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

/**
 * A shaped burst of noise — the one shape most of these cues are made of.
 *
 * A stylus click, a page's sweep, a photo sliding, a printer's step and a
 * sticker letting go are the same three nodes every time: noise, a filter, an
 * envelope. What differs is the band and the length, so those are arguments
 * and everything else is here once.
 *
 * `hz` may be a pair, in which case the filter sweeps between them over the
 * life of the burst. That sweep is what separates paper from static: brightness
 * falling as a sheet flattens is the whole effect, and a fixed filter over the
 * same noise is a hiss.
 */
export function burst(
  ctx: AudioContext,
  out: AudioNode,
  opts: {
    at: number;
    seconds: number;
    level: number;
    type: BiquadFilterType;
    /** One frequency, or `[from, to]` to sweep. */
    hz: number | readonly [number, number];
    q?: number;
    /** Seconds to reach full level. Longer than a millisecond or two turns a
     *  click into a swell, which is how the scratch and the pencil are made. */
    attack?: number;
  },
) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = opts.type;
  if (opts.q !== undefined) filter.Q.value = opts.q;

  if (typeof opts.hz === "number") {
    filter.frequency.value = opts.hz;
  } else {
    filter.frequency.setValueAtTime(opts.hz[0], opts.at);
    // Exponential, not linear: pitch is heard logarithmically, and a linear
    // fall spends most of its time in the top octave then drops off a cliff.
    filter.frequency.exponentialRampToValueAtTime(
      opts.hz[1],
      opts.at + opts.seconds,
    );
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, opts.at);
  env.gain.exponentialRampToValueAtTime(opts.level, opts.at + (opts.attack ?? 0.002));
  env.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.seconds);

  source.connect(filter).connect(env).connect(out);
  // A random offset, so repeated plays are never the same noise twice.
  source.start(opts.at, Math.random() * 1.5);
  source.stop(opts.at + opts.seconds + 0.02);
  return { source, env };
}

/**
 * A cue's own output stage: a gain at `peak`, already on the bus.
 *
 * Every cue opens by making one of these, and forgetting to connect it to
 * `voice.out` is the mistake that puts a sound past the mute — which is how
 * the jet's landing scuff stayed audible while everything else was silenced.
 */
export function stage(voice: Voice, peak: number): GainNode {
  const gain = voice.ctx.createGain();
  gain.gain.value = peak;
  gain.connect(voice.out);
  return gain;
}

export type Voice = {
  ctx: AudioContext;
  /** Everything a cue makes connects here, never to `ctx.destination` — a
   *  node wired past this one cannot be muted. */
  out: AudioNode;
  /** Call immediately before scheduling. Resumes the context if the page has
   *  earned it, and pushes the suspend back. No-op while muted, so a silenced
   *  page never wakes the audio hardware at all. */
  wake(): void;
};

/**
 * The shared context, built on first use.
 *
 * Returns `null` where there is no Web Audio to speak of; callers already
 * treat that as "this cue does not exist" and fall silent.
 */
export function acquire(): Voice | null {
  if (typeof window === "undefined") return null;

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = soundOn() ? 1 : 0;
    master.connect(ctx.destination);
  }

  const context = ctx;
  const bus = master;
  if (!bus) return null;

  return {
    ctx: context,
    out: bus,
    wake() {
      if (!soundOn()) return;
      window.clearTimeout(sleepTimer);
      // Refused until the page has had a real user gesture. Nothing throws and
      // nothing is audible, and the next call tries again.
      if (context.state !== "running") void context.resume().catch(() => {});
      sleepTimer = window.setTimeout(() => {
        if (context.state === "running") void context.suspend().catch(() => {});
      }, SLEEP_MS);
    },
  };
}
