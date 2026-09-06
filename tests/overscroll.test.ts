import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The back-swipe guard.
 *
 * THE BUG THIS EXISTS TO STOP COMING BACK. Two fingers travelling right on a
 * trackpad is how you pan the canvas left, and on macOS it is also how the
 * browser goes back a page. Get it wrong and the gesture that moves the board
 * throws you off it — mid-pan, with no warning, losing wherever you were.
 *
 * It has now been fixed twice. The first fix put `overscroll-behavior: none`
 * on `html[data-canvas]` (globals.css) and reasoned that the viewport is where
 * the browser decides. That is half the story: overscroll chaining starts at
 * the innermost scroll container under the pointer and walks *outward*, so a
 * scroller between the pointer and the root gets to decide first. The canvas
 * surface is one — `overflow: hidden` makes an element a scroll container even
 * though it can never scroll — and so are the terminal's log and the book's
 * spread. Every one of them was at the default `auto`, and handed the gesture
 * straight up the chain.
 *
 * The lesson is not "add another rule". It is that **any scroll container on
 * the canvas is a hole in the fix**, and holes get added by people writing
 * widgets who have no reason to know this. So the rule is checked rather than
 * remembered: declare a scrolling overflow anywhere under `components/canvas`
 * and you must say what happens at its edge.
 *
 * `contain` and `none` both stop chaining, and both stop the navigation
 * gesture — `none` additionally suppresses the local bounce. Either is a
 * deliberate answer; `auto` is the absence of one.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CANVAS = join(ROOT, "components", "canvas");

function stylesheets(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const at = join(dir, name);
    if (statSync(at).isDirectory()) out.push(...stylesheets(at));
    else if (name.endsWith(".css")) out.push(at);
  }
  return out;
}

/**
 * Rule bodies, as `{ ... }` blocks with the selector that opened them.
 *
 * Deliberately crude — a brace matcher, not a parser. These files are hand
 * written and shallow, and a regex that reads one declaration block is enough
 * to answer "does this block set both properties", which is the only question
 * here.
 */
function blocks(css: string): { selector: string; body: string }[] {
  const found: { selector: string; body: string }[] = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    found.push({ selector: m[1].trim(), body: m[2] });
  }
  return found;
}

/**
 * Real scrollers only — `auto` and `scroll`.
 *
 * `overflow: hidden` also makes a scroll container, and that is exactly what
 * made the canvas surface one. It is deliberately NOT swept for here, because
 * once the surface itself stops the chain (asserted by name below) every
 * `hidden` box *inside* it is already covered: the chain walks outward and
 * dies at the surface long before it reaches the viewport. Sweeping for
 * `hidden` flagged ten decorative clips — an avatar cropping its photo, a card
 * clipping a corner — and a guard that asks for a declaration on those is a
 * guard people learn to silence.
 *
 * So this is two checks with two different jobs: the surface, by name, because
 * it is load-bearing; and every real scroller, because those chain on a
 * gesture a reader is actually making and should stop at their own edge.
 */
const SCROLLS = /overflow(-x|-y)?\s*:\s*(auto|scroll)/;

describe("every scroll container on the canvas answers for its edge", () => {
  const files = stylesheets(CANVAS);

  it("finds the canvas stylesheets at all", () => {
    // A rename that empties this directory would otherwise make the whole
    // suite pass by checking nothing.
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => relative(ROOT, f)))("%s", (rel) => {
    const css = readFileSync(join(ROOT, rel), "utf8");

    const holes = blocks(css)
      .filter(({ body }) => SCROLLS.test(body))
      .filter(({ body }) => !/overscroll-behavior/.test(body))
      .map(({ selector }) => selector);

    expect(
      holes,
      `${rel}: these rules scroll but do not declare overscroll-behavior, which ` +
        `is how the canvas's back-swipe bug gets back in. Add ` +
        `\`overscroll-behavior: contain\` (or \`none\`) to each, and see the note ` +
        `in components/canvas/CanvasSurface/CanvasSurface.module.css.`,
    ).toEqual([]);
  });
});

describe("the surface stops the chain where it starts", () => {
  it("CanvasSurface's .surface declares overscroll-behavior", () => {
    const css = readFileSync(
      join(ROOT, "components", "canvas", "CanvasSurface", "CanvasSurface.module.css"),
      "utf8",
    );
    const rule = blocks(css).find(({ selector }) => selector === ".surface");

    expect(rule, "the .surface rule has gone").toBeDefined();
    /* THE ONE THAT ACTUALLY FIXED IT. `overflow: hidden` on this element makes
       it a scroll container that can never scroll, so every gesture on the
       board overscrolls it on the first frame — before JS, and below the rule
       on the root. At `auto` it hands the swipe to the browser. */
    expect(rule!.body).toMatch(/overscroll-behavior\s*:\s*(none|contain)/);
    expect(rule!.body).toMatch(/overflow\s*:\s*hidden/);
  });
});

describe("the viewport-level defence is still in place", () => {
  it("globals.css turns off overscroll while the canvas is up", () => {
    const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
    const rule = blocks(css).find(({ selector }) =>
      selector.includes("[data-canvas]"),
    );

    expect(rule, "the html[data-canvas] rule has gone").toBeDefined();
    expect(rule!.body).toMatch(/overscroll-behavior\s*:\s*none/);
  });

  it("CanvasSurface still sets the attribute that rule keys on", () => {
    const tsx = readFileSync(
      join(ROOT, "components", "canvas", "CanvasSurface", "index.tsx"),
      "utf8",
    );
    expect(tsx).toMatch(/setAttribute\(\s*["']data-canvas["']/);
    expect(tsx).toMatch(/removeAttribute\(\s*["']data-canvas["']/);
  });
});
