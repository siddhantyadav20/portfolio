/* ===========================================================================
   The needle, synthesised.

   A record on the board plays an mp3, and an mp3 begins the way a file begins:
   instantly, at full level, from digital silence. The widget spends its whole
   design saying "this is a record" — the vinyl slides out of the sleeve, the
   groove keeps its angle between plays — and then it sounds like a button.

   So this is the half-second the mechanism takes that the file does not have.
   Not a sound effect over the music: it lands *before* the track and is gone
   under it, which is the order the real thing happens in.

   Three parts, and they are all the same two ingredients — noise and a filter:

   - The DROP. A click, which is the stylus meeting the lacquer. Noise through
     a tight bandpass for eight milliseconds. Bandpass rather than a filtered
     impulse because a click with no pitch at all reads as a glitch in the
     playback rather than a thing touching another thing.

   - The SETTLE. Surface noise, filtered to the band a groove actually carries
     — nothing above 1.6k, nothing below 200 — fading up fast and away slowly,
     so the track arrives out of it rather than after it.

   - The CRACKLE. Three or four impulses scattered through the settle at
     random. This is the part that does the work. Steady filtered noise is a
     hiss and reads as a bad connection; noise with occasional isolated pops in
     it reads as dust, and dust reads as vinyl.

   Quiet on purpose — see PEAK. The track is about to play at its own level and
   this must not be the loud part of pressing play.
   =========================================================================== */

import { acquire, burst, noiseBuffer, prefersQuiet, stage } from "@/lib/sound";


/** Master ceiling. The loudest the mechanism ever gets. */
const PEAK = 0.14;

/* --- The drop ------------------------------------------------------------ */

/* BACK TO FOLEY, BY REQUEST. This was briefly a note — B4 for the drop, E4 for
   the lift — on the argument that modern interface audio is tonal rather than
   depictive. That is true of interface audio in general and is not what this
   is: a record going onto a turntable is the one place on this site where the
   *depiction* is the point, because the widget is a record and the visitor is
   putting it on.

   So: the stylus meeting the lacquer, and the groove under it. No note at all.

   Used in two places now — the canvas records, and the homepage music card,
   which had no sound of its own until this. Same mechanism, so the same
   sound. */

/** The contact. Short, mid-high, and dry — this is a diamond touching a
 *  plastic surface, not a click track. */
const CLICK_HZ = 2100;
const CLICK_Q = 1.6;
const CLICK_MS = 9;

/** Lifting is brighter and shorter: less mass is moving, and it is leaving
 *  rather than landing. */
const LIFT_CLICK_HZ = 2900;
const LIFT_LEVEL = 0.7;

/* --- The groove ----------------------------------------------------------
   The band a record actually carries: nothing above 1.6k is groove, nothing
   below 200 is anything but rumble. Up fast and away slowly, so the track
   arrives out of the surface rather than after it. */
const SURFACE_LO = 200;
const SURFACE_HI = 1600;
const SURFACE_IN = 0.05;
const SURFACE_HOLD = 0.32;
const SURFACE_OUT = 0.45;
const SURFACE_LEVEL = 0.55;

/* --- The crackle ---------------------------------------------------------
   Dust. This is the part that does the work: steady filtered noise is a hiss
   and reads as a bad connection, but noise with occasional isolated pops in it
   reads as vinyl, and nothing else does. */
const POPS = 5;
const POP_MS = 3;
const POP_LEVEL = 0.95;

/** How fast the surface is pulled from under a lift. Faster than SURFACE_OUT —
 *  lifting a needle is a decision, and it stops. */
const LIFT_OUT = 0.07;

type Live = { gain: GainNode; source: AudioBufferSourceNode };
let settling: Live | null = null;

/** The stylus lands: click, then surface noise the track can start under. */
export function drop() {
  if (prefersQuiet()) return;
  const voice = acquire();
  if (!voice) return;

  voice.wake();
  const { ctx } = voice;

  const master = stage(voice, PEAK);
  const t = ctx.currentTime + 0.01;

  burst(ctx, master, {
    at: t,
    seconds: CLICK_MS / 1000,
    level: 1,
    type: "bandpass",
    hz: CLICK_HZ,
    q: CLICK_Q,
  });

  /* The surface is held rather than fired and forgotten, because a lift has to
     be able to cut it short — see `lift`. Anything still fading when the next
     record starts is stopped by the drop below. */
  stopSurface(ctx);

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;

  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = SURFACE_HI;

  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = SURFACE_LO;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(SURFACE_LEVEL, t + SURFACE_IN);
  env.gain.setValueAtTime(SURFACE_LEVEL, t + SURFACE_IN + SURFACE_HOLD);
  env.gain.exponentialRampToValueAtTime(
    0.0001,
    t + SURFACE_IN + SURFACE_HOLD + SURFACE_OUT,
  );

  source.connect(low).connect(high).connect(env).connect(master);
  source.start(t, Math.random() * 1.5);
  source.stop(t + SURFACE_IN + SURFACE_HOLD + SURFACE_OUT + 0.05);
  settling = { gain: env, source };

  /* Dust. Scattered across the held part only — a pop in the tail, after the
     music has started, is a click in the track rather than a click before it. */
  const window_ = SURFACE_IN + SURFACE_HOLD;
  for (let i = 0; i < POPS; i += 1) {
    burst(ctx, master, {
      at: t + Math.random() * window_,
      seconds: POP_MS / 1000,
      level: POP_LEVEL * (0.4 + Math.random() * 0.6),
      type: "bandpass",
      // Spread across the band so they are not four of the same pop.
      hz: 900 + Math.random() * 2600,
      q: 0.9,
    });
  }
}

function stopSurface(ctx: AudioContext) {
  if (!settling) return;
  const { gain, source } = settling;
  settling = null;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + LIFT_OUT);
  try {
    source.stop(t + LIFT_OUT + 0.02);
  } catch {
    // Already stopped. Nothing to do.
  }
}

/** The stylus comes off: a brighter, shorter click and the surface pulled out
 *  from under it. */
export function lift() {
  if (prefersQuiet()) return;
  const voice = acquire();
  if (!voice) return;

  voice.wake();
  const { ctx } = voice;

  const master = stage(voice, PEAK);

  burst(ctx, master, {
    at: ctx.currentTime + 0.01,
    seconds: (CLICK_MS * 0.7) / 1000,
    level: LIFT_LEVEL,
    type: "bandpass",
    hz: LIFT_CLICK_HZ,
    q: CLICK_Q,
  });

  stopSurface(ctx);
}
