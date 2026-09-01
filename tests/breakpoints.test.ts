import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The breakpoint guard.
 *
 * This site has ONE breakpoint. Not one per surface, not a scale — one number,
 * 700, and above and below it the page is a uniform scale of a Figma frame
 * (1440 and 390 respectively). Everything geometric is a multiple of `--u`, so
 * there is nothing else for a width to decide.
 *
 * That is worth a test because it is the kind of property that decays silently.
 * A breakpoint is the easiest thing in CSS to add and the hardest to notice: it
 * costs one line, it fixes whatever was in front of you, and six months later
 * there are eleven of them across four uncoordinated sets and every one is load
 * bearing for something. That is precisely where this file came in — 500, 501,
 * 600, 720, 760, 860, 900, 1000, 1001, 1024, 1344 — and the seams between them
 * were visible: one pixel of viewport either side of 500 changed every size on
 * the page by 22%.
 *
 * So: adding a width here has to be a deliberate act that edits ALLOWED and
 * writes down why, rather than something that slips in with a fix.
 *
 * WHEN A COMPONENT WANTS A WIDTH, IT ALMOST ALWAYS WANTS ITS OWN. Reach for
 * `@container`, not `@media` — see `TokenAnatomy.module.css` and
 * `StudyEnd.module.css`, both of which used to be viewport queries and are
 * better for not being. A container query is not listed here and never needs
 * to be: it cannot drift out of step with anything, because it is not keeping
 * step with anything.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Every viewport width this site is allowed to ask about. */
const ALLOWED = new Map<number, string>([
  [
    700,
    "THE breakpoint. Below: the 390 phone frame, scaled. Above: the 1440 " +
      "bento, scaled. Nothing else decides anything.",
  ],
  [
    500,
    "The case-study reader's phone frame, and ONLY the reader's. Unlike the " +
      "homepage — where above and below 700 are the same drawing at two " +
      "scales, so one number does — the reader has no `--u`: its phone " +
      "layout is a separate design in hard pixels (Figma 863:4849 and " +
      "friends), 12px type and a 520 hero where the wide one has 17px and a " +
      "1120x700 rectangle. Merging it into 700 painted phone values into a " +
      "640px column and cropped the device mockup. Two designs, two numbers.",
  ],
  [
    600,
    "CommandPalette only — the panel goes full-screen. The palette is a " +
      "viewport-filling overlay, so the viewport genuinely is its container " +
      "and a container query here would be the same number wearing a hat.",
  ],
  [
    860,
    "CommandPalette only — the peek column is dropped. Same reasoning as 600.",
  ],
  [
    1344,
    "StudyCarousel only — whether the arrows have room to hang outside the " +
      "card (1120 column + 48 of reader padding + 64 of arrow, either side). " +
      "It is about the space AROUND the carousel, which no container query " +
      "can see from inside it.",
  ],
]);

/** Widths that are fine anywhere: these are not viewport breakpoints. */
const NON_WIDTH_FEATURES =
  /prefers-reduced-motion|prefers-color-scheme|hover|pointer|forced-colors|display-mode|orientation|prefers-contrast/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(css|tsx|ts)$/.test(name) && !full.includes("tests/")) out.push(full);
  }
  return out;
}

/** Every `<n>px` inside an `@media (...)` condition, or a `matchMedia`/`sizes` string. */
function widthsIn(source: string): number[] {
  const found: number[] = [];

  const scan = (condition: string) => {
    if (NON_WIDTH_FEATURES.test(condition) && !/width/.test(condition)) return;
    for (const m of condition.matchAll(/(\d+(?:\.\d+)?)px/g)) {
      found.push(Number.parseFloat(m[1]));
    }
  };

  // @media (…) — the condition runs up to the block's opening brace.
  for (const m of source.matchAll(/@media([^{]+)\{/g)) scan(m[1]);
  // matchMedia("…") — the whole string is a condition.
  for (const m of source.matchAll(/matchMedia\(\s*["'`]([^"'`]+)["'`]/g)) scan(m[1]);
  // next/image `sizes` — ONLY the parenthesised conditions. The bare lengths
  // after them ("…, 960px") are how wide the image renders, not a breakpoint,
  // and sweeping those up is how a guard like this earns a reputation for
  // crying wolf.
  for (const attr of source.matchAll(/sizes=["']([^"']+)["']/g)) {
    for (const cond of attr[1].matchAll(/\(([^)]+)\)/g)) scan(cond[1]);
  }

  return found;
}

describe("breakpoints", () => {
  const files = walk(join(ROOT, "app")).concat(walk(join(ROOT, "components")));

  it("finds files to check", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("uses only sanctioned viewport widths", () => {
    const strays: string[] = [];

    for (const file of files) {
      for (const width of widthsIn(readFileSync(file, "utf8"))) {
        if (!ALLOWED.has(width)) {
          strays.push(`${relative(ROOT, file)} → ${width}px`);
        }
      }
    }

    expect(
      strays,
      strays.length
        ? `Unsanctioned viewport width(s).\n\n${strays.join("\n")}\n\n` +
            `This site has one breakpoint: 700. Before adding another, check ` +
            `whether the component actually wants its OWN width — if so use ` +
            `@container, which needs no entry here. If it genuinely needs the ` +
            `viewport, add it to ALLOWED in tests/breakpoints.test.ts with a ` +
            `sentence saying why.`
        : undefined,
    ).toEqual([]);
  });

  it("keeps 700 as the one breakpoint carrying the layout", () => {
    // The homepage's two branches, and nothing between them.
    const page = readFileSync(join(ROOT, "app/page.module.css"), "utf8");
    expect(page).toContain("@media (width < 700px)");
    expect(page).toContain("@media (width >= 700px)");

    const widths = new Set(widthsIn(page));
    expect([...widths]).toEqual([700]);
  });
});
