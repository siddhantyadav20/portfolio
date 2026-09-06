import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   One stylesheet rule, guarded, because breaking it is invisible.

   The music card re-tints itself from the sleeve of whatever is playing. The
   obvious way to wire that up is to alias the record's colour onto the site's:

     --track-accent: var(--art, var(--accent));
     --accent: var(--track-accent);          <- this line

   which is a custom-property cycle. `--track-accent` falls back to `--accent`,
   and `--accent` on the same element resolves back to `--track-accent`. CSS
   resolves a cycle to the guaranteed-invalid value, so `background-color:
   var(--accent)` computed to `transparent` and the play disc and the progress
   fill both vanished — but ONLY on a track whose artwork yielded no colour,
   which is a monochrome sleeve, which is roughly one album in ten. It shipped
   through a full manual pass before a black-and-white cover happened to come
   up first in the queue.

   Nothing in the test suite can render CSS — vitest runs in node with no jsdom
   by design. So this asserts the shape of the file instead, which is the same
   move `tests/cssCollisions.test.ts` and `tests/breakpoints.test.ts` make.
   =========================================================================== */

const CSS = readFileSync(
  fileURLToPath(
    new URL("../components/home/MusicPlayer/MusicPlayer.module.css", import.meta.url),
  ),
  "utf8",
);

/** Declarations only — `--x: …`, not `var(--x)`. */
function declares(source: string, name: string): boolean {
  return new RegExp(`^\\s*${name}\\s*:`, "m").test(source);
}

describe("the music card's accent", () => {
  it("never redefines --accent", () => {
    /* The cycle above. Read the inherited value; do not shadow it. */
    expect(declares(CSS, "--accent")).toBe(false);
  });

  it("defines --track-accent, and falls back to the site accent", () => {
    expect(declares(CSS, "--track-accent")).toBe(true);
    /* Both themes, and both with a fallback — a track whose sleeve would not
       decode must still get a coloured button. */
    expect(CSS).toMatch(/--track-accent:\s*var\(--art,\s*var\(--accent\)\)/);
    expect(CSS).toMatch(/--track-accent:\s*var\(--art-dark,\s*var\(--accent\)\)/);
  });

  it("reads the record's colour rather than the site's", () => {
    /* Every other `var(--accent)` in the file would be the site's orange on a
       card whose whole point is to wear the sleeve's colour. */
    const reads = [...CSS.matchAll(/var\(--accent\)/g)].length;
    const fallbacks = [...CSS.matchAll(/var\(--art(?:-dark)?,\s*var\(--accent\)\)/g)].length;
    expect(reads).toBe(fallbacks);
  });

  it("registers --track-accent so it can be transitioned", () => {
    /* An unregistered custom property has no type, so the browser can only
       swap it at the halfway point of a transition — skipping a track would
       jump from one record's red to the next one's gold. */
    const globals = readFileSync(
      fileURLToPath(new URL("../app/globals.css", import.meta.url)),
      "utf8",
    );
    expect(globals).toMatch(/@property\s+--track-accent\s*\{[^}]*syntax:\s*"<color>"/);
    expect(CSS).toMatch(/transition:\s*--track-accent/);
  });
});
