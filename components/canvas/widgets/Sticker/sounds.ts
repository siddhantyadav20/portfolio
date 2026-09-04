/* ===========================================================================
   What each sticker sounds like.

   This file is the audio half of effects.ts, and it follows that file's
   argument rather than inventing one: "the flight stays where it belongs and
   the others get a move that matches what they are a picture of." A single
   shared tick for all four was the wrong call for exactly the reason a single
   shared *animation* was — a rifle and a bicycle kick are not the same event
   at different volumes.

     recoil     the CT. A rifle: crack, body, thump, and the room answering.
     flight     the rocket. Ignition, then a roar that leaves.
     bicycle    Rooney. A boot through a ball, then the flip's own air.
     hadouken   Ken. A charge, then the throw.

   EVERY ONE IS TIMED TO ITS TRACK. The numbers below are offsets into the
   keyframes in effects.ts, so the sound lands on the frame that causes it: the
   rifle cracks on the kick, the boot connects at the dip before the rotation,
   the fireball leaves on the lunge and not on the wind-up. Change a `times`
   array over there and the matching offset here has to move with it — that
   coupling is the point, and it is why the offsets are named after the frames
   rather than written as bare numbers.

   ON LEVEL. These are the loudest cues on the site and the only ones anywhere
   near a cartoon. Every PEAK here is still under a tenth, and the rifle — the
   one with a genuine transient — is the quietest of the four, because a sharp
   attack reads far louder than its amplitude and a gunshot that makes someone
   jump is a failure however well synthesised.
   =========================================================================== */

import { acquire, burst, prefersQuiet, stage } from "@/lib/sound";
import { shaped } from "@/lib/voices";

export type StickerEffect = "flight" | "bicycle" | "recoil" | "hadouken";

/**
 * Hovering plays the effect once and ignores repeats while it runs, so these
 * mostly cannot double up. The guard is for the pointer that leaves and
 * returns exactly as an animation ends.
 *
 * PER EFFECT, NOT PER MODULE — and the difference matters now in a way it did
 * not when all four shared one tick. A single timer meant brushing past the
 * CT on the way to the rocket left the rocket silent, because a guard written
 * to stop the *same* sound repeating was instead suppressing a different one.
 * The four stickers are also far apart on the board, so two firing close
 * together is rare and is two things happening, not a stutter.
 */
const RETRIGGER_MS = 260;
const lastAt: Record<StickerEffect, number> = {
  flight: -Infinity,
  bicycle: -Infinity,
  recoil: -Infinity,
  hadouken: -Infinity,
};

/** A pitched body, for the parts of these that are not noise. */
function swell(
  ctx: AudioContext,
  out: AudioNode,
  o: {
    at: number;
    seconds: number;
    level: number;
    from: number;
    to: number;
    type?: OscillatorType;
    attack?: number;
  },
) {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.from, o.at);
  osc.frequency.exponentialRampToValueAtTime(o.to, o.at + o.seconds);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, o.at);
  env.gain.exponentialRampToValueAtTime(o.level, o.at + (o.attack ?? 0.006));
  env.gain.exponentialRampToValueAtTime(0.0001, o.at + o.seconds);

  osc.connect(env).connect(out);
  osc.start(o.at);
  osc.stop(o.at + o.seconds + 0.03);
}

/* ===========================================================================
   recoil — Counter-Strike. Track is 0.52s; the kick is frame 1 at t=0.06.
   =========================================================================== */

/** The loudest cue on the site, and it has to be. Two attempts at this were
 *  the *quietest* sticker, on the reasoning that a gunshot which makes someone
 *  jump is a failure. True, but it went too far: at 0.075, filtered on every
 *  layer, there was never a moment of full-spectrum energy, and full-spectrum
 *  energy is the entire signature of a gunshot. What was left was a pop. */
const RIFLE_PEAK = 0.11;

/**
 * A rifle, third attempt.
 *
 * The thing both previous versions missed: A GUNSHOT IS UNFILTERED. Every
 * layer before this ran through a highpass or a lowpass, so there was always a
 * part of the spectrum missing and it always sounded like something smaller
 * happening behind a wall. The first two milliseconds here go through no
 * filter at all — everything, at once, distorted hard. That instant is the
 * gunshot; the rest is context.
 *
 * Four parts, and the order and spacing matter more than any single tuning:
 *
 *   0ms    the BLAST. Unfiltered, driven to clipping, 2ms. Full spectrum.
 *   1ms    the CRACK. High and short, the supersonic snap over the top.
 *   2ms    the BODY, collapsing downward — a gunshot's spectrum falls off a
 *          cliff, it does not sweep.
 *   35ms   the ROOM, arriving late and dark. Without it the shot happens
 *          nowhere; with it there is a building around the sticker.
 */
function rifle(ctx: AudioContext, out: AudioNode, t: number) {
  // 0. The blast. No filter — this is the part that was always missing.
  shaped(ctx, out, t, {
    seconds: 0.002,
    level: 1,
    type: "allpass",
    hz: 1000,
    drive: 12,
  });

  // 1. The crack over the top.
  shaped(ctx, out, t + 0.001, {
    seconds: 0.014,
    level: 0.8,
    type: "highpass",
    hz: 3200,
    drive: 8,
  });

  // 2. The body, falling off a cliff.
  shaped(ctx, out, t + 0.002, {
    seconds: 0.075,
    level: 0.75,
    type: "lowpass",
    hz: [6000, 180],
    drive: 4,
  });

  // The action working. This is what says "rifle" rather than "bang".
  swell(ctx, out, { at: t + 0.006, seconds: 0.07, level: 0.55, from: 92, to: 48 });

  // 3. The room answering, a beat late and dark.
  burst(ctx, out, {
    at: t + 0.035,
    seconds: 0.3,
    level: 0.2,
    type: "lowpass",
    hz: [1300, 320],
    attack: 0.025,
  });
}

/* ===========================================================================
   flight — the rocket. FLIGHT_DURATION is 1.75s; this must not outlast it.
   =========================================================================== */

const ROCKET_PEAK = 0.085;
const ROCKET_LIFE = 1.6;

function rocket(ctx: AudioContext, out: AudioNode, t: number) {
  // Ignition: a short broadband cough before the roar has anything behind it.
  burst(ctx, out, {
    at: t,
    seconds: 0.09,
    level: 0.8,
    type: "bandpass",
    hz: [420, 180],
    q: 0.8,
  });

  /* The roar. One long burst whose filter opens as it climbs and closes as it
     goes away — the close is the doppler, and it is the only part anyone
     actually hears as "it left". */
  burst(ctx, out, {
    at: t + 0.02,
    seconds: ROCKET_LIFE,
    level: 1,
    type: "lowpass",
    hz: [900, 240],
    // A long attack: thrust builds, it does not switch on.
    attack: 0.32,
  });

  // The rumble under it, rising as it climbs then falling away with the roar.
  swell(ctx, out, {
    at: t + 0.02,
    seconds: ROCKET_LIFE,
    level: 0.55,
    from: 38,
    to: 22,
    attack: 0.3,
  });
}

/* ===========================================================================
   bicycle — Rooney. Track is 1.05s; the dip before the rotation is frame 1 at
   t=0.12, and that dip is the contact.
   =========================================================================== */

const KICK_PEAK = 0.085;
const KICK_AT = 0.12 * 1.05;

/**
 * A boot through a football.
 *
 * Three things at once and they have to arrive in this order, about four
 * milliseconds apart, or it is a drum:
 *
 *   1. the LEATHER — a bright, extremely short slap. This is the actual
 *      contact and it is almost all of the recognition.
 *   2. the BALL — a low body that drops in pitch as it deforms and springs
 *      back. Falling pitch is what makes it a ball rather than a kick drum.
 *   3. the AIR it leaves through.
 *
 * Driven, because a kick is loud at the source and distortion is how a
 * transient reads as force rather than as volume.
 */
function bicycle(ctx: AudioContext, out: AudioNode, t: number) {
  const at = t + KICK_AT;

  // 1. Leather. Six milliseconds, bright, and gone.
  shaped(ctx, out, at, {
    seconds: 0.006,
    level: 1,
    type: "bandpass",
    hz: 1900,
    q: 0.9,
    drive: 5,
  });

  // 2. The ball deforming. The fall is the tell.
  swell(ctx, out, { at: at + 0.002, seconds: 0.115, level: 0.95, from: 150, to: 58 });

  // 3. A little more body just under the leather, so the contact has weight.
  shaped(ctx, out, at + 0.003, {
    seconds: 0.05,
    level: 0.5,
    type: "lowpass",
    hz: [900, 220],
    drive: 2.5,
  });

  // The flip's own air, over the rotation that follows.
  burst(ctx, out, {
    at: at + 0.05,
    seconds: 0.3,
    level: 0.22,
    type: "bandpass",
    hz: [600, 1500],
    q: 0.6,
    attack: 0.1,
  });
  burst(ctx, out, {
    at: at + 0.34,
    seconds: 0.3,
    level: 0.18,
    type: "bandpass",
    hz: [1500, 450],
    q: 0.6,
    attack: 0.1,
  });
}

/* ===========================================================================
   hadouken — Ken. A PUNCH LANDING, not a fireball, by request. Track is 0.72s:
   the wind-up runs to frame 1 at t=0.22 and the lunge is frame 2 at t=0.42.
   =========================================================================== */

const PUNCH_PEAK = 0.085;
const THROW_AT = 0.42 * 0.72;

/**
 * A punch connecting.
 *
 * Deliberately the opposite of the football next door, because those are the
 * two impacts on this board and they must not be confusable:
 *
 *   football   bright leather, a body that RINGS and falls in pitch, air after
 *   punch      no brightness at all, a body that is DEAD, and nothing after
 *
 * A landed punch is a dull, damped thud — flesh absorbs rather than rebounds,
 * so there is no ring and no pitch drop to speak of. What sells it is the
 * *whoosh before it*: the arm travelling, cut off the instant the hit lands.
 * Take the whoosh away and the same thud is a door closing.
 */
function hadouken(ctx: AudioContext, out: AudioNode, t: number) {
  const at = t + THROW_AT;

  /* The arm. Rises, and stops dead on contact rather than fading — a whoosh
     that outlives the impact reads as a miss. */
  burst(ctx, out, {
    at: t + 0.02,
    seconds: THROW_AT - 0.03,
    level: 0.4,
    type: "bandpass",
    hz: [420, 1250],
    q: 1.4,
    attack: 0.1,
  });

  // The contact. Dull, driven, no top.
  shaped(ctx, out, at, {
    seconds: 0.055,
    level: 1,
    type: "lowpass",
    hz: [1400, 260],
    drive: 6,
  });

  // The body under it. Barely moves in pitch — this is damped, not springy.
  swell(ctx, out, { at, seconds: 0.09, level: 0.85, from: 104, to: 74 });

  /* One short slap of skin on top, and nothing else. No tail: a punch that
     rings is a bell, and the silence straight after is most of why it lands. */
  shaped(ctx, out, at + 0.001, {
    seconds: 0.018,
    level: 0.45,
    type: "bandpass",
    hz: 760,
    q: 1.1,
    drive: 3,
  });
}

const PEAKS: Record<StickerEffect, number> = {
  recoil: RIFLE_PEAK,
  flight: ROCKET_PEAK,
  bicycle: KICK_PEAK,
  hadouken: PUNCH_PEAK,
};

const VOICES: Record<
  StickerEffect,
  (ctx: AudioContext, out: AudioNode, t: number) => void
> = { recoil: rifle, flight: rocket, bicycle, hadouken };

/** Fired as the sticker commits to moving, on the same frame the animation
 *  starts, so the offsets above line up with its keyframes. */
export function playSticker(effect: StickerEffect) {
  if (prefersQuiet()) return;

  const now = Date.now();
  if (now - lastAt[effect] < RETRIGGER_MS) return;
  lastAt[effect] = now;

  const voice = acquire();
  if (!voice) return;
  voice.wake();

  const { ctx } = voice;
  VOICES[effect](ctx, stage(voice, PEAKS[effect]), ctx.currentTime + 0.008);
}
