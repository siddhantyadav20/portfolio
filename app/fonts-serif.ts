import { Newsreader } from "next/font/google";

/**
 * The reading serif, on its own file and off the preload list.
 *
 * Two separate mechanisms, and the first pass only used one of them.
 *
 * `next/font` decides what to *preload* per module graph, so a single
 * `fonts.ts` declaring all three faces meant every route importing any face
 * preloaded all of them. Splitting this out fixed that for the routes that
 * cannot reach the canvas: a case study went from 5 preloaded faces (198KB)
 * to 3 (76KB).
 *
 * It did nothing for the homepage, and measuring is the only reason we know.
 * The homepage card opens the canvas as an overlay, so `CanvasSurface` is
 * still statically reachable from its graph — Next therefore emitted the
 * preload links, the browser fetched 120KB of Newsreader, and no `@font-face`
 * rule on that page referenced a byte of it. Downloaded, unusable, and a
 * fifth of the homepage's entire payload.
 *
 * `preload: false` is what separates the two. The `@font-face` rule still
 * ships and the books still render in Newsreader — the file is fetched when
 * the rule first applies to painted text, which is when the canvas mounts,
 * and never on a page with no books on it.
 *
 * `display: "swap"` is what makes that safe: the spread paints in the fallback
 * serif and swaps when the real face lands, rather than blocking on it.
 */
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});
