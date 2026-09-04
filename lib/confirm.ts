/* ===========================================================================
   Copied.

   The smallest positive cue on the site, and it has to stay that way — copying
   an email is an acknowledgement, not an achievement. Compare the waitlist,
   which is the one thing here allowed to celebrate.

   What "copied" sounds like: a short dry tick with one bright blip just after
   it. The tick is the action registering; the blip is the confirmation. Two
   parts, twenty milliseconds apart, which is close enough that nobody counts
   them and far enough that it does not read as a single click.

   Deliberately NOT a bell. The bell family — the LinkedIn chime and the
   waitlist — means "something happened for you". This means "I did the thing
   you asked", which is a smaller claim and should sound like one.

   Lives in lib because `copyToClipboard` does, and hooking the function rather
   than the buttons means the palette's "Copy email", the palette's "Copy this
   link" and the Introduction card's own button all sound the same without any
   of them knowing about it.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";

/** Quiet. It sits under whatever the visitor is actually doing. */
const PEAK = 0.075;

/** The tick: dry, mid, and over immediately. */
const TICK_HZ = 1500;
const TICK_MS = 16;

/** The blip: brighter, shorter, and just behind it. */
const BLIP_HZ = 3100;
const BLIP_MS = 9;
const BLIP_GAP = 0.02;
const BLIP_LEVEL = 0.55;

/** Two copies closer than this are one copy — double-clicking a copy button is
 *  common and should not double-strike. */
const RETRIGGER_MS = 300;

let lastAt = -Infinity;

/** Struck once, when something has actually reached the clipboard. */
export function confirmed() {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastAt < RETRIGGER_MS) return;
  lastAt = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const t = ctx.currentTime + 0.006;

  burst(ctx, out, {
    at: t,
    seconds: TICK_MS / 1000,
    level: 1,
    type: "bandpass",
    hz: [TICK_HZ, TICK_HZ * 0.7],
    q: 2.2,
    attack: 0.001,
  });

  burst(ctx, out, {
    at: t + BLIP_GAP,
    seconds: BLIP_MS / 1000,
    level: BLIP_LEVEL,
    type: "bandpass",
    hz: BLIP_HZ,
    q: 3,
    attack: 0.001,
  });
}
