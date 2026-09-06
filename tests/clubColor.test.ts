import { describe, expect, it } from "vitest";
import { DARK_GROUND, LIGHT_GROUND, contrast, toneFor } from "@/lib/clubColor";
import { toneOf } from "@/lib/clubs";

const KEYS = ["ars","avl","bou","bre","bha","che","cov","cry","eve","ful","hul","ips","lee","liv","mci","mun","new","nfo","sun","tot"];

describe("club colours clear contrast in both themes", () => {
  it.each(KEYS)("%s", (key) => {
    const { color, colorDark } = toneOf(key);
    expect(contrast(color, LIGHT_GROUND)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colorDark, DARK_GROUND)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves a colour that already passes untouched", () => {
    expect(toneFor("#cd020d", LIGHT_GROUND)).toBe("#cd020d");
  });

  it("resolves an unknown club to ink rather than nothing", () => {
    expect(toneOf("zzz")).toEqual({ color: "#222222", colorDark: "#ededed" });
  });
});
