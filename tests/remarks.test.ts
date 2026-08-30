import { describe, expect, it } from "vitest";
import {
  OLD_PATH_TAPS,
  OLD_PATH_WIDTHS,
  REMARKS,
  SEVERITY_LABEL,
  TAXONOMY,
  oldPathCostOf,
  searchRemarks,
  spreadOf,
} from "@/content/remarks";

/**
 * The Search card's corpus and matcher.
 *
 * This is the one place on the site where an argument is *computed* rather than
 * asserted. The card claims search beat navigation, and then proves it live by
 * running both over the same rows — so every number it shows is only as honest
 * as the functions below. These tests hold the properties the argument rests
 * on, not the implementation that currently provides them.
 */

describe("the corpus and the tree", () => {
  it("derives the taxonomy from the remarks, losing nothing", () => {
    // Load-bearing for the card's honesty: the before and the after are the
    // same rows read two ways, so the demonstration cannot cheat by giving
    // search a better dataset than navigation had.
    const inTree = TAXONOMY.flatMap((c) => c.subcategories).flatMap(
      (s) => s.remarks,
    );

    expect(inTree).toHaveLength(REMARKS.length);
    expect(new Set(inTree.map((r) => r.text)).size).toBe(REMARKS.length);
  });

  it("sorts each subcategory alphabetically", () => {
    // The one line of sorting the whole feature argues with: with no idea who
    // is asking, A–Z is the only order a tree can justify.
    for (const category of TAXONOMY) {
      for (const sub of category.subcategories) {
        const texts = sub.remarks.map((r) => r.text);
        expect(texts).toEqual([...texts].sort((a, b) => a.localeCompare(b)));
      }
    }
  });

  it("counts the old path's real branch widths", () => {
    expect(OLD_PATH_WIDTHS[0]).toBe(TAXONOMY.length);
    expect(OLD_PATH_TAPS).toBe(3);
    expect(OLD_PATH_WIDTHS.every((n) => n > 0)).toBe(true);
  });
});

describe("what a finding carries", () => {
  it("gives every remark the four things a result block draws", () => {
    // Figma 869:6510 draws a branch, a severity, a heading, a place and a
    // paragraph. A row missing any of them renders a hole, and the results list
    // has no way to skip one — so the corpus owes all of them.
    for (const remark of REMARKS) {
      expect(remark.label.length).toBeGreaterThan(0);
      expect(remark.text.length).toBeGreaterThan(0);
      expect(remark.location.length).toBeGreaterThan(0);
      expect(SEVERITY_LABEL[remark.severity]).toBeTruthy();
    }
  });

  it("keeps the labels distinct", () => {
    // The suggestions list is keyed on the remark and read by its label. Two
    // rows reading the same is a list a visitor cannot act on.
    expect(new Set(REMARKS.map((r) => r.label)).size).toBe(REMARKS.length);
  });

  it("puts the firm's count above this inspector's, always", () => {
    // The two badges are only interesting because they can disagree, and the
    // one direction that would be nonsense is an inspector who has used a
    // remark more times than the whole firm has.
    for (const remark of REMARKS) {
      expect(remark.global).toBeGreaterThan(remark.used);
    }
  });
});

describe("searchRemarks", () => {
  it("shows the whole library, most-reached-for first, before anything is typed", () => {
    // The state the old flow could not have at all: the answer already on
    // screen.
    const hits = searchRemarks("");
    expect(hits).toHaveLength(REMARKS.length);

    const used = hits.map((h) => h.remark.used);
    expect(used).toEqual([...used].sort((a, b) => b - a));
  });

  it("matches word starts, not substrings", () => {
    // An inspector typing "lash" means a word. Substring matching on a corpus
    // this size turns it into every "flashing" — and "vent" into every
    // "prevent" — which is the failure mode the prefix rule exists to avoid.
    const flashing = REMARKS.filter((r) =>
      r.text.toLowerCase().includes("flashing"),
    );
    expect(flashing.length).toBeGreaterThan(0);

    const hits = searchRemarks("lash");
    expect(hits).toHaveLength(0);

    // And the real prefix does find them.
    expect(searchRemarks("flash").length).toBeGreaterThan(0);
  });

  it("narrows as words are added", () => {
    // Every token has to match somewhere, so a second word can only ever
    // reduce the set. This is the behaviour anyone who has used a search field
    // already expects, and getting it backwards is a common bug.
    const one = searchRemarks("crack");
    const two = searchRemarks("crack foundation");

    expect(two.length).toBeGreaterThan(0);
    expect(two.length).toBeLessThan(one.length);

    const texts = new Set(one.map((h) => h.remark.text));
    for (const hit of two) expect(texts.has(hit.remark.text)).toBe(true);
  });

  it("puts your own writing above better text matches", () => {
    // The feature, stated as a number. `LIBRARY_WEIGHT` is 4 and the most-used
    // remark in the sample is 26, so its bonus is 104 — larger than any
    // match-quality score can reach. Among rows that all genuinely match, the
    // ranking is history first, text quality second.
    const hits = searchRemarks("crack");
    expect(hits.length).toBeGreaterThan(1);

    const mine = hits.filter((h) => h.remark.used > 0);
    const theirs = hits.filter((h) => h.remark.used === 0);
    expect(mine.length).toBeGreaterThan(0);
    expect(theirs.length).toBeGreaterThan(0);

    const lastMine = hits.findLastIndex((h) => h.remark.used > 0);
    const firstTheirs = hits.findIndex((h) => h.remark.used === 0);
    expect(firstTheirs).toBeGreaterThan(lastMine - 1);

    // And within the matched set, used counts descend.
    const used = mine.map((h) => h.remark.used);
    expect(used).toEqual([...used].sort((a, b) => b - a));
  });

  it("returns marks that actually point at the match", () => {
    // The suggestions list highlights from these rather than re-running the
    // match, so an off-by-one here shows up as a highlight over the wrong
    // letters. Into the label, which is the string both places that highlight
    // actually draw — the suggestion row and a result's heading.
    for (const hit of searchRemarks("crack")) {
      for (const [start, len] of hit.marks) {
        expect(hit.remark.label.slice(start, start + len).toLowerCase()).toBe(
          "crack",
        );
      }
    }
  });

  it("finds a word that is only in the body, and marks nothing for it", () => {
    // The label is what you scan and the body is what goes in the report, so
    // both are searchable — but only the label is drawn on a suggestion row,
    // and a mark into a string nothing renders is a highlight nobody sees.
    const hits = searchRemarks("underlayment");
    expect(hits.length).toBeGreaterThan(0);

    for (const hit of hits) {
      expect(hit.remark.text.toLowerCase()).toContain("underlayment");
      expect(hit.remark.label.toLowerCase()).not.toContain("underlayment");
      expect(hit.marks).toHaveLength(0);
      // Not a path match either: it really is in the body.
      expect(hit.viaPath).toBe(false);
    }
  });

  it("ranks a label hit above the same word buried in a body", () => {
    // Three tiers, in the order they are worth: what the row is called, what it
    // will say, where the tree filed it.
    const hits = searchRemarks("crack");
    const firstBodyOnly = hits.findIndex((h) => h.marks.length === 0);
    const lastLabelled = hits.findLastIndex((h) => h.marks.length > 0);

    // Only meaningful if the query actually produced both kinds.
    expect(firstBodyOnly).toBeGreaterThan(-1);
    expect(lastLabelled).toBeGreaterThan(-1);

    // History outranks everything (see LIBRARY_WEIGHT), so this holds within a
    // used count rather than across the whole list.
    const zero = hits.filter((h) => h.remark.used === 0);
    const labelled = zero.filter((h) => h.marks.length > 0);
    const bodyOnly = zero.filter((h) => h.marks.length === 0);
    if (labelled.length && bodyOnly.length) {
      expect(hits.indexOf(labelled[0])).toBeLessThan(
        hits.indexOf(bodyOnly[0]),
      );
    }
  });

  it("flags a path-only match, and only when the text missed", () => {
    // You type "roof" and get a roofing remark that never says the word. The
    // old flow could only ever find rows this way; search finds them as well
    // as, not instead of, the text.
    const hits = searchRemarks("roofing");
    expect(hits.length).toBeGreaterThan(0);

    for (const hit of hits) {
      if (hit.viaPath) expect(hit.marks).toHaveLength(0);
      else expect(hit.marks.length).toBeGreaterThan(0);
    }
    expect(hits.some((h) => h.viaPath)).toBe(true);
  });

  it("finds nothing for a word the library does not contain", () => {
    // The card's empty state depends on this being a real zero rather than a
    // fuzzy near-miss.
    expect(searchRemarks("termite")).toHaveLength(0);
  });

  it("narrows to a category when asked", () => {
    const all = searchRemarks("crack");
    const roofing = searchRemarks("crack", "Roofing");

    expect(roofing.length).toBeGreaterThan(0);
    expect(roofing.length).toBeLessThan(all.length);
    expect(roofing.every((h) => h.remark.category === "Roofing")).toBe(true);
  });
});

describe("spreadOf", () => {
  it("counts the distinct categories an answer landed in", () => {
    // The card's sharpest readout, and the reason the demonstration searches
    // for a crack: a set spread across many categories is one no single walk
    // down the tree could have produced.
    const hits = searchRemarks("crack");
    const spread = spreadOf(hits);

    expect(spread).toBe(new Set(hits.map((h) => h.remark.category)).size);
    expect(spread).toBeGreaterThan(1);
    expect(spreadOf([])).toBe(0);
  });
});

describe("oldPathCostOf", () => {
  it("counts the taps and rows a remark actually sat behind", () => {
    const remark = REMARKS.find(
      (r) => r.category === "Structure" && r.subcategory === "Foundation",
    )!;
    const cost = oldPathCostOf(remark);

    const category = TAXONOMY.find((c) => c.name === "Structure")!;
    const sub = category.subcategories.find((s) => s.name === "Foundation")!;

    expect(cost.taps).toBe(OLD_PATH_TAPS);
    expect(cost.rowsRead).toBe(
      TAXONOMY.length + category.subcategories.length + sub.remarks.length,
    );
  });

  it("is computable for every remark in the corpus", () => {
    // The card reports this for whichever row somebody picks, so a remark the
    // walk cannot find would put a wrong number on screen rather than throw.
    for (const remark of REMARKS) {
      const cost = oldPathCostOf(remark);
      expect(cost.rowsRead).toBeGreaterThan(TAXONOMY.length);
      expect(Number.isFinite(cost.rowsRead)).toBe(true);
    }
  });
});
