import "server-only";

/* ===========================================================================
   What Siddhant has actually been listening to.

   Last.fm rather than Spotify or Apple Music, and the reasoning is worth
   writing down because the obvious two both look better on paper:

     Spotify  removed `preview_url` from the Web API in November 2024. It will
              still tell you what was played; it will no longer give you thirty
              seconds of it. A player card needs audio, so Spotify would only
              ever have been half of this — and it costs an OAuth refresh token
              to be half of it.

     Apple    personalised endpoints need a Music User Token, which only
     Music    MusicKit JS in a browser can mint, which expires every six
              months, and which sits behind a paid developer membership. Not a
              thing an unattended server route can hold.

     Last.fm  one API key, no OAuth, no refresh, no expiry, and it already
              knows: Spotify scrobbles to it natively and the Last.fm app
              scrobbles Apple Music. It is the only one of the three that is a
              single GET.

   What it does not have is audio or usable artwork — Last.fm's own images are
   placeholder stars for most tracks. Both come from `lib/itunes.ts`, which is
   why this file stops at names.
   =========================================================================== */

const API = "https://ws.audioscrobbler.com/2.0/";

/** Long enough for a cold API, short enough that a build never hangs on it.
 *  The same number `lib/fantasy.ts` settled on, for the same reason. */
const TIMEOUT_MS = 6000;

/** Five minutes. The homepage is statically rendered and re-rendered in the
 *  background at most this often, so a scrobble takes up to five minutes to
 *  appear on the card — the right trade for a card in the corner of a
 *  portfolio, and again the number `lib/fantasy.ts` argues for at length. */
const REVALIDATE = 300;

/** One scrobble, reduced to the two fields that survive into a `Track`. */
export type Scrobble = {
  readonly artist: string;
  readonly title: string;
  readonly album: string | null;
  /** True for the row Last.fm marks as playing right now. It carries no
   *  timestamp, which is how you tell it apart in the raw feed. */
  readonly now: boolean;
};

/** Whether there is anything to ask. Both halves, because a user with no key
 *  and a key with no user are each as unusable as neither. */
export function lastfmReady(): boolean {
  return Boolean(process.env.LASTFM_API_KEY && process.env.LASTFM_USER);
}

/** Which half is missing, for the log and for `/api/music`. Names only —
 *  never the values. */
export function unsetVars(): string[] {
  return ["LASTFM_API_KEY", "LASTFM_USER"].filter((k) => !process.env[k]?.trim());
}

let announced = false;

/**
 * Say so, once, when the card falls back because it was never configured.
 *
 * WRITTEN AFTER A SILENT PRODUCTION FALLBACK. Setting `LASTFM_API_KEY` and
 * forgetting `LASTFM_USER` is the obvious mistake to make — one of them is
 * called a key and reads like the whole credential — and it produced exactly
 * nothing: no log, no error, no difference from a Last.fm outage. The card sat
 * in its unavailable state and the only way to tell why was to go and look at
 * the dashboard.
 *
 * Once rather than per request, and the same shape `lib/upstash.ts` uses for
 * the same purpose: a serverless function that logs this on every render is a
 * bill rather than a diagnostic.
 */
function announce(): void {
  if (announced) return;
  announced = true;
  console.warn(
    `[lastfm] not configured — ${unsetVars().join(" and ")} unset. The music ` +
      "card will render its unavailable state. See .env.example.",
  );
}

/* --- Parsing ---------------------------------------------------------------- */

/**
 * Last.fm's JSON is XML with the corners knocked off, and it shows in three
 * places that all have to be handled or the card breaks on a normal day:
 *
 *   1. `recenttracks.track` is an ARRAY of scrobbles — unless there is exactly
 *      one, in which case it is the scrobble. A serialiser that emits a list
 *      of one as the thing itself is a genuine trap: the code works for months
 *      and then fails the first time somebody has played precisely one song.
 *
 *   2. Every leaf is an object with a `#text` key, because it used to be an
 *      XML attribute. `artist` is `{ "#text": "The Strokes", mbid: "..." }`,
 *      not a string.
 *
 *   3. The now-playing row is flagged with `@attr.nowplaying === "true"` — the
 *      string, not the boolean — and has no `date`.
 *
 * Exported separately from the fetch so it can be tested against a captured
 * response, which is the only way any of the above gets verified without a
 * network and a listening history.
 */
export function parseRecent(json: unknown): Scrobble[] {
  const root = asRecord(json);
  const recent = asRecord(root?.recenttracks);
  const raw = recent?.track;
  if (raw === undefined || raw === null) return [];

  /* Case 1. A single scrobble arrives unwrapped. */
  const rows = Array.isArray(raw) ? raw : [raw];

  const out: Scrobble[] = [];
  for (const row of rows) {
    const track = asRecord(row);
    if (!track) continue;

    const title = text(track.name);
    const artist = text(asRecord(track.artist)?.["#text"] ?? track.artist);
    /* A title or an artist is the minimum a scrobble has to have to be worth
       trying to resolve. Missing either, nothing downstream can search for it. */
    if (!title || !artist) continue;

    out.push({
      artist,
      title,
      album: text(asRecord(track.album)?.["#text"] ?? track.album) || null,
      now: asRecord(track["@attr"])?.nowplaying === "true",
    });
  }
  return out;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* --- Reading ---------------------------------------------------------------- */

/**
 * The last `limit` things played, newest first, or `null`.
 *
 * Null rather than a throw, and null rather than an empty array, because the
 * caller treats the three differently: an empty history is a real answer and
 * means the card has nothing to show, whereas "Last.fm did not answer" means
 * fall back to the last queue that worked.
 */
export async function readRecent(limit: number): Promise<Scrobble[] | null> {
  if (!lastfmReady()) {
    announce();
    return null;
  }

  const url = new URL(API);
  url.searchParams.set("method", "user.getrecenttracks");
  url.searchParams.set("user", process.env.LASTFM_USER as string);
  url.searchParams.set("api_key", process.env.LASTFM_API_KEY as string);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "sidbuilds.in (+https://sidbuilds.in)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const json = await res.json();
    /* Last.fm answers a bad key with HTTP 200 and `{ error: 10, message }`,
       so the status alone proves nothing. */
    if (asRecord(json)?.error !== undefined) {
      console.error("[lastfm]", asRecord(json)?.message);
      return null;
    }
    return parseRecent(json);
  } catch {
    // Timed out, offline, or the shape changed. The caller falls back.
    return null;
  }
}
