import { afterEach, describe, expect, it, vi } from "vitest";

import { devRedis, devRedisReset } from "@/lib/upstashDev";
import { lastDays, mayView, parseStored, readInsights, readTrackKey } from "@/lib/insights";
import { dayStamp } from "@/lib/visitors";

/**
 * The insights page reads what other surfaces wrote. These pin the pieces
 * that can be wrong without anything on the page looking broken: which day a
 * visit lands on, how a track key reads back, and who may see the page.
 */

afterEach(() => {
  devRedisReset();
  vi.unstubAllEnvs();
});

describe("the day a visit belongs to", () => {
  it("is India time, so a late evening is not tomorrow", () => {
    // 18:00 UTC is 23:30 IST on the same date; 19:00 UTC is past midnight.
    expect(dayStamp(Date.UTC(2026, 9, 17, 18, 0))).toBe("2026-10-17");
    expect(dayStamp(Date.UTC(2026, 9, 17, 19, 0))).toBe("2026-10-18");
  });

  it("lists the last n days, oldest first, ending today, without gaps", () => {
    const days = lastDays(30, Date.UTC(2026, 9, 17, 6));
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toBe("2026-10-17");
    expect(days[0]).toBe("2026-09-18");
    expect(new Set(days).size).toBe(30);
  });
});

describe("a track key, read back", () => {
  it("splits on the double dash and titles the words", () => {
    expect(readTrackKey("the-strokes--ode-to-the-mets")).toEqual({
      artist: "The Strokes",
      title: "Ode To The Mets",
    });
  });
});

describe("stored comments", () => {
  it("drops a malformed row rather than the thread", () => {
    const good = JSON.stringify({ id: "a", name: "", body: "hi", at: 1 });
    expect(parseStored([good, "{nope", 4, JSON.stringify({ id: 1 })])).toEqual([
      { id: "a", name: "", body: "hi", at: 1 },
    ]);
  });
});

describe("who may see the page", () => {
  it("needs the exact token outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INSIGHTS_TOKEN", "s3cret");
    expect(mayView("s3cret")).toBe(true);
    expect(mayView("s3cre")).toBe(false);
    expect(mayView(undefined)).toBe(false);
    expect(mayView(["s3cret"])).toBe(false);
  });

  it("is closed when no token was ever set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INSIGHTS_TOKEN", "");
    expect(mayView("")).toBe(false);
  });
});

describe("the read", () => {
  it("brings visitors, studies, comments and tracks together", async () => {
    const now = Date.UTC(2026, 9, 17, 6);
    const today = dayStamp(now);
    devRedis([
      ["SADD", "sy:visitors", "a", "b", "c"],
      ["SADD", `sy:v:day:${today}`, "a", "b"],
      ["SADD", `sy:v:new:${today}`, "b"],
      ["SADD", "sy:s:search:likes", "a", "b"],
      ["LPUSH", "sy:s:search:comments", JSON.stringify({ id: "x", name: "Ana", body: "old", at: now - 5000 })],
      ["LPUSH", "sy:s:search:comments", JSON.stringify({ id: "y", name: "", body: "new", at: now - 1000 })],
      ["SADD", "sy:s:search:c:y:likes", "a"],
      ["SADD", "sy:m:up:the-strokes--ode", "a", "b"],
      ["SADD", "sy:m:dn:the-strokes--ode", "c"],
      ["SADD", "sy:m:dn:low--lullaby", "a"],
    ]);

    const data = await readInsights(now);

    expect(data.visitors.total).toBe(3);
    expect(data.visitors.days.at(-1)).toEqual({ date: today, seen: 2, fresh: 1 });
    const search = data.studies.find((s) => s.slug === "search");
    expect(search).toMatchObject({ likes: 2, comments: 2, lastAt: now - 1000 });
    expect(data.latest.map((c) => [c.body, c.likes])).toEqual([["new", 1], ["old", 0]]);
    expect(data.tracks.map((t) => [t.title, t.up, t.down])).toEqual([
      ["Ode", 2, 1],
      ["Lullaby", 0, 1],
    ]);
  });
});
