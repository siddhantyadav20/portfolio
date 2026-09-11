import { describe, expect, it } from "vitest";

import { briefs } from "@/content/canvas";
import { SKETCH_MAX_BYTES, base64Bytes, validateSketch } from "@/lib/sketch";

/**
 * What the drawing canvas may mail.
 *
 * The server action trusts nothing from the client: the brief has to be one
 * the site deals, the image has to be a PNG under the cap that keeps the
 * request inside Next's 1MB Server Action limit, and a contact, if given, has
 * to be a way to reach someone.
 */

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const id = briefs[0].id;

describe("validateSketch", () => {
  it("accepts a PNG for a real brief with no contact", () => {
    const r = validateSketch({ png: PNG, briefId: id });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.brief.id).toBe(id);
      expect(r.contact).toBeNull();
    }
  });

  it("accepts an email to reply to", () => {
    const r = validateSketch({ png: PNG, briefId: id, contact: "  a@b.co " });
    expect(r.ok && r.contact).toEqual({ kind: "email", value: "a@b.co" });
  });

  it("treats a blank contact as none", () => {
    const r = validateSketch({ png: PNG, briefId: id, contact: "   " });
    expect(r.ok && r.contact).toBeNull();
  });

  it("refuses a brief the site never dealt", () => {
    expect(validateSketch({ png: PNG, briefId: "made-up" })).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses anything that is not a base64 PNG", () => {
    for (const png of [
      "data:image/jpeg;base64,/9j/4AAQ",
      "data:image/png;base64,",
      "data:image/png;base64,<script>",
      "https://example.com/a.png",
    ]) {
      expect(validateSketch({ png, briefId: id }), png).toEqual({ ok: false, reason: "invalid" });
    }
  });

  it("refuses a sketch over the cap", () => {
    const big = "data:image/png;base64," + "A".repeat(Math.ceil(((SKETCH_MAX_BYTES + 3) * 4) / 3));
    expect(validateSketch({ png: big, briefId: id })).toEqual({ ok: false, reason: "too-large" });
  });

  it("keeps the cap inside Next's 1MB Server Action body", () => {
    // base64 is 4/3 of the bytes; leave room for the action's own framing.
    expect((SKETCH_MAX_BYTES * 4) / 3).toBeLessThan(1_000_000 - 50_000);
  });

  it("says so when the contact is not a way to reach anyone", () => {
    expect(validateSketch({ png: PNG, briefId: id, contact: "call me" })).toEqual({
      ok: false,
      reason: "contact",
    });
  });
});

describe("base64Bytes", () => {
  it("counts decoded bytes, padding included", () => {
    expect(base64Bytes("TWFu")).toBe(3);
    expect(base64Bytes("TWE=")).toBe(2);
    expect(base64Bytes("TQ==")).toBe(1);
  });
});
