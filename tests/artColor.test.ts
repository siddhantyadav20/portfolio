import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { clampAccent, decodePng, dominantColour, vivid } from "@/lib/artColor";
import { contrast } from "@/lib/clubColor";

/* ===========================================================================
   Reading a colour off a sleeve, with no image library.

   Two halves, tested separately because they fail differently. The decoder
   either produces the right pixels or it does not, and a wrong answer there is
   silent — an off-by-four in the IHDR read once gave a height of 134,742,024
   and simply returned null for every cover on the site. The picker is a
   judgement, and what is asserted about it is the judgement: extremes ignored,
   monochrome declined, both themes legible.

   The fixtures are real PNGs written by a real encoder (tests/fixtures/
   png.json), not bytes assembled here — a decoder tested only against its own
   author's idea of the format is testing agreement, not correctness.
   =========================================================================== */

const PNGS = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/png.json", import.meta.url)), "utf8"),
) as Record<string, string>;

const png = (name: string) => new Uint8Array(Buffer.from(PNGS[name], "base64"));

describe("decodePng", () => {
  it("reads a truecolour sleeve", () => {
    const px = decodePng(png("sleeve-red"));
    expect(px).not.toBeNull();
    expect([px!.width, px!.height]).toEqual([16, 16]);
    expect(px!.rgb.length).toBe(16 * 16 * 3);
    // The border is black and the middle is the sleeve's red.
    expect([...px!.rgb.slice(0, 3)]).toEqual([0, 0, 0]);
    const middle = (8 * 16 + 8) * 3;
    expect([...px!.rgb.slice(middle, middle + 3)]).toEqual([176, 38, 30]);
  });

  it.each(["palette-red", "grey8", "rgba-red"])(
    "reads colour type %s and lands on the same red",
    (name) => {
      const px = decodePng(png(name));
      expect(px, name).not.toBeNull();
      const middle = (8 * 16 + 8) * 3;
      const [r, g, b] = px!.rgb.slice(middle, middle + 3);
      if (name === "grey8") {
        /* Greyscale has no channels to disagree about — the assertion is that
           one byte was expanded to three rather than read as a third of a
           pixel, which is what a wrong `CHANNELS` entry would do. */
        expect(r).toBe(g);
        expect(g).toBe(b);
      } else {
        expect([r, g, b]).toEqual([176, 38, 30]);
      }
    },
  );

  it("declines 16 bits per channel rather than mis-reading it", () => {
    expect(decodePng(png("depth16"))).toBeNull();
  });

  it("declines an interlaced image", () => {
    /* Adam7 rearranges the whole image into seven passes — a second decoder,
       for a case mzstatic does not produce. The byte is flipped on a file that
       otherwise decodes, so this asserts the check rather than a fixture:
       signature (8) + chunk length (4) + type (4) puts IHDR's data at 16, and
       the interlace method is its thirteenth byte. */
    const good = png("sleeve-red");
    expect(decodePng(good)).not.toBeNull();
    const lying = Uint8Array.from(good);
    lying[16 + 12] = 1;
    expect(decodePng(lying)).toBeNull();
  });

  it.each([
    ["empty", new Uint8Array()],
    ["not a PNG", new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0])],
    ["a truncated header", png("sleeve-red").slice(0, 20)],
  ])("returns null for %s", (_what, bytes) => {
    /* Every one of these is survivable: the card keeps site orange. None of
       them may throw — this runs inside a render. */
    expect(() => decodePng(bytes)).not.toThrow();
    expect(decodePng(bytes)).toBeNull();
  });

  it("survives an IDAT that is not valid zlib", () => {
    const bytes = png("sleeve-red");
    // Corrupt the compressed body, leaving the header intact.
    const broken = Uint8Array.from(bytes);
    broken[bytes.length - 12] ^= 0xff;
    broken[bytes.length - 13] ^= 0xff;
    expect(() => decodePng(broken)).not.toThrow();
  });

  it("reconstructs every scanline filter", () => {
    /* PNG expresses each row as a difference from its neighbours, and there
       are five ways to do it. An encoder picks whichever compresses best, so a
       decoder that gets Paeth wrong works on most images and fails on some —
       the worst possible distribution of a bug. This image is written by hand
       with one filter per row, so all five run. */
    const W = 5;
    const H = 5;
    const expected: number[][] = [];
    for (let y = 0; y < H; y++) {
      const row: number[] = [];
      for (let x = 0; x < W; x++) row.push(20 * x + y, 40 + y, 100 - 3 * x);
      expected.push(row);
    }

    const raw: number[] = [];
    let prev = new Array<number>(W * 3).fill(0);
    for (let y = 0; y < H; y++) {
      const filter = y % 5; // 0 none, 1 sub, 2 up, 3 average, 4 Paeth
      raw.push(filter);
      const line = expected[y];
      for (let i = 0; i < line.length; i++) {
        const a = i >= 3 ? line[i - 3] : 0;
        const b = prev[i];
        const c = i >= 3 ? prev[i - 3] : 0;
        const predictor =
          filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
        raw.push((line[i] - predictor) & 0xff);
      }
      prev = line;
    }

    const px = decodePng(buildPng(W, H, 2, deflateSync(Buffer.from(raw))));
    expect(px).not.toBeNull();
    for (let y = 0; y < H; y++) {
      expect([...px!.rgb.slice(y * W * 3, (y + 1) * W * 3)], `row ${y}`).toEqual(expected[y]);
    }
  });
});

describe("dominantColour", () => {
  it("takes the sleeve's colour, not the average of its pixels", () => {
    /* The reason this is a population count rather than a mean: averaging a
       red panel with a black border and white type gives a muddy grey that
       appears nowhere on the cover. */
    const dom = dominantColour(decodePng(png("sleeve-red"))!)!;
    expect(dom).not.toBeNull();
    const [r, g, b] = rgb(dom);
    expect(r).toBeGreaterThan(120);
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
  });

  it("declines a monochrome cover", () => {
    /* A duotone sleeve has no accent to lend, and inventing one would put a
       colour on the card that is nowhere on the record. */
    expect(dominantColour(decodePng(png("greyscale"))!)).toBeNull();
  });

  it("still finds a sepia one", () => {
    /* The relaxed second pass. A single strict saturation floor threw away
       four sleeves in ten — Adele's `21` and Keane's `Hopes and Fears` among
       them — which are quiet colour schemes rather than none. */
    expect(dominantColour(decodePng(png("sepia"))!)).not.toBeNull();
  });
});

describe("vivid", () => {
  it("keeps the hue and lifts it out of shadow", () => {
    const [r, g, b] = rgb(vivid("#912c1a"));
    // Still unmistakably the same red.
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
    // And brighter than the shadow it was averaged out of.
    expect(r).toBeGreaterThan(0xc0);
  });

  it("leaves a grey alone", () => {
    /* There is no hue to make vivid. Pushing saturation onto one would invent
       a colour rather than find it. */
    expect(vivid("#808080")).toBe("#808080");
  });
});

describe("clampAccent", () => {
  it("is legible on both cards", () => {
    for (const seed of ["#912c1a", "#c80b3a", "#8e7947", "#0b3d91", "#ffe600", "#04170a"]) {
      const { accent, accentDark } = clampAccent(seed);
      /* Three, not four and a half: nothing tinted with this is text. It is a
         40px disc, a 20px thumb and a ring that expands and vanishes, and
         WCAG asks 3:1 of a graphical element. See lib/artColor.ts. */
      expect(contrast(accent, "#ffffff"), `${seed} on the light card`).toBeGreaterThanOrEqual(3);
      expect(contrast(accentDark, "#222222"), `${seed} on the dark card`).toBeGreaterThanOrEqual(3);
    }
  });
});

/* --- Helpers ----------------------------------------------------------------- */

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** A minimal PNG around an already-compressed IDAT. CRCs are zero — the
 *  decoder skips them, and the transport already checksums. */
function buildPng(w: number, h: number, colour: number, idat: Buffer): Uint8Array {
  const chunk = (type: string, body: Buffer) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, "ascii");
    body.copy(out, 8);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = colour;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", idat),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
