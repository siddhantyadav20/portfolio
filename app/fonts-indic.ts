import {
  Noto_Serif_Bengali,
  Noto_Serif_Tamil,
  Noto_Serif_Telugu,
} from "next/font/google";

/**
 * The other Indic display faces, for the greeting that cycles languages.
 *
 * `app/fonts-devanagari.ts` is the same idea for Hindi and explains the
 * reasoning at length; this is that argument applied to three more scripts, and
 * it is worth stating why they cannot share one file with it. There is no
 * "Indic" font. Bengali, Tamil and Telugu are three unrelated writing systems
 * with their own letterforms, and a face that covers one covers none of the
 * others — so this is three faces, each subset to exactly its own script, and
 * a browser downloads only the one whose glyphs it is actually asked to paint.
 *
 * Kept together in one module rather than one file each because they are one
 * decision: the greeting names the languages Siddhant would greet someone in,
 * and adding or removing a language is an edit to that list plus a face here.
 *
 * 700 to sit beside Canela Bold at the same optical weight, matching the
 * Devanagari file. `preload: false` for the same reason it gives: the
 * `@font-face` rule ships everywhere, the file is fetched only when that rule
 * first applies to painted text — which is when the About reader mounts and the
 * cycle reaches that language, and never on a page without it.
 *
 * Each face needs a matching `:lang()` rule in AboutModal.module.css. Without
 * one the variable is defined and never referenced, and the word silently falls
 * through to the platform's own idea of a Tamil serif.
 */

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["700"],
  variable: "--font-bengali",
  display: "swap",
  preload: false,
});

export const notoSerifTamil = Noto_Serif_Tamil({
  subsets: ["tamil"],
  weight: ["700"],
  variable: "--font-tamil",
  display: "swap",
  preload: false,
});

export const notoSerifTelugu = Noto_Serif_Telugu({
  subsets: ["telugu"],
  weight: ["700"],
  variable: "--font-telugu",
  display: "swap",
  preload: false,
});

/** Every Indic variable the greeting needs, as one class list. */
export const indicVariables = [
  notoSerifBengali.variable,
  notoSerifTamil.variable,
  notoSerifTelugu.variable,
].join(" ");
