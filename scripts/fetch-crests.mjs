#!/usr/bin/env node
/**
 * Pull the twenty Premier League club crests into `public/media/crests/`.
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

/** `short_name` lowercased is the filename, so `lib/fantasy.ts` can build the
 *  path from the API response without a lookup table to keep in step. */
const slug = (team) => team.short_name.toLowerCase();

async function main() {
  await mkdir(OUT, { recursive: true });

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

    const png = await sharp(source)
      .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, quality: 90, effort: 10 })
      .toBuffer();

    const file = `${slug(team)}.png`;
    await writeFile(join(OUT, file), png);
    bytes += png.length;
    console.log(`  ok  ${file.padEnd(12)} ${team.name}${variant}`);
  }

  console.log(`\n${teams.length} crests, ${(bytes / 1024).toFixed(0)}KB total.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
