import { Noto_Serif_Devanagari } from "next/font/google";

/**
 * The Devanagari display face, and it exists for exactly one word.
 *
 * The About page's greeting cycles through languages, and Canela — the display
 * face the rest of that line is set in — is a Latin family. Without this, नमस्ते
 * falls through to whatever serif the platform keeps for Devanagari: Devanagari
 * MT on a Mac, a sans on Windows, a lottery everywhere else. One word at 48px
 * is exactly the size at which that shows.
 *
 * The whole file is one weight and one script. 700 to sit beside Canela Bold at
 * the same optical weight, and `subsets: ["devanagari"]` so none of the Latin
 * coverage this face also has is downloaded — the Latin is Canela's job.
 *
 * `preload: false` for the reason `app/fonts-serif.ts` spells out at length:
 * the `@font-face` rule ships everywhere, and the file is fetched only when
 * that rule first applies to painted text — which is when the About reader
 * mounts, and never on a page without it. The variable is applied on the
 * greeting itself rather than in the root layout, so nothing else can reach it.
 */
export const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["700"],
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
});
