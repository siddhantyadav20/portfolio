/* ===========================================================================
   The phone's own noises.

   The most important one is the buzz. A text arriving on a phone that isn't
   yours, from someone who is frightened, is most of the episode's tension,
   and it has to land as a motor against a table, not a notification chime.
   Two short pulses of a low, wobbling saw (the eccentric mass spinning up)
   over a rattle of brown noise (whatever it's lying on).

   `navigator.vibrate` goes with it where it exists, which is Android only.
   Everything routes through `lib/sound`, so the site's mute silences it.
   =========================================================================== */

import { play, warm } from "@/lib/sfx";
import { acquire, burst, prefersQuiet, resonator, stage } from "@/lib/sound";

/** Loud for this site, on purpose: it is the one sound the game is built around. */
const BUZZ_PEAK = 0.16;
const PULSES = [0, 0.27] as const;

/** Call inside a click: the browser only lets audio start after a gesture. */
export function wakeAudio(): void {
  acquire()?.wake();
}

/** Fetch and decode the recorded buzz ahead of the first text. */
export function warmBuzz(): void {
  warm("found-buzz");
}

/** Two pulses, the way a text lands: the recording when it's ready. */
const SECOND_PULSE_S = 0.45;

export function buzz(): void {
  // Before the visitor's first tap (the canvas card buzzes on its own),
  // Chrome refuses vibrate and logs an error; Safari has no vibrate at all.
  const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  if (nav.userActivation?.hasBeenActive !== false) {
    try {
      nav.vibrate?.([170, 100, 170]);
    } catch {
      // Some browsers throw on vibrate without a gesture. Sound still plays.
    }
  }
  if (prefersQuiet()) return;

  // A real phone on real wood (samples.config.mjs, "found-buzz"). `play`
  // says false until the file is decoded, and the synthesised motor below
  // covers that first moment.
  if (play("found-buzz")) {
    play("found-buzz", { delay: SECOND_PULSE_S });
    return;
  }

  const voice = acquire();
  if (!voice) return;
  voice.wake();
  const { ctx } = voice;
  const out = stage(voice, BUZZ_PEAK);
  const t0 = ctx.currentTime + 0.02;

  for (const offset of PULSES) {
    const t = t0 + offset;
    const end = t + 0.2;

    const motor = ctx.createOscillator();
    motor.type = "sawtooth";
    motor.frequency.value = 168;
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 36;
    const depth = ctx.createGain();
    depth.gain.value = 10;
    wobble.connect(depth).connect(motor.frequency);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 440;
    lp.Q.value = 2;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.018);
    env.gain.setValueAtTime(1, end - 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    motor.connect(lp).connect(env).connect(out);
    motor.start(t);
    wobble.start(t);
    motor.stop(end + 0.02);
    wobble.stop(end + 0.02);

    burst(ctx, out, { at: t, seconds: 0.2, level: 0.3, type: "bandpass", hz: 240, q: 1.4, colour: "brown", attack: 0.012 });
  }
}

let lastKey = 0;

/** A keypad press: a tick of glass, quieter than the site's terminal keys. */
export function keyTap(): void {
  if (prefersQuiet()) return;
  const now = Date.now();
  if (now - lastKey < 40) return;
  lastKey = now;
  const voice = acquire();
  if (!voice) return;
  voice.wake();
  const { ctx } = voice;
  const out = stage(voice, 0.05);
  const t = ctx.currentTime + 0.005;
  burst(ctx, out, { at: t, seconds: 0.035, level: 0.9, type: "highpass", hz: 2600, colour: "white" });
  burst(ctx, resonator(ctx, out, { hz: 1850, q: 18, level: 0.4 }), { at: t, seconds: 0.03, level: 0.6, type: "bandpass", hz: 1850 });
}

/** A wrong code: two low, flat blips. Refusal, not alarm. */
export function refuse(): void {
  if (prefersQuiet()) return;
  const voice = acquire();
  if (!voice) return;
  voice.wake();
  const { ctx } = voice;
  const out = stage(voice, 0.06);
  for (const offset of [0, 0.13]) {
    const t = ctx.currentTime + 0.01 + offset;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 196;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}
