import "server-only";

import { redis, redisReady, asCount } from "@/lib/upstash";

/* ===========================================================================
   Turning a name into something playable.

   Last.fm says "The Strokes / Ode to the Mets". That is not audio and it is
   not artwork. Apple's iTunes Search API is both, it needs no key and no
   account, and it is the only source of thirty-second previews left standing
   after Spotify withdrew theirs.

   THE PART THAT IS NOT OBVIOUS, AND THE REASON THIS FILE IS LONG.

   Searching for a song does not return that song. Run the real query:

     search?term=the+strokes+ode+to+the+mets&entity=song&limit=8&country=US

       1. The Skinwalkers   | Ode To The Mets
       2. Backing Business  | Ode to the Mets (Originally Performed by ...)
       3. Sweet Little Band | Ode to the Mets      [Babies Go The Strokes]
       4. The Strokes       | The Way It Is
       5. Douglas Joyman, canki, Arcade Player (8-Bit), Matthew Smyth

   The actual recording is not in the results at all. A different band with the
   same title outranks it, then a karaoke backing track, then a lullaby cover,
   then the right band playing a different song. `results[0]` puts a nursery
   rhyme on the homepage under the words "Listening to".

   Switching to `entity=musicTrack` does surface The Strokes first — as a
   `kind: "music-video"` whose preview is an `.m4v`. An <audio> element loads
   that happily and plays no sound, which is the worst of the failures here
   because it looks like it worked.

   So: candidates are filtered to real songs, scored against both fields with
   the cover-version vocabulary treated as disqualifying, and when nothing
   clears the bar the search is retried inside one artist's own catalogue —
   `lookup?id=560289&entity=song&limit=200` returns 170 Strokes songs and the
   right one is among them. If that also fails the track is dropped. An empty
   slot is better than a confident wrong answer.
   =========================================================================== */

const SEARCH = "https://itunes.apple.com/search";
const LOOKUP = "https://itunes.apple.com/lookup";

const TIMEOUT_MS = 6000;

/** A day. The mapping from a song's name to its Apple id does not change; the
 *  preview URL it carries does, occasionally, which is what stops this being
 *  a week. */
const REVALIDATE = 86_400;

/**
 * The storefront to search. It changes the answer materially — the same query
 * returns five genuine Strokes tracks in `IN` and none in `US` — so it is
 * pinned rather than left to Apple's default, and configurable because the
 * right storefront is the one whose catalogue matches the listening.
 */
const COUNTRY = process.env.ITUNES_COUNTRY?.trim() || "US";

/** Apple rate-limits the search API at roughly twenty calls a minute. Sit
 *  well under it: a burst of traffic must degrade to cached answers, not to
 *  a storefront that has stopped talking to the site entirely. */
const WIRE_PER_MINUTE = 12;

export type Match = {
  readonly trackId: number;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  /** Already upgraded past the 100px thumbnail. */
  readonly cover: string;
  readonly preview: string;
  readonly lengthMs: number | null;
  readonly href: string | null;
};

/** One row of an iTunes response, as far as anything here reads it. */
export type Candidate = {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artistId?: number;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
};

/* --- Artwork ---------------------------------------------------------------- */

/**
 * The artwork at a useful size.
 *
 * `artworkUrl100` is a 100px thumbnail, and mzstatic serves any size off the
 * same path by rewriting the last segment — verified: `16x16bb.png` is 1.5KB,
 * `400x400bb.jpg` 113KB, `600x600bb.jpg` 233KB.
 *
 * 400 rather than 600 because the cover renders at 214x135 design pixels: 400
 * covers a 2x display with room to spare, and 600 is twice the bytes for
 * detail nothing can show. Idempotent, so a URL that has already been through
 * here comes out unchanged.
 */
export function upgradeArt(url100: string, size = 400): string {
  return url100.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.jpg`);
}

/** The same rewrite to a 16x16 PNG — 256 pixels, which is all the colour
 *  extraction in `lib/artColor.ts` needs and about 1.5KB on the wire. */
export function tinyArt(url100: string): string {
  return url100.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/16x16bb.png");
}

/* --- Scoring ---------------------------------------------------------------- */

/**
 * The vocabulary of a recording that is not the recording.
 *
 * Every one of these was observed in the top eight results for a single
 * ordinary query. They are treated as disqualifying rather than as a penalty,
 * because there is no score at which a karaoke backing track is the right
 * answer — if the real one is missing, the answer is that it is missing.
 */
const IMPOSTOR =
  /\b(karaoke|tribute|instrumental|backing track|originally performed|made famous|in the style of|8[- ]?bit|babies go|lullaby|rockabye|string quartet|piano version|cover version|as made famous|workout mix|sleep sounds)\b/i;

/** Punctuation and case are noise when comparing two catalogues' spelling of
 *  the same name. Kept local rather than shared with `trackKey`, which folds
 *  much harder — it strips "(Remastered)", and here that is a distinction
 *  worth scoring rather than erasing. */
function norm(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type Want = {
  artist: string;
  title: string;
  /**
   * The album the scrobble named, when it named one. Never scored — only used
   * to break a tie, and only in that direction.
   *
   * It earns its place on real data: "Scar Tissue" and "Can\u2019t Feel My Face"
   * both resolved to a greatest-hits compilation, because "Greatest Hits" is a
   * shorter string than "Californication" and the tie-break had nothing better
   * to go on. The player reported the album it actually played; preferring it
   * puts the right sleeve on the card.
   */
  album?: string | null;
};

/**
 * How well a candidate answers `want`, or `null` for "not this one".
 *
 * Null is not zero. A caller must not be able to take the best of a bad set by
 * accident, which is exactly what returning 0 for a rejected row would let it
 * do, so rejection is a different type rather than a low number.
 *
 * Both fields must match for anything to come back. The two failures this
 * prevents are symmetrical and both were observed: a different band playing
 * the right title, and the right band playing a different song.
 */
export function scoreCandidate(c: Candidate, want: Want): number | null {
  /* A song, with audio. `music-video` is the dangerous one — it matches on
     both fields and its preview is an .m4v that <audio> plays silently. */
  if (c.wrapperType !== "track" || c.kind !== "song") return null;
  if (!c.previewUrl || !c.trackId || !c.trackName || !c.artistName) return null;
  if (!c.artworkUrl100) return null;

  const haystack = `${c.trackName} ${c.artistName} ${c.collectionName ?? ""}`;
  /* Only disqualifying when the *candidate* introduces the word. Somebody who
     genuinely listened to "Karaoke" by Boygenius should still be able to find
     it, so the term has to be absent from what was asked for. */
  if (IMPOSTOR.test(haystack) && !IMPOSTOR.test(`${want.title} ${want.artist}`)) {
    return null;
  }

  const artist = pairScore(norm(c.artistName), norm(want.artist));
  if (artist === 0) return null;
  const title = pairScore(norm(c.trackName), norm(want.title));
  if (title === 0) return null;

  /* Artist dominates. Two songs called the same thing is ordinary; a band
     appearing under a slightly different spelling is not, so a weaker title
     match on the right artist beats a perfect title on the wrong one. */
  return artist * 10 + title;
}

/** 3 exact, 2 the candidate is the wanted one plus a suffix, 1 the wanted one
 *  appears inside it, 0 unrelated. The asymmetry is deliberate: "Ode to the
 *  Mets (Live)" is a plausible answer to "Ode to the Mets", while "Ode" is
 *  not a plausible answer to "Ode to the Mets and Back". */
function pairScore(candidate: string, want: string): number {
  if (!candidate || !want) return 0;
  if (candidate === want) return 3;
  if (candidate.startsWith(`${want} `)) return 2;
  if (candidate.includes(want) || want.includes(candidate)) return 1;
  return 0;
}

/**
 * The best candidate, or null.
 *
 * Three keys, in order: the score, then whether the release is the one that
 * was actually played, then the shorter name — which is a proxy for the
 * plainest release ("Ode To The Mets" over "Ode To The Mets (Deluxe Edition
 * Bonus Track)" when both are the same band and the same song).
 */
export function bestMatch(rows: readonly Candidate[], want: Want): Candidate | null {
  const wantAlbum = want.album ? norm(want.album) : "";

  let best: Candidate | null = null;
  let bestRank: [number, number, number] = [0, 0, Infinity];

  for (const row of rows) {
    const score = scoreCandidate(row, want);
    if (score === null) continue;

    const album = norm(row.collectionName ?? "");
    const sameAlbum =
      wantAlbum && album && (album === wantAlbum || album.startsWith(`${wantAlbum} `))
        ? 1
        : 0;
    const rank: [number, number, number] = [
      score,
      sameAlbum,
      `${row.trackName ?? ""}${row.collectionName ?? ""}`.length,
    ];

    if (better(rank, bestRank)) {
      best = row;
      bestRank = rank;
    }
  }
  return best;
}

/** Score high, album match high, name length low. */
function better(a: [number, number, number], b: [number, number, number]): boolean {
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] < b[2];
}

export function toMatch(c: Candidate): Match {
  return {
    trackId: c.trackId as number,
    title: c.trackName as string,
    artist: c.artistName as string,
    album: c.collectionName ?? null,
    cover: upgradeArt(c.artworkUrl100 as string),
    preview: c.previewUrl as string,
    lengthMs: typeof c.trackTimeMillis === "number" ? c.trackTimeMillis : null,
    href: c.trackViewUrl ?? null,
  };
}

/* --- The wire --------------------------------------------------------------- */

/**
 * One token from the minute's budget, or false.
 *
 * `INCR` then `EXPIRE ... NX`: the counter is created by the increment and the
 * expiry is only set the first time, so the window is a fixed minute from the
 * first call rather than one that slides forward with every request and never
 * resets. Without Redis there is nothing to count with and the call goes
 * ahead — a single developer machine is not the traffic this guards against.
 */
async function takeToken(): Promise<boolean> {
  if (!redisReady()) return true;
  try {
    const [count] = await redis(["INCR", "sy:m:rl"], ["EXPIRE", "sy:m:rl", 60, "NX"]);
    return asCount(count) <= WIRE_PER_MINUTE;
  } catch {
    return true;
  }
}

async function get(url: URL): Promise<Candidate[] | null> {
  if (!(await takeToken())) {
    console.warn("[itunes] minute budget spent — serving cache only");
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "sidbuilds.in (+https://sidbuilds.in)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: Candidate[] };
    return Array.isArray(body.results) ? body.results : null;
  } catch {
    return null;
  }
}

/**
 * Resolve one name to something playable.
 *
 * Two passes, and the second is the one that actually works for anything
 * whose title is also a common phrase. See the header.
 */
export async function searchTrack(want: Want): Promise<Match | null> {
  const url = new URL(SEARCH);
  url.searchParams.set("term", `${want.artist} ${want.title}`);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "25");
  url.searchParams.set("country", COUNTRY);

  const direct = await get(url);
  const hit = direct ? bestMatch(direct, want) : null;
  if (hit) return toMatch(hit);

  const scoped = await searchWithinArtist(want);
  return scoped ? toMatch(scoped) : null;
}

/**
 * The fallback: find the artist, then look inside their catalogue.
 *
 * Two extra requests, which is why it is a fallback and not the first thing
 * tried. It works where search does not because the artist is no longer one
 * scoring term among many — it is the query.
 */
async function searchWithinArtist(want: Want): Promise<Candidate | null> {
  const find = new URL(SEARCH);
  find.searchParams.set("term", want.artist);
  find.searchParams.set("entity", "musicArtist");
  find.searchParams.set("limit", "1");
  find.searchParams.set("country", COUNTRY);

  const artists = await get(find);
  const artistId = artists?.[0]?.artistId;
  if (!artistId) return null;

  const url = new URL(LOOKUP);
  url.searchParams.set("id", String(artistId));
  url.searchParams.set("entity", "song");
  /* Apple's ceiling. Enough for a full discography — The Strokes come back as
     170 rows — and the alternative is paging, for a fallback path. */
  url.searchParams.set("limit", "200");
  url.searchParams.set("country", COUNTRY);

  const rows = await get(url);
  return rows ? bestMatch(rows, want) : null;
}

/**
 * Resolve known ids in one request.
 *
 * For the canvas, whose six records are curated and whose ids are written down
 * in `content/canvas.ts` — so none of the matching problem above applies to
 * them, by construction.
 *
 * Keyed by `trackId` on the way out rather than trusted positionally: the
 * response is not ordered by the request, and a lookup also returns
 * `wrapperType: "collection"` rows that are not tracks at all.
 */
export async function lookupTracks(
  ids: readonly number[],
): Promise<Map<number, Match>> {
  const out = new Map<number, Match>();
  if (ids.length === 0) return out;

  const url = new URL(LOOKUP);
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("entity", "song");
  url.searchParams.set("country", COUNTRY);

  const rows = await get(url);
  for (const row of rows ?? []) {
    if (row.wrapperType !== "track" || row.kind !== "song") continue;
    if (!row.trackId || !row.previewUrl || !row.artworkUrl100) continue;
    out.set(row.trackId, toMatch(row));
  }
  return out;
}
