/* ===========================================================================
   The site's motion primitive.

   One integrator, used by everything that moves under its own weight: the
   homepage's proximity field, the About card's orbiting tools, and the
   canvas's camera. It was written twice before this file existed —
   once inline in ProximityField and once in AboutMeCard/orbit.ts — which is
   how it earned its own module.

   Two properties matter and both come from the same choice:

   These are the *exact discrete solutions* to a damped harmonic oscillator,
   not a stepped numerical integration. So they are stable at any dt — which
   is not a theoretical nicety here, since dt is whatever the display refresh
   and the tab's visibility state hand us, and a stepped integrator visibly
   changes character between 60Hz and 120Hz.

   And they carry velocity. A plain lerp is exponential decay: fastest on its
   very first frame, then an asymptotic crawl, re-lurching every time the
   target moves. This ramps in, builds, and decelerates into place, and
   follows a moving target as one continuous motion. That difference is most
   of why the site feels like it has weight.

   Nothing here touches the DOM.
   =========================================================================== */

/** One smoothed value: where it is, and how fast it is going. */
export type Channel = { v: number; vel: number };

export const chan = (v: number): Channel => ({ v, vel: 0 });

/** Settling time (ms) to the angular frequency of a critically damped system. */
export const omegaFor = (settleMs: number) => 5.83 / (settleMs / 1000);

/**
 * Critically damped: incapable of overshoot, so it reads as weight rather than
 * as bounce.
 *
 * The default for anything responding to a pointer. Use `spring` below when a
 * gesture should deliberately overshoot.
 */
export function settle(
  c: Channel,
  target: number,
  omega: number,
  dt: number,
) {
  const e = Math.exp(-omega * dt);
  const d = c.v - target;
  const tmp = (c.vel + omega * d) * dt;
  c.v = target + (d + tmp) * e;
  c.vel = (c.vel - tmp * omega) * e;
}

/**
 * The same integrator with the damping ratio exposed.
 *
 * `zeta >= 1` is `settle` exactly — the branch is here so a caller can choose
 * temperament per direction with one function. Below 1 it overshoots once and
 * settles, which is what makes a thing being flung out feel different from the
 * same thing being drawn back in.
 */
export function spring(
  c: Channel,
  target: number,
  omega: number,
  zeta: number,
  dt: number,
) {
  const d = c.v - target;

  if (zeta >= 1) {
    settle(c, target, omega, dt);
    return;
  }

  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * dt);
  const a = d;
  const b = (c.vel + zeta * omega * d) / wd;
  const cos = Math.cos(wd * dt);
  const sin = Math.sin(wd * dt);
  c.v = target + e * (a * cos + b * sin);
  c.vel = e * (-zeta * omega * (a * cos + b * sin) + wd * (b * cos - a * sin));
}

/**
 * Has this channel arrived — close to its target *and* barely moving?
 *
 * Both tests are needed. Position alone reports success at the top of an
 * overshoot, on the way past the target at speed.
 *
 * `epsVel` is explicit rather than derived from `eps` because the two original
 * call sites disagreed about it, and both were right for their own channels:
 * ProximityField holds one flat velocity floor across channels whose position
 * epsilons differ by two orders of magnitude (0.02px vs 0.0002 scale), while
 * orbit.ts scales it with the channel. Folding them into one rule would have
 * changed the feel of one of them, silently, in what looked like a pure move.
 */
export const arrived = (
  c: Channel,
  target: number,
  eps: number,
  epsVel: number,
) => Math.abs(target - c.v) <= eps && Math.abs(c.vel) <= epsVel;

/* --- Frame timing ---------------------------------------------------------- */

/**
 * rAF stops entirely while a tab is backgrounded, so the first frame after it
 * returns can carry an arbitrarily long dt. Cap it, and that frame replays as
 * one ordinary step instead of a jump across the screen.
 */
export const DT_CEILING = 1 / 30;

/** Seconds since the last frame, capped, with a sane guess for the first. */
export const frameDelta = (now: number, last: number) =>
  last ? Math.min((now - last) / 1000, DT_CEILING) : 1 / 60;

/* --- Scalars --------------------------------------------------------------- */

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export const clamp01 = (v: number) => clamp(v, 0, 1);

/** Smoothstep. */
export const smooth = (t: number) => t * t * (3 - 2 * t);
