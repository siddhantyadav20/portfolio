/* ===========================================================================
   The geometry behind the head chart.

   Everything positional lives here and nothing in it is hand-placed: the
   wedges, the colour ramp and the callouts' coordinates are all derived from
   one list of shares. Change a number in `about.interests` and the fan, the
   ramp and the labels move together — which is the whole reason this is not
   nine `<path>`s and nine `top:` values written out in the stylesheet, where
   the first edit would have desynchronised them silently.

   One coordinate space, shared by the SVG's viewBox and the callouts'
   percentages. The callouts are HTML rather than SVG text — they are chips
   with padding and two type sizes, which SVG makes hard and CSS makes free —
   so they need a way to speak the same coordinates as the drawing. `FRAME` is
   that way, and it is exact rather than approximate as long as the stylesheet
   and this file agree on the box, which is why `PLACEMENT` is derived here
   rather than eyeballed there.
   =========================================================================== */

import { smoothClosedPath, type SplinePoint } from "@/lib/spline";

export type Interest = { readonly name: string; readonly share: number };

/**
 * The part of the drawing space the figure is actually cropped to.
 *
 * Everything else in this file is written in raw drawing coordinates, which
 * are deliberately roomier than the picture: the head sits at round numbers
 * and the callouts are projected wherever their wedge's angle sends them, with
 * no thought given to where an edge is. Laid out that way the composition used
 * about two thirds of its own frame — a column of nothing down each side,
 * because the fan does not care about the frame.
 *
 * So the frame is moved to the content rather than the content to the frame:
 * one rectangle, taken from a measured bounding box, that every coordinate is
 * expressed as a percentage of on the way out. It is the only number here that
 * would need revisiting if the interests changed enough to move the callouts.
 *
 * Slightly negative at the top: the first callout is centred on its wedge, and
 * that wedge's mid-angle is a few degrees off twelve o'clock, so half a chip
 * sits above the crown. That is the reference's arrangement too.
 */
export const FRAME = { x: 80, y: -20, w: 700, h: 580 } as const;

/**
 * The silhouette — one closed path, facing left.
 *
 * Drawn rather than imported: an SVG of a head is a 6KB asset that cannot take
 * `currentColor` on one half and a wedge on the other, and this has to be
 * *filled by the chart* rather than placed beside it. As a path it is also the
 * clip, which is the trick the whole figure rests on — the pie is a plain full
 * circle and the head is the only part of it you ever see.
 *
 * Proportions are a stylised profile, not an outline of anybody: a round
 * cranium, a short brow, one nose, a soft jaw, and a neck that leaves the
 * frame. The nose is the only sharp corner, because it is the one feature that
 * reads as a face at thumbnail size.
 */
/**
 * The profile, as landmarks rather than as bezier handles.
 *
 * THIS USED TO BE A LIST OF CUBIC CONTROL POINTS and it was the wrong tool
 * twice over. Nobody can look at `C 206 336 184 334 168 328` and say whether
 * the nose is too long, so every adjustment was a guess followed by a
 * screenshot; and a handle is not on the outline, so moving a feature meant
 * moving four numbers that had to stay in a relationship no one could see.
 * Three rounds of that produced a beak.
 *
 * These are points the curve actually passes through, and they are the points
 * a life-drawing class would name. Moving the nose is moving the nose. The
 * spline does the rest — see `lib/spline.ts`, which lives there rather than
 * here because its formula is subtle enough to have been wrong once and is
 * now pinned by tests.
 *
 * PROPORTIONED TO THE CANON, so it reads as a head before it reads as
 * anything else. Crown at 40, chin at 418: a 378-unit head. The brow lands at
 * 47% of that, the base of the nose at 77%, the mouth at 84%. Depth is 0.85 of
 * height, and the nose runs a quarter of the height and stands 50 units proud
 * of the face — both canon. The chin sits 15 units *behind* the brow, which is
 * true of most profiles and is the single detail that stops a silhouette
 * looking like it is jutting its face out at you.
 */
const PROFILE: readonly SplinePoint[] = [
  // Crown, over the top and down the back of the skull.
  { x: 350, y: 40 },
  { x: 438, y: 62 },
  { x: 492, y: 128 },
  { x: 506, y: 212 },
  { x: 492, y: 292 },
  { x: 462, y: 348 },
  // The nape, and the step in from the occiput to the neck. The skull
  // overhangs the neck by 80-odd units; without that step the two read as one
  // tapering shape and the head looks like a thumb.
  { x: 432, y: 388 },
  { x: 424, y: 424 },
  // The neck leaves the frame rather than resolving into shoulders the figure
  // has no room for. Three corners: two verticals and the cut.
  { x: 424, y: 560, corner: true },
  { x: 266, y: 560, corner: true },
  { x: 266, y: 464 },
  // The jaw, forward and up to the chin.
  { x: 258, y: 450 },
  { x: 240, y: 437 },
  { x: 220, y: 424 },
  { x: 206, y: 404 },
  /* Mouth. Two lips and the crease under them, at an amplitude of about seven
     units peak to peak — a tenth of the nose's. Drawn at twelve, which was the
     first pass, the profile grew three legible notches and aged forty years:
     at the size this renders, a mouth wants to be felt rather than read. */
  { x: 211, y: 386 },
  { x: 204, y: 370 },
  { x: 209, y: 358 },
  { x: 203, y: 346 },
  { x: 209, y: 332 },
  // The nose. Not a corner: a centripetal spline turns tightly here on its
  // own and leaves a tip with a radius on it, which is a nose. A corner leaves
  // a beak, which is what three earlier passes of this drew.
  { x: 202, y: 324 },
  { x: 150, y: 306 },
  { x: 182, y: 284 },
  { x: 198, y: 258 },
  // The nasion — the dip between brow and bridge, and the reason a profile
  // reads as a face rather than as a wedge.
  { x: 196, y: 238 },
  { x: 189, y: 218 },
  { x: 185, y: 180 },
  { x: 194, y: 128 },
  { x: 238, y: 66 },
];

/** The silhouette — one closed path, facing left. */
export const HEAD_PATH = smoothClosedPath(PROFILE);

/**
 * The head's own box inside the shared space, with a little air around it.
 *
 * The SVG is cropped to this rather than drawn at the full 900x540, and that
 * is what lets the same drawing serve both layouts. Wide, it is placed back at
 * exactly these coordinates by `PLACEMENT` and the callouts land where the
 * geometry says they should. Narrow, the callouts stop being positioned at all
 * and the element is just a picture of a head with its own aspect ratio —
 * which it can only be if the empty half of the frame the labels used to
 * occupy is not part of it.
 */
export const HEAD_BOX = { x: 140, y: 26, w: 376, h: 534 } as const;

/** `HEAD_BOX` as percentages of `VIEW`, for placing the crop back in the wide
 *  layout. Derived, so the two can never disagree. */
export const PLACEMENT = {
  left: px(HEAD_BOX.x),
  top: py(HEAD_BOX.y),
  width: round((HEAD_BOX.w / FRAME.w) * 100),
  height: round((HEAD_BOX.h / FRAME.h) * 100),
} as const;

/** Where the fan radiates from — inside the cranium, a little above centre. */
const CENTRE = { x: 348, y: 218 } as const;

/** Past every corner of the head from `CENTRE`, so no wedge stops short. */
const REACH = 360;

/** How far out the callouts are projected before they are spaced. */
const ANCHOR = 250;

/* Room for a chip between the head's right edge (506) and the frame. Anything
   that projects to less than this is pushed out to it rather than allowed to
   sit on the skull — the reference lets one label kiss the outline and it is
   the one thing in it that reads as a mistake. */
const RIGHT_EDGE = 528;

/** The least vertical distance between two callouts, in view units. */
const CLEARANCE = 52;

export type Wedge = {
  readonly name: string;
  readonly share: number;
  /** The pie slice, already clipped by nothing — the `<g>` carries the clip. */
  readonly path: string;
  /**
   * A `color-mix()` against the two theme tokens rather than a hex triple, so
   * the fan follows the accent and re-grades itself in dark mode with no
   * second palette to keep in step. See `ramp`.
   */
  readonly fill: string;
  readonly label: Label;
};

export type Label = {
  /** Percent of `VIEW`, ready for `left`/`top`. */
  readonly x: number;
  readonly y: number;
  /** Which side of the chip the pointer sits on — the side facing the head. */
  readonly side: "left" | "right";
};

/**
 * 0deg is twelve o'clock and the sweep is clockwise, which is how a pie chart
 * is read and *not* how `Math.cos` is laid out — hence the -90.
 */
function point(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CENTRE.x + r * Math.cos(rad), y: CENTRE.y + r * Math.sin(rad) };
}

function slice(from: number, to: number): string {
  const a = point(from, REACH);
  const b = point(to, REACH);
  // A slice wider than a half-turn needs the large-arc flag; the dominant one
  // always is, and every thin one never is.
  const large = to - from > 180 ? 1 : 0;
  return (
    `M ${CENTRE.x} ${CENTRE.y} L ${round(a.x)} ${round(a.y)} ` +
    `A ${REACH} ${REACH} 0 ${large} 1 ${round(b.x)} ${round(b.y)} Z`
  );
}

/**
 * The colour of the nth thin wedge.
 *
 * A ramp from the accent toward ink, so the fan darkens as it sweeps into the
 * dominant slice and every step still carries enough chroma to separate from
 * the ink it is drawn on. Mixed in oklab because a mix in sRGB between an
 * orange and a near-black goes through a muddy brown at the midpoint — the
 * perceptual space keeps the hue and only spends the lightness.
 *
 * The dominant slice is not on the ramp at all: it is `--ink`, the head's own
 * colour, which is the idea the whole figure is built on. The biggest thing in
 * the head is not a slice *of* the head, it is the shape of it.
 */
function ramp(i: number, count: number): string {
  const share = count < 2 ? 100 : 100 - (i / (count - 1)) * 38;
  return `color-mix(in oklab, var(--accent) ${round(share)}%, var(--ink))`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Turn the list into everything the component draws.
 *
 * The last entry takes the rest of the circle and is the head's own colour;
 * every earlier one is a thin wedge in the fan. That convention is documented
 * where the data is, and asserted here — a set that does not sum to 100 is an
 * edit that went wrong, and drawing it at plausible-looking wrong proportions
 * is worse than saying so during development.
 */
export function chart(items: readonly Interest[]): {
  readonly wedges: readonly Wedge[];
  readonly head: Wedge;
} {
  if (process.env.NODE_ENV !== "production") {
    const total = items.reduce((sum, item) => sum + item.share, 0);
    if (total !== 100) {
      console.warn(
        `[headGeometry] shares add to ${total}, not 100 — the fan will be drawn ` +
          "at the wrong proportions. See `about.interests` in content/site.ts.",
      );
    }
  }

  const fan = items.slice(0, -1);
  const last = items[items.length - 1];

  /* Projected first, then spaced. The projection is what ties a label to its
     wedge; the spacing is what stops the five thin ones at the top of the fan
     — which span 27deg between them — from landing in a stack 8px tall. Going
     down the list and pushing each one clear of the one above keeps the order
     the angles put them in, which is the part a reader actually uses. */
  let cursor = -Infinity;
  const anchors = fan.map((item, i) => {
    const to = fan.slice(0, i + 1).reduce((sum, w) => sum + w.share, 0) * 3.6;
    const from = to - item.share * 3.6;
    const at = point((from + to) / 2, ANCHOR);

    const y = Math.max(at.y, cursor + CLEARANCE, 6);
    cursor = y;

    return { x: Math.max(at.x, RIGHT_EDGE), y };
  });

  const wedges = fan.map((item, i) => {
    const to = fan.slice(0, i + 1).reduce((sum, w) => sum + w.share, 0) * 3.6;
    return {
      name: item.name,
      share: item.share,
      path: slice(to - item.share * 3.6, to),
      fill: ramp(i, fan.length),
      label: { x: px(anchors[i].x), y: py(anchors[i].y), side: "left" as const },
    };
  });

  return {
    wedges,
    head: {
      name: last.name,
      share: last.share,
      // No path: the dominant slice *is* the head, painted as its base fill.
      path: "",
      fill: "var(--ink)",
      /* The one hand-placed coordinate in the file, and it earns the
         exception. Its wedge covers the whole face, the jaw and the front of
         the neck — a 187deg span whose midpoint projects onto the bridge of
         the nose, which is the one place a chip cannot go. Sat in the open
         beside the chin instead, where the reference puts it. */
      label: { x: px(214), y: py(452), side: "right" as const },
    },
  };
}

/** A `VIEW` coordinate as a percentage of the crop the figure is drawn in. */
function px(value: number): number {
  return round(((value - FRAME.x) / FRAME.w) * 100);
}

function py(value: number): number {
  return round(((value - FRAME.y) / FRAME.h) * 100);
}
