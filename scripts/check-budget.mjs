#!/usr/bin/env node
/**
 * Fail the build when the site gets heavier than it is allowed to be.
 *
 * WHY THIS AND NOT LIGHTHOUSE CI
 *
 * `app/vitals.tsx` already measures Core Web Vitals on real visits, which is
 * the answer rather than a hypothesis — a synthetic run on a wired connection
 * is least likely to catch exactly the heavy things on this site. What real
 * user monitoring cannot do is *stop* a regression: it reports one after
 * strangers have already paid for it.
 *
 * So this is the other half, and it is deliberately narrow. It checks the two
 * numbers that actually move here:
 *
 *   1. The JavaScript the homepage ships. The whole architecture is a server
 *      component with a few client islands, and the way that erodes is one
 *      island at a time, invisibly.
 *
 *   2. Every file in `public/`. This is the one that has already happened: 35MB
 *      of full-length audio, an 8.7MB video and a 2.1MB GIF all landed in the
 *      repo without anything objecting. A budget would have objected.
 *
 * Run after `next build`, which is where the numbers come from.
 *
 *   node scripts/check-budget.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The budgets.
 *
 * Set a little above where the site sits today, not at a round number — a
 * budget with no headroom fails on noise and gets raised until it means
 * nothing, and one with too much never fires. Raise these deliberately, in a
 * commit that says what bought the increase.
 */
const BUDGET = {
  /**
   * The homepage's client JavaScript, in KB, uncompressed — the same basis
   * Next's own build table uses, minus the one chunk that basis over-counts.
   *
   * It sits at 428KB today, of which about 379KB is the React and Next
   * runtime, so the part this site actually wrote is around 50KB and the
   * headroom below is for that part.
   *
   * WHAT IS NOT IN THIS NUMBER, AND WHY
   *
   * Next also emits a ~110KB polyfill chunk, and this check used to add it in
   * — which made the reported figure 538KB and the headroom mean much less
   * than it looked. No visitor pays it. The chunk is linked with `noModule`,
   * so every browser that understands `<script type="module">` skips it, and
   * Next's default browserslist target is already Chrome/Edge/Firefox 111 and
   * Safari 16.4. It exists for browsers this site does not have.
   *
   * That is the same reasoning `homepageJsBytes` already applies when it
   * deduplicates a chunk shared between the layout and the page: report the
   * number a real visitor is charged, not the number the build produced. It is
   * still measured and still printed, on its own line, so it cannot grow
   * unwatched — it just does not eat this budget.
   */
  homepageJs: 480,
  /** The largest single file allowed in `public/`, in KB. */
  asset: 1200,
  /**
   * Everything in `public/` together, in MB. 22.1MB today.
   *
   * This should come down rather than up: 8.7MB of it is the prototype
   * recording and 2.1MB the waitlist GIF, both of which want re-encoding and
   * are only waiting on a machine with ffmpeg. Lower this to about 12 once
   * they are done.
   */
  publicTotal: 24,
};

/** Files that are allowed to be over `asset`, and why. Anything not on this
 *  list has to fit the budget or earn a line here. */
const ALLOWED_LARGE = {
  "media/inspection-prototype.mp4":
    "The prototype recording, 8.7MB. Loads on hover-intent only, never on " +
    "page load. Needs re-encoding — see the note in CONTENT-INTAKE.md; it " +
    "wants ffmpeg, which this machine does not have.",
  "media/waitlist-success.gif":
    "2.1MB, and only ever requested after somebody has actually joined the " +
    "waitlist. Wants to become a looping muted <video>, same blocker.",
};

const KB = 1024;
const MB = 1024 * 1024;
const failures = [];
const notes = [];

/* --- 1. The homepage's JavaScript ------------------------------------------
   Read off the build manifests rather than the terminal output, so this works
   in CI where nobody is reading a table. */

function homepageJsBytes() {
  const dir = join(ROOT, ".next");
  if (!existsSync(dir)) {
    failures.push("No .next directory — run `next build` first.");
    return null;
  }

  /* Turbopack writes a build manifest per route rather than the single
     `app-build-manifest.json` the webpack builder produced. The homepage's
     lives here, and `rootMainFiles` is what the document actually links. */
  const manifestPath = join(dir, "server", "app", "page", "build-manifest.json");
  if (!existsSync(manifestPath)) {
    failures.push(
      "No build manifest for `/` at .next/server/app/page/build-manifest.json. " +
        "Next's layout changed — this check needs updating rather than " +
        "skipping, so it fails loudly instead of passing quietly.",
    );
    return null;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const modern = manifest.rootMainFiles ?? [];
  const polyfill = manifest.polyfillFiles ?? [];
  if (modern.length === 0) {
    failures.push("The homepage's build manifest lists no chunks.");
    return null;
  }

  // Deduplicated: a chunk shared between the layout and the page is downloaded
  // once, so counting it twice would report a number no visitor ever pays.
  const bytes = (files) => {
    let total = 0;
    for (const file of new Set(files)) {
      const at = join(dir, file);
      if (existsSync(at)) total += statSync(at).size;
    }
    return total;
  };

  return { modern: bytes(modern), polyfill: bytes(polyfill) };
}

const js = homepageJsBytes();
if (js !== null) {
  const kb = js.modern / KB;
  const line = `homepage JS   ${kb.toFixed(0)}KB / ${BUDGET.homepageJs}KB`;
  if (kb > BUDGET.homepageJs) failures.push(line);
  else notes.push(line);

  /* Printed, not budgeted — see BUDGET.homepageJs. Nobody downloads it, but a
     silent number is one nobody notices doubling. */
  if (js.polyfill > 0) {
    notes.push(
      `polyfills     ${(js.polyfill / KB).toFixed(0)}KB (noModule — not sent to any supported browser)`,
    );
  }
}

/* --- 2. Everything the browser can fetch ----------------------------------- */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const at = join(dir, entry.name);
    if (entry.isDirectory()) walk(at, out);
    else out.push(at);
  }
  return out;
}

const publicDir = join(ROOT, "public");
if (existsSync(publicDir)) {
  const files = walk(publicDir).map((at) => ({
    path: relative(publicDir, at),
    size: statSync(at).size,
  }));

  const total = files.reduce((n, f) => n + f.size, 0);
  const totalLine = `public/       ${(total / MB).toFixed(1)}MB / ${
    BUDGET.publicTotal
  }MB`;
  if (total / MB > BUDGET.publicTotal) failures.push(totalLine);
  else notes.push(totalLine);

  for (const file of files.sort((a, b) => b.size - a.size)) {
    if (file.size / KB <= BUDGET.asset) break; // sorted, so nothing else is over
    if (file.path in ALLOWED_LARGE) {
      notes.push(
        `allowed       ${file.path} (${(file.size / MB).toFixed(1)}MB)`,
      );
      continue;
    }
    failures.push(
      `${file.path} is ${(file.size / KB).toFixed(0)}KB, over the ${
        BUDGET.asset
      }KB per-asset budget. Shrink it, or add it to ALLOWED_LARGE in ` +
        `scripts/check-budget.mjs with a reason.`,
    );
  }
}

/* --- Report ---------------------------------------------------------------- */

for (const note of notes) console.log(`  ok    ${note}`);

if (failures.length > 0) {
  console.error("\nOver budget:\n");
  for (const failure of failures) console.error(`  FAIL  ${failure}`);
  console.error("");
  process.exit(1);
}

console.log("\nWithin budget.\n");
