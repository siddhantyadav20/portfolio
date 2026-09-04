/* ===========================================================================
   Moving through the photographs.

   Prints sliding over prints, and it is deliberately the *quietest* member of
   the paper family — the book's page is a sheet being turned through air,
   this is two flat surfaces parting. Less air, more friction, and much shorter.

   Two events, and the difference between them is mass:

     slip      one print moving within a category
     shuffle   the whole stack, changing category. Longer, lower, and with a
               second layer under it — the same relationship the widget's own
               animation has between nudging one photo and swapping the stack.

   No note. This was briefly pitched, back when the board was tonal, and it is
   the last thing left over from that — a single musical cue among a dozen
   foley ones is more conspicuous than any of them.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";
import { shaped } from "@/lib/voices";

const PEAK = 0.08;

/* A SCRAPE, NOT A WHOOSH.

   The previous version was a smooth lowpass falling from 3k to 950 over 110ms,
   which is a "shhh" — the sound of air, not of card. Two things were wrong and
   they are the same two that were wrong on the scratch panel:

   - A SMOOTH SWEEP HAS NO FRICTION IN IT. Photographic paper dragged over
     photographic paper is rough at a small scale; that roughness is what makes
     it card rather than cloth, and it comes from distortion, not filtering.

   - IT WAS TOO LONG. 110ms is enough time to hear the sweep travel, and a
     travelling sweep reads as a gesture through air. A print coming off a
     stack is over in about sixty milliseconds.

   Short, driven, and mostly high — with a dull body under the heavy version
   for the mass of a whole stack moving. */

/** One print. Brief and dry. */
const ONE_HZ = 2400;
const ONE_MS = 62;
const ONE_DRIVE = 4;

/** The whole category: longer and lower, with a body beneath it. Not much
 *  louder — the extra mass is felt as weight rather than volume. */
const MANY_HZ = 1700;
const MANY_MS = 105;
const MANY_DRIVE = 5;
const MANY_LEVEL = 1.1;

/** Two slides closer than this are one slide. */
const RETRIGGER_MS = 70;

let lastAt = -Infinity;

function paper(hz: number, ms: number, level: number, drive: number, heavy: boolean) {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastAt < RETRIGGER_MS) return;
  lastAt = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  const out = stage(voice, PEAK);
  const at = ctx.currentTime + 0.005;
  const seconds = ms / 1000;

  /* The friction. Highpass rather than a falling lowpass: the grit is the
     event, and a sweep would put a gesture where there is only contact. */
  shaped(ctx, out, at, {
    seconds,
    level,
    type: "highpass",
    hz,
    drive,
  });

  /* A stack has a body one print does not — the block shifting together,
     under everything, and it is the only part of this that moves in pitch. */
  if (heavy) {
    burst(ctx, out, {
      at: at + 0.012,
      seconds: seconds * 0.9,
      level: level * 0.5,
      type: "lowpass",
      hz: [800, 240],
      attack: 0.018,
    });
  }
}

/** One photograph, within a category. */
export const slip = () => paper(ONE_HZ, ONE_MS, 1, ONE_DRIVE, false);

/** The whole stack, changing category. */
export const shuffle = () => paper(MANY_HZ, MANY_MS, MANY_LEVEL, MANY_DRIVE, true);
