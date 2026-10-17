/* ===========================================================================
   How far a surface gives under a finger, and how it comes back.

   The numbers behind `components/interaction/PressField`. Pure, so the shape
   of the press can be tested without a browser.

   THE DEPTH IS IN PIXELS, NOT PERCENT. A uniform `scale(0.97)` is what most
   sites reach for, and on this page it would mean two different materials:
   3% of a 48px pill is a pixel and a half, which is a crisp button, and 3% of
   the 420x640 Inspection card is nineteen pixels of the whole study sagging
   toward its centre, which is a balloon. A real surface pressed by the same
   finger gives by about the same distance whatever its size, so the press is
   a constant depth and the scale is derived from it — measured off the
   element's geometric mean, the same yardstick `morph()` uses for the size of
   a journey, so a tall narrow card and a squat wide one of equal area give
   alike.

   Then clamped at both ends, because physics stops being the right model at
   the extremes: a small chip pressed by "seven pixels" would collapse by a
   fifth, and the largest cards would barely move at all, and a press that
   cannot be seen is not an answer.
   =========================================================================== */

import { clamp, springEasing } from "./spring";

export const PRESS = {
  /** How far, in px of the geometric-mean side, a surface gives. */
  depth: 7,
  /** The least a surface gives, as a fraction — what the biggest cards get. */
  least: 0.012,
  /** The most — what pills and chips get. 4% is a firm button. */
  most: 0.04,

  /** Going down. Short and decelerating: the surface meets the finger, it
   *  does not drift toward it. */
  inMs: 110,
  inEase: "cubic-bezier(0.2, 0, 0, 1)",

  /** Coming back. Underdamped, so it rises a hair past rest and settles — the
   *  part of a press people feel and never see. At these depths the overshoot
   *  is a fraction of a pixel on a card and about one on a pill. */
  outMs: 560,
  outZeta: 0.48,

  /** On touch, how long a finger has to stay down before the surface answers.
   *  Every touch on a scrolling page starts as a press, and answering all of
   *  them makes the cards flinch under a thumb that only meant to scroll —
   *  the same reason iOS holds a scroll view's touches for a beat before
   *  highlighting anything inside it. */
  touchHoldMs: 70,
  /** How far a finger can travel before the touch is a scroll, not a press. */
  slop: 10,
  /** A tap that lifts before `touchHoldMs` still gets its answer, compressed
   *  into this: down and straight back up. */
  tapMs: 90,
} as const;

/** The scale a surface of this size is pressed to. */
export function pressScale(width: number, height: number): number {
  const side = Math.sqrt(Math.max(1, width) * Math.max(1, height));
  return 1 - clamp(PRESS.depth / side, PRESS.least, PRESS.most);
}

/** The release curve, sampled once off the site's own integrator. */
export const RELEASE_EASE = springEasing(PRESS.outMs, PRESS.outZeta, 48);
