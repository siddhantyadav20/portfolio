/* ===========================================================================
   The engine note, synthesised.

   No audio file, for two reasons. A loop long enough not to be obviously a
   loop is a large asset for a hover effect, and — more to the point — a
   recording cannot be *driven*. What the card wants is an engine whose pitch
   and breath follow the same throttle number the exhaust plume reads, so the
   sound is the motion rather than an accompaniment to it.

   Two voices, which is roughly what a jet is from the outside:

     air     filtered noise, the broadband rush. Its band opens from a low
             mutter to a bright hiss as the throttle comes up.
     core    a sine an octave and a half below it, the part you feel. It is
             what makes the takeoff read as effort.

   Everything is quiet on purpose — see PEAK. This is a texture under a hover,
   not an event.

   Nothing here forces audio on anyone. The context is created on the first
   hover and immediately asked to resume; browsers refuse that until the page
   has had a real user gesture, and if it is refused the card simply stays
   silent and tries again on the next hover. Reduced-motion callers don't
   construct it at all, and lib/sound's mute silences it whether or not they
   did.
   =========================================================================== */

import { acquire } from "@/lib/sound";

export type Jet = {
  /** Where the throttle is (cruise = 1) and how far off the ground it is. */
  drive(throttle: number, alt: number): void;
  /** Wheels down: a short scuff of ground contact. */
  touchdown(): void;
  /** The plane is parked. Fade out and let the hardware go back to sleep. */
  release(): void;
  dispose(): void;
};

/** Master ceiling. The loudest this ever gets, at full boost. */
const PEAK = 0.05;

/** Band the rush moves through, Hz — idle to full throttle. */
const AIR_LO = 320;
const AIR_HI = 1700;

/** The core's range, Hz. */
const CORE_LO = 52;
const CORE_HI = 104;

/** How fast the sound follows the number. Long enough that a 60Hz stream of
 *  updates doesn't zipper, short enough to feel connected to the plane. */
const FOLLOW = 0.09;

/* The context, the sleep timer and the mute are lib/sound's now — see the note
   there. The tuning below is untouched; only where the master ends up moved. */

export function createJet(): Jet | null {
  const voice = acquire();
  if (!voice) return null;

  const { ctx } = voice;

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(voice.out);

  /* --- The rush ---------------------------------------------------------- */

  // Two seconds of noise, looped. Longer than any single pass of the card, so
  // the loop point never lands inside a flight.
  const frames = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Brown-ish rather than white: a running sum, which tilts the spectrum down
  // and away from the thin hiss that white noise gives at this volume.
  let running = 0;
  for (let i = 0; i < frames; i++) {
    running = (running + (Math.random() * 2 - 1) * 0.02) * 0.996;
    data[i] = running * 8;
  }

  const air = ctx.createBufferSource();
  air.buffer = buffer;
  air.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = AIR_LO;
  band.Q.value = 0.7;

  const airGain = ctx.createGain();
  airGain.gain.value = 0.9;

  air.connect(band).connect(airGain).connect(master);

  /* --- The core ---------------------------------------------------------- */

  const core = ctx.createOscillator();
  core.type = "sine";
  core.frequency.value = CORE_LO;

  const coreGain = ctx.createGain();
  coreGain.gain.value = 0.34;

  core.connect(coreGain).connect(master);

  air.start();
  core.start();

  let disposed = false;

  /** Bring the hardware back if it is asleep, and push the suspend back.
   *  Rejected before the page has had a user gesture, which is fine: nothing
   *  is audible and nothing throws. */
  const wake = voice.wake;

  return {
    drive(throttle, alt) {
      if (disposed) return;
      wake();

      const t = Math.max(0, Math.min(throttle, 1.7));
      const now = ctx.currentTime;

      // Altitude is in here as well as throttle: the plane running along the
      // ground at the far end of a landing should be quieter than the same
      // throttle setting at cruise, and it puts a fade on either end of the
      // flight that nothing else has to author.
      const loud = Math.min(1, t / 1.7) * (0.35 + 0.65 * alt);

      master.gain.setTargetAtTime(PEAK * loud, now, FOLLOW);
      band.frequency.setTargetAtTime(
        AIR_LO + (AIR_HI - AIR_LO) * Math.min(1, t / 1.7),
        now,
        FOLLOW,
      );
      core.frequency.setTargetAtTime(
        CORE_LO + (CORE_HI - CORE_LO) * Math.min(1, t / 1.7),
        now,
        FOLLOW,
      );
    },

    touchdown() {
      if (disposed || ctx.state !== "running") return;

      // A separate one-shot rather than a bump on the engine: the scuff is a
      // different thing happening, and mixing it into the throttle would make
      // it sound like the plane accelerating as it landed.
      const scuff = ctx.createBufferSource();
      scuff.buffer = buffer;
      scuff.playbackRate.value = 1.8;

      const shape = ctx.createBiquadFilter();
      shape.type = "lowpass";
      shape.frequency.value = 900;

      const env = ctx.createGain();
      const now = ctx.currentTime;
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(PEAK * 1.4, now + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      // Through the bus, not `ctx.destination`. Wired past it this one shot
      // stayed audible with everything else muted — which is precisely the
      // bug a single mute point exists to make impossible.
      scuff.connect(shape).connect(env).connect(voice.out);
      scuff.start(now, Math.random() * 1.5);
      scuff.stop(now + 0.36);
    },

    release() {
      if (disposed) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      // The suspend is lib/sound's, on a timer shared with every other cue —
      // so an idling jet no longer pulls the context down while the bell is
      // still ringing out. `wake` is what pushes it back.
    },

    dispose() {
      disposed = true;
      try {
        air.stop();
        core.stop();
      } catch {
        // Already stopped — nothing to do, and nothing worth reporting.
      }
      /* The context is shared, so this lets go of our own nodes rather than
         closing it out from under the bell. */
      master.disconnect();
    },
  };
}
