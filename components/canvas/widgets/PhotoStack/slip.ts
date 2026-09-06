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

import { acquire, burst, prefersQuiet, resonator, stage } from "@/lib/sound";
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
const ONE_HZ = 4200;
const ONE_MS = 62;
const ONE_DRIVE = 2.2;

/** The whole category: longer and lower, with a body beneath it. Not much
 *  louder — the extra mass is felt as weight rather than volume. */
const MANY_HZ = 3200;
const MANY_MS = 105;
const MANY_DRIVE = 2.8;
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
  /* PINK, AND WITH A PRINT'S OWN RING.

     This was white noise through a highpass, which is the same ingredient the
     rifle and the page were made of — different envelope, one timbre, and that
     sameness is what reads as patchwork across the board however carefully
     each cue is shaped. Photographic paper is stiffer and glossier than a
     book's page, so it sits between them: pink like paper, but resonating
     higher and tighter than a leaf does — 3.4kHz against the book's 2.6, at a
     sharper Q, which is the difference between a print and a page. */
  const ring = resonator(ctx, out, { hz: 3400, q: 10, level: 0.5 });

  /* BANDPASS AND BARELY DRIVEN, and both of those are the fix.

     It was a highpass at 2400 with a drive of 4, and measured against the
     other cues that put its spectral centre at ~12kHz — within a few hundred
     hertz of the coin scraping the scratch panel. Two different objects
     arriving at the same brightness is precisely the "everything sounds the
     same" this pass is about, and the colour alone could not fix it: a
     waveshaper generates its own harmonics, so hard drive flattens whatever
     tilt the source had and hands back the same bright hiss.

     A print is stiff but soft. Bandpassed it has a top *and* a bottom, and at
     a drive of 2.2 the pink survives the shaper. It measures at ~7.7kHz now
     against the coin's ~13kHz — brighter than a book page, dimmer than metal,
     which is where a photograph belongs. */
  for (const target of [out, ring]) {
    shaped(ctx, target, at, {
      seconds,
      level: target === ring ? level * 0.8 : level,
      type: "bandpass",
      hz,
      q: 0.7,
      drive,
      colour: "pink",
    });
  }

  /* A stack has a body one print does not — the block shifting together,
     under everything, and it is the only part of this that moves in pitch. */
  if (heavy) {
    /* Brown under the whole stack — this is mass moving, and mass is the one
       thing white noise cannot suggest. */
    burst(ctx, out, {
      at: at + 0.012,
      seconds: seconds * 0.9,
      level: level * 0.5,
      type: "lowpass",
      hz: [800, 240],
      attack: 0.018,
      colour: "brown",
    });
  }
}

/** One photograph, within a category. */
export const slip = () => paper(ONE_HZ, ONE_MS, 1, ONE_DRIVE, false);

/** The whole stack, changing category. */
export const shuffle = () => paper(MANY_HZ, MANY_MS, MANY_LEVEL, MANY_DRIVE, true);
