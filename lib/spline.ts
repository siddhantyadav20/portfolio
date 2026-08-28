/* ===========================================================================
   A smooth closed path through a list of points.

   Centripetal Catmull-Rom, converted to cubic beziers, because SVG has no
   spline primitive and a `<path>` is what has to come out the other end.

   WHY INTERPOLATING. A bezier's handles are not on the curve, so a shape
   authored as handles cannot be adjusted by moving the thing you can see —
   every tweak is a guess followed by a screenshot. Catmull-Rom passes through
   its points, so the input is the outline itself and moving a feature is
   moving a feature.

   WHY CENTRIPETAL (alpha = 0.5) rather than uniform. Uniform Catmull-Rom
   overshoots and can put a cusp or a loop in a segment where two points sit
   close together next to one that is far away — which is precisely the shape
   of a mouth: four landmarks inside 50 units, hanging off a jawline 90 units
   long. The centripetal parameterisation is proven never to cusp or
   self-intersect, and that proof is what lets a caller move one point without
   auditing what it did three segments away.
   =========================================================================== */

export type SplinePoint = {
  readonly x: number;
  readonly y: number;
  /**
   * Break the curve here: the segments either side are drawn as straight
   * lines. For the places a shape genuinely has an edge rather than a bend.
   */
  readonly corner?: true;
};

const ALPHA = 0.5;

/**
 * The `d` attribute for a closed path through every point, in order.
 *
 * Rounded to a tenth of a unit on the way out — the difference is far below a
 * device pixel at any size this renders at, and it keeps the string readable
 * in a diff, which is the only place anybody will ever look at it.
 */
export function smoothClosedPath(points: readonly SplinePoint[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n < 3) {
    return `M ${points.map((p) => `${r(p.x)} ${r(p.y)}`).join(" L ")} Z`;
  }

  const at = (i: number) => points[((i % n) + n) % n];
  let d = `M ${r(points[0].x)} ${r(points[0].y)}`;

  for (let i = 0; i < n; i++) {
    const p1 = at(i);
    const p2 = at(i + 1);

    if (p1.corner || p2.corner) {
      d += ` L ${r(p2.x)} ${r(p2.y)}`;
      continue;
    }

    const [c1, c2] = handles(at(i - 1), p1, p2, at(i + 2));
    d += ` C ${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }

  return `${d} Z`;
}

/**
 * The two bezier handles for the segment p1 -> p2, given its neighbours.
 *
 * Exported for the tests, and worth testing: the two expressions are near
 * mirror images of each other, and swapping which point each term multiplies
 * produces tangents that point the wrong way — a shape that is not subtly off
 * but a starburst of spikes. That is what shipped for one commit. The uniform
 * case reduces to the classic `p1 + (p2 - p0) / 6`, which is the assertion
 * that would have caught it in a second rather than a screenshot.
 */
export function handles(
  p0: SplinePoint,
  p1: SplinePoint,
  p2: SplinePoint,
  p3: SplinePoint,
) {
  /* Knot spacing. Floored rather than guarded at the division: two identical
     points are a typo, and a NaN reaching a path string fails silently as an
     invisible shape rather than as an error anybody can find. */
  const d01 = Math.max(knot(p0, p1), 1e-4);
  const d12 = Math.max(knot(p1, p2), 1e-4);
  const d23 = Math.max(knot(p2, p3), 1e-4);

  const axis = (a: number, b: number, c: number, e: number) => ({
    c1:
      (d01 * d01 * c -
        d12 * d12 * a +
        (2 * d01 * d01 + 3 * d01 * d12 + d12 * d12) * b) /
      (3 * d01 * (d01 + d12)),
    c2:
      (d23 * d23 * b -
        d12 * d12 * e +
        (2 * d23 * d23 + 3 * d23 * d12 + d12 * d12) * c) /
      (3 * d23 * (d23 + d12)),
  });

  const x = axis(p0.x, p1.x, p2.x, p3.x);
  const y = axis(p0.y, p1.y, p2.y, p3.y);

  return [
    { x: x.c1, y: y.c1 },
    { x: x.c2, y: y.c2 },
  ] as const;
}

function knot(a: SplinePoint, b: SplinePoint): number {
  return Math.pow(Math.hypot(b.x - a.x, b.y - a.y), ALPHA);
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
