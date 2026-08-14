/* ===========================================================================
   What each sticker does when you touch it.

   The reference shipped one effect — a parabolic flight with a 360 roll —
   and applied it to everything. It is wonderful on a rocket and meaningless
   on a footballer: a bicycle kick that flies across the desk is just a sticker
   being thrown. So the flight stays where it belongs and the others get a
   move that matches what they are a picture of.

     flight     the rocket. Climbs an arc, loops, lands where it started.
     bicycle    Rooney. A backflip on the spot — which is the kick.
     recoil     the CT. A rifle's kick: back hard, two shakes, settle.
     hadouken   Ken. Winds up, lunges, snaps back.

   The three short ones are plain keyframe tracks. They do not need the
   flight's tangent maths, and pretending otherwise is what made the original
   hard to read.
   =========================================================================== */

type Ease = "easeIn" | "easeOut" | "easeInOut" | "linear";

export type Track = {
  duration: number;
  times: number[];
  x?: number[];
  y?: number[];
  rotate: number[];
  scale: number[];
  ease?: Ease[];
};

export const TRACKS: Record<"bicycle" | "recoil" | "hadouken", Track> = {
  /* Down, over the top, and back onto its feet. The dip before the rotation
     is the whole tell — a flip that starts instantly reads as a spin. */
  bicycle: {
    duration: 1.05,
    times: [0, 0.12, 0.5, 0.86, 1],
    y: [0, 12, -48, 8, 0],
    rotate: [0, 8, -180, -352, -360],
    scale: [1, 0.95, 1.05, 0.97, 1],
    ease: ["easeOut", "easeInOut", "easeInOut", "easeOut"],
  },

  /* Fast and mostly over before you register it, with the shake decaying
     rather than repeating evenly. A symmetric wobble reads as a spring, not
     as a weapon. */
  recoil: {
    duration: 0.52,
    times: [0, 0.06, 0.16, 0.32, 0.56, 1],
    x: [0, 16, -4, 6, -2, 0],
    rotate: [0, 6, -2.5, 2, -0.8, 0],
    scale: [1, 0.97, 1.02, 0.99, 1, 1],
    ease: ["easeOut", "easeOut", "easeInOut", "easeInOut", "easeOut"],
  },

  /* Pull back, throw, recover. The wind-up is longer than the strike, which
     is what makes the strike feel fast. */
  hadouken: {
    duration: 0.72,
    times: [0, 0.22, 0.42, 0.68, 1],
    x: [0, -12, 30, -5, 0],
    rotate: [0, 4, -5, 1.5, 0],
    scale: [1, 0.93, 1.07, 0.98, 1],
    ease: ["easeInOut", "easeOut", "easeOut", "easeOut"],
  },
};

/* --- The rocket's flight ---------------------------------------------------
   Kept from references/canvas/Stickers.tsx, because this one genuinely needs
   its maths: rotation blends between a clean 360 and the *tangent of the
   path*, so the nose leads the curve instead of the body sliding round it.
   --------------------------------------------------------------------------- */

const TAU = Math.PI * 2;
const smoothstep = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

export const FLIGHT_DURATION = 1.75;

export function buildFlight({
  dir = -1,
  arcW = 150,
  arcH = 180,
  shrink = 0.22,
  shadowOpacity = 0.28,
  samples = 26,
} = {}) {
  const posX = (t: number) => dir * arcW * Math.sin(TAU * t);
  const posY = (t: number) => (-arcH * (1 - Math.cos(TAU * t))) / 2;
  const rawHeading = (t: number) =>
    (Math.atan2((-arcH / 2) * Math.sin(TAU * t), dir * arcW * Math.cos(TAU * t)) *
      180) /
    Math.PI;

  const ts = Array.from({ length: samples + 1 }, (_, i) => i / samples);

  // Unwrapped, so the heading never jumps 360 mid-flight.
  const heads: number[] = [];
  let prev = rawHeading(0);
  let acc = prev;
  heads.push(acc);
  for (let i = 1; i < ts.length; i++) {
    const h = rawHeading(ts[i]);
    let d = h - prev;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    acc += d;
    heads.push(acc);
    prev = h;
  }
  const turn = Math.sign(heads[heads.length - 1] - heads[0]) || 1;

  const times = [0, 0.07];
  const x = [0, dir * -arcW * 0.035];
  const y = [0, 7];
  const rotate = [0, dir * -3];
  const scale = [1, 0.93];
  const shX = [0, 0];
  const shScale = [1, 1.07];
  const shOpacity = [shadowOpacity, shadowOpacity];
  const ease: Ease[] = ["easeInOut"];

  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    // Blend to the tangent through the middle and back to the clean spin at
    // both ends, so it launches and lands square.
    const blend = Math.min(smoothstep(t / 0.16), smoothstep((1 - t) / 0.16));
    const spin = turn * 360 * t;
    times.push(0.1 + 0.83 * (i / samples));
    x.push(posX(t));
    y.push(posY(t));
    rotate.push(spin + blend * (heads[i] - spin));
    scale.push(1 - shrink * Math.sin(Math.PI * t));
    shX.push(posX(t) * 0.12);
    shScale.push(1 - 0.5 * Math.sin(Math.PI * t));
    shOpacity.push(shadowOpacity * (1 - 0.78 * Math.sin(Math.PI * t)));
    ease.push(i === 0 ? "easeOut" : "linear");
  }

  times.push(0.965, 1);
  x.push(0, 0);
  y.push(6, 0);
  rotate.push(turn * 360, turn * 360);
  scale.push(0.95, 1);
  shX.push(0, 0);
  shScale.push(1.1, 1);
  shOpacity.push(shadowOpacity * 1.15, shadowOpacity);
  ease.push("easeIn", "easeOut");

  return { times, x, y, rotate, scale, shX, shScale, shOpacity, ease };
}

