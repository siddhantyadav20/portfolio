import { describe, expect, it } from "vitest";
import { piecesOf, readSse } from "@/lib/gemini";

describe("readSse", () => {
  it("reads complete events and holds back the one still arriving", () => {
    const { events, rest } = readSse('data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"');
    expect(events).toEqual(['{"a":1}', '{"b":2}']);
    expect(rest).toBe('data: {"c"');
  });

  it("copes with CRLF line endings", () => {
    expect(readSse('data: {"a":1}\r\n\r\n').events).toEqual(['{"a":1}']);
  });

  it("gives the same events however the network split them", () => {
    const whole = 'data: {"t":"Hel"}\n\ndata: {"t":"lo"}\n\n';
    let buffer = "";
    const seen: string[] = [];
    for (const ch of whole) {
      buffer += ch;
      const { events, rest } = readSse(buffer);
      seen.push(...events);
      buffer = rest;
    }
    expect(seen).toEqual(['{"t":"Hel"}', '{"t":"lo"}']);
  });
});

describe("piecesOf", () => {
  it("takes the answer's text and skips thought summaries", () => {
    const chunk = {
      candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: "Yes, I have." }] } }],
    };
    expect(piecesOf(chunk)).toEqual([{ text: "Yes, I have." }]);
  });

  it("reads a blocked prompt or a safety stop as a decline", () => {
    expect(piecesOf({ promptFeedback: { blockReason: "SAFETY" } })).toEqual([{ declined: true }]);
    expect(piecesOf({ candidates: [{ finishReason: "SAFETY" }] })).toEqual([{ declined: true }]);
  });

  it("treats a normal stop as the end, not a decline", () => {
    expect(piecesOf({ candidates: [{ content: { parts: [{ text: "Done." }] }, finishReason: "STOP" }] })).toEqual([
      { text: "Done." },
    ]);
  });
});
