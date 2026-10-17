import { describe, expect, it } from "vitest";
import {
  didYouMean,
  fold,
  levenshtein,
  matchAll,
  prefixAt,
  tokenize,
  wordStarts,
} from "@/lib/match";

/**
 * The matcher two surfaces share.
 *
 * `tests/remarks.test.ts` already holds the behaviour the Search card's
 * argument rests on, and it passed unchanged through the extraction — which is
 * the real regression test here. What this file adds is the properties the
 * *palette* leans on and the card never exercised: matching into numbers and
 * hyphenated slugs, and the "did you mean" threshold.
 */

describe("wordStarts", () => {
  it("finds the start of every alphanumeric run", () => {
    expect(wordStarts("one two")).toEqual([0, 4]);
    expect(wordStarts("")).toEqual([]);
  });

  it("treats punctuation as a word break", () => {
    // This is what makes "system" reach "design-system" and "122" reach
    // "104,122" — both are real palette queries against real site strings.
    expect(wordStarts("design-system")).toEqual([0, 7]);
    expect(wordStarts("104,122")).toEqual([0, 4]);
  });
});

describe("tokenize", () => {
  it("splits on anything that is not alphanumeric", () => {
    expect(tokenize("design-system")).toEqual(["design", "system"]);
    expect(tokenize("  12   products ")).toEqual(["12", "products"]);
  });

  it("never yields an empty token mid-typing", () => {
    // A trailing space while someone is still typing used to produce a "" that
    // matches nothing, so the result list blanked between words.
    expect(tokenize("crack ")).toEqual(["crack"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("prefixAt", () => {
  it("matches at a word start and nowhere else", () => {
    const text = "step flashing at the chimney";
    const starts = wordStarts(text);

    expect(prefixAt(text, starts, "flash")).toBe(5);
    expect(prefixAt(text, starts, "lash")).toBeUndefined();
  });
});

describe("matchAll", () => {
  it("returns null when any token misses", () => {
    // "Matched nothing" and "matched everything badly" are different answers,
    // and both callers filter on the difference.
    expect(matchAll("Scaling a Design System", ["design", "tokens"])).toBeNull();
    expect(matchAll("Scaling a Design System", ["design"])).not.toBeNull();
  });

  it("scores a hit at the start above one buried inside", () => {
    const first = matchAll("Design System", ["design"])!;
    const later = matchAll("Scaling a Design System", ["design"])!;
    expect(first.quality).toBeGreaterThan(later.quality);
  });

  it("returns marks that point at the match", () => {
    // Renderers highlight from these rather than re-running the match, so an
    // off-by-one shows up as a highlight over the wrong letters.
    const text = "281 reusable tokens, used across 12 products";
    const { marks } = matchAll(text, ["tokens", "12"])!;

    for (const [start, len] of marks) {
      const slice = text.slice(start, start + len).toLowerCase();
      expect(["tokens", "12"]).toContain(slice);
    }
  });

  it("sorts marks by position regardless of token order", () => {
    const { marks } = matchAll("281 reusable tokens", ["tokens", "281"])!;
    expect(marks.map(([at]) => at)).toEqual([0, 13]);
  });

  it("is case-insensitive in both directions", () => {
    expect(matchAll("Design System", ["DESIGN"])).not.toBeNull();
  });

  it("matches everything when nothing was typed", () => {
    // The palette's empty state depends on this: no tokens is not a failed
    // match, it is the unfiltered index.
    const hit = matchAll("anything", [])!;
    expect(hit).not.toBeNull();
    expect(hit.marks).toEqual([]);
    expect(hit.quality).toBe(0);
  });
});

describe("fold", () => {
  /* The bug this exists for: the palette's CV row is labelled "Open résumé",
     so `resume` — the likeliest word anybody types into a designer's command
     palette — matched nothing at all, and the empty state offered "Did you
     mean result?" instead. */
  it("reaches an accented label from an unaccented query", () => {
    expect(matchAll("Open résumé", ["resume"])).not.toBeNull();
  });

  it("keeps marks aligned with the original string", () => {
    // This is why `fold` is per-character rather than NFD-then-strip: marks
    // are indices into the text a renderer paints, and NFD changes lengths.
    const text = "Open résumé";
    const { marks } = matchAll(text, ["resume"])!;
    const [start, len] = marks[0];
    expect(text.slice(start, start + len)).toBe("résumé");
  });

  it("leaves plain ASCII exactly as it was", () => {
    expect(fold("Open resume")).toBe("Open resume");
  });

  it("folds a query's own accents too", () => {
    // Somebody who types the accents gets the same row.
    expect(tokenize("Résumé")).toEqual(["resume"]);
  });

  it("does not fold characters whose decomposition is not an accent", () => {
    // Length-preserving by construction: anything that would change length is
    // left alone, ligatures included.
    expect(fold("æon").length).toBe(3);
  });
});

describe("levenshtein", () => {
  it("counts single edits", () => {
    expect(levenshtein("help", "help")).toBe(0);
    expect(levenshtein("hlp", "help")).toBe(1);
    expect(levenshtein("", "help")).toBe(4);
  });

  it("is symmetric", () => {
    expect(levenshtein("projects", "prjects")).toBe(
      levenshtein("prjects", "projects"),
    );
  });
});

describe("didYouMean", () => {
  const pool = ["inspection", "design-system", "canvas", "resume"];

  it("catches a plausible typo in a long word", () => {
    expect(didYouMean("inspecton", pool)).toBe("inspection");
  });

  it("says nothing for a word that is simply absent", () => {
    // A suggestion for an unrelated query is noise dressed as help.
    expect(didYouMean("photography", pool)).toBeUndefined();
  });

  it("refuses to guess at short words", () => {
    // Below four characters almost everything is two edits from everything
    // else, so the suggestion would be worse than silence.
    expect(didYouMean("cnv", pool)).toBeUndefined();
  });
});
