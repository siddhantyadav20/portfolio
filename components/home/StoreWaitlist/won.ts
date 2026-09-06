/* ===========================================================================
   Joined.

   ONE GESTURE, AND IT IS THE PICTURE'S.

   This cue used to be a 260ms tick fired the instant the server answered: a
   triangle sliding D5 to A5 with a transient on the front. Heard on its own it
   was fine. Heard over the celebration it was wrong, and the reason is that it
   was composed against nothing — it happened, and then, most of a second
   later, a disc flew across the card and a check drew itself in silence. Two
   events that were meant to be one, which is what "the sound is weird" is
   describing.

   So it is scored to the animation instead. Three beats, at the three moments
   the picture actually has:

     THE FLIGHT   0 -> 480ms   the disc crossing the card. A quiet tone rising
                               a fifth, so the travel is *heard* as travel and
                               the arrival has something to arrive from.
     THE RING     560ms        the mark revealed and the ring starting to draw.
                               A soft swell under it — no attack; nothing has
                               landed yet.
     THE CHECK    1060ms       the tick lands exactly as the checkmark closes,
                               with the shine over the pulse pushing out behind
                               it. This is the beat the whole cue is for.

   The offsets are the CSS's and Success.tsx's: `--flight` is 480ms, `.mark`
   waits a further 80, and the check's trim completes on frame 30 of a 60fps
   animation — 500ms after it starts. Change either and this has to move; they
   are named below rather than spelled as numbers so the arithmetic is visible.

   It is still the biggest sound on the site, and it should be. This is the one
   moment a visitor gives something up rather than taking something away.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

/** The loudest cue here — which is still a quiet one. */
const PEAK = 0.1;

/* --- The clock, shared with the picture -----------------------------------
   `--flight` and the 80ms beat after it live in StoreWaitlist.module.css;
   `REVEAL_MS` in Success.tsx is their sum and is the moment the animation is
   allowed to start. The rest are frames of the Lottie at 60fps. */

/** The disc's crossing. `--flight`. */
const FLIGHT = 0.48;
/** When the mark appears and the drawing begins. `REVEAL_MS`. */
const REVEAL = 0.56;
/** Frame 20 of 60 — the ring closing. */
const RING_DONE = REVEAL + 20 / 60;
/** Frame 30 of 60 — the checkmark closing. The cue's landing. */
const CHECK_DONE = REVEAL + 30 / 60;

/* --- The flight ----------------------------------------------------------- */

/** D5 to A5. The same fifth the old cue slid, now spent on the disc's travel
 *  rather than compressed into a quarter second of its own. */
const FROM_HZ = 587.33;
const TO_HZ = 880;

/** Quiet: this is the run-up, not the event. Loud enough to be a presence
 *  under the movement and not loud enough to be the thing you notice. */
const FLIGHT_LEVEL = 0.34;

/* --- The ring ------------------------------------------------------------- */

/** Air under the ring as it draws. No attack — a swell, so nothing sounds like
 *  it has landed until the check actually does. */
const RING_HZ = 1800;
const RING_LEVEL = 0.2;

/* --- The check ------------------------------------------------------------ */

/** The transient. Without it the cue swells, and a confirmation that swells
 *  sounds unsure. */
const TICK_HZ = 2600;
const TICK_MS = 12;
const TICK_LEVEL = 0.5;

/** The shine, over the pulse ring pushing out. */
const SPARKLE_HZ = 5200;
const SPARKLE_MS = 90;
const SPARKLE_LEVEL = 0.16;

/** The phase can only be reached once per submission, but a re-render must not
 *  be able to strike it twice. Longer than the cue, which is now ~1.2s. */
const RETRIGGER_MS = 2500;

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

  /* 1. THE FLIGHT. Triangle rather than sine: a little upper harmonic, so it
        carries over a card that is animating, without the buzz a saw brings.
        The pitch climbs across the whole crossing and arrives — rather than
        arriving early and waiting, which is what a fast glide sounds like. */
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(FROM_HZ, t);
  osc.frequency.exponentialRampToValueAtTime(TO_HZ, t + FLIGHT);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  /* In over 90ms — the disc is already moving when the tone starts, so a hard
     edge here would be a second event before the first one. */
  env.gain.exponentialRampToValueAtTime(FLIGHT_LEVEL, t + 0.09);
  env.gain.setValueAtTime(FLIGHT_LEVEL, t + FLIGHT * 0.8);
  /* Down to nothing as the mark takes over. */
  env.gain.exponentialRampToValueAtTime(0.0001, t + REVEAL + 0.06);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + REVEAL + 0.12);

  /* 2. THE RING, drawing. Filtered noise with a long attack and no transient:
        it is the sound of something being described, not struck. Ends as the
        ring closes. */
  burst(ctx, out, {
    at: t + REVEAL,
    seconds: RING_DONE - REVEAL,
    level: RING_LEVEL,
    type: "bandpass",
    hz: [RING_HZ, RING_HZ * 1.5],
    q: 1.1,
    attack: 0.6,
  });

  /* 3. THE CHECK, landing. The one moment in the cue with an edge on it, and
        it is on the frame the checkmark closes. */
  burst(ctx, out, {
    at: t + CHECK_DONE,
    seconds: TICK_MS / 1000,
    level: TICK_LEVEL,
    type: "bandpass",
    hz: TICK_HZ,
    q: 2,
    attack: 0.001,
  });

  /* 4. The shine, over the pulse. Twenty milliseconds behind the tick, which is
        what makes it read as the tick's own brightness rather than as a fourth
        event. */
  burst(ctx, out, {
    at: t + CHECK_DONE + 0.02,
    seconds: SPARKLE_MS / 1000,
    level: SPARKLE_LEVEL,
    type: "bandpass",
    hz: [SPARKLE_HZ, SPARKLE_HZ * 1.4],
    q: 1.6,
    attack: 0.012,
  });
}
