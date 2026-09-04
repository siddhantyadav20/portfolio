/* ===========================================================================
   A pencil on paper.

   The same granular idea as the scratch panel next door — one short grain per
   pointer move, rate-limited, driven by speed — and deliberately built from
   the opposite materials, because the two widgets sit on the same board and
   would otherwise be the same sound at different volumes.

   Where they differ, and why:

   - A coin on foil is BRIGHT and its top end climbs with speed. Graphite is
     DARK and stays dark: the lead is soft, the paper absorbs, and the top of
     a pencil stroke does not open up when you draw faster.

   - A coin gets DENSER with speed. A pencil gets LOUDER but not much denser,
     because the tooth of the paper is a fixed grain the lead is dragging over.
     So the interval here barely moves and the level does the work.

   - There is a LOWPASS over the whole thing rather than a bandpass. A pencil
     has no resonance to speak of; it is a rustle, and a bandpass gives a
     rustle a pitch it should not have.

   The quietest continuous cue here. Someone drawing is looking at their line,
   not listening to it, and the sound's only job is to make the line feel like
   it has friction.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

const PEAK = 0.055;

/** Slower than the coin's: paper grain is coarser than foil. */
const GRAIN_MS = 34;
const GRAIN_SECONDS = 0.042;

/** px/ms treated as full speed. Lower than the coin's — drawing is a slower
 *  gesture than scratching, and calibrating to the same number would leave the
 *  pencil permanently near silent. */
const FAST = 1.1;

/** Where the paper sits. The top moves only a little with speed. */
const LEAD_HI_SLOW = 1300;
const LEAD_HI_FAST = 2100;
const LEAD_LO = 520;

let lastGrain = 0;

/** One grain of lead on paper. `speed` is px/ms. */
export function graphite(speed: number) {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastGrain < GRAIN_MS) return;
  lastGrain = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const drive = Math.min(1, speed / FAST);

  burst(ctx, stage(voice, PEAK), {
    at: ctx.currentTime + 0.005,
    seconds: GRAIN_SECONDS,
    // A lower floor than the coin's: a pencil resting still and moving barely
    // at all really is almost silent, where a coin is not.
    level: 0.12 + 0.88 * drive,
    type: "lowpass",
    hz: [LEAD_HI_SLOW + (LEAD_HI_FAST - LEAD_HI_SLOW) * drive, LEAD_LO],
    attack: 0.006,
  });
}
