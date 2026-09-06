import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   The music does not live here any more.

   4.8MB of it did: eight MP3s in `public/audio/`, four homepage covers and six
   album sleeves for the canvas. All of it is fetched now — Last.fm for what was
   played, Apple for the artwork and a thirty-second preview (lib/nowPlaying.ts,
   lib/discArt.ts).

   A deletion that size does not stay deleted on its own. Somebody adds a card,
   wants a cover, and writes `/media/track-something.jpg` because four of those
   used to work; the file is missing, the image 404s, and nothing fails until
   somebody looks at the page. This is the same kind of guard as
   tests/breakpoints.test.ts — a property of the codebase, asserted so that
   putting it back has to be a decision rather than an accident.
   =========================================================================== */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** The one committed image the card still uses: what it shows when Last.fm,
 *  Apple or the network is not answering. See content/site.ts. */
const KEPT = "track-unavailable.png";

const GONE: [RegExp, string][] = [
  [/["'`]\/audio\//, "public/audio/ — the eight trimmed MP3s"],
  /* Every `/media/track-…` except the one that stayed. */
  [/\/media\/track-(?!unavailable\b)/, "the four homepage covers"],
  [/album-[a-z-]+\.png/, "the six canvas album sleeves"],
  [/trim-audio/, "scripts/trim-audio.mjs, which cut the previews"],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(css|tsx?|mjs|md)$/.test(name)) out.push(full);
  }
  return out;
}

describe("the committed music", () => {
  const files = ["app", "components", "content", "lib", "scripts"].flatMap((d) =>
    walk(join(ROOT, d)),
  );

  it("finds files to check", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(GONE)("is not referenced: %s", (pattern, what) => {
    const strays = files
      .filter((file) => pattern.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file));

    expect(
      strays,
      `${what} is gone from the repository. Artwork and previews come from ` +
        `Apple now — resolve them through lib/itunes.ts rather than adding a ` +
        `file back.\n  ${strays.join("\n  ")}`,
    ).toEqual([]);
  });

  it.each([
    "public/audio",
    "public/media/track-ode-to-the-mets.jpg",
    "public/media/workspace/album-ode-to-the-mets.png",
    "scripts/trim-audio.mjs",
  ])("is not on disk: %s", (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false);
  });

  it("keeps the one fallback sleeve", () => {
    /* The floor the card stands on, and the reason it is a drawing rather than
       one of the four covers that left: a rights-encumbered commercial sleeve
       shipped as a permanent, always-served fallback is the posture
       content/site.ts talks itself out of. */
    const at = join(ROOT, "public/media", KEPT);
    expect(existsSync(at)).toBe(true);
    expect(statSync(at).size).toBeLessThan(60_000);
  });
});
