import { DARK_GROUND, LIGHT_GROUND, toneFor } from "./clubColor";

/**
 * The twenty clubs, by the FPL API's own `short_name`.
 *
 * ONE BRAND COLOUR EACH, AND WHY THAT IS ENOUGH
 *
 * `brand` is the club's primary, chosen as the one a person would name if you
 * asked them the club's colour. Both theme values are then derived from it by
 * `toneFor`, which walks lightness until the name clears 4.5:1 on the card it
 * is actually sitting on — see lib/clubColor.ts. So this table holds twenty
 * facts rather than forty, and a colour that fails contrast is a bug in one
 * function instead of in one row nobody looked at.
 *
 * `onDark` is the exception, and it is a short list on purpose. Four clubs own
 * a second colour that is genuinely theirs and genuinely better on a dark
 * ground than anything a lightness walk can produce from the first — City's
 * sky blue rather than a washed navy, Leeds' yellow rather than a pale blue.
 * Anywhere else, the computed tone is the honest answer and this column is
 * left alone.
 *
 * The crest path is built from the key, which is the same `short_name`
 * lowercased that `scripts/fetch-crests.mjs` writes the files under — so a
 * promoted club arrives with its colour added here and its crest fetched, and
 * nothing in between needs a lookup table.
 */

type Club = {
  /** The club's primary, as drawn on their own shirt. */
  brand: string;
  /** A second brand colour, used on the dark card instead of a computed tone.
   *  Only where the club really has one that reads better there. */
  onDark?: string;
};

const CLUBS: Record<string, Club> = {
  ars: { brand: "#ef0107" },
  avl: { brand: "#670e36", onDark: "#95bfe5" }, // claret, and their sky blue
  bou: { brand: "#da291c" },
  bre: { brand: "#e30613" },
  bha: { brand: "#0057b8" },
  che: { brand: "#034694" },
  cov: { brand: "#1f2a44", onDark: "#6cb4ee" }, // navy, and their sky blue
  cry: { brand: "#1b458f" },
  eve: { brand: "#003399" },
  ful: { brand: "#000000" }, // black and white; the walk finds the white
  hul: { brand: "#f18a00" }, // amber, darkened for the light card
  ips: { brand: "#3a64a3" },
  lee: { brand: "#1d428a", onDark: "#ffcd00" }, // blue, and their yellow
  liv: { brand: "#c8102e" },
  mci: { brand: "#00285e", onDark: "#6cabdd" }, // navy, and their sky blue
  mun: { brand: "#cd020d" }, // the value the Figma card is drawn in
  new: { brand: "#241f20" },
  nfo: { brand: "#dd0000" },
  sun: { brand: "#eb172b" },
  tot: { brand: "#132257" },
};

export type ClubTone = {
  /** On the light card. */
  color: string;
  /** On the dark card. */
  colorDark: string;
};

/* Resolved once, at module load: twenty pairs, each a few dozen iterations of
   integer arithmetic. Doing it here rather than per render means the card can
   stay a pure read. */
const TONES: Record<string, ClubTone> = Object.fromEntries(
  Object.entries(CLUBS).map(([key, { brand, onDark }]) => [
    key,
    {
      color: toneFor(brand, LIGHT_GROUND),
      colorDark: toneFor(onDark ?? brand, DARK_GROUND),
    },
  ]),
);

/**
 * The pair of tones for a club, by its FPL short name.
 *
 * Falls back to the site's own ink for a club this table has never heard of —
 * a newly promoted side the season after this was written. That renders a
 * correct, if colourless, card rather than an empty one, which is the same
 * choice every other fallback on this site makes.
 */
export function toneOf(shortName: string): ClubTone {
  return (
    TONES[shortName.toLowerCase()] ?? { color: "#222222", colorDark: "#ededed" }
  );
}

/** Where `scripts/fetch-crests.mjs` puts a club's badge. */
export function crestOf(shortName: string): string {
  return `/media/crests/${shortName.toLowerCase()}.png`;
}
