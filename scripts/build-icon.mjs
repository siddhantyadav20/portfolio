/**
 * Writes `app/icon.svg` — the browser tab icon — from the mark in
 * `content/logo.ts`.
 *
 * The mark is the one asset in the repo with no upstream file (see the header
 * of content/logo.ts), so the favicon cannot be exported from Figma alongside
 * it. Copying the three path strings into a static SVG by hand would give the
 * mark a second home that nothing keeps in step; this reads the real ones, and
 * `tests/logo.test.ts` fails if the file on disk stops matching them.
 *
 * Run it after changing the mark:  node scripts/build-icon.mjs
 *
 * Read as text rather than imported because this is a plain Node script and
 * `content/logo.ts` is TypeScript. The regex is deliberately narrow — it wants
 * `tone` and `d` and would rather throw than guess — and the test does the
 * authoritative comparison against the real module.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const source = readFileSync(join(root, "content/logo.ts"), "utf8");

const box = source.match(/LOGO_BOX = \{ w: ([\d.]+), h: ([\d.]+) \}/);
if (!box) throw new Error("could not find LOGO_BOX in content/logo.ts");
const [w, h] = [Number(box[1]), Number(box[2])];

const parts = [...source.matchAll(/tone: "([sy])",\n\s*len: [\d.]+,\n\s*d: "([^"]+)"/g)].map(
  ([, tone, d]) => ({ tone, d }),
);
if (parts.length !== 3) {
  throw new Error(`expected 3 paths in content/logo.ts, found ${parts.length}`);
}

/* A square box with the mark centred in it, and just enough margin that it
   does not touch the sides. A favicon is square wherever it is shown, and the
   mark is 160x122 — so width is the constraint and the vertical air is a
   consequence of the mark's own proportion rather than a choice. Four units on
   a 160 box is about 2.5%: at zero the mark reads as clipped at 16px, and much
   more than this and there is not enough mark left at that size to recognise. */
const PAD = 4;
const side = w + PAD * 2;
const viewBox = `${-PAD} ${-(side - h) / 2} ${side} ${side}`;

/* The two tones, and the whole reason this is an SVG rather than the PNG the
   route used to generate. A media query inside an SVG favicon is re-evaluated
   by the browser when the OS theme changes, so one file is the mark in both —
   which is exactly what `--mark-s` and `--mark-y` do on the page. The values
   are those two custom properties from globals.css, written out because a
   favicon has no page to inherit from. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<style>
:root { --mark-s: #1a1a1a; --mark-y: #656565 }
@media (prefers-color-scheme: dark) {
:root { --mark-s: #faf8f6; --mark-y: #666666 }
}
</style>
${parts.map((p) => `<path fill="var(--mark-${p.tone})" d="${p.d}"/>`).join("\n")}
</svg>
`;

writeFileSync(join(root, "app/icon.svg"), svg);
console.log(`app/icon.svg — ${parts.length} paths, ${svg.length} bytes`);
