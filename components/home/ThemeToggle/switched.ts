/* ===========================================================================
   The theme, switched.

   The weakest cue on the list and the one to delete first if the page ends up
   feeling busy — this was flagged as marginal when it was proposed and nothing
   since has argued otherwise. A theme switch is a setting, not a moment, and
   settings that congratulate you are how a site starts feeling like a toy.

   It survives on one argument: it is the only control on the homepage whose
   whole job is to change something, and it is directly beside two cards that
   already make noise. Silence there is now conspicuous rather than restrained.

   So: the smallest possible thing that acknowledges a switch. Not a bell —
   bells mean success on this site and nothing succeeded here. A single
   filtered blip, and the *direction* carries the meaning: down into dark, up
   into light. Nobody will consciously notice that. Everybody will notice if it
   is the wrong way round.
   =========================================================================== */

import { acquire, prefersQuiet, stage } from "@/lib/sound";

/** As quiet as the terminal's keys. This fires whenever anyone plays with the
 *  toggle, which people do. */
const PEAK = 0.05;

/** Where the two land. A minor third apart — small enough to read as one
 *  control with two positions rather than as two different notes. */
const DARK_HZ = 392; // G4
const LIGHT_HZ = 466.16; // A#4

/** Each blip bends a little toward where it is going, which is what makes the
 *  direction legible at all at this length. */
const BEND = 1.08;
const MS = 130;

/** Someone flicking the toggle back and forth should not machine-gun it. */
const RETRIGGER_MS = 180;

let lastAt = -Infinity;

/** `theme` is what is being switched *to*. */
export function switched(theme: "light" | "dark") {
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

  const light = theme === "light";
  const hz = light ? LIGHT_HZ : DARK_HZ;

  const osc = ctx.createOscillator();
  // Sine, and nothing but. Any harmonic content at all makes this a beep, and
  // a beep beside a struck bell sounds like a different site.
  osc.type = "sine";
  osc.frequency.setValueAtTime(light ? hz / BEND : hz * BEND, t);
  osc.frequency.exponentialRampToValueAtTime(hz, t + seconds * 0.7);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  // A soft attack — a hard one on a pure sine is a click, and the click is
  // louder than the note.
  env.gain.exponentialRampToValueAtTime(1, t + 0.018);
  env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);

  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + seconds + 0.03);
}
