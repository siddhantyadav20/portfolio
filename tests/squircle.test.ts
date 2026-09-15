import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The squircle fallback guard.
 *
 * THE BUG THIS EXISTS TO STOP COMING BACK. `.squircle` zeroes `border-radius`
 * where there is no `corner-shape`, so that a nine-slice mask can draw the
 * corner instead. The zero was gated on the missing shape alone, which assumed
 * every browser without the shape has the mask. Firefox has neither: it took
 * the zero, dropped the mask as an invalid declaration, and every card on the
 * site rendered with square corners.
 *
 * The rule is that the zero may only apply where its replacement exists. So
 * every `@supports` block in globals.css that zeroes a `.squircle` radius has
 * to require a mask-border feature in its own condition — and the plain
 * `border-radius: var(--sq-r)` has to stay outside any `@supports`, because it
 * is what a browser with neither feature is left holding.
 */

const CSS_PATH = fileURLToPath(new URL("../app/globals.css", import.meta.url));

/**
 * Every `@supports` block, as its condition and its body.
 *
 * A brace counter rather than a parser, like the other CSS guards here — one
 * level of nesting is all globals.css uses, and that is enough to answer "what
 * condition is this rule under".
 */
function supportsBlocks(css: string): { condition: string; body: string }[] {
  const found: { condition: string; body: string }[] = [];
  const re = /@supports\s+([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    found.push({ condition: m[1].replace(/\s+/g, " ").trim(), body: css.slice(re.lastIndex, i - 1) });
  }
  return found;
}

const css = readFileSync(CSS_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** `.squircle { … border-radius: 0 … }`, as a plain single-class rule. */
const ZEROES = /(^|[\s,}])\.squircle\s*\{[^}]*border-radius\s*:\s*0(px)?\s*;/;

describe("the squircle fallback never leaves a corner at zero", () => {
  const zeroing = supportsBlocks(css).filter(({ body }) => ZEROES.test(body));

  it("finds the fallback at all", () => {
    // A rewrite that moves or renames it would otherwise pass by checking nothing.
    expect(zeroing.length).toBeGreaterThan(0);
  });

  it.each(zeroing.map((b) => b.condition))(
    "@supports %s requires a mask-border feature",
    (condition) => {
      expect(
        condition,
        "this block zeroes .squircle's border-radius for a mask to replace, but " +
          "does not require the mask. A browser with neither corner-shape nor " +
          "mask-border (Firefox) takes the zero and renders a square. Add " +
          "`and ((mask-border: none) or (-webkit-mask-box-image: none))`.",
      ).toMatch(/\(\s*(mask-border|-webkit-mask-box-image)\s*:/);
      /* The requirement has to be positive. `not (mask-border: …)` would name
         the feature and still take the zero exactly where the mask is absent. */
      expect(condition).not.toMatch(/not\s*\(\s*(mask-border|-webkit-mask-box-image)\s*:/);
    },
  );

  it("the plain radius sits outside every @supports", () => {
    const supported = supportsBlocks(css)
      .map((b) => b.body)
      .join("\n");
    const bare = css.replace(
      /@supports[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
      "",
    );
    expect(bare).toMatch(/\.squircle\s*\{[^}]*border-radius\s*:\s*var\(--sq-r\)/);
    expect(supported).not.toMatch(/\.squircle\s*\{[^}]*border-radius\s*:\s*var\(--sq-r\)/);
  });
});
