import localFont from "next/font/local";
import { Newsreader, Outfit } from "next/font/google";

/**
 * Display face. Only the two weights the design actually uses are shipped
 * (Medium 500 for the 44px/15px display text, Bold 700 for 20/22/28px).
 *
 * NOTE: these are the trial files from the Canela Collection, copied in from
 * outside the repo so the app has no dependency on a personal filesystem path.
 * Swap in the licensed files at the same two paths before the site goes public.
 */
export const canela = localFont({
  src: [
    { path: "./fonts/CanelaText-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/CanelaText-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  // Keeps the 44px headline from reflowing when the display face swaps in.
  adjustFontFallback: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

/** UI face — Regular / Medium / SemiBold are all used. Variable, so one file. */
export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

/**
 * Reading serif. Used only by the books on the canvas — their pages
 * and reading spread are set in it, because a book set in the UI face reads as
 * a card about a book rather than as a book.
 *
 * The reference loaded it from Google's CDN at runtime; self-hosted here like
 * Outfit, so the canvas makes no external request.
 */
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
