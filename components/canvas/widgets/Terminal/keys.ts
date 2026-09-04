/* ===========================================================================
   Typing, the iOS keyboard.

   The reference is specific and worth describing, because it is easy to get
   almost right and have it sound cheap.

   The iOS key is NOT a click and NOT a beep. It is a very short, very DRY
   wooden tock — no ring at all, no pitch you could hum, and gone in about
   thirty milliseconds. Its whole character is in a narrow mid band around
   1.2kHz with everything above 4k rolled off, and it is quiet enough to sit
   under a thumb without competing with what you are typing.

   The two mistakes are a long decay, which turns it into a marimba, and too
   much top, which turns it into a snare. Both are what the earlier versions
   of this file did.

   Return is the same tock, lower and a touch longer — on iOS the modifier and
   return keys are a distinctly duller variant of the same sample set, and that
   difference is what the ear uses to hear a line ending.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

/** Master ceiling. The quietest cue on the site apart from the room itself. */
const PEAK = 0.07;

/** The tock. Narrow, mid, and dead. */
const KEY_HZ = 1250;
const KEY_Q = 2.8;
const KEY_MS = 30;

/** A dull body just under it, which is what stops the band sounding thin. */
const BODY_HZ = 420;
const BODY_MS = 26;
const BODY_LEVEL = 0.5;

/** Return: lower, longer, and a little more of it. */
const ENTER_HZ = 840;
const ENTER_BODY_HZ = 300;
const ENTER_MS = 42;
const ENTER_LEVEL = 1.2;

/** Per-press pitch jitter. A fixed cue at typing speed stops sounding like
 *  typing within four presses and starts sounding like a fault. */
const JITTER = 0.07;

/** A floor under retriggering. Auto-repeat runs at up to 30/s, which is a buzz
 *  rather than typing. */
const FLOOR_MS = 32;

let lastAt = 0;

function press(hz: number, bodyHz: number, ms: number, level: number) {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastAt < FLOOR_MS) return;
  lastAt = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const at = ctx.currentTime + 0.003;
  const wobble = 1 + (Math.random() * 2 - 1) * JITTER;

  // The tock. Falls a little across its own length — the downstroke of a key
  // is brighter than the bottom of it.
  burst(ctx, out, {
    at,
    seconds: ms / 1000,
    level,
    type: "bandpass",
    hz: [hz * wobble, hz * wobble * 0.62],
    q: KEY_Q,
    attack: 0.0008,
  });

  // The body. Dull, and shorter than the tock so it cannot ring.
  burst(ctx, out, {
    at,
    seconds: (ms * (BODY_MS / KEY_MS)) / 1000,
    level: level * BODY_LEVEL,
    type: "lowpass",
    hz: bodyHz * wobble,
    attack: 0.001,
  });
}

export const key = () => press(KEY_HZ, BODY_HZ, KEY_MS, 1);
export const enter = () => press(ENTER_HZ, ENTER_BODY_HZ, ENTER_MS, ENTER_LEVEL);
