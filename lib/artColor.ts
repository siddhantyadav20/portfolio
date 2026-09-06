import { inflateSync } from "node:zlib";

import { GRAPHIC_TARGET, toneFor } from "@/lib/clubColor";

/* ===========================================================================
   The colour of a record, taken off its sleeve.

   The card's play button, its filled thumb and the ring that bursts out of it
   are all one accent, and that accent belongs to whatever is playing — a red
   room on The New Abnormal makes a red button. That means reading a pixel out
   of a remote JPEG on the server, which sounds like a job for an image
   library and is not.

   WHY NOT `sharp`. It is already on disk — Next lists it under
   `optionalDependencies` — and importing it would work today on this machine.
   It is not in this project's `package.json`, so nothing pins it and nothing
   declares it: `npm ci --omit=optional`, a runner with no prebuilt binary for
   its libc, or Next dropping the dependency, each break the build with no
   warning at review time. Declaring it honestly means owning about thirty
   megabytes of native dependency in order to average two hundred and fifty-six
   pixels. So: no dependency at all.

   WHAT MAKES THAT CHEAP. mzstatic serves any size off the same path, and the
   16x16 rendition is a 1.5KB PNG. PNG is inflate plus five subtraction
   filters — seventy lines, all of it in `node:zlib` and arithmetic — where a
   JPEG would be a discrete cosine transform and a genuine argument for a
   library. The image is fetched small and in the one format that can be read
   without one.
   =========================================================================== */

const TIMEOUT_MS = 4000;

/** A week. A sleeve's colours do not change. */
const REVALIDATE = 604_800;

/**
 * What the accent has to be legible against.
 *
 * White in both, and the dark one is not a mistake. The accent's job on this
 * card is to be a disc with a white mark on it — the pause bars and the
 * progress ring, `--player-on`, which is white in both themes. So the binding
 * constraint in dark mode is the MARK, not the card.
 *
 * Clamping to the mark covers the card for free, and the arithmetic is worth
 * writing down because it is the whole reason one target does both jobs. A
 * colour that clears 3:1 against white has a relative luminance of at most
 * 0.3; the dark card is #222222 at 0.0156; and (0.3 + 0.05) / (0.0156 + 0.05)
 * is 5.3:1. Any accent legible under a white ring is therefore comfortably
 * visible on the card it sits on, with room to spare.
 *
 * Doing it the other way round does not work, which is what this replaces:
 * clamped against the dark card, the accents came out light — and white on a
 * light accent is invisible. Measured on real sleeves, white against the dark
 * accent ran 2.1:1 for a sand-coloured cover and 2.6:1 for a pale blue one,
 * both under the 3:1 a graphical element is held to.
 *
 * Deliberately not `LIGHT_GROUND` / `DARK_GROUND` from `lib/clubColor.ts` —
 * those are the *glass* grounds, and this card is `surface="glass"` over a
 * solid one.
 */
const LIGHT_CARD = "#ffffff";
const MARK = "#ffffff";

export type Accent = { accent: string; accentDark: string };

/* --- PNG -------------------------------------------------------------------- */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** How many bytes one pixel occupies, per PNG colour type. Index 1 and 5 do
 *  not exist in the format, hence the zeroes. */
const CHANNELS = [1, 0, 3, 1, 2, 0, 4];

export type Pixels = { width: number; height: number; rgb: Uint8Array };

/**
 * Decode an 8-bit, non-interlaced PNG to packed RGB.
 *
 * Returns null rather than throwing for anything outside that: a 16-bit or
 * interlaced sleeve is a reason to fall back to site orange, not a reason for
 * a page to fail to render. Every branch that gives up is a colour the card
 * simply does not get.
 */
export function decodePng(buf: Uint8Array): Pixels | null {
  if (buf.length < 8) return null;
  for (let i = 0; i < 8; i++) if (buf[i] !== SIGNATURE[i]) return null;

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let at = 8;

  let width = 0;
  let height = 0;
  let depth = 0;
  let colour = -1;
  let palette: Uint8Array | null = null;
  const idat: Uint8Array[] = [];

  /* 4 length + 4 type + data + 4 CRC. The CRC is skipped rather than checked:
     the transport already checksums, and a corrupt sleeve costs an accent. */
  while (at + 8 <= buf.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(buf[at + 4], buf[at + 5], buf[at + 6], buf[at + 7]);
    const body = at + 8;
    if (body + length > buf.length) return null;

    if (type === "IHDR") {
      width = view.getUint32(body);
      height = view.getUint32(body + 4);
      depth = buf[body + 8];
      colour = buf[body + 9];
      /* Byte 12 is the interlace method. Adam7 rearranges the whole image into
         seven passes, which is a second decoder for a case mzstatic does not
         produce. */
      if (buf[body + 12] !== 0) return null;
    } else if (type === "PLTE") {
      palette = buf.subarray(body, body + length);
    } else if (type === "IDAT") {
      idat.push(buf.subarray(body, body + length));
    } else if (type === "IEND") {
      break;
    }

    at = body + length + 4;
  }

  if (depth !== 8 || width <= 0 || height <= 0) return null;
  const channels = CHANNELS[colour] ?? 0;
  if (channels === 0) return null;
  if (colour === 3 && !palette) return null;
  if (idat.length === 0) return null;

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat.map((c) => Buffer.from(c))));
  } catch {
    return null;
  }

  const stride = width * channels;
  if (raw.length < height * (stride + 1)) return null;

  /* Unfilter in place. Each scanline is prefixed by its filter type and is
     expressed as a difference from the pixel to its left (a), the one above
     (b), and the one above-left (c) — so this has to run top to bottom and
     left to right, and `line` is the already-reconstructed previous row. */
  const out = new Uint8Array(height * stride);
  let prev = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const line = new Uint8Array(stride);

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let value = src[i];

      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) value += paeth(a, b, c);
      else if (filter !== 0) return null;

      line[i] = value & 0xff;
    }

    out.set(line, y * stride);
    prev = line;
  }

  /* Everything becomes RGB. Alpha is dropped rather than composited: these are
     opaque album sleeves, and a sleeve that did carry transparency would
     composite onto a card colour this file has no business knowing. */
  const rgb = new Uint8Array(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    const s = p * channels;
    const d = p * 3;
    if (colour === 0 || colour === 4) {
      rgb[d] = rgb[d + 1] = rgb[d + 2] = out[s];
    } else if (colour === 3) {
      const e = out[s] * 3;
      rgb[d] = palette![e];
      rgb[d + 1] = palette![e + 1];
      rgb[d + 2] = palette![e + 2];
    } else {
      rgb[d] = out[s];
      rgb[d + 1] = out[s + 1];
      rgb[d + 2] = out[s + 2];
    }
  }

  return { width, height, rgb };
}

/** The PNG predictor: whichever of the three neighbours the linear estimate
 *  a + b - c lands nearest to. */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/* --- Picking one colour ------------------------------------------------------ */

/** Twelve buckets of thirty degrees. Fine enough to keep red apart from
 *  orange, coarse enough that one sleeve's shading stays in one bucket. */
const HUES = 12;

/**
 * Below this the pixel is a grey, and a grey accent is not an accent.
 *
 * Two floors rather than one, because a single strict floor threw away four
 * sleeves in ten: Adele's `21` and Keane's `Hopes and Fears` are sepia and
 * wash, which is a colour scheme even though it is a quiet one, and both came
 * back with nothing. The strict pass runs first so a vivid sleeve is decided
 * by its vivid pixels; the relaxed pass only ever sees images that had none.
 *
 * A genuinely greyscale cover — `To Pimp a Butterfly` — has a saturation of
 * approximately zero and still falls through both, which is right. It has no
 * accent to lend.
 */
const SAT_FLOORS = [0.25, 0.1];

/** A sleeve is mostly its own black borders and white type. Neither is the
 *  colour of the record. */
const MIN_LIGHT = 0.15;
const MAX_LIGHT = 0.85;

/**
 * The colour a sleeve reads as, or null if it does not read as one.
 *
 * Population, not average. Averaging every pixel of a red room with a beige
 * floor gives a muddy brown that appears nowhere in the artwork; taking the
 * most-populated hue and averaging only *within* it gives the red. Sleeves
 * that are genuinely monochrome fall through to null, which is the honest
 * answer — a duotone black-and-white cover has no accent to lend.
 */
export function dominantColour(px: Pixels): string | null {
  for (const floor of SAT_FLOORS) {
    const hit = pickAt(px, floor);
    if (hit) return hit;
  }
  return null;
}

function pickAt(px: Pixels, minSat: number): string | null {
  const counts = new Array<number>(HUES).fill(0);
  const sums = Array.from({ length: HUES }, () => [0, 0, 0]);

  const total = px.width * px.height;
  for (let p = 0; p < total; p++) {
    const r = px.rgb[p * 3];
    const g = px.rgb[p * 3 + 1];
    const b = px.rgb[p * 3 + 2];
    const { h, s, l } = hsl(r, g, b);
    if (s < minSat || l < MIN_LIGHT || l > MAX_LIGHT) continue;

    const bucket = Math.min(HUES - 1, Math.floor(h * HUES));
    counts[bucket]++;
    sums[bucket][0] += r;
    sums[bucket][1] += g;
    sums[bucket][2] += b;
  }

  let best = -1;
  for (let i = 0; i < HUES; i++) if (counts[i] > (counts[best] ?? 0)) best = i;
  /* One or two stray saturated pixels in an otherwise grey sleeve are noise,
     not a colour scheme. Out of 256, ask for at least eight. */
  if (best < 0 || counts[best] < 8) return null;

  const n = counts[best];
  return hex(sums[best][0] / n, sums[best][1] / n, sums[best][2] / n);
}

function hsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h, s, l };
}

/**
 * The hue of the sleeve, at a strength you can put on a button.
 *
 * The most-populous bucket is an *average of real pixels*, and real pixels are
 * mostly in shadow: the red room on `The Slow Rush` averages to `#912c1a`, a
 * deep brick, when the colour anybody would name for that sleeve is the
 * brighter red the designer picked in Figma (`#e04a52`). The two are the same
 * hue eighteen points of lightness apart.
 *
 * So the hue is kept and the other two are moved into a band: saturated enough
 * to read as a colour, light enough to be a fill rather than a shadow. This is
 * the step that turns "the average pixel" into "the colour of the record",
 * which is the thing actually being asked for.
 *
 * Contrast is somebody else's job — `clampAccent` runs after this and can
 * still move the lightness back if the band lands too close to a card.
 */
const VIVID_MIN_SAT = 0.45;
const VIVID_MIN_LIGHT = 0.52;
const VIVID_MAX_LIGHT = 0.62;

export function vivid(colour: string): string {
  const n = Number.parseInt(colour.slice(1), 16);
  const { h, s, l } = hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  /* A grey has no hue to preserve, so there is nothing here to make vivid —
     it would become an arbitrary colour that appears nowhere on the sleeve. */
  if (s < 0.05) return colour;
  const next = toRgb(
    h,
    Math.max(s, VIVID_MIN_SAT),
    Math.min(VIVID_MAX_LIGHT, Math.max(VIVID_MIN_LIGHT, l)),
  );
  return hex(next[0], next[1], next[2]);
}

function toRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let v = t;
    if (v < 0) v += 1;
    if (v > 1) v -= 1;
    if (v < 1 / 6) return p + (q - p) * 6 * v;
    if (v < 1 / 2) return q;
    if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
    return p;
  };
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

function hex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * The sleeve's colour, clamped so it is legible on both cards.
 *
 * `toneFor` is `lib/clubColor.ts`'s — it was written for football crests,
 * whose problem is identical and already argued out there: a real brand colour
 * almost never clears on both a light and a dark ground, and the fix is to walk
 * its lightness rather than to pick a different colour.
 *
 * At `GRAPHIC_TARGET`, not the 4.5 a club's name is held to, and the
 * distinction is the whole reason that number is a parameter. Nothing tinted
 * here is text: it is a 40px disc, a 20px thumb and a ring that expands and
 * disappears. WCAG asks 3:1 of a graphical element, and holding a sleeve to
 * 4.5 walks its red down into a maroon that no longer looks like the record —
 * which defeats the point of taking the colour off the record at all.
 */
export function clampAccent(dominant: string): Accent {
  const base = vivid(dominant);
  return {
    accent: toneFor(base, LIGHT_CARD, GRAPHIC_TARGET),
    accentDark: toneFor(base, MARK, GRAPHIC_TARGET),
  };
}

/**
 * Fetch a 16x16 sleeve and read its colour. Null on any failure, and every
 * failure here is survivable — the card keeps site orange.
 */
export async function accentFor(tinyUrl: string): Promise<Accent | null> {
  try {
    const res = await fetch(tinyUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const px = decodePng(new Uint8Array(await res.arrayBuffer()));
    if (!px) return null;
    const dominant = dominantColour(px);
    return dominant ? clampAccent(dominant) : null;
  } catch {
    return null;
  }
}
