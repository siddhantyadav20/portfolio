import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  bestMatch,
  scoreCandidate,
  tinyArt,
  upgradeArt,
  type Candidate,
} from "@/lib/itunes";

/* ===========================================================================
   The matcher, against what Apple actually returns.

   This is the highest-value file in the feature, and the reason is in the
   fixture rather than in the code: searching iTunes for "The Strokes — Ode to
   the Mets" does not return that recording. It returns a different band with
   the same title, a karaoke backing track, a lullaby cover, an 8-bit version,
   and the right band playing a different song. `results[0]` puts a nursery
   rhyme on the homepage under the words "Listening to".

   So every case below is a real row from a real response, captured into
   tests/fixtures/itunes.json, and the assertion is always the same shape:
   this row must not win.
   =========================================================================== */

const FIXTURES = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/itunes.json", import.meta.url)), "utf8"),
) as Record<string, Candidate[]>;

const METS = { artist: "The Strokes", title: "Ode to the Mets" };

function names(rows: readonly Candidate[]): string[] {
  return rows.map((r) => `${r.artistName} — ${r.trackName}`);
}

describe("the fixture is the problem it is here to prove", () => {
  it("does not contain the recording that was asked for", () => {
    /* If Apple ever fixes their ranking this fails, and that is a useful
       failure: it means the fallback below is no longer load-bearing and
       somebody should decide whether to keep paying two extra requests for
       it. It is not a reason to relax the scorer. */
    const genuine = FIXTURES["search-mets"].filter(
      (r) => r.artistName === "The Strokes" && /ode to the mets/i.test(r.trackName ?? ""),
    );
    expect(genuine, names(FIXTURES["search-mets"]).join("\n")).toHaveLength(0);
  });
});

describe("scoreCandidate", () => {
  it("never picks a music video", () => {
    /* The worst failure available here, because it looks like it worked:
       `entity=musicTrack` ranks the right band first, and its preview is an
       .m4v that an <audio> element loads happily and plays silently. */
    const video = FIXTURES["search-mets-musictrack"].find((r) => r.kind === "music-video");
    expect(video, "the fixture should still contain a music video").toBeDefined();
    expect(video!.previewUrl).toMatch(/\.m4v$/);
    expect(scoreCandidate(video!, METS)).toBeNull();
  });

  it.each([
    ["a different band with the same title", "The Skinwalkers"],
    ["a karaoke backing track", "Backing Business"],
    ["a lullaby cover", "Sweet Little Band"],
    ["an 8-bit version", "Arcade Player"],
  ])("rejects %s", (_what, artistName) => {
    const rows = FIXTURES["search-mets"].filter((r) => r.artistName === artistName);
    expect(rows.length, `no ${artistName} row in the fixture`).toBeGreaterThan(0);
    for (const row of rows) expect(scoreCandidate(row, METS)).toBeNull();
  });

  it("rejects the right artist playing a different song", () => {
    const wrongSong = FIXTURES["search-mets"].find(
      (r) => r.artistName === "The Strokes" && r.trackName === "The Way It Is",
    );
    expect(wrongSong).toBeDefined();
    expect(scoreCandidate(wrongSong!, METS)).toBeNull();
  });

  it("does not disqualify a word the search itself asked for", () => {
    /* "Instrumental" is disqualifying because a candidate that introduces it
       is a cover. Somebody who genuinely listened to a track with the word in
       its title must still be able to find it. */
    const row: Candidate = {
      wrapperType: "track",
      kind: "song",
      trackId: 1,
      trackName: "Instrumental",
      artistName: "Ravi Shankar",
      artworkUrl100: "https://x/100x100bb.jpg",
      previewUrl: "https://x.m4a",
    };
    expect(scoreCandidate(row, { artist: "Ravi Shankar", title: "Instrumental" })).not.toBeNull();
    expect(scoreCandidate(row, { artist: "Ravi Shankar", title: "Sitar" })).toBeNull();
  });

  it("requires audio and artwork, not just a name", () => {
    const bare: Candidate = {
      wrapperType: "track",
      kind: "song",
      trackId: 1,
      trackName: "Ode to the Mets",
      artistName: "The Strokes",
    };
    expect(scoreCandidate(bare, METS)).toBeNull();
    expect(scoreCandidate({ ...bare, previewUrl: "https://x.m4a" }, METS)).toBeNull();
    expect(
      scoreCandidate(
        { ...bare, previewUrl: "https://x.m4a", artworkUrl100: "https://x/100x100bb.jpg" },
        METS,
      ),
    ).not.toBeNull();
  });
});

describe("bestMatch", () => {
  it("returns null rather than the best of a bad set", () => {
    /* The whole point of rejection being `null` rather than a low score. An
       empty slot on the card is recoverable; a confident wrong answer is
       indistinguishable from a right one. */
    expect(bestMatch(FIXTURES["search-mets"], METS)).toBeNull();
  });

  it("finds the recording inside the artist's own catalogue", () => {
    /* What the fallback pass buys, and why it is worth two extra requests:
       the artist stops being one scoring term among many and becomes the
       query. */
    const hit = bestMatch(FIXTURES["lookup-strokes"], METS);
    expect(hit).not.toBeNull();
    expect(hit!.artistName).toBe("The Strokes");
    expect(hit!.trackName).toMatch(/ode to the mets/i);
    expect(hit!.collectionName).toBe("The New Abnormal");
    expect(hit!.previewUrl).toMatch(/\.m4a$/);
  });

  it("prefers the release that was actually played", () => {
    /* Observed on real data: "Scar Tissue" resolved to a greatest-hits
       compilation, because that is a shorter string than "Californication"
       and the tie-break had nothing better to go on. The scrobble knows which
       record was on. */
    const want = { artist: "Red Hot Chili Peppers", title: "Scar Tissue" };
    const blind = bestMatch(FIXTURES["search-scar-tissue"], want);
    const told = bestMatch(FIXTURES["search-scar-tissue"], {
      ...want,
      album: "Californication (Deluxe Edition)",
    });
    expect(told!.collectionName).toMatch(/^Californication/);
    expect(blind!.collectionName).not.toBe(told!.collectionName);
  });

  it("ignores an album it was told about but cannot honour", () => {
    const hit = bestMatch(FIXTURES["lookup-strokes"], {
      ...METS,
      album: "A Record That Does Not Exist",
    });
    expect(hit!.collectionName).toBe("The New Abnormal");
  });
});

describe("artwork rewriting", () => {
  const HUNDRED =
    "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/62/a6/ff/62a6ff2a/886448281085.jpg/100x100bb.jpg";

  it("asks for the size it will paint", () => {
    expect(upgradeArt(HUNDRED)).toMatch(/\/400x400bb\.jpg$/);
    expect(tinyArt(HUNDRED)).toMatch(/\/16x16bb\.png$/);
  });

  it("is idempotent", () => {
    /* A URL can arrive here twice — once out of the search, once out of the
       Redis cache — and must not accumulate suffixes. */
    expect(upgradeArt(upgradeArt(HUNDRED))).toBe(upgradeArt(HUNDRED));
    expect(tinyArt(upgradeArt(HUNDRED))).toBe(tinyArt(HUNDRED));
  });

  it("leaves a URL it does not recognise alone", () => {
    expect(upgradeArt("https://example.test/cover.png")).toBe("https://example.test/cover.png");
  });
});
