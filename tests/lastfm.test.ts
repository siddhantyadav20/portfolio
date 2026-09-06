import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lastfmReady, parseRecent, unsetVars } from "@/lib/lastfm";

/* ===========================================================================
   Last.fm's JSON is XML with the corners knocked off.

   Three of the four cases below are shapes that arrive on ordinary days and
   would each have broken the card silently. The fourth is the one that only
   arrives on a strange day, and is the reason this file exists: `track` is a
   list — unless there is exactly one, when it is the track. That works for
   months and fails the first time somebody has played precisely one song.
   =========================================================================== */

const row = (name: string, artist: string, album?: string) => ({
  name,
  artist: { "#text": artist, mbid: "" },
  album: { "#text": album ?? "", mbid: "" },
  date: { uts: "1788700000", "#text": "06 Sep 2026, 12:00" },
});

describe("parseRecent", () => {
  it("reads an ordinary response", () => {
    const out = parseRecent({
      recenttracks: { track: [row("Borderline", "Tame Impala", "The Slow Rush")] },
    });
    expect(out).toEqual([
      { artist: "Tame Impala", title: "Borderline", album: "The Slow Rush", now: false },
    ]);
  });

  it("reads a single scrobble, which arrives unwrapped", () => {
    const out = parseRecent({ recenttracks: { track: row("Heartless", "Kanye West") } });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Heartless");
  });

  it("marks the now-playing row, which has no date", () => {
    const live = { ...row("Scar Tissue", "Red Hot Chili Peppers") } as Record<string, unknown>;
    delete live.date;
    live["@attr"] = { nowplaying: "true" };

    const out = parseRecent({ recenttracks: { track: [live, row("Babydoll", "Dominic Fike")] } });
    expect(out[0].now).toBe(true);
    expect(out[1].now).toBe(false);
  });

  it("survives a missing album", () => {
    const bare = { name: "Untitled", artist: { "#text": "Sigur Rós" } };
    expect(parseRecent({ recenttracks: { track: [bare] } })).toEqual([
      { artist: "Sigur Rós", title: "Untitled", album: null, now: false },
    ]);
  });

  it("drops a row it could not name", () => {
    /* Nothing downstream can search for a track with no title or no artist,
       so it is dropped here rather than resolved into a null further on. */
    const out = parseRecent({
      recenttracks: {
        track: [
          { name: "", artist: { "#text": "Someone" } },
          { name: "A Song", artist: { "#text": "" } },
          row("Real", "Artist"),
        ],
      },
    });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Real");
  });

  it.each([
    ["null", null],
    ["a string", "not json"],
    ["an empty object", {}],
    ["an error body", { error: 6, message: "User not found" }],
    ["an array at the root", [1, 2, 3]],
    ["a track list of nonsense", { recenttracks: { track: [null, 4, "x"] } }],
  ])("returns [] rather than throwing for %s", (_what, input) => {
    expect(() => parseRecent(input)).not.toThrow();
    expect(parseRecent(input)).toEqual([]);
  });
});

describe("configuration", () => {
  /* Both halves or nothing. Setting the key and forgetting the user is the
     obvious mistake — one of them is called a key and reads like the whole
     credential — and it put a production deploy into the fallback state with
     no log, no error, and nothing to tell it apart from Last.fm being down.
     `unsetVars` is what `/api/music` reports so that is answerable from
     outside; it returns NAMES, never values. */
  const KEYS = ["LASTFM_API_KEY", "LASTFM_USER"] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("is not ready with neither", () => {
    expect(lastfmReady()).toBe(false);
    expect(unsetVars()).toEqual(["LASTFM_API_KEY", "LASTFM_USER"]);
  });

  it("is not ready with only the key, and says which half is missing", () => {
    process.env.LASTFM_API_KEY = "abc";
    expect(lastfmReady()).toBe(false);
    expect(unsetVars()).toEqual(["LASTFM_USER"]);
  });

  it("is not ready with only the user", () => {
    process.env.LASTFM_USER = "someone";
    expect(lastfmReady()).toBe(false);
    expect(unsetVars()).toEqual(["LASTFM_API_KEY"]);
  });

  it("treats an empty value as unset", () => {
    /* Importing this repo into Vercel offers every key in .env.example, so a
       project very easily ends up with a variable defined and empty — the trap
       lib/upstash.ts documents at length. */
    process.env.LASTFM_API_KEY = "abc";
    process.env.LASTFM_USER = "   ";
    expect(unsetVars()).toEqual(["LASTFM_USER"]);
  });

  it("is ready with both, and reports nothing missing", () => {
    process.env.LASTFM_API_KEY = "abc";
    process.env.LASTFM_USER = "someone";
    expect(lastfmReady()).toBe(true);
    expect(unsetVars()).toEqual([]);
  });
});
