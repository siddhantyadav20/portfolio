import localFont from "next/font/local";
import { Outfit } from "next/font/google";

/**
 * Display face. Only the two weights the design actually uses are shipped
 * (Medium 500 for the 44px/15px display text, Bold 700 for 20/22/28px).
 *
 * NOTE: these are the trial files from the Canela Collection, copied in from
 * outside the repo so the app has no dependency on a personal filesystem path.
 * Swap in the licensed files before the site goes public — and run them
 * through the same conversion as below, or the saving goes with them.
 *
 * WOFF2, not the OTFs they arrived as. Both faces are preloaded on every route
 * because the display face sets the first thing anyone reads, so they sit
 * squarely in the critical path — and as OTFs that was 147KB of it. The same
 * outlines as WOFF2 are 42KB. Nothing else about them changes: same family,
 * same two weights, same metrics.
 *
 *   fonttools:  f = TTFont("CanelaText-Medium.otf"); f.flavor = "woff2"
 *               f.save("CanelaText-Medium.woff2")
 */
export const canela = localFont({
  src: [
    { path: "./fonts/CanelaText-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/CanelaText-Bold.woff2", weight: "700", style: "normal" },
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
