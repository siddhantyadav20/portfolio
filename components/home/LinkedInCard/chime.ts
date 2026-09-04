/* ===========================================================================
   The connect cue, synthesised.

   No audio file, for the same reason the jet doesn't have one: a 40KB mp3 for
   a third of a second of sound is a poor trade when the sound is four
   oscillators, and a file cannot be retuned by editing two numbers.

   What it is trying to be: the noise a professional network makes when a
   connection lands. Not a game chime and not a notification blip — a soft
   struck bell, two notes, D5 up to A5. A rising perfect fifth is the interval
   almost every "accepted / connected / done" cue in the genre settles on,
   because it reads as an answer rather than an alert. Each note is a
   fundamental with two quiet inharmonic partials over it and a fast
   exponential decay, so it has a wooden attack and a glassy tail.

   Quiet on purpose — see PEAK. It sits under a hover, and a hover the visitor
   did not ask to be loud.

   Nothing here forces audio on anyone. The context is built on the first hover
   and immediately asked to resume; browsers refuse that until the page has had
   a real user gesture, and if it is refused the card simply stays silent and
   tries again next time. Reduced-motion callers never construct it, and
   lib/sound's mute silences it whether or not they did.
   =========================================================================== */

import { bellStage, strike } from "@/lib/bell";
import { acquire } from "@/lib/sound";

export type Chime = {
  /** Struck once per arrival at the CTA. */
  connect(): void;
  dispose(): void;
};

/** Master ceiling. The loudest this ever gets. */
const PEAK = 0.085;

/** The two notes, Hz: D5 then A5. */
const LOW = 587.33;
const HIGH = 880;

/** How far behind the first note the second one lands, seconds. Short enough
 *  that the pair reads as one gesture rather than two events. */
const GAP = 0.115;

/* The partials, the lowpass and the striking live in lib/bell now. Not for
   reuse's sake: the waitlist's confirmation has to be *this* bell rather than
   another one like it, and two nearly-identical bells sound like the site has
   two ideas about what success is. See the note there. */

/** Two hovers closer together than this are one hover. Without it, a pointer
 *  crossing the pill's edge a few times machine-guns the bell. */
const RETRIGGER_MS = 420;

/* The context, the sleep timer and the mute are lib/sound's now — a cue owns
   its oscillators and its tuning and nothing else. Everything below the master
   is unchanged; only where the master ends up is different. */

export function createChime(): Chime | null {
  const voice = acquire();
  if (!voice) return null;

  const { ctx } = voice;
  const { master, tone } = bellStage(ctx, voice.out, PEAK);

  let lastAt = -Infinity;
  let disposed = false;

  const hit = (freq: number, at: number, level: number, decay: number) =>
    strike(ctx, master, freq, at, level, decay);

  return {
    connect() {
      if (disposed) return;

      const now = Date.now();
      if (now - lastAt < RETRIGGER_MS) return;
      lastAt = now;

      // Resumes if the page has earned it and pushes the suspend back. Silent
      // and harmless before the first user gesture, and a no-op while muted.
      voice.wake();

      const t = ctx.currentTime + 0.01;
      hit(LOW, t, 1, 0.85);
      hit(HIGH, t + GAP, 0.8, 1.3);
    },

    /* The context is shared and outlives this cue, so disposing means letting
       go of our own nodes — closing it would take the jet down with us. The
       oscillators are one-shot and already stopped; the master and its filter
       are what stay wired to the bus. */
    dispose() {
      disposed = true;
      master.disconnect();
      tone.disconnect();
    },
  };
}
