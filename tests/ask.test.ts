import { describe, expect, it } from "vitest";
import { FAILED_MARK, REFUSED_MARK, RESET_MARK, SOURCES_MARK, readAsk } from "@/components/palette/askStream";
import { ASK_SYSTEM, LEFT_OUT } from "@/lib/ask";
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

  it("takes the brackets off an id cited the way the prompt shows it", () => {
    expect(readAsk(`a\n${SOURCES_MARK} [answer:tour], [study:search]`).sources).toEqual([
      "answer:tour",
      "study:search",
    ]);
  });

  it("still reads a failure that carries a status code", () => {
    expect(readAsk(`I\n${FAILED_MARK} 429`)).toMatchObject({ text: "I", failed: true });
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

describe("readAsk across a retry", () => {
  it("throws away the attempt that broke and keeps the one after it", () => {
    const read = readAsk(`I\n${RESET_MARK}Yes, most of my work is for field inspectors.\n${SOURCES_MARK} study:search`);
    expect(read.text).toBe("Yes, most of my work is for field inspectors.");
    expect(read.sources).toEqual(["study:search"]);
  });

  it("shows nothing while the retry has not written anything yet", () => {
    expect(readAsk(`I don't\n${RESET_MARK}`).text).toBe("");
  });
});

describe("the ask system prompt", () => {
  it("carries every work entry, tagged with the id the palette can open", () => {
    for (const entry of PALETTE_INDEX) {
      if (LEFT_OUT.has(entry.group)) expect(ASK_SYSTEM).not.toContain(`[${entry.id}]`);
      else expect(ASK_SYSTEM).toContain(`[${entry.id}]`);
    }
  });

  it("forbids turning avoided work into claimed savings", () => {
    expect(ASK_SYSTEM).toMatch(/do not turn work that was avoided into time or money that was saved/);
  });

  it("is stable enough to cache — no clock, no per-request anything", () => {
    expect(ASK_SYSTEM).not.toMatch(/\b20\d\d-\d\d-\d\dT/);
    expect(ASK_SYSTEM).toContain(SOURCES_MARK);
  });
});
