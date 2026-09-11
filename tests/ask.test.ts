import { describe, expect, it } from "vitest";
import { FAILED_MARK, REFUSED_MARK, SOURCES_MARK, readAsk } from "@/components/palette/askStream";
import { ASK_SYSTEM } from "@/lib/ask";
import { PALETTE_INDEX } from "@/content/palette";

describe("readAsk", () => {
  it("splits the answer from the ids it cites", () => {
    const read = readAsk(`I led it across twelve products.\n${SOURCES_MARK} study:design-system, outcome:design-system:0`);
    expect(read.text).toBe("I led it across twelve products.");
    expect(read.sources).toEqual(["study:design-system", "outcome:design-system:0"]);
    expect(read.refused || read.failed).toBe(false);
  });

  it("never shows a marker that has only half arrived", () => {
    expect(readAsk("Mostly field software §sou").text).toBe("Mostly field software");
  });

  it("keeps three sources at most, and none when the model cited none", () => {
    expect(readAsk(`a\n${SOURCES_MARK} a, b, c, d`).sources).toEqual(["a", "b", "c"]);
    expect(readAsk(`a\n${SOURCES_MARK}`).sources).toEqual([]);
  });

  it("reads the route's own markers", () => {
    expect(readAsk(`\n${REFUSED_MARK}`)).toMatchObject({ text: "", refused: true });
    expect(readAsk(`Half an answer\n${FAILED_MARK}`)).toMatchObject({ text: "Half an answer", failed: true });
  });
});

describe("the ask system prompt", () => {
  it("carries every entry, tagged with the id the palette can open", () => {
    for (const entry of PALETTE_INDEX) expect(ASK_SYSTEM).toContain(`[${entry.id}]`);
  });

  it("is stable enough to cache — no clock, no per-request anything", () => {
    expect(ASK_SYSTEM).not.toMatch(/\b20\d\d-\d\d-\d\dT/);
    expect(ASK_SYSTEM).toContain(SOURCES_MARK);
  });
});
