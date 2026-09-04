/* ===========================================================================
   Joined.

   ONE SOUND, by request. This was a three-note bell arpeggio — D5, A5, F#6 —
   and three struck notes in sequence is heard as three events however tightly
   they are spaced. What it should be is a single confident tick: the mark
   being drawn, the order going through.

   THE REFERENCE is the confirmation an ordering app plays when the order is
   placed — bright, brief, unmistakably positive, and over before you have
   finished reading the screen. What makes those work is that the pitch RISES
   inside one gesture rather than across separate notes. The ear hears one
   thing going up, not two things at different heights.

   So: one voice, sliding up a fifth, with a bright transient on the front so
   it lands rather than swells, and a short sparkle over the top. Under 300ms
   in total.

   It is still the biggest sound on the site, and it should be. This is the one
   moment a visitor gives something up rather than taking something away.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

/** The loudest cue here — which is still a quiet one. */
const PEAK = 0.1;

/** The tick, sliding up a fifth. D5 to A5: the same two notes the old
 *  arpeggio used, now one movement instead of two events. */
const FROM_HZ = 587.33;
const TO_HZ = 880;
const MS = 260;

/** How far into the slide the pitch has arrived. Early, so most of the sound
 *  is spent *on* the top note rather than travelling to it — a slide that
 *  arrives late is a swanee whistle. */
const GLIDE = 0.35;

/** The transient on the front. Without it this swells, and a confirmation that
 *  swells sounds unsure. */
const TICK_HZ = 2600;
const TICK_MS = 12;
const TICK_LEVEL = 0.45;

/** A sparkle over the top, brief and high — the shine on the checkmark. */
const SPARKLE_HZ = 5200;
const SPARKLE_MS = 90;
const SPARKLE_LEVEL = 0.16;

/** The phase can only be reached once per submission, but a re-render must not
 *  be able to strike it twice. */
const RETRIGGER_MS = 2000;

let lastAt = -Infinity;

/** Struck once, when the waitlist actually accepted the address. */
export function celebrate() {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastAt < RETRIGGER_MS) return;
  lastAt = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const t = ctx.currentTime + 0.008;
  const seconds = MS / 1000;

  /* The voice. Triangle rather than sine: a little upper harmonic, so it
     carries over a page that may still be animating, without the buzz a saw
     would bring. */
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(FROM_HZ, t);
  osc.frequency.exponentialRampToValueAtTime(TO_HZ, t + seconds * GLIDE);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + seconds + 0.05);

  // The transient, so it lands.
  burst(ctx, out, {
    at: t,
    seconds: TICK_MS / 1000,
    level: TICK_LEVEL,
    type: "bandpass",
    hz: TICK_HZ,
    q: 2,
    attack: 0.001,
  });

  // The shine.
  burst(ctx, out, {
    at: t + 0.02,
    seconds: SPARKLE_MS / 1000,
    level: SPARKLE_LEVEL,
    type: "bandpass",
    hz: [SPARKLE_HZ, SPARKLE_HZ * 1.4],
    q: 1.6,
    attack: 0.012,
  });
}
