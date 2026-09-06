import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* ===========================================================================
   Two stylesheets, one element, one `position`, and no tie-breaker.

   A component owns a class in its own module. A parent passes it another class
   from a different module. Both land on the same element, both are a single
   class, so both are (0,1,0) — and nothing in the cascade decides between them
   except which stylesheet the bundler happened to put second.

   THAT ORDER IS NOT THE SAME IN DEVELOPMENT AND IN PRODUCTION. `next dev`
   serves one <style> per module; a production build concatenates them. So this
   is the specific shape of bug that works perfectly on localhost, passes every
   check, and is wrong the moment it is deployed.

   It has now happened twice. The theme toggle is the one that shipped:
   `app/page.module.css` pins it with `position: absolute` and
   `ThemeToggle.module.css` sets `position: relative` so its sliding thumb has
   something to be absolute against. In dev the page won and the control sat 32
   from the top right corner. In production the component won, the control fell
   back into the flow of the top row, and it rendered seventeen pixels off the
   LEFT edge of the viewport. Nothing errored.

   The fix either way is to stop relying on order: double the class on the rule
   that must win (`.themeToggle.themeToggle`, taking it to (0,2,0)), or delete
   the duplicate where both rules say the same thing anyway.

   This test cannot render CSS — vitest runs in node with no jsdom, by design —
   so it reads the source instead, which is what `tests/breakpoints.test.ts` and
   `tests/cssCollisions.test.ts` also do.
   =========================================================================== */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP = new Set(["node_modules", ".next", ".git"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

/** The CSS module a component imports, and the name it imports it under. */
function ownModule(tsx: string): { alias: string; css: string } | null {
  const m = /import\s+(\w+)\s+from\s+"\.\/([\w.]+\.module\.css)"/.exec(read(tsx));
  if (!m) return null;
  const css = join(dirname(tsx), m[2]);
  return existsSync(css) ? { alias: m[1], css } : null;
}

/**
 * Does this stylesheet set `position` in a rule whose whole selector is one
 * class? Only that shape is at risk — anything more specific already wins, and
 * anything inside `@media`/`@container` is scoped to a case rather than being
 * the base declaration.
 */
function singleClassPosition(css: string, cls: string): boolean {
  const rule = new RegExp(`(?:^|\\})\\s*\\.${cls}\\s*\\{([^}]*)\\}`, "gm");
  for (const m of css.matchAll(rule)) {
    if (/(?:^|[;{\s])position\s*:/.test(m[1])) return true;
  }
  return false;
}

function resolveImport(importer: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? join(ROOT, spec.slice(2))
    : spec.startsWith(".")
      ? normalize(join(dirname(importer), spec))
      : null;
  if (!base) return null;
  for (const c of [`${base}.tsx`, join(base, "index.tsx")]) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** The classes a component puts on its own root, from its own module. */
function rootClasses(tsx: string): string[] {
  const own = ownModule(tsx);
  if (!own) return [];
  const src = read(tsx);
  const at = src.indexOf("return");
  const body = (at >= 0 ? src.slice(at) : src).slice(0, 1500);
  return [...new Set([...body.matchAll(new RegExp(`${own.alias}\\.(\\w+)`, "g"))].map((m) => m[1]))];
}

describe("cross-module position collisions", () => {
  const files = walk(join(ROOT, "app")).concat(walk(join(ROOT, "components")));

  it("finds files to check", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("never leaves `position` to be decided by stylesheet order", () => {
    const collisions: string[] = [];

    for (const tsx of files) {
      const own = ownModule(tsx);
      if (!own) continue;
      const src = read(tsx);
      const css = read(own.css);
      const imports = new Map(
        [...src.matchAll(/import\s+(\w+)\s+from\s+"([^"]+)"/g)].map((m) => [m[1], m[2]]),
      );

      const used = new RegExp(`<([A-Z]\\w+)[^>]*?className=\\{${own.alias}\\.(\\w+)\\}`, "gs");
      for (const m of src.matchAll(used)) {
        const [, component, cls] = m;
        if (!singleClassPosition(css, cls)) continue;

        const target = resolveImport(tsx, imports.get(component) ?? "");
        if (!target) continue;
        const theirs = ownModule(target);
        if (!theirs) continue;
        const theirCss = read(theirs.css);

        for (const rootCls of rootClasses(target)) {
          if (singleClassPosition(theirCss, rootCls)) {
            collisions.push(
              `${relative(ROOT, tsx)}\n` +
                `    <${component} className={styles.${cls}}> — both stylesheets set ` +
                `\`position\` on that one element at (0,1,0):\n` +
                `      .${cls} in ${relative(ROOT, own.css)}\n` +
                `      .${rootCls} in ${relative(ROOT, theirs.css)}`,
            );
            break;
          }
        }
      }
    }

    expect(
      collisions,
      "Only stylesheet order decides these, and that order differs between " +
        "`next dev` and a production build — so this works locally and ships " +
        "broken. Double the class on the rule that must win " +
        "(`.foo.foo`), or delete the duplicate if both say the same thing.\n\n  " +
        collisions.join("\n  "),
    ).toEqual([]);
  });
});
