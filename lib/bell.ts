/* ===========================================================================
   A struck bell.

   Lifted out of LinkedInCard/chime.ts, which is where it was written and where
   it was tuned, because a second cue now needs to be recognisably the *same
   bell* rather than another one like it.

   That matters more than sharing code usually does. The connect chime and the
   waitlist's confirmation both mean "that worked", and the page has exactly one
   voice for saying so — the same partials, the same decay, a different figure
   on top. Two bells that are nearly the same is worse than either one alone: it
   sounds like the site has two ideas about what success is.

   The tuning below is chime.ts's, moved rather than re-derived.
   =========================================================================== */

import { burst as _burst } from "@/lib/sound";

/**
 * Partials, as [ratio of the fundamental, share of the level]. The 3.01 and
 * 5.04 are deliberately off the harmonic series — that detuning is the
 * difference between a bell and an organ.
 */
export const PARTIALS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [2.0, 0.3],
  [3.01, 0.11],
  [5.04, 0.04],
];

/** Takes the top off the upper partials. Without it the 5.04 is a spike and
 *  the whole thing reads as a phone alert rather than something struck. */
export const TONE_HZ = 5200;
export const TONE_Q = 0.4;

/**
 * The bell's output stage: a lowpass between the cue and the bus.
 *
 * Returned as the node to strike into, so a caller cannot accidentally get the
 * partials without the filter that makes them a bell.
 */
export function bellStage(ctx: AudioContext, out: AudioNode, peak: number) {
  const master = ctx.createGain();
  master.gain.value = peak;

  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = TONE_HZ;
  tone.Q.value = TONE_Q;

  master.connect(tone).connect(out);
  return { master, tone };
}

/**
 * One struck note.
 *
 * Every partial gets its own envelope and the higher ones decay faster, which
 * is what a real bar or bell does — a single envelope over the stack is a
 * synth pad with a fast release.
 */
export function strike(
  ctx: AudioContext,
  into: AudioNode,
  freq: number,
  at: number,
  level: number,
  decay: number,
) {
  for (const [ratio, share] of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;

    const env = ctx.createGain();
    const life = decay / (1 + (ratio - 1) * 0.55);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(level * share, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + life);

    osc.connect(env).connect(into);
    osc.start(at);
    osc.stop(at + life + 0.05);
  }
}

/* Re-exported so a bell cue needs one import rather than two. */
export const burst = _burst;
