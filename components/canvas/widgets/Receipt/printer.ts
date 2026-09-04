/* ===========================================================================
   A thermal printer running.

   Foley, by request, and it is the right call here: a receipt printer has one
   of the most recognisable sounds in the world and nothing is gained by
   abstracting it into a note.

   What makes it that sound, in order of how much each matters:

   1. THE MOTOR. A stepper does not click, it *buzzes* — a rapid, even pulse
      train, fast enough that the ear stops counting and starts hearing a
      pitch. That rate is the whole identification, and it is why this is a
      run of 60 pulses rather than the nine spaced clicks it used to be. Nine
      clicks is a ratchet; sixty is a printer.

   2. THE PAPER, hissing out under it for exactly as long as the motor runs.

   3. THE STOP. The motor cuts, and the head parks a beat later. A printer
      that fades out has not finished printing.

   The pulse rate is deliberately not a round number — 190Hz sits between the
   notes on the site's scale, so this can never be mistaken for one of the
   pitched cues even though it has an audible pitch.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

const PEAK = 0.075;

/** How long the head travels. */
const RUN_MS = 420;

/** Pulses per second. The motor's pitch, and the sound's identity. */
const PULSE_HZ = 190;

/** Each pulse. Very short and quite bright — a step is a tooth engaging. */
const PULSE_MS = 2.6;
const PULSE_BAND = 2400;
const PULSE_Q = 2.4;

/** Wobble on each pulse's pitch. Small: a stepper is imprecise, not broken,
 *  and too much turns the buzz into a rattle. */
const WOBBLE = 0.07;

/** Paper feeding out under the motor. */
const PAPER_LEVEL = 0.3;

/** The head parking, after the motor stops. */
const PARK_GAP = 0.06;

/** A run is ~500ms; clicking faster than that should not start a second. */
const RETRIGGER_MS = 560;

let lastAt = -Infinity;

/** One pass of the head. */
export function print() {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastAt < RETRIGGER_MS) return;
  lastAt = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const t = ctx.currentTime + 0.01;
  const run = RUN_MS / 1000;
  const pulses = Math.round(run * PULSE_HZ);

  /* The motor. Evenly spaced — this is the one place on the board where
     regularity is the point, because irregularity here is a broken machine
     rather than a natural one. */
  for (let i = 0; i < pulses; i += 1) {
    const at = t + (i / PULSE_HZ);
    burst(ctx, out, {
      at,
      seconds: PULSE_MS / 1000,
      // Up quickly, steady, then off — a motor reaching speed and stopping.
      level: (i < 4 ? (i + 1) / 5 : 1) * (0.85 + Math.random() * 0.15),
      type: "bandpass",
      hz: PULSE_BAND * (1 + (Math.random() * 2 - 1) * WOBBLE),
      q: PULSE_Q,
      attack: 0.0008,
    });
  }

  // Paper, for exactly as long as the motor runs.
  burst(ctx, out, {
    at: t,
    seconds: run,
    level: PAPER_LEVEL,
    type: "bandpass",
    hz: [3400, 2200],
    q: 0.5,
    attack: 0.03,
  });

  // The head parking. A printer that fades out has not finished.
  burst(ctx, out, {
    at: t + run + PARK_GAP,
    seconds: 0.05,
    level: 0.7,
    type: "lowpass",
    hz: [900, 260],
    attack: 0.002,
  });
}
