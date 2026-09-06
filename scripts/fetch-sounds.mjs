#!/usr/bin/env node
/**
 * Find and download candidate recordings, without an account.
 *
 *   node scripts/fetch-sounds.mjs             every cue
 *   node scripts/fetch-sounds.mjs book-page   one cue
 *
 * WHERE THESE COME FROM, AND WHY IT IS ALLOWED
 *
 * Freesound's search page is public HTML and its preview files are on a public
 * CDN — the same two things any visitor's browser fetches. No key, no account,
 * no scraping of anything behind a login.
 *
 * Every search below is filtered to CREATIVE COMMONS ZERO. That is the whole
 * licensing story: CC0 is a dedication to the public domain, so there is no
 * attribution to carry, no licence file to ship, and no question about a
 * portfolio being commercial. Sounds under CC-BY are deliberately excluded
 * even though they are usually better recorded — an attribution requirement on
 * a UI cue is a footnote nobody will maintain, and an unmaintained attribution
 * is a licence violation waiting to happen.
 *
 * The `-hq` preview is 48kHz stereo at around 150kbps. That is a transcode,
 * and for a 100ms cue that will be downsampled to 32kHz mono and re-encoded at
 * 96k anyway, the generation loss is inaudible — well under what the trim and
 * the normalise do to it.
 *
 * THE QUERIES ARE THE DESIGN. Each cue's terms come from the reference work:
 * what object the sound is a picture of, and what it is not. `photo-slip` asks
 * for dealt cards and sliding paper rather than "photo", because no app makes
 * a photo noise and the reference is the physical print.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "samples-src");

/** Candidates kept per cue. Enough to choose from, few enough to audition. */
const KEEP = 5;

/**
 * What to search for, per cue, and how long the result may be.
 *
 * `seconds` is an upper bound sent to the search itself rather than a filter
 * applied afterwards. A thirty-second field recording of a library will match
 * "page turn" and be useless: the cue needed is one contact, and a file that
 * long is a session that would have to be hunted through by ear.
 */
const WANTED = {
  "scratch-rub": { queries: ["sandpaper", "rubbing paper", "scratching paper", "scratch card", "eraser rubbing", "friction paper"], seconds: 15 },
  "scratch-body": { queries: ["cardboard", "card bend", "cardboard box hit", "carton"], seconds: 6 },
  "scratch-peel": { queries: ["peel", "sticker peel", "tape peel", "foil"], seconds: 5 },

  // Not "photo": no app makes a photo sound. The object is a print sliding.
  "photo-slip": { queries: ["playing card deal", "card slide", "paper slide single"], seconds: 4 },
  "photo-settle": { queries: ["card deck tap", "papers tap desk", "stack papers"], seconds: 4 },

  "book-page": { queries: ["page turn", "book page single", "turning page paper"], seconds: 6 },
  "book-riffle-open": { queries: ["book riffle", "flip through book", "pages flutter"], seconds: 6 },
  "book-riffle-close": { queries: ["book close", "close book thud"], seconds: 6 },
  "book-boards": { queries: ["hardcover book close", "book drop"], seconds: 4 },

  "sticker-rifle": { queries: ["rifle shot", "gunshot single", "assault rifle shot"], seconds: 6 },
  "sticker-rocket": { queries: ["rocket engine", "rocket launch", "jet engine roar", "thruster", "flame thrower whoosh"], seconds: 10 },
  "sticker-kick": { queries: ["football kick", "soccer ball kick", "ball impact"], seconds: 4 },
  "sticker-punch": { queries: ["punch impact", "body punch", "fist hit"], seconds: 4 },

  "key-press": { queries: ["keyboard key press", "mechanical keyboard single", "typewriter key"], seconds: 4 },
  "key-enter": { queries: ["keyboard enter key", "spacebar press"], seconds: 4 },
  "printer-run": { queries: ["receipt printer", "thermal printer", "dot matrix printer"], seconds: 8 },
  "pencil-draw": { queries: ["pencil writing paper", "graphite drawing"], seconds: 12 },
  "needle-drop": { queries: ["vinyl needle drop", "turntable stylus"], seconds: 6 },
  "needle-lift": { queries: ["record player stop", "turntable stop", "vinyl stop", "record scratch stop", "stylus"], seconds: 6 },

  "jet-pass": { queries: ["jet engine loop", "aircraft engine idle", "turbine loop", "airplane engine interior"], seconds: 20 },
};

const AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";

function get(url) {
  return execFileSync("curl", ["-sSL", "--max-time", "40", "-A", AGENT, url], {
    maxBuffer: 1 << 28,
    encoding: "utf8",
  });
}

/** Pull the player blocks out of a search page. Everything needed is on the
 *  element as data attributes — id, title, duration, and the preview URL. */
function parse(html) {
  const out = [];
  for (const block of html.split('class="bw-player"').slice(1)) {
    const head = block.slice(0, 2600);
    const attr = (name) => head.match(new RegExp(`data-${name}="([^"]*)"`))?.[1] ?? null;

    const lq = attr("mp3");
    const id = attr("sound-id");
    if (!lq || !id) continue;

    out.push({
      id,
      title: attr("title") ?? "",
      user: attr("username") ?? "",
      seconds: Number(attr("duration") ?? 0),
      rate: Number(attr("samplerate") ?? 0),
      downloads: Number(attr("num-downloads") ?? 0),
      // The page embeds the low-quality preview; the high-quality one is the
      // same URL. 48kHz stereo rather than 24kHz.
      url: lq.replace("-lq.mp3", "-hq.mp3"),
      page: `https://freesound.org/s/${id}/`,
    });
  }
  return out;
}

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const cues = Object.keys(WANTED).filter((c) => only.length === 0 || only.includes(c));

if (cues.length === 0) {
  console.error(`Unknown cue. Known: ${Object.keys(WANTED).join(", ")}`);
  process.exit(1);
}

for (const cue of cues) {
  const { queries, seconds } = WANTED[cue];
  const seen = new Map();

  for (const query of queries) {
    const filter = encodeURIComponent(`license:"Creative Commons 0" duration:[0 TO ${seconds}]`);
    const url = `https://freesound.org/search/?q=${encodeURIComponent(query)}&f=${filter}&s=score+desc`;

    let found = [];
    try {
      found = parse(get(url));
    } catch {
      console.log(`  ${cue}: search failed for "${query}"`);
      continue;
    }
    for (const hit of found) if (!seen.has(hit.id)) seen.set(hit.id, { ...hit, query });
  }

  /* Ranked by downloads. A blunt proxy, and the right one available here: it
     is a vote by thousands of people who could hear the file, which is exactly
     the judgement this end of the pipeline cannot make for itself. */
  const ranked = [...seen.values()].sort((a, b) => b.downloads - a.downloads).slice(0, KEEP);

  if (ranked.length === 0) {
    console.log(`  ${cue}: nothing found`);
    continue;
  }

  const dir = join(DEST, cue);
  mkdirSync(dir, { recursive: true });

  const kept = [];
  for (const hit of ranked) {
    const file = `${hit.id}.mp3`;
    const path = join(dir, file);
    if (!existsSync(path)) {
      try {
        execFileSync("curl", ["-sSL", "--max-time", "60", "-A", AGENT, hit.url, "-o", path]);
      } catch {
        console.log(`  ${cue}: download failed for ${hit.id}`);
        continue;
      }
    }
    kept.push({ file, ...hit });
  }

  /* Provenance, even though CC0 requires none. Six months from now the only
     way to answer "where did this come from and may we keep using it" is a
     record written when it was fetched. */
  writeFileSync(join(dir, "candidates.json"), `${JSON.stringify(kept, null, 2)}\n`);

  console.log(`  ${cue.padEnd(20)} ${String(kept.length).padStart(2)} candidates`);
  for (const k of kept) {
    console.log(`      ${k.id.padEnd(8)} ${k.seconds.toFixed(1).padStart(5)}s  ${String(k.downloads).padStart(6)} dl  ${k.title.slice(0, 46)}`);
  }
}

console.log(`\n  Downloaded to samples-src/ (git-ignored).`);
console.log(`  Next: node scripts/audition.mjs — measures every candidate against what the cue needs.`);
