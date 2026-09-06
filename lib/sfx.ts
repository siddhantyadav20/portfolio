/* ===========================================================================
   Recordings.

   WHY THIS EXISTS.

   Everything on this board was synthesised — noise through a biquad, an
   envelope, sometimes a waveshaper — and two full passes were spent tuning
   that. The designs are not the problem. `Book/leaf.ts` models forty-two
   accelerating contacts; `ScratchCard/rasp.ts` is granular with a shaper;
   `Sticker/sounds.ts` builds a five-layer gunshot. They are careful, and they
   still arrive as first drafts, because of a limit no amount of tuning moves:

     A FILTER SHAPES WHAT YOU HEAR OF A SOURCE. IT CANNOT CHANGE WHAT THE
     SOURCE IS.

   Noise is not paper. It is not foil, leather, cardstock or a bolt carrier.
   Three consequences, and they are exactly the three complaints:

   1. No real transient spectrum. Recorded contacts differ event to event in a
      way no scheduler reproduces, so forty-two scheduled bursts read as a
      machine — the ratchet under the book's open.
   2. Nothing in the low-mid. Almost every cue was high-passed or centred over
      2kHz; `slip` was a 62ms bandpass at 4.2kHz, all treble and no body.
      Laptop speakers roll off under ~300Hz and peak at 2-4kHz, so a cue built
      up there arrives as pure fizz.
   3. The scratch was built as fire. A train of short, bright, hard-driven
      transients with two high-Q rings at 5.2 and 7.7kHz *is* the signature of
      crackling flame. The "coin" resonators added last pass are what put it
      there.

   The reference check settles it: no shipping product synthesises this class
   of sound. Kindle answered the page turn with haptics and no audio at all.
   Apple Photos, Instagram and Snapchat are silent on swipe — so the reference
   is not an app, it is the object. Scratch-card apps and every game engine
   play short recorded takes. Where products *do* synthesise, it is chimes and
   confirmations, which is precisely the half of this site that already works.

   So the line drawn here, and it is the whole design: IS THIS CUE A PICTURE OF
   A REAL OBJECT? Paper, foil, leather, a gun, a keyboard, a stylus → a
   recording. A chime, a confirm, a theme click, a celebration, the room's
   swell → stays synthesised, and is not addressable from this file.

   WHAT THIS IS NOT: a second audio system. There is one `AudioContext`, one
   master, one mute, and they live in `lib/sound.ts`. Everything here goes
   through `acquire()` and connects to `voice.out`, for the same reason every
   synthesised cue does — a node wired past that gain cannot be muted.
   =========================================================================== */

import { acquire, type Voice } from "@/lib/sound";
import { SFX, type SfxCue } from "@/lib/sfx-manifest";

/* ===========================================================================
   Loading

   Two stages, kept separate on purpose. Fetching is just bytes and can happen
   whenever; decoding needs an `AudioContext`, and building one before the page
   has had a user gesture claims audio hardware for a visitor who may never
   make a sound.

   So `warm()` fetches, and decoding waits until a context exists anyway —
   which, in practice, is the moment something first plays. A widget that warms
   on `pointerenter` has both done well before the click.
   =========================================================================== */

/** Fetched bytes, awaiting a context. */
const raw = new Map<string, ArrayBuffer>();
/** Decoded and playable. */
const buffers = new Map<string, AudioBuffer>();
/** In flight, so a hover that fires ten times fetches once. */
const inflight = new Map<string, Promise<void>>();

const url = (file: string) => `/sfx/${file}`;

async function fetchTake(file: string): Promise<void> {
  if (raw.has(file) || buffers.has(file)) return;
  const existing = inflight.get(file);
  if (existing) return existing;

  const job = (async () => {
    try {
      const res = await fetch(url(file));
      if (!res.ok) return;
      raw.set(file, await res.arrayBuffer());
    } catch {
      // Offline, or the file is not there yet. Both mean "fall back to the
      // synthesised cue", which is what an empty `buffers` already says.
    } finally {
      inflight.delete(file);
    }
  })();

  inflight.set(file, job);
  return job;
}

function decodeTake(ctx: AudioContext, file: string): void {
  const bytes = raw.get(file);
  if (!bytes || buffers.has(file)) return;
  // `decodeAudioData` detaches the buffer, so drop our reference first — a
  // second call with a detached ArrayBuffer throws.
  raw.delete(file);
  void ctx
    .decodeAudioData(bytes)
    .then((buffer) => buffers.set(file, buffer))
    .catch(() => {
      // A corrupt or half-written file. Silently stays unavailable.
    });
}

/**
 * Fetch a cue's takes and decode them, so the first play is a recording.
 *
 * Safe to call on every `pointerenter` — it de-duplicates. Deliberately not
 * called at module load: nothing on the homepage's critical path should be
 * spending bandwidth on the canvas's foley.
 *
 * IT DECODES AS WELL AS FETCHES, and the first version did not — which turned
 * out to be a deadlock rather than a mere delay. Readiness gates the sample
 * path, decoding only happened inside `play()`, and the bench disables a
 * cue's button until it is ready: nothing could ever be auditioned, because
 * the only thing that would have decoded a take was the press that was
 * disabled. On the site it was milder and still wrong — every cue fell back to
 * synthesis on its first use, for good.
 *
 * The reason it was written that way — that building an `AudioContext` before
 * a user gesture claims audio hardware — does not survive contact: a context
 * built early is born *suspended*, makes no sound, and is exactly what
 * `voice.wake()` already exists to resume. Decoding needs one; nothing else
 * about it needs the page to have earned anything.
 */
export function warm(...cues: SfxCue[]): void {
  if (typeof window === "undefined") return;
  for (const cue of cues) {
    for (const file of SFX[cue].takes) {
      void fetchTake(file).then(() => {
        const voice = acquire();
        if (voice) decodeTake(voice.ctx, file);
      });
    }
  }
}

/* ===========================================================================
   Round-robin

   THE LOUDEST TELL OF A SAMPLED INTERFACE IS HEARING THE SAME WAVEFORM TWICE.
   A synthesised cue never had this problem — every play randomised its noise
   offset — so it is a failure mode this board has not had to handle before,
   and it is the one that would make recordings sound *worse* than what they
   replace.

   Two defences, both standard game-audio practice:

     round-robin   several takes per cue, cycled so the same one never lands
                   twice running.
     jitter        a little pitch and level on every play. Real repeated
                   contacts are never identical, and a few percent is enough
                   for the ear to stop noticing the loop.
   =========================================================================== */

const lastTake = new Map<SfxCue, number>();

function pick(cue: SfxCue): string | null {
  const all = SFX[cue].takes;
  if (all.length === 0) return null;

  /* Choose among the takes that are actually decoded, falling back to all of
     them when none are yet.

     Without this, `ready()` and `play()` disagree: `ready` is true as soon as
     ONE take has decoded, while a round-robin over all of them would keep
     landing on the others and returning false. The caller would then run its
     synthesised fallback for a cue the bench is showing as available. */
  const decoded = all.filter((file) => buffers.has(file));
  const takes = decoded.length > 0 ? decoded : all;
  if (takes.length === 1) return takes[0];

  const previous = lastTake.get(cue);
  let index = Math.floor(Math.random() * takes.length);
  // One nudge is enough — with two takes it always lands on the other, with
  // more it is a cheap way to avoid a biased shuffle bag.
  if (index === previous) index = (index + 1 + Math.floor(Math.random() * (takes.length - 1))) % takes.length;
  lastTake.set(cue, index);
  return takes[index];
}

/** Semitone-ish spread, as a playback-rate multiplier. */
function jitter(amount: number): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

/* ===========================================================================
   Playing
   =========================================================================== */

export type PlayOptions = {
  /** Seconds from now. Matches the offsets the sticker cues already use to
   *  land on a particular animation frame. */
  delay?: number;
  /** The caller's own level, multiplied by the manifest's per-cue trim. */
  level?: number;
  /** Playback-rate spread, ±. 0.04 is about two-thirds of a semitone and is a
   *  good default for repeated contacts; 0 for anything recognisable enough
   *  that a pitch change would read as wrong. */
  spread?: number;
  /** Level spread, ±, as a fraction. */
  levelSpread?: number;
  /** Fixed rate, before jitter. Below 1 is longer and heavier. */
  rate?: number;
};

/**
 * Is this cue playable *right now*?
 *
 * Synchronous, and that is the point. The callers are pointer handlers that
 * must decide between a recording and the synthesised fallback inside one
 * event, with no chance to await anything.
 */
export function ready(cue: SfxCue): boolean {
  return SFX[cue].takes.some((file) => buffers.has(file));
}

/**
 * Play one take.
 *
 * Returns whether it actually played. `false` means "no recording available",
 * and every caller answers that by running the synthesised cue it already has
 * — which is why this layer can ship before any file has been chosen.
 *
 * The first call for a cue is usually the one that returns `false`: it arrives
 * with bytes fetched but nothing decoded, kicks the decode off, and every call
 * after it is a recording. Widgets that `warm()` on hover rarely hit even that.
 */
export function play(cue: SfxCue, opts: PlayOptions = {}): boolean {
  const voice = acquire();
  if (!voice) return false;

  const file = pick(cue);
  if (!file) return false;

  const buffer = buffers.get(file);
  if (!buffer) {
    /* We have a context now, so everything already fetched for this cue can be
       made ready. All of its takes rather than the one picked: decoding only
       the miss would make a three-take cue need three separate misses before
       it stopped falling back. Nothing is audible this call. */
    for (const take of SFX[cue].takes) decodeTake(voice.ctx, take);
    return false;
  }

  voice.wake();
  const { ctx } = voice;
  const at = ctx.currentTime + (opts.delay ?? 0) + 0.008;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = (opts.rate ?? 1) * jitter(opts.spread ?? 0.04);

  const gain = ctx.createGain();
  gain.gain.value =
    (opts.level ?? 1) * SFX[cue].gain * jitter(opts.levelSpread ?? 0.08);

  src.connect(gain).connect(voice.out);
  src.start(at);
  return true;
}

/* ===========================================================================
   Sustaining

   For the two gestures that are continuous rather than repeated: a coin
   dragged across foil, and a pencil moving on paper.

   THIS IS THE REVERSAL. `ScratchCard/rasp.ts` argues at length that the rub
   must be granular and not a loop, and against synthesis that was right — a
   held noise source gated by a gain is audibly a synthesiser switching on and
   off. Against a recording it is backwards: the take already contains the
   thousands of tiny contacts the granular scheduler was trying to imitate, and
   chopping it into 22ms grains destroys the continuity that identifies a
   scrape in the first place.

   So: one looping source, a gate, and a filter the gesture drives. What speed
   changes is not just level — it opens the band DOWNWARD, because pressing
   harder and moving faster puts more body into a scrape, not more fizz.
   =========================================================================== */

export type Sustain = {
  /** 0 to 1. Ramped, never assigned — a gain step mid-sound is a click. */
  level(value: number): void;
  /** Playback rate. Real scraping does change pitch with speed. */
  rate(value: number): void;
  /** Lowpass corner, in Hz. */
  tone(hz: number): void;
  /** Ramp down and let go. */
  stop(): void;
};

const GATE = 0.03;
const RELEASE = 0.06;

/**
 * Start a sustaining cue, or `null` if it has no recording yet.
 *
 * The caller owns the handle and must `stop()` it — on pointerup, on unmount,
 * and on any early return. A leaked loop is the one failure here that is worse
 * than silence.
 */
export function sustain(cue: SfxCue, opts: { rate?: number } = {}): Sustain | null {
  const voice: Voice | null = acquire();
  if (!voice) return null;

  const file = pick(cue);
  if (!file) return null;

  const buffer = buffers.get(file);
  if (!buffer) {
    for (const take of SFX[cue].takes) decodeTake(voice.ctx, take);
    return null;
  }

  voice.wake();
  const { ctx } = voice;
  const at = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.playbackRate.value = opts.rate ?? 1;
  // A random start, so beginning to scratch twice is never the same sound
  // twice — the same reasoning as the noise buffer's offset in lib/sound.ts.
  const offset = Math.random() * Math.max(0, buffer.duration - 0.1);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2000;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = 0.0001;

  src.connect(filter).connect(gain).connect(voice.out);
  src.start(at, offset);

  let stopped = false;

  return {
    level(value) {
      if (stopped) return;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, value * SFX[cue].gain), t + GATE);
      // The loop has to be kept awake: `voice.wake()` pushes back the shared
      // suspend, and a scratch held for longer than SLEEP_MS would otherwise
      // fall silent mid-gesture.
      voice.wake();
    },
    rate(value) {
      if (stopped) return;
      const t = ctx.currentTime;
      src.playbackRate.cancelScheduledValues(t);
      src.playbackRate.setValueAtTime(src.playbackRate.value, t);
      src.playbackRate.linearRampToValueAtTime(value, t + GATE);
    },
    tone(hz) {
      if (stopped) return;
      const t = ctx.currentTime;
      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(filter.frequency.value, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, hz), t + GATE);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
      gain.gain.linearRampToValueAtTime(0.0001, t + RELEASE);
      src.stop(t + RELEASE + 0.02);
    },
  };
}
