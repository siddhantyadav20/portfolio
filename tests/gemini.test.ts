import { describe, expect, it } from "vitest";
import { pieceOf, readSse } from "@/lib/gemini";

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

describe("pieceOf", () => {
  it("takes the answer's text from text deltas", () => {
    expect(pieceOf({ event_type: "step.delta", delta: { type: "text", text: "Yes, I have." } })).toEqual({
      text: "Yes, I have.",
    });
  });

  it("skips thinking and every other kind of delta", () => {
    expect(pieceOf({ event_type: "step.delta", delta: { type: "thought", text: "hmm" } })).toBeNull();
    expect(pieceOf({ event_type: "step.start" })).toBeNull();
    expect(pieceOf({ event_type: "interaction.created" })).toBeNull();
  });

  it("marks the end of the stream", () => {
    expect(pieceOf({ event_type: "interaction.completed" })).toEqual({ done: true });
  });

  it("throws on an error event, so the route says it failed", () => {
    expect(() => pieceOf({ event_type: "error", error: { code: 429, message: "quota" } })).toThrow(/429 quota/);
  });
});
