/* ===========================================================================
   The mark, as geometry.

   HOW THIS WAS OBTAINED, and why it was done twice.

   There has never been a vector of this logo anywhere in the project — the
   Figma export was taken as PNG, at 160x122, and both PNGs have since been
   deleted. The first pass at fixing that traced the bitmap's alpha into
   polygons: every boundary pixel edge followed, then reduced with
   Douglas-Peucker. It was sharp at any size, which was the point, but it was
   still a *polygon*. Every rounded corner on this mark was a fan of six or
   seven straight chords, every 45-degree fold came out at 44.2 or 45.9, and a
   single long edge arrived broken into five segments that each leaned
   slightly differently. Small, that reads as softness. At the size the
   arrival sequence draws it, it reads as the pixel staircase it came from.

   So this is the same bitmap, read again, as construction rather than as
   pixels:

     - Per-pixel *coverage* rather than a threshold. The export is
       antialiased, so alpha is the fraction of each pixel the shape covers,
       and an edge can be located to about a tenth of a unit instead of half
       of one.
     - Straight runs found and snapped. Fitting lines to the long edges gave
       0.00, 44.98, 89.97, 134.95 degrees with residuals of 0.005 to 0.02 — so
       the mark is built on exact horizontals, verticals and 45s, and each of
       those is now exactly that, with its offset taken from the fit.
     - Corners fitted as cubics. Between each pair of straight edges, a curve
       whose end tangents are pinned to those edges, with an anchor dropped at
       every extreme where the tangent turns axis-aligned — which is where a
       person drawing this would have put one. Handle lengths are solved for,
       and capped at the corner's own vertex so no control point escapes the
       shape it belongs to.

   The result sits on the original within **0.25 units** at its worst, on a
   160-unit box — a sixth of one pixel of the source. It is 38 anchors where
   the trace was 69, and the corners are curves.

   WHAT THIS BUYS beyond looking right:

     - It themes. The two tones are `--mark-s` and `--mark-y`, so the mark
       follows the page instead of being swapped between two bitmaps. That is
       the thing the PNG pair could not do, and the reason there were two.
     - The arrival sequence can draw it. `nodes` below is the path's own
       anchors and control handles, with the arc-length position of each, so
       the loader traces the real geometry and shows the real handles rather
       than a decoration that resembles them.

   THE BOX IS THE ARTWORK'S OWN BOUNDS. The old viewBox was the PNG's pixel
   box, which left about a fifth of a unit of padding on each side; this one is
   the measured extent, uniformly scaled to 160 wide. Uniformly, because an
   anisotropic fit to a rounder number would take the 45s off 45.

   Figma remains the source of truth for the mark itself. If it changes,
   re-export and re-derive — do not edit the numbers below by hand.
   =========================================================================== */

/** The box the paths are drawn in — the artwork's own bounds. */
export const LOGO_BOX = { w: 160, h: 121.72 } as const;

/** One anchor on a path, with the control handles either side of it. */
export type LogoNode = {
  /** The on-curve point. */
  readonly on: readonly [number, number];
  /** Where it sits along its path, 0 to 1 by arc length. */
  readonly at: number;
  /** The handle arriving into it, if the segment before is a curve. */
  readonly back: readonly [number, number] | null;
  /** The handle leaving it, if the segment after is a curve. */
  readonly fwd: readonly [number, number] | null;
};

export type LogoPart = {
  /** Which of the two tones this path is drawn in. */
  readonly tone: "s" | "y";
  /** Its length in user units — the dash length the loader draws with. */
  readonly len: number;
  readonly d: string;
  readonly nodes: readonly LogoNode[];
};

/**
 * The three closed paths that make the mark, in drawing order.
 *
 * Two are the S — the folded monogram and the wedge that sits under it — and
 * one is the Y. They are separate paths rather than one because they carry
 * different tones, and they never overlap, so nothing depends on the order
 * they are painted in. The order they are *drawn* in matters, and it is this
 * one: the S reads first.
 */
export const LOGO_PARTS: readonly LogoPart[] = [
  {
    tone: "s",
    len: 399.5,
    d: "M70.85 118.69C73.56 121.4 74.47 121.72 77.07 121.72C81.4 121.72 81.4 120.64 81.4 116.26L81.4 73.88C81.4 68.92 79.98 66.07 76.65 62.74L57.08 43.18C54.84 40.94 54.35 40.45 54.35 38.78C54.35 36.44 56.3 34.81 58.04 34.81C61.66 34.81 62.1 37.83 64.32 37.83C65.38 37.83 65.36 37.85 68.09 35.11L95.76 7.44C97.75 5.45 98.88 4.33 98.88 3.24C98.88 0 96.52 0 93.28 0L31.76 0C14.08 0 0 15.47 0 34.67C0 44.26 3.42 51.27 8.38 56.22L70.85 118.69Z",
    nodes: [
      { on: [70.85, 118.69], at: 0, back: null, fwd: [73.56, 121.4] },
      { on: [77.07, 121.72], at: 0.018, back: [74.47, 121.72], fwd: [81.4, 121.72] },
      { on: [81.4, 116.26], at: 0.039, back: [81.4, 120.64], fwd: null },
      { on: [81.4, 73.88], at: 0.146, back: null, fwd: [81.4, 68.92] },
      { on: [76.65, 62.74], at: 0.177, back: [79.98, 66.07], fwd: null },
      { on: [57.08, 43.18], at: 0.246, back: null, fwd: [54.84, 40.94] },
      { on: [54.35, 38.78], at: 0.26, back: [54.35, 40.45], fwd: [54.35, 36.44] },
      { on: [58.04, 34.81], at: 0.274, back: [56.3, 34.81], fwd: [61.66, 34.81] },
      { on: [64.32, 37.83], at: 0.292, back: [62.1, 37.83], fwd: [65.38, 37.83] },
      { on: [68.09, 35.11], at: 0.304, back: [65.36, 37.85], fwd: null },
      { on: [95.76, 7.44], at: 0.402, back: null, fwd: [97.75, 5.45] },
      { on: [98.88, 3.24], at: 0.416, back: [98.88, 4.33], fwd: [98.88, 0] },
      { on: [93.28, 0], at: 0.435, back: [96.52, 0], fwd: null },
      { on: [31.76, 0], at: 0.589, back: null, fwd: [14.08, 0] },
      { on: [0, 34.67], at: 0.719, back: [0, 15.47], fwd: [0, 44.26] },
      { on: [8.38, 56.22], at: 0.779, back: [3.42, 51.27], fwd: null },
    ],
  },
  {
    tone: "s",
    len: 144.5,
    d: "M2.89 115.03C0.95 116.97 0.16 117.87 0.16 118.72C0.16 121.67 3.66 121.7 5.79 121.7L53.44 121.7C56.27 121.7 58.8 121.7 58.8 119.54C58.8 118.7 58.23 118.13 55.85 115.76L33.14 93.04C30.6 90.5 30.1 90.11 29.18 90.11C27.95 90.11 27.58 90.35 24.91 93.02L2.89 115.03Z",
    nodes: [
      { on: [2.89, 115.03], at: 0, back: null, fwd: [0.95, 116.97] },
      { on: [0.16, 118.72], at: 0.032, back: [0.16, 117.87], fwd: [0.16, 121.67] },
      { on: [5.79, 121.7], at: 0.082, back: [3.66, 121.7], fwd: null },
      { on: [53.44, 121.7], at: 0.412, back: null, fwd: [56.27, 121.7] },
      { on: [58.8, 119.54], at: 0.457, back: [58.8, 121.7], fwd: [58.8, 118.7] },
      { on: [55.85, 115.76], at: 0.491, back: [58.23, 118.13], fwd: null },
      { on: [33.14, 93.04], at: 0.713, back: null, fwd: [30.6, 90.5] },
      { on: [29.18, 90.11], at: 0.748, back: [30.1, 90.11], fwd: [27.95, 90.11] },
      { on: [24.91, 93.02], at: 0.785, back: [27.58, 90.35], fwd: null },
    ],
  },
  {
    tone: "y",
    len: 313.3,
    d: "M94.02 60.28C89.91 64.39 89.08 67.9 89.08 71.67L89.08 115.59C89.08 120.66 89.21 121.59 94.7 121.59L112.36 121.59C118 121.59 118.1 120.32 118.1 115.64L118.1 94.78C118.1 90.02 119.29 86.88 123.42 82.75L151.91 54.26C156.42 49.75 160 43.44 160 34.65L160 7.98C160 3.48 158.7 0.87 155.52 0.87C153.55 0.87 152.83 1.47 150.39 3.91L94.02 60.28Z",
    nodes: [
      { on: [94.02, 60.28], at: 0, back: null, fwd: [89.91, 64.39] },
      { on: [89.08, 71.67], at: 0.041, back: [89.08, 67.9], fwd: null },
      { on: [89.08, 115.59], at: 0.181, back: null, fwd: [89.08, 120.66] },
      { on: [94.7, 121.59], at: 0.213, back: [89.21, 121.59], fwd: null },
      { on: [112.36, 121.59], at: 0.27, back: null, fwd: [118, 121.59] },
      { on: [118.1, 115.64], at: 0.302, back: [118.1, 120.32], fwd: null },
      { on: [118.1, 94.78], at: 0.369, back: null, fwd: [118.1, 90.02] },
      { on: [123.42, 82.75], at: 0.412, back: [119.29, 86.88], fwd: null },
      { on: [151.91, 54.26], at: 0.541, back: null, fwd: [156.42, 49.75] },
      { on: [160, 34.65], at: 0.61, back: [160, 43.44], fwd: null },
      { on: [160, 7.98], at: 0.696, back: null, fwd: [160, 3.48] },
      { on: [155.52, 0.87], at: 0.726, back: [158.7, 0.87], fwd: [153.55, 0.87] },
      { on: [150.39, 3.91], at: 0.746, back: [152.83, 1.47], fwd: null },
    ],
  },
];
