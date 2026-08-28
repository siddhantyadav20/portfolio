import { describe, expect, it } from "vitest";
import { formatVisitors, isVisitorId } from "@/lib/visitors";

/**
 * The visitor count's one shared rule, and its one bit of formatting.
 *
 * `isVisitorId` is the interesting half. The count is a set whose members come
 * from the browser rather than from the server — that is what lets it survive
 * somebody's address changing, and it is also the only thing about the design
 * that could be abused. This is the guard that keeps the set to fixed-size,
 * fixed-shape entries, so it is worth pinning against the things a careless
 * regex would let through: the nil UUID, a v1, something merely UUID-shaped,
 * and anything with a payload smuggled either side of it.
 */
describe("what counts as a browser id", () => {
  const REAL = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

  it("takes what crypto.randomUUID() produces", () => {
    expect(isVisitorId(REAL)).toBe(true);
    expect(isVisitorId(REAL.toUpperCase())).toBe(true);
  });

  it("refuses a UUID that is not version 4", () => {
    // v1 is derived from a MAC address and a clock. Nothing here mints one,
    // so anything sending one is not the site's own code.
    expect(isVisitorId("3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(false);
    expect(isVisitorId("00000000-0000-0000-0000-000000000000")).toBe(false);
  });

  it("refuses a bad variant nibble", () => {
    expect(isVisitorId("3f2504e0-4f89-41d3-1a0c-0305e82c3301")).toBe(false);
  });

  it("refuses anything padded around a real one", () => {
    // Anchored at both ends — the difference between a 36-byte set member and
    // a set somebody can store whatever they like in.
    expect(isVisitorId(` ${REAL}`)).toBe(false);
    expect(isVisitorId(`${REAL}\n${REAL}`)).toBe(false);
    expect(isVisitorId(REAL + "x")).toBe(false);
  });

  it("refuses the shapes that are not strings at all", () => {
    expect(isVisitorId(undefined)).toBe(false);
    expect(isVisitorId(null)).toBe(false);
    expect(isVisitorId(12)).toBe(false);
    expect(isVisitorId({ id: REAL })).toBe(false);
    expect(isVisitorId([REAL])).toBe(false);
  });
});

describe("the total, as the footer says it", () => {
  it("groups, so a real number does not read as a serial", () => {
    expect(formatVisitors(12408)).toBe("12,408");
    expect(formatVisitors(1_000_000)).toBe("1,000,000");
  });

  it("leaves the small ones alone", () => {
    expect(formatVisitors(0)).toBe("0");
    expect(formatVisitors(1)).toBe("1");
    expect(formatVisitors(999)).toBe("999");
  });
});
