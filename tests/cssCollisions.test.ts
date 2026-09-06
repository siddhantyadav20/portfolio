import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * One class name, one meaning, per stylesheet.
 *
 * THE BUG THIS EXISTS TO STOP, WHICH HAS NOW HAPPENED TWICE.
 *
 * A CSS Module scopes class names to their file, which is the point of it —
 * and it means the *only* namespace a name has to be unique in is that file.
 * Reuse one for a second thing and both sets of rules apply to both elements,
 * with source order deciding the conflicts. Nothing errors. Nothing warns.
 *
 *   MusicPlayer: `.track` was the song title, and a playhead track was added
 *   under the same name.
 *
 *   StoreWaitlist: `.mark` was the "+" glyph in the Join pill, and the success
 *   animation's wrapper was added under the same name — so a `position:
 *   relative` 20px chip inherited `position: absolute`, `inset: 0`, `opacity:
 *   0` and an entry animation, and the pill's plus arrived visibly broken in
 *   the card's resting state.
 *
 * Both were caught by eye, late, after being shipped into review. This catches
 * them at the point they are written.
 *
 * WHAT IT CHECKS. A class selector that appears in more than one *rule block*
 * is completely normal — a base rule plus a media-query override plus a theme
 * override is three blocks and one meaning. What is not normal is one name
 * declaring two different layout roles, and the reliable signal for that is a
 * name being given `position` twice with different values in blocks that are
 * not inside a media query. That is narrow on purpose: a guard that fires on
 * ordinary overrides is a guard people delete.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function stylesheets(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const at = join(dir, name);
    if (statSync(at).isDirectory()) stylesheets(at, out);
    else if (name.endsWith(".module.css")) out.push(at);
  }
  return out;
}

/** Strip comments, then split into `selector { body }` pairs, remembering
 *  whether each was inside an at-rule (a media/supports override). */
function blocks(css: string) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: { selector: string; body: string; nested: boolean }[] = [];
  const re = /(@[^{]+\{)|([^{}]+)\{([^{}]*)\}|\}/g;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    if (m[1]) { depth += 1; continue; }
    if (m[0] === "}") { depth = Math.max(0, depth - 1); continue; }
    if (m[2] !== undefined) {
      found.push({ selector: m[2].trim(), body: m[3], nested: depth > 0 });
    }
  }
  return found;
}

/** The bare local class names a selector targets — `.a .b` is two; `:global`
 *  is ignored. */
function classesIn(selector: string): string[] {
  const withoutGlobal = selector.replace(/:global\([^)]*\)/g, " ");
  return [...withoutGlobal.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
}

/**
 * Whether a selector positions a *pseudo-element* rather than the class.
 *
 * `.mark::before { position: absolute }` says nothing about `.mark` — the
 * pseudo is the thing being placed, and attributing its `position` to the
 * class made this guard report every icon on the site.
 */
function targetsPseudo(selector: string): boolean {
  return /::(before|after|first-line|first-letter|placeholder|selection|marker|backdrop)/.test(
    selector,
  );
}

describe("a class name means one thing per stylesheet", () => {
  const files = stylesheets(ROOT);

  it("finds the stylesheets", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((f) => relative(ROOT, f)))("%s", (rel) => {
    const found = blocks(readFileSync(join(ROOT, rel), "utf8"));

    /** name -> the distinct `position` values it declares outside an at-rule. */
    const positions = new Map<string, Set<string>>();

    for (const { selector, body, nested } of found) {
      if (nested) continue;
      const pos = /(?:^|;|\s)position\s*:\s*([a-z-]+)/.exec(body);
      if (!pos) continue;

      /* A SELECTOR LIST IS N SELECTORS, and splitting it is load-bearing:
         `.mark, .joinMark { position: relative }` positions *both*. Reading
         the whole thing as one selector and taking its last class credited
         only `.joinMark`, which is why the first version of this guard passed
         the exact collision it was written for. */
      for (const one of selector.split(",")) {
        if (targetsPseudo(one)) continue;

        // Only the subject — the last class — is the thing being positioned;
        // ancestors in a descendant selector are not.
        const names = classesIn(one);
        const subject = names[names.length - 1];
        if (!subject) continue;

        if (!positions.has(subject)) positions.set(subject, new Set());
        positions.get(subject)!.add(pos[1]);
      }
    }

    const clashes = [...positions]
      .filter(([, values]) => values.size > 1)
      .map(([name, values]) => `.${name} is positioned ${[...values].join(" and ")}`);

    expect(
      clashes,
      `${rel}: one class name is being used for two different things. A CSS ` +
        `Module scopes names to the file, so the file is the whole namespace — ` +
        `reusing one silently applies both sets of rules to both elements. ` +
        `Rename one of them.`,
    ).toEqual([]);
  });
});
