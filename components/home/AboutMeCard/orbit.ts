/* ===========================================================================
   Geometry for the About card's tool icons.

   The motion primitives it runs on live in lib/spring.ts.

   Three ideas do the work.

   1. The icons ride the card's *outline*, not a circle around it. `onOutline`
      casts a ray from the card's centre at a given bearing and returns where it
      crosses the rounded rectangle, so a pill is always sitting on the border
      however far round it has travelled — and because the three bearings stay
      120deg apart, what they hold between them is a rotating triangle.

   2. Deployment is a single scalar per icon, 0 at home behind the portrait and
      1 out on the orbit, integrated by a real spring. Position is that scalar
      read along a curve from the portrait to the icon's *live* orbit point, so
      the target may keep moving while the icon is still on its way out and the
      two never disagree. It also means every interruption is already handled:
      leaving mid-flight only changes what the spring is aiming at.

   3. The outbound spring is deliberately underdamped and the inbound one is
      not. Things being flung out overshoot; things being drawn back in do not.

   Everything is in card-space px / degrees / seconds, and nothing here touches
   the DOM.
   =========================================================================== */

export type Vec = { x: number; y: number };

const RAD = Math.PI / 180;

/* The motion primitives this file used to define now live in lib/spring.ts —
   ProximityField had grown its own copy of the same integrator. Re-exported
   here so the card can keep importing its geometry and its motion from one
   place. */
export {
  arrived,
  chan,
  clamp,
  clamp01,
  omegaFor,
  smooth,
  spring,
  type Channel,
} from "@/lib/spring";

/* --- The card's outline ---------------------------------------------------- */

/**
 * Where the ray leaving the centre at `deg` crosses a rounded rectangle of
 * half-extents (hw, hh) and corner radius r. Returned relative to the centre.
 *
 * Bearings are screen-space: 0 is due right and they increase clockwise,
 * because y grows downward.
 *
 * The straight edges are one division each; only in a corner does this have to
 * solve anything, and there it is the intersection of the ray with that
 * corner's circle — the near root, taken with the sign that keeps t positive.
 */
export function onOutline(deg: number, hw: number, hh: number, r: number): Vec {
  const dx = Math.cos(deg * RAD);
  const dy = Math.sin(deg * RAD);

  const tx = Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity;
  let t = Math.min(tx, ty);

  // Inside a corner's square, the flat edge isn't the boundary any more.
  const px = Math.abs(t * dx);
  const py = Math.abs(t * dy);
  if (px > hw - r && py > hh - r) {
    const cx = Math.sign(dx) * (hw - r);
    const cy = Math.sign(dy) * (hh - r);
    const dot = dx * cx + dy * cy;
    const disc = dot * dot - (cx * cx + cy * cy) + r * r;
    if (disc > 0) t = dot + Math.sqrt(disc);
  }

  return { x: t * dx, y: t * dy };
}

/**
 * The flight path, sampled at `u`.
 *
 * A quadratic Bezier from the portrait to the icon's place on the orbit, bent
 * by `arc` in the direction the orbit turns — so an icon leaves along a curve
 * that is already going the way it will be going when it gets there, and
 * arrives without a corner in it. Straight lines out and back read as an
 * inventory being displayed; a curve reads as something being thrown.
 *
 * `u` past 1 is allowed and meant: the spring overshoots, and the curve simply
 * continues along its end tangent, which carries the pill a little past its
 * mark and lets it settle back.
 */
export function flightPoint(from: Vec, to: Vec, arc: number, u: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Perpendicular, clockwise in screen space: (x, y) -> (-y, x).
  const cx = (from.x + to.x) / 2 - dy * arc;
  const cy = (from.y + to.y) / 2 + dx * arc;

  const n = 1 - u;
  return {
    x: n * n * from.x + 2 * n * u * cx + u * u * to.x,
    y: n * n * from.y + 2 * n * u * cy + u * u * to.y,
  };
}
