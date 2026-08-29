#!/usr/bin/env node
/**
 * The squircle mask, for browsers without `corner-shape`.
 *
 * WHY THIS EXISTS
 *
 * Every card on this site is drawn with Figma's cornerSmoothing at 1 — an
 * iOS-style continuous corner rather than a circular one. `corner-shape:
 * squircle` gets that natively and is what the site uses where it exists, but
 * it is a 2025 property: a phone one OS version behind drops the declaration
 * and paints an ordinary rounded rect, which at the same radius reads *rounder*
 * than the corner that was asked for.
 *
 * So: a nine-slice mask. `-webkit-mask-box-image` has been in Safari for years,
 * slices an image into nine regions, and keeps the four corners at a fixed
 * pixel size while stretching the edges — which is exactly the geometry a
 * corner radius needs. One source image serves every radius, because the corner
 * slice is scaled to whatever `--sq-r` says and a squircle scales uniformly.
 *
 * WHERE THE CURVE COMES FROM
 *
 * Measured, not guessed. `corner-shape` participates in hit-testing, so a box
 * carrying it can be traced with `elementFromPoint`: binary-search the boundary
 * at a series of x offsets and you have the curve the browser actually paints.
 * Done against Chrome 143 at radius 100, the result fits a superellipse
 *
 *     |1 - x/R|^n + |1 - y/R|^n = 1
 *
 * with n between 4.2 and 4.6 depending which sample you solve from — the spread
 * is hit-test granularity, not disagreement. 4.3 is the middle of it and what
 * this uses.
 *
 * Run: node scripts/build-squircle.mjs
 * Then paste the printed value into `--sq-mask` in app/globals.css.
 */

/** The superellipse exponent, measured off Chrome's own `squircle`. */
const N = 4.3;

/** Corner radius of the source image, in its own pixels. The slice value in
 *  the CSS must equal this. Anything divisible by 2 works; 64 keeps the path
 *  numbers readable and the image small. */
const R = 64;

/** Two pixels of straight edge between the corners, so the nine-slice has a
 *  middle and edge regions to stretch rather than four corners meeting. */
const MID = 2;

const SIZE = R * 2 + MID;

/**
 * One corner, sampled, in the direction of travel.
 *
 * `px, py` is the corner point itself. `sx, sy` point into the box from it —
 * (+1, +1) at the top-left, (-1, +1) at the top-right, and so on. The curve
 * runs between the two points where the corner meets its edges:
 *
 *     t = 0     ->  (px,          py + sy * R)   on the vertical edge
 *     t = PI/2  ->  (px + sx * R, py         )   on the horizontal edge
 *
 * so a corner that is entered along the top edge sweeps `PI/2 -> 0` and one
 * entered along a vertical edge sweeps `0 -> PI/2`. Getting that backwards on
 * two of the four is what turns this path into a pinwheel, which is exactly
 * what the first version of this file drew.
 */
function corner(px, py, sx, sy, forward, samples = 48) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const k = forward ? i / samples : 1 - i / samples;
    const t = k * (Math.PI / 2);
    const u = Math.cos(t) ** (2 / N);
    const v = Math.sin(t) ** (2 / N);
    pts.push(`${round(px + sx * R * (1 - u))} ${round(py + sy * R * (1 - v))}`);
  }
  return pts;
}

/* One decimal. The source is 130px and the largest corner it is scaled to
   is 64, so a tenth of a source pixel is a twentieth of a screen one. */
const round = (n) => Math.round(n * 10) / 10;

const E = SIZE - R; // where a corner meets the far edge

/* Clockwise from the top edge, corner by corner. */
const path = [
  `M ${R} 0`,
  `L ${E} 0`,
  ...corner(SIZE, 0, -1, +1, false).map((p) => `L ${p}`), // top-right
  `L ${SIZE} ${E}`,
  ...corner(SIZE, SIZE, -1, -1, true).map((p) => `L ${p}`), // bottom-right
  `L ${R} ${SIZE}`,
  ...corner(0, SIZE, +1, -1, false).map((p) => `L ${p}`), // bottom-left
  `L 0 ${R}`,
  ...corner(0, 0, +1, +1, true).map((p) => `L ${p}`), // top-left
  "Z",
].join(" ");

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" ` +
  `viewBox="0 0 ${SIZE} ${SIZE}"><path d="${path}" fill="#fff"/></svg>`;

/* White, not black, and it matters. A mask border can be read as alpha or as
   luminance depending on the engine; black is opaque under alpha and invisible
   under luminance, so a black shape silently erases whatever it masks in half
   the browsers this exists for. White is correct under both.

   `encodeURIComponent`, not a hand-picked set of replacements. An `<img src>`
   is lenient about a data URI carrying raw `<`, `>` and spaces; the mask
   loader is not, and the failure is silent — the mask resolves to nothing,
   which masks the element away entirely rather than erroring. That cost an
   hour, so it is encoded properly here and the leniency is not relied on.

   The three characters put back afterwards are safe unencoded inside a quoted
   CSS url() and are common enough in this path data to be worth the bytes. */
const uri =
  "data:image/svg+xml," +
  encodeURIComponent(svg)
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":");

console.log(`/* slice: ${R} */`);
console.log(`--sq-mask: url("${uri}");`);
console.error(`\n  ${svg.length} bytes of SVG, ${uri.length} of data URI`);
