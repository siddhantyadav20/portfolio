import { describe, expect, it } from "vitest";
import { buildQueue, dedupeScrobbles } from "@/lib/nowPlaying";
import { QUEUE_MAX, type Track } from "@/lib/music";
import type { Scrobble } from "@/lib/lastfm";

/* ===========================================================================
   What survives from a listening history into six rows on a card.

   The two functions here are the pure middle of `readNowPlaying`, and both
   exist because of something a real feed does: it repeats, and it names songs
   Apple has never heard of.
   =========================================================================== */

const scrobble = (artist: string, title: string): Scrobble => ({
  artist,
  title,
  album: null,
  now: false,
});

const track = (key: string): Track => ({
  key,
  title: key,
  artist: "Someone",
  album: null,
  cover: "https://x/400x400bb.jpg",
  preview: "https://x.m4a",
  lengthMs: null,
  href: null,
  accent: null,
  accentDark: null,
});

describe("dedupeScrobbles", () => {
  it("collapses a song left on repeat", () => {
    const out = dedupeScrobbles([
      scrobble("Tame Impala", "Borderline"),
      scrobble("Tame Impala", "Borderline"),
      scrobble("Tame Impala", "Borderline"),
      scrobble("Keane", "Somewhere Only We Know"),
    ]);
    expect(out.map((s) => s.title)).toEqual(["Borderline", "Somewhere Only We Know"]);
  });

  it("keeps a song that was come back to", () => {
    /* Consecutive only, and that is the distinction: an hour of one track is
       one thing worth showing, but playing something, then something else,
       then the first again is three. */
    const out = dedupeScrobbles([
      scrobble("A", "One"),
      scrobble("B", "Two"),
      scrobble("A", "One"),
    ]);
    expect(out).toHaveLength(3);
  });

  it("collapses two spellings of the same song", () => {
    /* Two players, two apostrophes, one record — see tests/musicKeys.test.ts.
       Deduping on the raw title would leave both. */
    const out = dedupeScrobbles([
      scrobble("Red Hot Chili Peppers", "Can’t Stop"),
      scrobble("Red Hot Chili Peppers", "Can't Stop"),
    ]);
    expect(out).toHaveLength(1);
  });

  it("has nothing to say about an empty history", () => {
    expect(dedupeScrobbles([])).toEqual([]);
  });
});

describe("buildQueue", () => {
  it("drops what could not be resolved", () => {
    /* A row with no audio is a dead button in a three-button transport, which
       is worse than a shorter list — and dropping here is what lets
       `Track.preview` be non-nullable everywhere downstream. */
    expect(buildQueue([track("a"), null, track("b"), null])).toHaveLength(2);
  });

  it("collapses two scrobbles that resolved to one recording", () => {
    /* Not redundant with `dedupeScrobbles`. That one collapses repeats of the
       same text; this catches a remaster and an original, which arrive as two
       rows from Last.fm and as one song from Apple. */
    expect(buildQueue([track("a"), track("b"), track("a")]).map((t) => t.key)).toEqual([
      "a",
      "b",
    ]);
  });

  it("stops at the card's length", () => {
    const many = Array.from({ length: 20 }, (_, i) => track(`t${i}`));
    expect(buildQueue(many)).toHaveLength(QUEUE_MAX);
  });

  it("is empty when nothing resolved", () => {
    /* Which is what sends `readNowPlaying` to the last known good queue, and
       failing that to a card that says it has nothing. */
    expect(buildQueue([null, null])).toEqual([]);
  });
});

describe("the transport's ends", () => {
  /* Not a component test — there is no DOM here. This is the rule the two skip
     buttons are disabled by, asserted where it can be: the queue does not
     wrap, so the first track has nothing behind it and the last has nothing
     ahead. Figma draws it — the paused mock's skip-back sits at 40%. */
  const canPrev = (i: number) => i > 0;
  const canNext = (i: number, n: number) => i < n - 1;

  it("closes both ends", () => {
    const n = 6;
    expect(canPrev(0)).toBe(false);
    expect(canNext(0, n)).toBe(true);
    expect(canPrev(n - 1)).toBe(true);
    expect(canNext(n - 1, n)).toBe(false);
  });

  it("closes both ends of a queue of one", () => {
    expect(canPrev(0)).toBe(false);
    expect(canNext(0, 1)).toBe(false);
  });
});
