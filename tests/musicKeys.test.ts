import { describe, expect, it } from "vitest";
import { timeLabel, trackKey } from "@/lib/music";

/* ===========================================================================
   The name a track answers to.

   This is the identifier a like count is stored under, so every case below is
   really the same question asked twice: will the same song, scrobbled by two
   different players on two different days, land in the same Redis set — and
   will two different songs stay out of each other's.

   Getting the first wrong splits a count in half with no way to notice. The
   second merges two, which is worse and even quieter.
   =========================================================================== */

describe("trackKey", () => {
  it("is the same song either way the apostrophe is typed", () => {
    /* The single most common split in practice. One scrobbler sends the
       typographic apostrophe, another the ASCII one, and the song is filed
       twice. */
    expect(trackKey("Red Hot Chili Peppers", "Can’t Stop")).toBe(
      trackKey("Red Hot Chili Peppers", "Can't Stop"),
    );
  });

  it("folds case and diacritics", () => {
    expect(trackKey("BEYONCÉ", "Halo")).toBe(trackKey("beyonce", "halo"));
    /* Composed vs decomposed: the same six letters, two byte sequences. A
       lowercase alone does not merge them. */
    expect(trackKey("Beyoncé", "Halo")).toBe(trackKey("Beyoncé", "Halo"));
  });

  it("drops the edition, which is a property of the release", () => {
    const plain = trackKey("The Strokes", "Ode to the Mets");
    expect(trackKey("The Strokes", "Ode to the Mets (Remastered 2020)")).toBe(plain);
    expect(trackKey("The Strokes", "Ode to the Mets - 2020 Remaster")).toBe(plain);
    expect(trackKey("The Strokes", "Ode to the Mets (Deluxe Edition)")).toBe(plain);
  });

  it("drops a feature credit, however it is spelled", () => {
    const plain = trackKey("The Weeknd", "I Feel It Coming");
    expect(trackKey("The Weeknd", "I Feel It Coming (feat. Daft Punk)")).toBe(plain);
    expect(trackKey("The Weeknd", "I Feel It Coming [ft. Daft Punk]")).toBe(plain);
  });

  it("keeps two different songs apart", () => {
    expect(trackKey("The Strokes", "Ode to the Mets")).not.toBe(
      trackKey("The Skinwalkers", "Ode to the Mets"),
    );
    expect(trackKey("The Strokes", "Ode to the Mets")).not.toBe(
      trackKey("The Strokes", "The Adults Are Talking"),
    );
  });

  it("cannot be ambiguous about where the artist ends", () => {
    /* Two separators, not one. With a single dash these two collapse into the
       same string, and a key format that *can* collide will eventually merge
       two songs' counts with nobody able to tell. */
    expect(trackKey("the-strokes", "ode")).not.toBe(trackKey("the", "strokes-ode"));
  });

  it("is safe to paste into a Redis key", () => {
    const key = trackKey("Sigur Rós", "Untitled #1 (Vaka) / 「あ」");
    expect(key).not.toMatch(/[\s:]/);
    expect(key).toMatch(/^[a-z0-9-]*--[a-z0-9-]*$/);
  });

  it("is bounded, whatever it is given", () => {
    const key = trackKey("a".repeat(500), "b".repeat(500));
    expect(key.length).toBeLessThanOrEqual(130);
  });

  it("spells the two Hindi transliterations differently, and that is the answer", () => {
    /* Written down rather than left to be discovered: Last.fm reports the
       canvas record as "Chala Jaata Hoon" and Apple sells it as "Chala Jata
       Hoon". Folding them together would need a transliteration table this
       site has no business owning, so they are two keys — which is why the six
       curated records carry an Apple id instead of being looked up by name. */
    expect(trackKey("Kishore Kumar", "Chala Jaata Hoon")).not.toBe(
      trackKey("Kishore Kumar", "Chala Jata Hoon"),
    );
  });
});

describe("timeLabel", () => {
  it("reads as a clock", () => {
    expect(timeLabel(0)).toBe("0:00");
    expect(timeLabel(9)).toBe("0:09");
    expect(timeLabel(30)).toBe("0:30");
    expect(timeLabel(221)).toBe("3:41");
    expect(timeLabel(351.787)).toBe("5:51");
  });

  it("does not throw inside an animation frame", () => {
    /* It runs sixty times a second off `audio.currentTime`, which is NaN
       before metadata loads and can briefly go negative on a seek. A clock
       that crashes the frame is worse than a clock that says 0:00. */
    expect(timeLabel(Number.NaN)).toBe("0:00");
    expect(timeLabel(-4)).toBe("0:00");
    expect(timeLabel(Infinity)).toBe("0:00");
  });
});
