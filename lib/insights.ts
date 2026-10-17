import "server-only";

import { timingSafeEqual } from "node:crypto";

import { STUDIES, studyHref } from "@/content/work";
import type { StudyComment } from "@/lib/engagement";
import { readFunnel, type Funnel } from "@/lib/found/store";
import { asCount, redis, redisReady } from "@/lib/upstash";
import { dayKey, newKey } from "@/lib/visitorStore";
import { dayStamp } from "@/lib/visitors";

/* ===========================================================================
   Everything the site has measured, read back for one person.

   No new data lives here. Each surface already keeps its own numbers — the
   footer's visitor set, a study's likes and thread, the music card's thumbs,
   Found's funnel — and this reads them side by side, in as few round trips as
   the keys allow. The one addition it needed was a day dimension for
   visitors, which `lib/visitorStore.ts` now writes; everything else is
   cumulative because that is how it was always stored.

   Page views, referrers and countries are not here and are not re-collected:
   Vercel Analytics already has them, and the page links out to it.
   =========================================================================== */

/** How many days the visitor chart draws. */
export const DAYS = 30;

/** How many comments the "latest" list shows, across every study. */
const LATEST = 12;

/** How many tracks the music table shows. */
const TOP_TRACKS = 8;

export type Day = {
  readonly date: string;
  /** Distinct browsers seen that day. */
  readonly seen: number;
  /** The subset that had never been seen before. */
  readonly fresh: number;
};

export type StudyRow = {
  readonly slug: string;
  readonly title: string;
  readonly href: string;
  readonly likes: number;
  readonly comments: number;
  readonly lastAt: number | null;
};

export type LatestComment = StudyComment & {
  readonly study: string;
  readonly href: string;
  readonly likes: number;
};

export type TrackRow = {
  readonly key: string;
  readonly artist: string;
  readonly title: string;
  readonly up: number;
  readonly down: number;
};

export type Insights = {
  readonly configured: boolean;
  readonly at: number;
  readonly visitors: { readonly total: number; readonly days: readonly Day[] };
  readonly studies: readonly StudyRow[];
  readonly latest: readonly LatestComment[];
  readonly tracks: readonly TrackRow[];
  readonly found: Funnel;
};

/* --- Who may look --------------------------------------------------------- */

/**
 * Whether this request may see the page.
 *
 * The same rule as Found's funnel GET (app/api/found): open under `next dev`,
 * and behind a token everywhere else — a 404 when the token is missing, wrong,
 * or `INSIGHTS_TOKEN` was never set on Vercel. Compared in constant time,
 * because it is the one secret on a public page.
 */
export function mayView(given: unknown): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const token = process.env.INSIGHTS_TOKEN?.trim();
  if (!token || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* --- Pure helpers (tested in tests/insights.test.ts) ----------------------- */

/** The last `n` day stamps, oldest first, ending today. */
export function lastDays(n: number, now = Date.now()): string[] {
  /* 24-hour strides back from now: IST has no DST, so a stride can never
     skip or repeat a day. */
  return Array.from({ length: n }, (_, i) => dayStamp(now - (n - 1 - i) * 86_400_000));
}

/**
 * A track key back into words.
 *
 * `trackKey` folds "The Strokes" / "Ode to the Mets" into
 * `the-strokes--ode-to-the-mets`; the double dash is the separator it chose
 * precisely so this split is unambiguous. Capitalisation is lost on the way in
 * and only approximated on the way out.
 */
export function readTrackKey(key: string): { artist: string; title: string } {
  const [artist = "", title = ""] = key.split("--");
  const words = (s: string) =>
    s
      .split("-")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  return { artist: words(artist), title: words(title) };
}

/** Stored comments, tolerating the malformed rows the thread reader does. */
export function parseStored(raw: unknown): StudyComment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): StudyComment[] => {
    if (typeof entry !== "string") return [];
    try {
      const c = JSON.parse(entry) as Partial<StudyComment>;
      if (typeof c.id !== "string" || typeof c.body !== "string") return [];
      return [
        {
          id: c.id,
          name: typeof c.name === "string" ? c.name : "",
          body: c.body,
          at: typeof c.at === "number" ? c.at : 0,
        },
      ];
    } catch {
      return [];
    }
  });
}

/* --- The read ------------------------------------------------------------- */

const EMPTY_FUNNEL: Funnel = { configured: false, counts: {}, finishes: 0, medianSeconds: null };

export const NO_INSIGHTS: Insights = {
  configured: false,
  at: 0,
  visitors: { total: 0, days: [] },
  studies: [],
  latest: [],
  tracks: [],
  found: EMPTY_FUNNEL,
};

export async function readInsights(now = Date.now()): Promise<Insights> {
  if (!redisReady()) return { ...NO_INSIGHTS, at: now };

  const days = lastDays(DAYS, now);

  /* Round trip one: everything whose key is known up front. */
  const results = await redis(
    ["SCARD", "sy:visitors"],
    ...days.flatMap((d) => [
      ["SCARD", dayKey(d)] as const,
      ["SCARD", newKey(d)] as const,
    ]),
    ...STUDIES.flatMap((s) => [
      ["SCARD", `sy:s:${s.slug}:likes`] as const,
      ["LLEN", `sy:s:${s.slug}:comments`] as const,
      // The whole thread: it is capped at 500, and the latest list needs to
      // merge across studies, which a page of four cannot do.
      ["LRANGE", `sy:s:${s.slug}:comments`, 0, -1] as const,
    ]),
  );

  let i = 0;
  const total = asCount(results[i++]);
  const visitorDays = days.map((date) => ({
    date,
    seen: asCount(results[i++]),
    fresh: asCount(results[i++]),
  }));

  const threads = STUDIES.map((s) => {
    const likes = asCount(results[i++]);
    const count = asCount(results[i++]);
    const comments = parseStored(results[i++]);
    return { study: s, likes, count, comments };
  });

  const studies: StudyRow[] = threads.map(({ study, likes, count, comments }) => ({
    slug: study.slug,
    title: study.title,
    href: studyHref(study.slug),
    likes,
    comments: count,
    lastAt: comments.reduce<number | null>((m, c) => (c.at && (!m || c.at > m) ? c.at : m), null),
  }));

  const newest = threads
    .flatMap(({ study, comments }) => comments.map((c) => ({ c, study })))
    .sort((a, b) => b.c.at - a.c.at)
    .slice(0, LATEST);

  /* Round trip two: what can only be asked once the first answered — the
     likes on the newest comments, and which tracks have ever been reacted
     to (SCAN), alongside Found's own read. */
  const [commentLikes, ups, downs, found] = await Promise.all([
    newest.length
      ? redis(...newest.map(({ c, study }) => ["SCARD", `sy:s:${study.slug}:c:${c.id}:likes`] as const))
      : Promise.resolve([]),
    scan("sy:m:up:*"),
    scan("sy:m:dn:*"),
    readFunnel().catch(() => EMPTY_FUNNEL),
  ]);

  const latest: LatestComment[] = newest.map(({ c, study }, n) => ({
    ...c,
    study: study.title,
    href: studyHref(study.slug),
    likes: asCount(commentLikes[n]),
  }));

  const keys = [
    ...new Set([
      ...ups.map((k) => k.slice("sy:m:up:".length)),
      ...downs.map((k) => k.slice("sy:m:dn:".length)),
    ]),
  ];
  const counts = keys.length
    ? await redis(
        ...keys.flatMap((k) => [["SCARD", `sy:m:up:${k}`] as const, ["SCARD", `sy:m:dn:${k}`] as const]),
      )
    : [];
  const tracks: TrackRow[] = keys
    .map((key, n) => ({
      key,
      ...readTrackKey(key),
      up: asCount(counts[n * 2]),
      down: asCount(counts[n * 2 + 1]),
    }))
    .filter((t) => t.up + t.down > 0)
    .sort((a, b) => b.up + b.down - (a.up + a.down) || b.up - a.up)
    .slice(0, TOP_TRACKS);

  return {
    configured: true,
    at: now,
    visitors: { total, days: visitorDays },
    studies,
    latest,
    tracks,
    found,
  };
}

/** Every key matching a glob. SCAN, never KEYS — see scripts/purge-engagement. */
async function scan(pattern: string): Promise<string[]> {
  const found: string[] = [];
  let cursor = "0";
  let guard = 0;
  do {
    const [page] = await redis(["SCAN", cursor, "MATCH", pattern, "COUNT", 500]);
    if (!Array.isArray(page)) break;
    cursor = String(page[0]);
    if (Array.isArray(page[1])) found.push(...(page[1] as string[]));
  } while (cursor !== "0" && ++guard < 50);
  return found;
}
