#!/usr/bin/env node
/**
 * Pull the twenty Premier League club crests into `public/media/crests/`, and
 * a dark-theme set beside them in `public/media/crests/dark/`.
 *
 * WHY THESE ARE LOCAL FILES AND NOT HOTLINKS
 *
 * The Fantasy card shows whichever fixture is next, so it needs all twenty
 * crests available, not the two the design happened to draw. The obvious
 * shortcut is to point `<img src>` straight at the Premier League's own CDN
 * and be done — and every other asset on this site is local, the budget script
 * counts `public/` precisely because assets are the thing that gets away from
 * you here, and a portfolio that renders a broken image the day someone else's
 * CDN changes a path is worse than one that ships 300KB it controls. Only two
 * of these are ever requested by a visitor.
 *
 * WHY IT IS A SCRIPT AND NOT A ONE-OFF
 *
 * Three clubs go down and three come up every May, so this set has a shelf
 * life of one season. Re-run it against the new `bootstrap-static` and the
 * files rename themselves off the API's own short codes.
 *
 *   node scripts/fetch-crests.mjs
 *
 * Sourced at 200px and written at 192, which is the size the card draws at 64
 * with enough left for a 2x screen at the widest the page scales to (`--u`
 * reaches 1.78 at 2560, so 64 becomes 114 CSS px and 228 device px — the one
 * place this set is a hair soft, and a fair trade against doubling its
 * weight). Quantised to a palette: these are flat-fill vector artwork
 * rasterised, which is the case PNG-8 is good at.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "media", "crests");
const OUT_DARK = join(OUT, "dark");

const BOOTSTRAP = "https://fantasy.premierleague.com/api/bootstrap-static/";

/** The Premier League's own badge CDN, keyed by the FPL team `code` — which is
 *  a stable club id, unlike `id`, which is just this season's alphabetical
 *  position and shuffles every August. */
const BADGE = (code) => `https://resources.premierleague.com/premierleague/badges/t${code}.png`;

/**
 * The reversed badge, where the league publishes one.
 *
 * A handful of clubs' default badge is a single-colour *white* silhouette,
 * meant to be laid on the club's own colour. Liverpool's is the case that
 * caught this: a white Liver bird on transparent, invisible on the light card,
 * and perfectly fine in the dark theme — so it looked correct in exactly the
 * half of the site it was checked in. `rb` is the light-ground version, and it
 * exists for those clubs and 403s for everyone else.
 */
const BADGE_REVERSED = (code) =>
  `https://resources.premierleague.com/premierleague/badges/rb/t${code}.png`;

const SIZE = 192;

/**
 * Mean luminance over the opaque pixels — how light the artwork itself is,
 * ignoring the transparent surround.
 *
 * Used to choose between the two variants above rather than keeping a list of
 * which clubs need which. A list would be three names today and wrong the
 * first time the league re-issues a badge; this asks the picture.
 */
async function meanLuminance(buffer) {
  const { data } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // transparent surround
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n === 0 ? 255 : sum / n;
}

/** Above this the badge is essentially white and will vanish on the light
 *  card. Liverpool's default measures 255 — the whole mark is one colour —
 *  and the next lightest in the league is 178, so there is a lot of room
 *  between "light crest" and "no crest". */
const TOO_LIGHT = 200;

/* --- The dark set --------------------------------------------------------

   EVERY LEAGUE BADGE CARRIES A WHITE KEYLINE — a stroke around the outside of
   the artwork so it holds on any photograph or kit colour. On the light card
   it is invisible, white on near-white. On the dark card it is a hard white
   ring round every crest, the brightest thing on the card, and it makes the
   badges look like stickers. The league's newer `premierleague25` set has the
   same stroke, so there is no cleaner source to switch to.

   So the dark set strips it: a flood fill from the transparent surround
   through near-white, unsaturated pixels, clearing everything it reaches.
   Because it starts outside and stops at the first coloured pixel, white that
   belongs to the badge — Fulham's shield, City's roundel, Brighton's ring —
   is behind a coloured edge and survives. */

/** Near-white and nearly grey: the keyline and its anti-aliasing, and not a
 *  pale yellow or a sky blue, which are artwork. */
function isKeyline(r, g, b, a) {
  if (a < 32) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min > 170 && max - min < 40;
}

async function stripKeyline(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const cleared = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);

  while (queue.length) {
    const p = queue.pop();
    if (cleared[p]) continue;
    const i = p * 4;
    if (!isKeyline(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
    cleared[p] = 1;
    data[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < w - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - w);
    if (y < h - 1) queue.push(p + w);
  }

  /* The stroke's inner anti-aliasing is a blend of white and the badge's own
     edge colour — too coloured to be caught above, and a pale fringe on dark if
     left. One pixel of it, where it is still light, goes to half alpha. */
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (cleared[p] || data[i + 3] === 0) continue;
    const x = p % w;
    const y = (p / w) | 0;
    const onEdge =
      (x > 0 && cleared[p - 1]) ||
      (x < w - 1 && cleared[p + 1]) ||
      (y > 0 && cleared[p - w]) ||
      (y < h - 1 && cleared[p + w]);
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (onEdge && lum > 120) data[i + 3] >>= 1;
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** WCAG relative luminance, 0–1. */
function relLum(r, g, b) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** The dark card, #222222. */
const GROUND = relLum(0x22, 0x22, 0x22);

/**
 * The share of the artwork that all but disappears on the dark card — opaque
 * pixels under 1.5:1 against #222.
 *
 * Not mean luminance, which is what the light-side check uses and which cannot
 * tell these apart: Spurs' navy and Liverpool's red measure 37 and 42, and one
 * vanishes on #222 while the other reads perfectly well. Contrast is the
 * question actually being asked.
 */
async function sinkOnDark(buffer) {
  const { data } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sunk = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const l = relLum(data[i], data[i + 1], data[i + 2]);
    const contrast = (Math.max(l, GROUND) + 0.05) / (Math.min(l, GROUND) + 0.05);
    if (contrast < 1.5) sunk += 1;
    n += 1;
  }
  return n === 0 ? 1 : sunk / n;
}

/** Past this share, the keyline is the only thing outlining the badge on dark,
 *  and it stays. Spurs' navy cockerel is the case — without its stroke it is a
 *  shape you have to look for. */
const TOO_DARK = 0.5;

/** `short_name` lowercased is the filename, so `lib/fantasy.ts` can build the
 *  path from the API response without a lookup table to keep in step. */
const slug = (team) => team.short_name.toLowerCase();

function toPng(buffer) {
  return sharp(buffer)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, quality: 90, effort: 10 })
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DARK, { recursive: true });

  const res = await fetch(BOOTSTRAP, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`bootstrap-static: ${res.status}`);
  const { teams } = await res.json();

  let bytes = 0;
  for (const team of teams) {
    const badge = await fetch(BADGE(team.code));
    if (!badge.ok) {
      console.error(`  !!  ${team.name} (code ${team.code}): ${badge.status}`);
      continue;
    }

    let source = Buffer.from(await badge.arrayBuffer());
    let variant = "";

    /* Only asked for when the default is unusable, so this is one extra
       request for the two or three clubs that need it rather than forty. */
    if ((await meanLuminance(source)) > TOO_LIGHT) {
      const reversed = await fetch(BADGE_REVERSED(team.code));
      if (reversed.ok) {
        const alt = Buffer.from(await reversed.arrayBuffer());
        if ((await meanLuminance(alt)) <= TOO_LIGHT) {
          source = alt;
          variant = " (reversed — the default is white)";
        }
      }
      if (!variant) {
        console.error(
          `  !!  ${team.name}: the badge is near-white and the league ` +
            `publishes no reversed one. It will not read on the light card.`,
        );
      }
    }

    const stripped = await stripKeyline(source);
    const sunk = await sinkOnDark(stripped);
    const keepKeyline = sunk > TOO_DARK;

    const file = `${slug(team)}.png`;
    const png = await toPng(source);
    const dark = await toPng(keepKeyline ? source : stripped);
    await writeFile(join(OUT, file), png);
    await writeFile(join(OUT_DARK, file), dark);
    bytes += png.length + dark.length;

    const note = keepKeyline
      ? `dark keeps the keyline — ${Math.round(sunk * 100)}% sinks into #222 without it`
      : `dark keyline stripped (${Math.round(sunk * 100)}% sunk)`;
    console.log(`  ok  ${file.padEnd(12)} ${team.name}${variant}; ${note}`);
  }

  console.log(`\n${teams.length} crests x 2, ${(bytes / 1024).toFixed(0)}KB total.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
