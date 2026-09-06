/**
 * Club colours that clear contrast in both themes, from one brand value.
 *
 * THE PROBLEM THIS SOLVES
 *
 * The Fantasy card writes each club's name in that club's colour, and the card
 * appears on a near-white surface in one theme and on #222 in the other. A
 * club's real brand colour almost never works on both. Manchester City's sky
 * blue is 2.0:1 on the light card; their navy is 1.1:1 on the dark one. Hull's
 * amber fails light, Leeds' yellow fails badly, and every navy in the league
 * disappears on dark.
 *
 * The honest fix is not forty hand-picked hexes — that is a table nobody can
 * check and everybody edits. It is one brand colour per club and a rule: walk
 * the lightness until the pair clears 4.5:1 against the ground it is actually
 * on, keeping the hue exactly where it was so the colour still reads as the
 * club's. Where a club genuinely owns a second colour that suits the other
 * theme better than a computed one — City's sky blue is the case this was
 * written for — `lib/clubs.ts` names it and the rule steps aside.
 *
 * 4.5:1 because these are 14px names, which is body text under WCAG AA.
 *
 * Hue is preserved and saturation is only touched as a last resort, at the
 * extremes where a very saturated hue cannot reach the target on lightness
 * alone (a pure yellow on white is the case). Walking in 1% steps costs a few
 * dozen iterations per club, once, at module load.
 */

/** The light card: `--surface-glass` at 0.4 over the page wash. Sampled, not
 *  derived — the wash is a gradient and this is its lighter half, which is the
 *  conservative end to test against. */
export const LIGHT_GROUND = "#f4f4f4";

/** The dark card. globals.css: "the cards are #222222". */
export const DARK_GROUND = "#222222";

/** Body-text AA, and the default because a club's name is set as text. */
const TARGET = 4.5;

/**
 * WCAG's bar for a graphical element rather than a glyph of text.
 *
 * Exported for callers whose colour is never text: `lib/artColor.ts` tints a
 * 40px disc, a 20px icon and an expanding ring with it, none of which is read.
 * Holding those to 4.5 walks a sleeve's red down to a maroon that no longer
 * looks like the record it came off.
 */
export const GRAPHIC_TARGET = 3;

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

function parse(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function format({ r, g, b }: Rgb): string {
  const to = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** WCAG relative luminance. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHsl({ r, g, b }: Rgb): Hsl {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h, s, l };
}

function toRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let v = t;
    if (v < 0) v += 1;
    if (v > 1) v -= 1;
    if (v < 1 / 6) return p + (q - p) * 6 * v;
    if (v < 1 / 2) return q;
    if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
    return p;
  };

  return {
    r: channel(h + 1 / 3) * 255,
    g: channel(h) * 255,
    b: channel(h - 1 / 3) * 255,
  };
}

/**
 * The nearest tone of `brand` that clears `TARGET` against `ground`.
 *
 * Which way to walk is decided by the ground, not by the colour: on a light
 * card the only way out is down, on a dark one the only way out is up. The
 * colour is returned untouched when it already passes, which is the common
 * case — most club reds and blues are chosen to sit on white and already do.
 */
export function toneFor(
  brand: string,
  ground: string,
  target: number = TARGET,
): string {
  if (contrast(brand, ground) >= target) return brand;

  const darken = luminance(parse(ground)) > 0.5;
  const hsl = toHsl(parse(brand));

  /* Lightness first, hue untouched. 100 steps of 1% is the whole range, so
     this cannot spin: it either clears the target or falls through to the
     saturation pass below. */
  for (let i = 1; i <= 100; i++) {
    const l = darken ? hsl.l - i / 100 : hsl.l + i / 100;
    if (l < 0 || l > 1) break;
    const candidate = format(toRgb({ ...hsl, l }));
    if (contrast(candidate, ground) >= target) return candidate;
  }

  /* Lightness alone was not enough, which happens for a very saturated hue
     near the ground's own luminance — a pure yellow on white stays yellow all
     the way down to a dark olive without ever being *dark*. Give up a little
     saturation and try again; a duller club colour is a better failure than an
     illegible one. */
  for (let s = 9; s >= 0; s--) {
    for (let i = 0; i <= 100; i++) {
      const l = darken ? hsl.l - i / 100 : hsl.l + i / 100;
      if (l < 0 || l > 1) break;
      const candidate = format(toRgb({ h: hsl.h, s: (hsl.s * s) / 10, l }));
      if (contrast(candidate, ground) >= target) return candidate;
    }
  }

  /* Unreachable for any real colour — black and white both clear 4.5:1 against
     either ground — but a colour is better than a crash. */
  return darken ? "#000000" : "#ffffff";
}
