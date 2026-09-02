import { describe, expect, it } from "vitest";
import {
  FEATURED,
  GROUP_LABELS,
  GROUPS,
  PALETTE_INDEX,
  emptyState,
  nearestWord,
  searchPalette,
} from "@/content/palette";
import { STUDIES } from "@/content/work";
import { designSystem, intro, timeline } from "@/content/site";
import { widgets } from "@/content/canvas";

/**
 * The palette's index and matcher.
 *
 * The index is *derived* — that is the whole design, and it is the thing worth
 * testing. Nothing below asserts that a particular sentence appears in the
 * palette; it asserts that whatever `content/` says today is what the palette
 * finds today. Reword a heading and these stay green. Start keeping a second
 * copy of the copy and they go red.
 */

describe("the index is derived, not authored", () => {
  it("carries every section of every written study", () => {
    // A section that exists but cannot be found is the failure mode the whole
    // feature is supposed to remove.
    for (const study of STUDIES) {
      for (const section of study.sections ?? []) {
        const found = PALETTE_INDEX.find(
          (e) =>
            e.to.kind === "study" &&
            e.to.slug === study.slug &&
            e.to.section === section.id,
        );
        expect(found, `${study.slug}#${section.id}`).toBeDefined();
        expect(found!.label).toBe(section.heading);
      }
    }
  });

  it("carries every outcome number", () => {
    const outcomes = STUDIES.flatMap((s) => s.outcomes?.items ?? []);
    expect(outcomes.length).toBeGreaterThan(0);

    for (const outcome of outcomes) {
      expect(
        PALETTE_INDEX.some((e) => e.label.startsWith(outcome.value)),
      ).toBe(true);
    }
  });

  it("carries every stop on the timeline and every widget on the board", () => {
    for (const entry of timeline.entries) {
      expect(PALETTE_INDEX.some((e) => e.label === entry.title)).toBe(true);
    }
    for (const widget of widgets) {
      expect(
        PALETTE_INDEX.some(
          (e) => e.to.kind === "canvas" && e.to.widget === widget.id,
        ),
        widget.id,
      ).toBe(true);
    }
  });

  it("takes its labels from content rather than restating them", () => {
    // The rule the file's header sets itself. If somebody hard-codes "281
    // Reusable Tokens" here instead of reading `designSystem.stat`, this stays
    // green — but the day that number changes in one place and not the other,
    // it goes red, which is the day it matters.
    const tokens = PALETTE_INDEX.find((e) => e.id === "evidence:tokens")!;
    expect(tokens.label).toBe(designSystem.stat);

    const email = PALETTE_INDEX.find((e) => e.id === "do:copy-email")!;
    expect(email.hint).toBe(intro.email);
  });

  it("gives every entry a unique id and a known group", () => {
    const ids = PALETTE_INDEX.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of PALETTE_INDEX) {
      expect(GROUPS).toContain(entry.group);
      expect(GROUP_LABELS[entry.group]).toBeTruthy();
      expect(entry.label.trim()).not.toBe("");
    }
  });

  it("offers a short, useful empty state", () => {
    // The screen before you type is the one everybody sees. A palette that
    // opens onto two hundred rows has answered nothing.
    expect(FEATURED.length).toBeGreaterThan(0);
    expect(FEATURED.length).toBeLessThan(16);
    expect(FEATURED.some((e) => e.to.kind === "answer")).toBe(true);
    expect(searchPalette("")).toHaveLength(FEATURED.length);
  });
});

describe("searchPalette", () => {
  it("answers a number question with the number", () => {
    // The behaviour the whole feature is for: "products" is not a request to
    // navigate to a page called Products, it is a question with an answer, and
    // the answer is a row whose own label states the number.
    //
    // The query used to be "tokens", answered by "281 Reusable Tokens". That
    // number counted a licensed foundation's variables rather than any of
    // Siddhant's work and has been removed from the site, so this points at
    // the number that replaced it.
    //
    // It asserts the shape rather than one row's id, because two rows now
    // state this number honestly — the card's headline and the study's Scope
    // — and which of them wins is a ranking detail, not the behaviour. That
    // labels are read from content and never restated is held by its own test
    // above.
    const [top] = searchPalette("products");
    expect(top.entry.study).toBe("design-system");
    expect(top.entry.label).toMatch(/12 products/i);
  });

  it("still lands a concept query in the study that owns it", () => {
    // The other half of what the old "tokens" case covered, and the half that
    // survives the copy change: the word no longer appears in any label, so
    // every hit is a keywords match — and it still has to arrive in the right
    // study rather than scattering across three.
    const hits = searchPalette("tokens");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.study).toBe("design-system");
  });

  it("puts a visible-label match above a keywords-only match", () => {
    // A row whose label matches *is* the answer; a row that merely lists the
    // word as a hidden synonym is related to it. Letting group priority
    // overturn that is the bug QUALITY_SPREAD exists to prevent.
    const hits = searchPalette("chess");
    expect(hits.length).toBeGreaterThan(0);

    const firstViaKeywords = hits.findIndex((h) => h.viaKeywords);
    const lastVisible = hits.findLastIndex((h) => !h.viaKeywords);
    if (firstViaKeywords !== -1 && lastVisible !== -1) {
      expect(firstViaKeywords).toBeGreaterThan(lastVisible);
    }
  });

  it("narrows as words are added", () => {
    const one = searchPalette("design");
    const two = searchPalette("design system");
    expect(two.length).toBeGreaterThan(0);
    expect(two.length).toBeLessThan(one.length);
  });

  it("returns marks that point at the label", () => {
    for (const hit of searchPalette("design")) {
      for (const [start, len] of hit.marks) {
        expect(
          hit.entry.label.slice(start, start + len).toLowerCase(),
        ).toBe("design");
      }
    }
  });

  it("ranks the work above the record collection", () => {
    // "design" appears in a study title, a skill, a receipt line and a book's
    // genres. The studies are what somebody is asking about.
    const [top] = searchPalette("design");
    expect(["work", "evidence"]).toContain(top.entry.group);
  });

  it("finds a book by the line Siddhant wrote about it", () => {
    // The closest thing on the site to how he thinks, and it currently lives
    // inside a book on a 3000x3000 board.
    const hits = searchPalette("rams");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.to.kind).toBe("canvas");
  });

  it("finds nothing for a word the site does not contain", () => {
    expect(searchPalette("kubernetes")).toHaveLength(0);
  });
});

describe("nearestWord", () => {
  it("offers a real word when a query was probably a typo", () => {
    expect(nearestWord("inspecton")).toBeTruthy();
  });

  it("stays quiet when the query is simply about something else", () => {
    expect(nearestWord("kubernetes")).toBeUndefined();
  });
});

describe("previews", () => {
  it("gives every case study its hero and every outcome its tile", () => {
    // The peek column is only worth its width if the rows a recruiter actually
    // lands on have something to show.
    for (const study of STUDIES) {
      const row = PALETTE_INDEX.find((e) => e.id === `study:${study.slug}`)!;
      expect(row.preview?.title).toBe(study.title);
      if (study.hero) expect(row.preview?.image?.src).toBeTruthy();

      for (const [i, outcome] of (study.outcomes?.items ?? []).entries()) {
        const tile = PALETTE_INDEX.find(
          (e) => e.id === `outcome:${study.slug}:${i}`,
        )!;
        expect(tile.preview?.figure?.value).toBe(outcome.value);
        // The wash travels with the number, so it looks the same here as on
        // the page it was published on.
        expect(tile.preview?.tint).toBe(outcome.tint);
      }
    }
  });

  it("never shows a preview built from a value that isn't written", () => {
    // `meta` rows are `null` until somebody writes them, and a preview made
    // mostly of gaps reads as broken rather than as honest.
    for (const entry of PALETTE_INDEX) {
      for (const [, value] of entry.preview?.facts ?? []) {
        expect(value).toBeTruthy();
      }
      if (entry.preview) expect(entry.preview.title.trim()).not.toBe("");
    }
  });
});

describe("context", () => {
  it("ranks the study you are standing in above the one you are not", () => {
    // "design" matches things in every study. Reading the Design System study
    // and searching it should not offer you somebody else's section first.
    // The query used to be "a contract", after a section of that name; the
    // study was rewritten and the section went with it. Any phrase unique to
    // one study proves the same thing.
    const [cold] = searchPalette("permission model");
    expect(cold.entry.study).toBe("design-system");

    const inspection = searchPalette("problem", { study: "inspection-photos" });
    expect(inspection[0].entry.study).toBe("inspection-photos");
  });

  it("changes nothing when the query only matches elsewhere", () => {
    // Context reorders what matched; it never invents a match. Searching for
    // tokens from inside the Inspection study still finds the tokens.
    const hits = searchPalette("tokens", { study: "inspection-photos" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.study).toBe("design-system");
  });
});

describe("emptyState", () => {
  it("puts what you last opened above the opening questions", () => {
    const study = PALETTE_INDEX.find((e) => e.id === "study:search")!;
    const hits = emptyState([study]);

    expect(hits[0].entry.id).toBe(study.id);
    expect(hits[0].group).toBe("recent");
    expect(hits.some((h) => h.group === "start")).toBe(true);
  });

  it("does not list the same row twice under two headings", () => {
    // The thing every "Recent" list gets wrong.
    const featured = FEATURED[FEATURED.length - 1];
    const ids = emptyState([featured]).map((h) => h.entry.id);
    expect(ids.filter((id) => id === featured.id)).toHaveLength(1);
  });

  it("is exactly the featured list when there is no history", () => {
    expect(emptyState([]).map((h) => h.entry.id)).toEqual(
      FEATURED.map((e) => e.id),
    );
  });
});
