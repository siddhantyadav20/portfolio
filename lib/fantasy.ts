import "server-only";
import { crestOf, toneOf } from "./clubs";
import { fantasy as written } from "@/content/site";

/**
 * The Fantasy card's data — phase 3.
 *
 * Reads the Premier League fixture list and one manager's gameweek history off
 * the public FPL API, and falls back to the values written down in
 * `content/site.ts` whenever it cannot. Nothing here throws: the homepage is
 * statically rendered, so a five-second wobble at fantasy.premierleague.com
 * must not be able to fail a build or blank a card. Every failure path lands on
 * the same written-down fixture the card shipped with in phase 1, and the
 * caller is told which it got.
 *
 * NO KEY, NO ACCOUNT, NO SECRET. These three endpoints are public and
 * unauthenticated — `FPL_ENTRY_ID` is a manager's public profile number, the
 * one in the URL of their own points page, not a credential. It is in the
 * environment rather than in the repo because it is Siddhant's, not because it
 * is sensitive.
 *
 * WHAT REVALIDATION BUYS. Each fetch carries `revalidate: 300`, so the page
 * stays static and is re-rendered in the background at most every five
 * minutes. A live score is therefore up to five minutes stale, which is the
 * right trade for a card in the corner of a portfolio: the alternative is
 * rendering the homepage per request for a number nobody is refreshing.
 */

const API = "https://fantasy.premierleague.com/api";

/** Long enough for a cold API, short enough that a build never hangs on it. */
const TIMEOUT_MS = 6000;

/** Five minutes. See the note above. */
const REVALIDATE = 300;

/* A KNOWN BUILD WARNING, AND IT IS ACCEPTED RATHER THAN MISSED.
 *
 *   Failed to set Next.js data cache for .../bootstrap-static/,
 *   items over 2MB can not be cached (2311612 bytes)
 *
 * `bootstrap-static` is 2.3MB — every player, fixture and price in the league —
 * and this card reads three small parts of it. Next declines to put a response
 * that size in its data cache, so that one fetch is not individually cached.
 *
 * It costs nothing that matters. The homepage is statically rendered with
 * `revalidate: 300`, so the *route* cache is what decides how often any of this
 * runs: the page is rebuilt at most once every five minutes and the fetch
 * happens then, on the server, once, for everybody. The data cache would only
 * buy sharing between routes, and there is exactly one consumer.
 *
 * The alternative is a proxy that trims the payload before it is cached, which
 * is a server to own and keep alive for a warning that describes no symptom. */


export type FixtureState = "upcoming" | "live" | "finished";

export type Side = {
  /** As the API spells it — "Man Utd", "Spurs", "Nott'm Forest". */
  name: string;
  short: string;
  crest: string;
  color: string;
  colorDark: string;
  /** Null until the match kicks off. */
  score: number | null;
};

export type Fixture = {
  state: FixtureState;
  /** ISO 8601, UTC. Null for a fixture the league has not scheduled yet. */
  kickoff: string | null;
  /** Minutes played. 0 before kickoff, 90 at full time. */
  minutes: number;
  home: Side;
  away: Side;
  /**
   * How many of Siddhant's own players are in this match, and which side they
   * are mostly on.
   *
   * THIS IS WHY THE CARD SHOWS *THIS* MATCH. Without it the fixture is picked
   * by club strength — a reasonable guess at "the big game", and a shrug: it
   * has nothing to do with him, so the fixture at the top and the points at
   * the bottom are two unrelated facts sharing a card. With it, the match on
   * screen is the one his gameweek is actually riding on, and the two halves
   * are one sentence.
   *
   * `null` when the manager is not configured or the API would not say, in
   * which case the card simply does not draw the line.
   */
  players: { count: number; side: "home" | "away" | "both" } | null;
};

export type Week = {
  gw: number;
  score: number;
  /**
   * The gameweek is open — its matches have not all been played.
   *
   * This exists because a live card is read mid-gameweek more often than not,
   * and FPL reports a week's points as they accrue: 0 from the deadline until
   * the reader's first player touches the ball. A bare "0" under "GW 3" reads
   * as a broken card rather than as a Saturday morning, so the component shows
   * a dash for a pending week that has not scored yet — and the real number
   * the moment there is one, which is the same field ticking up.
   */
  pending: boolean;
};

export type Fantasy = {
  fixture: Fixture;
  /**
   * The season so far, OLDEST FIRST — which is the opposite of what this used
   * to hold, and the reason is that it is drawn as a chart now rather than as
   * three figures.
   *
   * A sparkline reads left to right in time, so document order is time order
   * and nothing has to be reversed at render. The card still calls out the
   * current gameweek; it is simply the last entry rather than the first.
   */
  points: Week[];
  overallRank: number | null;
  /** Whether any of this came off the wire. The card says so in dev. */
  source: "live" | "written";
};

/* --- The wire ------------------------------------------------------------- */

type ApiTeam = { id: number; name: string; short_name: string; strength: number };
type ApiEvent = { id: number; is_current: boolean; is_next: boolean; finished: boolean };
type ApiFixture = {
  event: number | null;
  kickoff_time: string | null;
  started: boolean | null;
  finished: boolean;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
};
type ApiHistory = {
  current: { event: number; points: number; overall_rank: number | null }[];
};
/** The manager's own summary. The only place the *live* gameweek score and the
 *  *current* overall rank exist — see the note at the call site. */
type ApiEntry = {
  current_event: number | null;
  summary_event_points: number | null;
  summary_overall_rank: number | null;
};
/** The fifteen players picked for a gameweek. `element` indexes
 *  `bootstrap-static`'s `elements`, whose `team` is the club. */
type ApiPicks = { picks: { element: number; multiplier: number }[] };
type ApiElement = { id: number; team: number };

/**
 * A JSON GET that resolves to null instead of throwing.
 *
 * The FPL API answers 403 to a request with no User-Agent, which is the one
 * failure worth naming here because it looks like a permissions problem and is
 * not.
 */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; sidbuilds.in)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Timed out, offline, or the shape changed. The caller falls back.
    return null;
  }
}

/* --- Choosing the fixture -------------------------------------------------- */

/**
 * Which of the gameweek's ten matches the card is "watching".
 *
 * A live match wins outright — a card that says "Watching next" while a game
 * is being played is looking the wrong way. Otherwise it is the next one to
 * kick off, and if the gameweek is over, the last one played, so the card
 * always has something true to say rather than going blank between weeks.
 *
 * `FPL_CLUB` narrows all of that to one club's matches — set it to a short
 * name (`mun`, `ars`, `liv`) and the card follows that team through the
 * season. Unset, the tie-break among upcoming matches is the strongest pair on
 * the pitch, which is a reasonable reading of "the one worth watching" and
 * means the card needs no configuration to be interesting.
 */
function pickFixture(
  fixtures: ApiFixture[],
  teams: Map<number, ApiTeam>,
  club: string | undefined,
  /** His players per club id. Empty when the manager is not configured. */
  squad: Map<number, number>,
): ApiFixture | null {
  const mine = club
    ? fixtures.filter((f) => {
        const h = teams.get(f.team_h)?.short_name.toLowerCase();
        const a = teams.get(f.team_a)?.short_name.toLowerCase();
        return h === club || a === club;
      })
    : fixtures;

  const pool = mine.length > 0 ? mine : fixtures;
  if (pool.length === 0) return null;

  const live = pool.filter((f) => f.started && !f.finished);
  /* More than one match is usually live at once — a Saturday 15:00 is five or
     six — so this is a ranking, not a `[0]`. Same order as everything below:
     his players first. */
  if (live.length > 0) return live.sort(byInterest)[0];

  const upcoming = pool
    .filter((f) => !f.started && f.kickoff_time)
    .sort((a, b) => Date.parse(a.kickoff_time!) - Date.parse(b.kickoff_time!));

  if (upcoming.length > 0) {
    // Everything at the earliest kickoff, then the most interesting of those.
    const first = Date.parse(upcoming[0].kickoff_time!);
    return upcoming
      .filter((f) => Date.parse(f.kickoff_time!) === first)
      .sort(byInterest)[0];
  }

  return pool
    .filter((f) => f.kickoff_time)
    .sort((a, b) => Date.parse(b.kickoff_time!) - Date.parse(a.kickoff_time!))[0] ?? null;

  /**
   * Which of two matches is more worth watching, most-interesting first.
   *
   * HIS OWN PLAYERS FIRST, and that is the whole point of the change. Club
   * strength answers "which is the big game", which is a fact about football
   * and not about him; the number of his players on the pitch answers "which
   * one is his gameweek riding on", which is the only reason this card has an
   * opinion about a fixture at all. Strength is kept as the tie-break, so a
   * week where he owns nobody in any of the ten still picks something sensible
   * rather than the first in the list.
   */
  function byInterest(a: ApiFixture, b: ApiFixture) {
    const owned = (f: ApiFixture) =>
      (squad.get(f.team_h) ?? 0) + (squad.get(f.team_a) ?? 0);
    const strength = (f: ApiFixture) =>
      (teams.get(f.team_h)?.strength ?? 0) + (teams.get(f.team_a)?.strength ?? 0);
    return owned(b) - owned(a) || strength(b) - strength(a);
  }
}

function sideOf(team: ApiTeam, score: number | null): Side {
  const { color, colorDark } = toneOf(team.short_name);
  return {
    name: team.name,
    short: team.short_name,
    crest: crestOf(team.short_name),
    color,
    colorDark,
    score,
  };
}

function stateOf(f: ApiFixture): FixtureState {
  if (f.finished) return "finished";
  if (f.started) return "live";
  return "upcoming";
}

/* --- The written-down card ------------------------------------------------- */

/**
 * Phase 1's card, rebuilt through the same types.
 *
 * The colours come from `lib/clubs.ts` here too rather than being repeated in
 * the copy file, so the fallback and the live card cannot drift apart — that
 * was the whole reason the two hand-written hexes came out of `content/site.ts`.
 */
function writtenCard(): Fantasy {
  const { fixture, points } = written;
  const side = (short: string, name: string, score: number | null): Side => {
    const { color, colorDark } = toneOf(short);
    return { name, short, crest: crestOf(short), color, colorDark, score };
  };

  return {
    fixture: {
      state: "upcoming",
      kickoff: fixture.kickoff,
      minutes: 0,
      home: side(fixture.home.short, fixture.home.name, null),
      away: side(fixture.away.short, fixture.away.name, null),
      /* Nothing written down knows whose players are in it. The card draws no
         line rather than an invented one. */
      players: null,
    },
    /* The written-down card is a record of something that already happened, so
       nothing in it is pending — and it is oldest-first, like the live one, so
       the chart can render either without knowing which it got. */
    points: [...points]
      .map(({ gw, score }) => ({ gw, score, pending: false }))
      .sort((a, b) => a.gw - b.gw),
    overallRank: null,
    source: "written",
  };
}

/* --- The card -------------------------------------------------------------- */

export async function readFantasy(): Promise<Fantasy> {
  const entry = process.env.FPL_ENTRY_ID?.trim();
  const club = process.env.FPL_CLUB?.trim().toLowerCase() || undefined;

  const bootstrap = await get<{
    teams: ApiTeam[];
    events: ApiEvent[];
    elements: ApiElement[];
  }>("/bootstrap-static/");
  if (!bootstrap) return writtenCard();

  const teams = new Map(bootstrap.teams.map((t) => [t.id, t]));

  /* The current gameweek, or the next one if the season has not started and
     `is_current` is therefore on nothing. */
  const event =
    bootstrap.events.find((e) => e.is_current) ??
    bootstrap.events.find((e) => e.is_next);
  if (!event) return writtenCard();

  const [fixtures, history, summary, picks] = await Promise.all([
    get<ApiFixture[]>(`/fixtures/?event=${event.id}`),
    /* Only asked for when the manager is configured. Without it the fixture is
       still live and only the points fall back — a half-live card, which beats
       a written-down one. */
    entry ? get<ApiHistory>(`/entry/${entry}/history/`) : Promise.resolve(null),
    /* TWO ENDPOINTS FOR ONE ROW, AND THE REASON IS THAT THEY DISAGREE.

       `history` is the record of finished gameweeks and it is authoritative
       for those. It is NOT authoritative for the one being played: through a
       live gameweek it reports that week's points as 0 and repeats the
       previous week's overall rank, and only settles once the week is
       verified. Read alone it made this card claim a rank of 2.4m during a
       weekend when the real figure was 1.0m, and a dash where 21 points had
       already been scored.

       `/entry/` carries the live pair — `summary_event_points` and
       `summary_overall_rank` — so the current week and the rank come from
       here and everything behind them from `history`. Which is also what
       makes the headline number climb through a Saturday, rather than sitting
       at nothing until Monday. */
    entry ? get<ApiEntry>(`/entry/${entry}/`) : Promise.resolve(null),
    /* His fifteen for this gameweek — what makes the fixture *his*. See
       `pickFixture`. Cheapest of the four and the only one that changes what
       match is shown. */
    entry
      ? get<ApiPicks>(`/entry/${entry}/event/${event.id}/picks/`)
      : Promise.resolve(null),
  ]);

  /* His players per club, counted once. `multiplier > 0` is the eleven who are
     actually starting — a benched player is not on the pitch and should not
     make a match look like it matters more than it does. */
  const elements = new Map(bootstrap.elements.map((e) => [e.id, e.team]));
  const squad = new Map<number, number>();
  for (const pick of picks?.picks ?? []) {
    if (pick.multiplier <= 0) continue;
    const team = elements.get(pick.element);
    if (team === undefined) continue;
    squad.set(team, (squad.get(team) ?? 0) + 1);
  }

  const fallback = writtenCard();

  /* --- The fixture --- */
  let fixture = fallback.fixture;
  const picked = fixtures ? pickFixture(fixtures, teams, club, squad) : null;
  const home = picked ? teams.get(picked.team_h) : undefined;
  const away = picked ? teams.get(picked.team_a) : undefined;

  if (picked && home && away) {
    const atHome = squad.get(picked.team_h) ?? 0;
    const away_ = squad.get(picked.team_a) ?? 0;
    const count = atHome + away_;

    fixture = {
      state: stateOf(picked),
      kickoff: picked.kickoff_time,
      minutes: picked.minutes,
      home: sideOf(home, picked.team_h_score),
      away: sideOf(away, picked.team_a_score),
      /* Which side to lean the line's colour toward. `both` when he owns
         players on each — a genuinely divided allegiance, and the one case
         where picking a colour would be a lie. */
      players:
        count > 0
          ? {
              count,
              side: atHome > 0 && away_ > 0 ? "both" : atHome > 0 ? "home" : "away",
            }
          : null,
    };
  }

  /* --- The points ---
     THE WHOLE SEASON, OLDEST FIRST. It used to be the last three, newest
     first, because the card drew three figures; it draws a chart now, and a
     chart wants every week it has and wants them in time order — see the note
     on `Fantasy["points"]`. Nothing is sliced here: the card decides how much
     of a season it has room for, not the fetch. */
  let points = fallback.points;
  let overallRank = fallback.overallRank;

  if (history?.current?.length) {
    const weeks = history.current.filter((w) => typeof w.points === "number");

    points = weeks
      .map((w) => {
        /* Open until the league says every match in it is done. `finished` is
           the gameweek's own flag, not a guess from the fixture list. */
        const pending = w.event === event.id && !event.finished;

        /* The live score for the week in progress, where there is one. See the
           note at the fetch: `history` reports this week as 0 until it is
           verified, and the summary is the only endpoint that counts it up as
           the matches are played. */
        const live =
          pending && summary?.current_event === w.event
            ? summary.summary_event_points
            : null;

        return {
          gw: w.event,
          score: typeof live === "number" ? live : w.points,
          pending,
        };
      });

    /* Same split: the summary's rank is current, the history's is the rank as
       each week closed — which through a live week is last week's. */
    overallRank =
      summary?.summary_overall_rank ??
      weeks[weeks.length - 1]?.overall_rank ??
      null;
  }

  return {
    fixture,
    points,
    overallRank,
    source: picked || history ? "live" : "written",
  };
}
