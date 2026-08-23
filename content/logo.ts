/* ===========================================================================
   The mark, as geometry.

   For most of this project the logo was two PNGs — `logo.png` and
   `logo-dark.png` — and `Introduction` carried a comment explaining why they
   could not be one file: the mark is two-tone, so `currentColor` cannot reach
   it, and it is "two drawings".

   It is two drawings. These are those two drawings.

   HOW THESE WERE OBTAINED. There was no vector anywhere in the repo and the
   Figma export had been taken as PNG. So the alpha of `logo-dark.png` was
   traced: supersampled 4x, each of the two tones separated by colour, the
   boundary between filled and empty pixels followed as directed unit edges
   (filled always on the left, so every corner has exactly one outgoing edge
   and the chains close on their own), and the resulting loops reduced with
   Douglas-Peucker at a tolerance that keeps the rounded corners and discards
   the pixel staircase. Verified by overlaying the result on the original at
   300px: the outline sits on the artwork.

   WHAT THIS BUYS, beyond the loading sequence that needed it:

     - One file instead of two, and 707 bytes of path instead of 24KB of PNG.
     - It themes. The two tones are CSS custom properties now, so the mark
       follows the page instead of being swapped between two bitmaps.
     - It is sharp at any size, which matters because the arrival sequence
       shows it at roughly three times its resting size.
     - The loader and the homepage can render the *same element*, so the
       hand-over between them is exact by construction rather than by
       measurement.

   The viewBox is the dark export's own pixel box. `logo.png` had a baked
   `#ededed` background and a little padding; that is why the two files had
   slightly different aspect ratios, and why this geometry comes from the dark
   one, which is a clean cut-out.

   BOTH PNGs ARE GONE. Nothing referenced them once this existed, and they were
   24KB shipping to every visitor to draw something that is now 707 bytes. The
   Figma file remains the source of truth for the mark itself; if it changes,
   re-export and re-trace rather than editing the numbers below by hand.
   =========================================================================== */

/** The box the paths are drawn in. */
export const LOGO_BOX = { w: 160, h: 122 } as const;

/**
 * The S — the angular monogram and the wedge that sits under it.
 *
 * Two subpaths: the folded zig-zag, and the small detached triangle at the
 * bottom left. They are one tone and always move together.
 */
export const LOGO_S: readonly string[] = [
  "M27.5 0L97 0L98.75 2.25L98 5.25L65.75 37.5L63.25 37.75L60.5 35.25L57.25 34.75L55.5 35.75L54.25 37.75L54.25 39.75L55.25 42L58.25 44.25L78.25 64.5L81 69.75L81.25 119.75L79 122L75.25 122L75 121.25L73.5 121L71.75 119.75L7.75 55.75L5 52.25L2 46.5L0.75 40.75L0 40.5L0 28.75L0.75 28.5L2 22.5L4.25 17.25L8.25 11.25L15 5.25L20.5 2.25L26.75 0.75Z",
  "M28.25 90.25L30.5 90.5L33.5 93.25L58 117.75L58.75 119.75L57.75 121.25L56.75 122L3.25 122L0 119.5L0 118Z",
];

/** The Y — one stroke: a stem with a chamfered shoulder sweeping up and left. */
export const LOGO_Y =
  "M154.75 1L157.75 1.75L159.25 4.25L160 4.5L160 38.75L159.25 39.25L158.75 43L156.75 47.75L153.75 52.25L120 86.25L118 91.5L118 118.75L117 120.5L115 121.5L91.75 121.5L90 120.75L89 118.75L89 70.25L90.25 65.25L93 61.25L109.25 44.75L110.75 44L118.75 36L143.25 10.75L152.25 2Z";
