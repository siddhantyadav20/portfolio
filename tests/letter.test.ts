import { describe, expect, it } from "vitest";

import { LETTER_BODY_MAX, LETTER_SUBJECT_MAX, validateLetter } from "@/lib/letter";

/**
 * What the homepage's compose window may mail.
 *
 * The From line has to be an address the reply can go to, the message has to
 * say something, and neither field may be longer than the window lets you
 * type — the server action trusts none of that from the client.
 */

const ok = { from: "a@b.co", subject: "Hello", body: "Hi Siddhant," };

describe("validateLetter", () => {
  it("accepts a letter and trims it", () => {
    expect(validateLetter({ from: " a@b.co ", subject: "  Hello ", body: "\n Hi \n" })).toEqual({
      ok: true,
      from: "a@b.co",
      subject: "Hello",
      body: "Hi",
    });
  });

  it("allows an empty subject, as Mail does", () => {
    const r = validateLetter({ ...ok, subject: "   " });
    expect(r.ok && r.subject).toBe("");
  });

  it("folds a pasted multi-line subject onto one line", () => {
    const r = validateLetter({ ...ok, subject: "one\r\ntwo\tthree" });
    expect(r.ok && r.subject).toBe("one two three");
  });

  it("keeps the message's own line breaks", () => {
    const r = validateLetter({ ...ok, body: "one\r\n\r\ntwo" });
    expect(r.ok && r.body).toBe("one\n\ntwo");
  });

  it("wants an address to reply to", () => {
    expect(validateLetter({ ...ok, from: "" })).toEqual({ ok: false, reason: "from" });
    expect(validateLetter({ ...ok, from: "not an email" })).toEqual({ ok: false, reason: "from" });
  });

  it("refuses a phone number, which a reply cannot reach", () => {
    expect(validateLetter({ ...ok, from: "+44 7700 900123" })).toEqual({ ok: false, reason: "from" });
  });

  it("refuses an empty message", () => {
    expect(validateLetter({ ...ok, body: " \n " })).toEqual({ ok: false, reason: "body" });
  });

  it("refuses what the window would not have let you type", () => {
    expect(validateLetter({ ...ok, subject: "x".repeat(LETTER_SUBJECT_MAX + 1) })).toEqual({
      ok: false,
      reason: "too-long",
    });
    expect(validateLetter({ ...ok, body: "x".repeat(LETTER_BODY_MAX + 1) })).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("survives a request that is not the shape it claims", () => {
    // @ts-expect-error — the action is a public endpoint and gets whatever it gets.
    expect(validateLetter(null).ok).toBe(false);
    // @ts-expect-error — as above.
    expect(validateLetter({ from: 1, subject: {}, body: [] }).ok).toBe(false);
  });
});
