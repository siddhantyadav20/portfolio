import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The morph guard.
 *
 * Six surfaces on this site make one gesture: a thing you clicked grows into
 * the reader it opens. They are choreographed entirely in CSS, against a clock
 * that JavaScript writes onto <html> — which means the two halves can drift
 * apart silently, and they had. Four cards were running seven hand-picked
 * durations that only agreed with each other on one of them; the reader's last
 * block was still arriving 190ms after its own container had landed.
 *
 * The properties below are the ones that made that possible. They are asserted
 * loosely on purpose — the same way `flight.test.ts` bounds the plane's arc
 * rather than pinning its keyframes — so the motion can be re-tuned freely and
 * only a re-break fails:
 *
 *   - every morph name has the rules its type comment says it needs
 *   - no beat outlives the container it is drawn inside
 *   - nothing arrives on an `ease-in`, which is the one curve UI must not use
 *
 * See `lib/viewTransition.ts` for where `--morph-ms` comes from, and the "View
 * transitions" block in `app/globals.css` for what reads it.
 */

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const helper = readFileSync(join(root, "lib/viewTransition.ts"), "utf8");

/** Every surface that hands a name to a modal plate or to the canvas. */
const MORPH_NAMES = [
  "inspection-frame",
  "design-system-frame",
  "search-frame",
  "about-portrait",
  "colophon-frame",
  "canvas-frame",
] as const;

/** The block this file is about, so a stray `::view-transition` elsewhere in
 *  the sheet cannot satisfy an assertion by accident. */
const block = (() => {
  const start = css.indexOf("View transitions — one law for every morph");
  const end = css.indexOf("@media (prefers-reduced-motion: reduce)", start);
  expect(start, "the view transitions block should still be findable").toBeGreaterThan(-1);
  return css.slice(start, end);
})();

describe("morph names", () => {
  it.each(MORPH_NAMES)("%s is ordered, cropped and cornered", (name) => {
    // Low at rest, lifted only while it is the live one. Without the pair, a
    // card sitting later in the DOM paints over the reader it opened.
    expect(block).toContain(`::view-transition-group(${name})`);
    expect(block).toContain(
      `:root[data-morph="${name}"]::view-transition-group(${name})`,
    );
    // The container crops; the snapshots are never squeezed to fit it.
    expect(block).toContain(`::view-transition-image-pair(${name})`);
    // Both directions are named, or the card is the one that covers on the way
    // out and the reader is the one that scales — which is backwards.
    expect(block).toContain(
      `:root[data-morph-dir="out"]::view-transition-old(${name})`,
    );
    expect(block).toContain(
      `:root[data-morph-dir="out"]::view-transition-new(${name})`,
    );
  });

  it("every StudyMorphName in the content types has rules here", () => {
    const types = readFileSync(join(root, "content/work/types.ts"), "utf8");
    const declared = [
      ...types.matchAll(/^\s*\|?\s*"([a-z-]+-frame)"/gm),
    ].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      expect(MORPH_NAMES, `${name} is declared but not choreographed`).toContain(
        name as (typeof MORPH_NAMES)[number],
      );
    }
  });
});

describe("one clock", () => {
  it("no beat outlives its container", () => {
    /* Every delay and duration in the block is written as a fraction of
       `--morph-ms`. Summing the pairs is what catches the regression this file
       exists for: 250ms of delay plus 460ms of rise against a 520ms group. */
    const fractions = [
      ...block.matchAll(/calc\(var\(--morph-dur\)\s*\*\s*([\d.]+)\)/g),
    ].map((m) => Number(m[1]));
    expect(fractions.length, "expected fractional beats").toBeGreaterThan(4);
    for (const f of fractions) {
      expect(f, "no single beat should exceed the container").toBeLessThanOrEqual(1);
    }

    /* The staggered content is the case that actually broke: its delay and its
       duration are declared apart, so only their sum tells you the truth. */
    const riseDur = /animation: modal-content-rise calc\(var\(--morph-dur\) \* ([\d.]+)\)/.exec(block);
    expect(riseDur, "the content rise should still be a fraction").not.toBeNull();
    const delays = [
      ...block.matchAll(
        /::view-transition-new\(modal-(?:title|body|meta)\)\s*\{\s*animation-delay: calc\(var\(--morph-dur\) \* ([\d.]+)\)/g,
      ),
    ].map((m) => Number(m[1]));
    expect(delays.length, "title, body and meta should each be staggered").toBe(3);
    for (const d of delays) {
      expect(d + Number(riseDur![1])).toBeLessThanOrEqual(1.001);
    }
  });

  it("leaving is shorter than arriving", () => {
    const exit = /\[data-morph-dir="out"\][\s\S]{0,220}?--morph-dur: calc\(var\(--morph-ms\) \* ([\d.]+)\)/.exec(block);
    expect(exit, "the out direction should scale the clock").not.toBeNull();
    expect(Number(exit![1])).toBeLessThan(1);
  });

  it("the helper's clock stays inside the range the CSS is written for", () => {
    const min = /const MIN_MS = (\d+)/.exec(helper);
    const max = /const MAX_MS = (\d+)/.exec(helper);
    expect(min).not.toBeNull();
    expect(max).not.toBeNull();
    expect(Number(min![1])).toBeGreaterThanOrEqual(300);
    expect(Number(max![1])).toBeLessThanOrEqual(900);
    expect(Number(min![1])).toBeLessThan(Number(max![1]));
  });
});

describe("curves", () => {
  it("nothing arrives on an ease-in", () => {
    /* `ease-in` starts slow, which delays the exact moment the visitor is
       watching. It is legitimate on the way *out* — `cubic-bezier(0.32, 0, …)`
       and friends — so this only guards the arrivals. */
    const arrivals = [
      ...block.matchAll(/::view-transition-new\([^)]+\)[^{]*\{([^}]*)\}/g),
    ].map((m) => m[1]);
    expect(arrivals.length).toBeGreaterThan(3);
    for (const body of arrivals) {
      expect(body).not.toMatch(/\bease-in\b/);
      expect(body).not.toMatch(/cubic-bezier\(\s*0?\.[4-9]/);
    }
  });
});
