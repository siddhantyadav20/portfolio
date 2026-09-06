/* ===========================================================================
   A coin across a scratch panel.

   Two sounds, and the interesting one is the rub.

   THE RUB IS GRANULAR, NOT A LOOP. A held noise source gated by a gain is what
   a synthesiser does, and it sounds like it: a continuous hiss that switches
   on and off. What a coin on foil actually is, is thousands of tiny separate
   contacts. So every pointer move past the interval below lays down a small
   cluster of short grains, and moving faster lays down more. Stop moving and
   they stop, with no gate to fade, because nothing was ever sustaining.

   Speed drives three things at once, which is what keeps it from sounding
   mechanical: a faster drag is louder, brighter, and denser. Any one of those
   alone reads as a volume knob.

   THE DENSITY HAS TO BEAT THE EVENT RATE. `pointermove` arrives at frame rate,
   so one grain per event can never exceed about sixty a second — slow enough
   to count, which is exactly what made the first version tick like a ratchet.
   Grains are scheduled ahead in clusters instead, which is the one part of
   this that must not be simplified back.

   THE REVEAL is the opposite kind of sound — pitched, short, and the only
   thing on the canvas that resolves upward. It marks the one moment on this
   widget that is a result rather than an action, and it is deliberately the
   only cue here that could be called a "note".
   =========================================================================== */

import { acquire, prefersQuiet, resonator, stage } from "@/lib/sound";
import { shaped } from "@/lib/voices";

/** Master ceiling for the rub. Under a pointer the visitor is already looking
 *  at, and it runs for as long as they keep scratching. */
const RASP_PEAK = 0.075;

/* BROADBAND AND GRITTY, NOT BANDED.

   Third attempt, and the first two failed the same way for a reason worth
   writing down: both put each grain through a *bandpass* at a randomly chosen
   centre frequency. A bandpass with any resonance at all gives a noise burst a
   pitch, and thirty of those a second at thirty different pitches is bubbling
   — chirping insects, a boiling kettle, anything but a coin.

   A coin dragged across foil has no pitch anywhere in it. It is broadband
   friction: everything above a couple of kilohertz at once, ragged, with the
   peaks squashed because the contact is violent at a small scale. That is a
   highpass and a waveshaper, and it is the distortion doing most of the work —
   undistorted, the same noise is a hiss.

   So: no bandpass, no random centres, no pitch. Speed opens the *bottom* of
   the band rather than the top, because pressing harder and moving faster puts
   more body into a scrape, and it drives the shaper harder, which is what
   roughness sounds like.
   =========================================================================== */

/** Nominal gap between grains, jittered so the run never falls into a pulse. */
const GRAIN_MS = 12;
const GRAIN_JITTER = 0.5;
const GRAIN_SECONDS = 0.022;

/** Pointer speed, px/ms, treated as "as fast as this gets". */
const FAST = 1.6;

/** Where the friction starts. Slow drags are thin and high; fast ones reach
 *  further down, which is the only way the band moves. */
const CORNER_SLOW = 3200;
const CORNER_FAST = 1500;

/** How hard the shaper is driven, slow to fast. This is the grit, and it is
 *  the single most important number in this file. */
const DRIVE_SLOW = 3;
const DRIVE_FAST = 9;

/* --- The reveal ---------------------------------------------------------- */

const REVEAL_PEAK = 0.1;

/** A rising fourth. Not the connect chime's fifth: that is the site's "this
 *  worked" and belongs to real outcomes — an email copied, a waitlist joined.
 *  This is a small delight on a toy, and borrowing the fifth would inflate it
 *  into an achievement. */
const REVEAL_LOW = 784; // G5
const REVEAL_HIGH = 1046.5; // C6
const REVEAL_GAP = 0.085;
const REVEAL_DECAY = 0.42;

let lastGrain = 0;

/**
 * One grain of coin-on-foil.
 *
 * `speed` is px/ms. Called from pointermove, which fires far faster than this
 * will let a grain through — the interval guard is what makes that safe.
 */
export function rasp(speed: number) {
  if (prefersQuiet()) return;

  const now = Date.now();
  // Jittered, so a steady drag does not produce a steady pulse.
  if (now - lastGrain < GRAIN_MS * (1 - GRAIN_JITTER + Math.random() * GRAIN_JITTER * 2)) {
    return;
  }
  lastGrain = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  // 0 at a standstill, 1 at FAST and beyond.
  const drive = Math.min(1, speed / FAST);
  const out = stage(voice, RASP_PEAK);

  /* A CLUSTER, NOT A GRAIN. `pointermove` arrives at frame rate, so one grain
     per event can never exceed about sixty a second — slow enough to count,
     which is what made the first version tick. Scheduling is not bound by the
     event loop, so each accepted call lays down two or three grains at its own
     offsets inside the window ahead. */
  const count = 2 + (Math.random() < 0.35 + drive * 0.5 ? 1 : 0);
  const t = ctx.currentTime + 0.004;
  const corner = CORNER_SLOW + (CORNER_FAST - CORNER_SLOW) * drive;

  /* THE COIN, which this cue never had.

     Everything above is right about friction — broadband, distorted, no pitch
     — and it was still the same white noise every other cue on the board is
     made of, so a coin on foil arrived sounding like a page turning quickly.
     Friction says how it is being touched; it cannot say what is touching.

     What identifies metal is that it *rings*: struck or scraped, it holds a
     couple of high, narrow modes long after the contact. Two of them, in
     parallel with the dry grains — the grains keep their roughness and gain a
     coin. High Q on purpose: this is a ring, not a tone control, and at a low
     one it would only sound like a brighter hiss.

     Two peaks rather than one because a single resonance is a whistle; the
     interval between two is what the ear reads as an object. */
  const metal = resonator(ctx, out, { hz: 5200, q: 22, level: 0.55 });
  const metal2 = resonator(ctx, out, { hz: 7700, q: 18, level: 0.4 });

  for (let i = 0; i < count; i += 1) {
    const when = t + (Math.random() * GRAIN_MS) / 1000;
    const seconds = GRAIN_SECONDS * (0.7 + Math.random() * 0.6);
    /* Never silent even at a crawl — a coin moving slowly still makes contact.
       The per-grain random factor is what stops a constant drag sounding like
       one held sound at one level. */
    const level = (0.3 + 0.7 * drive) * (0.5 + Math.random() * 0.5);

    for (const target of [out, metal, metal2]) {
      shaped(ctx, target, when, {
        seconds,
        level: target === out ? level : level * 0.6,
        // Highpass, not bandpass. The grain itself has no pitch.
        type: "highpass",
        hz: corner * (0.85 + Math.random() * 0.3),
        drive: DRIVE_SLOW + (DRIVE_FAST - DRIVE_SLOW) * drive,
      });
    }
  }
}

/** The panel comes off. Fired from the scratch that crosses the threshold. */
export function reveal() {
  if (prefersQuiet()) return;
  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, REVEAL_PEAK);
  const t = ctx.currentTime + 0.01;

  for (const [hz, at, level] of [
    [REVEAL_LOW, t, 1],
    [REVEAL_HIGH, t + REVEAL_GAP, 0.85],
  ] as const) {
    const osc = ctx.createOscillator();
    // Triangle rather than sine: a hair of upper harmonic, so it carries over
    // the rub that is still fading underneath it.
    osc.type = "triangle";
    osc.frequency.value = hz;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(level, at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, at + REVEAL_DECAY);

    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + REVEAL_DECAY + 0.05);
  }
}
