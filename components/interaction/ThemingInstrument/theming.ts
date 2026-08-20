/* ===========================================================================
   The skins the Design System card sweeps through.

   The card's whole argument is that one variable re-skins an entire product.
   So the sweep has to be exactly that: a single hue written once, onto one
   element, which every painted thing in the miniature reads. Nothing here
   touches a component — it produces a colour and hands it to the DOM.

   Two decisions worth stating.

   The stops are the system's own semantic mains, not invented brand colours.
   Anyone who opens the Figma file finds these six hexes in the colour page,
   which is the point: the card is showing the real palette, at the real
   values.

   And the interpolation happens in OKLCh, not in sRGB. A straight hex lerp
   from #005982 to #a77318 travels through a dead grey-brown at the halfway
   mark, because sRGB's midpoint between two saturated colours is unsaturated.
   OKLCh keeps chroma up across the crossing, so the sweep reads as one colour
   turning rather than as two colours cross-fading through mud.

   Only the forward conversion is here. The output is an `oklch()` string,
   which browsers take directly — converting back to sRGB would be forty more
   lines to arrive where we started.
   =========================================================================== */

import { clamp01, smooth } from "@/lib/spring";

/** A colour in OKLCh: lightness 0-1, chroma, hue in degrees. */
type Lch = { l: number; c: number; h: number };

/* --- The stops ------------------------------------------------------------ */

/**
 * The six semantic mains, in the order the system documents them.
 *
 * Semantic order rather than an order picked to make the sweep prettier. The
 * jump from `primary` to `secondary` is a big one and that is honest — these
 * are presets a product picks, not a gradient anyone would ship. The detents
 * below lean into it: the sweep holds at each stop and crosses quickly, so it
 * reads as switching skins rather than as scrubbing a hue wheel.
 */
export const PRESETS = [
  { name: "Primary", hex: "#005982" },
  { name: "Secondary", hex: "#a77318" },
  { name: "Info", hex: "#00b8d9" },
  { name: "Success", hex: "#22c55e" },
  { name: "Warning", hex: "#ffab00" },
  { name: "Error", hex: "#ff5630" },
] as const;

/**
 * Above this lightness the system's own tokens put dark text on the fill —
 * `warning/contrast-text` is #1c252e where every other ramp's is #ffffff. One
 * threshold reproduces that rule for the colours between the stops too.
 */
const LIGHT_FILL = 0.78;

/**
 * How much of the gap between two stops is spent crossing, rather than held.
 *
 * At 1 the sweep is linear and the presets are just points it passes through.
 * At 0.45 the middle 45% of each gap does all the travelling and the ends sit
 * still, which is what gives the scrub its detents.
 */
const CROSSING = 0.45;

/**
 * How many distinct colours the whole sweep is allowed to produce.
 *
 * Without this the sweep is continuous, and a continuous colour means a new
 * `--ds-primary` on almost every frame — which is a fresh style resolution and
 * a fresh raster for every element that inherits it, and nothing Chrome has
 * already rasterised can ever be reused. Quantising bounds that: however long
 * anyone plays with the card, there are only ever this many colours, so the
 * paints for them are computed once and then hit cache.
 *
 * 48 across six stops is roughly six intermediate colours per crossing, and a
 * crossing lasts about a fifth of a second — far finer than the eye resolves
 * on a moving fill, and it is a detented control rather than a gradient
 * scrubber, so the holds are meant to look like held colours anyway.
 */
const STEPS = 48;

/* --- sRGB to OKLCh -------------------------------------------------------- */

const srgbToLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

function hexToLch(hex: string): Lch {
  const n = parseInt(hex.slice(1), 16);
  const r = srgbToLinear(((n >> 16) & 255) / 255);
  const g = srgbToLinear(((n >> 8) & 255) / 255);
  const b = srgbToLinear((n & 255) / 255);

  // Björn Ottosson's OKLab. The cube roots are the whole trick: they are what
  // make the space perceptually even, and so what makes a midpoint look like a
  // midpoint.
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  return {
    l: okL,
    c: Math.hypot(okA, okB),
    h: (Math.atan2(okB, okA) * 180) / Math.PI,
  };
}

/** The stops, converted once at module load rather than per frame. */
const STOPS: readonly Lch[] = PRESETS.map((p) => hexToLch(p.hex));

/* --- The sweep ------------------------------------------------------------ */

export type Skin = {
  /** `oklch(...)`, ready to write onto a custom property. */
  readonly css: string;
  /** The same colour at 8% — the system's `primary/8%`, used for the nav's
   *  selected row and other tinted fills. */
  readonly tint: string;
  /** What the ramp's own `contrast-text` would be over this fill. */
  readonly onFill: string;
  /** The stop the sweep is currently sitting on or nearest to. */
  readonly name: string;
};

/**
 * The skin at position `t` along the sweep, `t` in 0..1.
 *
 * Hue is interpolated the short way round the wheel. Without that, crossing
 * from the amber stop to the red one at 20deg would run backwards through the
 * entire spectrum — green, cyan, blue — to cover 40 degrees.
 */
export function skinAt(t: number): Skin {
  const p = (Math.round(clamp01(t) * STEPS) / STEPS) * (STOPS.length - 1);
  const i = Math.min(Math.floor(p), STOPS.length - 2);
  const a = STOPS[i];
  const b = STOPS[i + 1];

  // The detent. `f` is where we are between two stops; `k` is how much of the
  // crossing has actually been made, which holds near 0 and 1.
  const f = p - i;
  const k = smooth(clamp01((f - (1 - CROSSING) / 2) / CROSSING));

  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  const l = a.l + (b.l - a.l) * k;
  const c = a.c + (b.c - a.c) * k;
  const h = a.h + dh * k;

  return {
    css: `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`,
    tint: `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)} / 0.08)`,
    onFill: l > LIGHT_FILL ? "#1c252e" : "#ffffff",
    name: PRESETS[k < 0.5 ? i : i + 1].name,
  };
}

/**
 * Write a skin onto an element.
 *
 * Called from a rAF loop, so it is four `setProperty` calls and no allocation
 * beyond the strings `skinAt` already built. Everything downstream is CSS
 * inheritance — which is exactly the claim the card is making.
 */
export function writeSkin(el: HTMLElement, skin: Skin) {
  el.style.setProperty("--ds-primary", skin.css);
  el.style.setProperty("--ds-primary-tint", skin.tint);
  el.style.setProperty("--ds-on-primary", skin.onFill);
}
