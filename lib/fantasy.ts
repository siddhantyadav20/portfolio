import "server-only";
import { crestDarkOf, crestOf, toneOf } from "./clubs";
import { fantasy as written } from "@/content/site";

/**
 * The Fantasy card's data — phase 4, the "Football Card" redesign.
 *
 * Reads the Premier League fixture list and one manager's season off the
 * public FPL API, and falls back to the fixture written down in
 * `content/site.ts` whenever it cannot. Nothing here throws: a five-second
 * wobble at fantasy.premierleague.com must not be able to fail a render or
 * blank a card. Every failure path lands on the written-down fixture, and the
 * caller is told which it got.
 *
 * NO KEY, NO ACCOUNT, NO SECRET. These endpoints are public and
 * unauthenticated — the entry id is a manager's public profile number, the one
 * in the URL of their own points page, not a credential.
 *
 * WHY THE ID NOW HAS A WRITTEN-DOWN DEFAULT. It used to live only in
 * `FPL_ENTRY_ID`, which was set in `.env.local` and never on the host. So
 * production ran with no manager at all: the fixture was live (it needs no
 * id) and every number under it was phase 1's hand-written 73 / 86 / 64 —
 * which is why the points looked frozen at the week the card shipped. The id
 * is in `content/site.ts` now, and the environment variable still overrides it.
 *
 * WHAT REVALIDATION BUYS. Each small fetch carries `revalidate: 300`, so a live
 * number is up to five minutes stale. The homepage renders per request (the
 * footer's live-visitor count reads headers), so that data cache is what keeps
 * this from being four round trips to the FPL API per page view.
 */

const API = "https://fantasy.premierleague.com/api";

/** Long enough for a cold API, short enough that a render never hangs on it. */
const TIMEOUT_MS = 6000;

/** Five minutes. See the note above. */
const REVALIDATE = 300;

export type FixtureState = "upcoming" | "live" | "finished";

export type Side = {
  /** As the API spells it — "Man Utd", "Spurs", "Nott'm Forest". */
  name: string;
  short: string;
  crest: string;
  /** The dark card's badge — no white keyline. */
  crestDark: string;
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
};

/** Which way the overall rank went against the gameweek before. "up" is a
 *  smaller number — a better rank — which is how anyone playing reads it. */
export type RankMove = "up" | "down" | "same";

export type Stats = {
  /** Season total. The live summary's while a gameweek is being played. */
  total: number | null;
  rank: number | null;
  /** Null in gameweek 1, or whenever there is no week before to compare. */
  move: RankMove | null;
};

/** The player who has scored the most points *for him* this season. */
export type TopPlayer = {
  /** FPL's short name — "Isak", "M.Salah", "Bruno G." — the one on the shirt
   *  and the one the game itself prints. */
  name: string;
  /** Every point that player has put on his score, across every gameweek
   *  they were in his team — captaincy included, bench excluded. Points a
   *  player scored for other managers, or for him while benched, are not his. */
  points: number;
  photo: string;
  color: string;
  colorDark: string;
};

export type Fantasy = {
  fixture: Fixture;
  stats: Stats;
  top: TopPlayer | null;
  /** Whether any of this came off the wire. The card says so in dev. */
  source: "live" | "written";
};

/* --- The wire ------------------------------------------------------------- */

type ApiTeam = { id: number; name: string; short_name: string; strength: number };
/** `data_checked` is the league's "bonus added, numbers final" flag — a week
 *  can be `finished` for a day before it is. */
type ApiEvent = {
  id: number;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  data_checked: boolean;
};
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
  current: { event: number; total_points: number; overall_rank: number | null }[];
};
/** The manager's own summary. The only place the *live* season total and the
 *  *current* overall rank exist — see the note at the call site. */
type ApiEntry = {
  current_event: number | null;
  summary_overall_points: number | null;
  summary_overall_rank: number | null;
};
/** The fifteen players picked for a gameweek. `element` indexes
 *  `bootstrap-static`'s `elements`. `multiplier` is 0 on the bench, 2 or 3 on
 *  the captain — AS PICKED, not as scored: `automatic_subs` sits beside the
 *  list rather than being applied to it. See `weekTally`. */
type ApiPick = {
  element: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
};
export type ApiPicks = {
  picks: ApiPick[];
  automatic_subs?: { element_in: number; element_out: number }[];
};
/** `code` is what the Premier League's photo URLs are keyed on, not `id`. */
type ApiElement = { id: number; team: number; web_name: string; code: number };
type ApiLive = {
  elements: { id: number; stats: { total_points: number; minutes: number } }[];
};

type Bootstrap = { teams: ApiTeam[]; events: ApiEvent[]; elements: ApiElement[] };

/**
 * A JSON GET that resolves to null instead of throwing.
 *
 * The FPL API answers 403 to a request with no User-Agent, which is the one
 * failure worth naming here because it looks like a permissions problem and is
 * not.
 */
async function get<T>(
  path: string,
  { fresh = false, revalidate = REVALIDATE } = {},
): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; sidbuilds.in)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(fresh ? { cache: "no-store" as const } : { next: { revalidate } }),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Timed out, offline, or the shape changed. The caller falls back.
    return null;
  }
}

/* --- bootstrap-static, kept small ----------------------------------------- */

/**
 * `bootstrap-static` is 2.3MB — every player, fixture and price in the league —
 * and Next's data cache refuses anything over 2MB. On a page that renders per
 * request, that meant the whole file came down from the FPL API on *every*
 * homepage view, for the sake of a few hundred bytes of it.
 *
 * So it is fetched uncached, trimmed to the fields this file reads (about 60KB
 * for a full squad list), and held in module memory for the same five minutes
 * everything else gets. A warm server instance serves every visitor from that;
 * a cold one pays for one fetch. `unstable_cache` would do the same job and is
 * deprecated in this version of Next in favour of `use cache`, which needs Cache
 * Components switched on for the whole site — too big a lever for one card.
 *
 * A failed refresh keeps serving the last good copy: a five-minute-old squad
 * list is right, and the written-down card is not.
 */
let memo: { at: number; value: Bootstrap } | null = null;

async function bootstrap(): Promise<Bootstrap | null> {
  if (memo && Date.now() - memo.at < REVALIDATE * 1000) return memo.value;

  const raw = await get<Bootstrap>("/bootstrap-static/", { fresh: true });
  if (!raw) return memo?.value ?? null;

  const value: Bootstrap = {
    teams: raw.teams.map(({ id, name, short_name, strength }) => ({ id, name, short_name, strength })),
    events: raw.events.map(({ id, is_current, is_next, finished, data_checked }) => ({
      id,
      is_current,
      is_next,
      finished,
      data_checked,
    })),
    elements: raw.elements.map(({ id, team, web_name, code }) => ({ id, team, web_name, code })),
  };
  memo = { at: Date.now(), value };
  return value;
}

/* --- Choosing the fixture -------------------------------------------------- */

/**
 * Which of the gameweek's ten matches the card is "watching".
 *
 * A live match wins outright — a card that says "Watching next" while a game
 * is being played is looking the wrong way. Otherwise it is the next one to
 * kick off, and if the gameweek is over, the last one played.
 *
 * `FPL_CLUB` narrows all of that to one club's matches — set it to a short
 * name (`mun`, `ars`, `liv`) and the card follows that team through the
 * season. Unset, the tie-break is his own players and then club strength.
 */
function pickFixture(
  fixtures: ApiFixture[],
  teams: Map<number, ApiTeam>,
  club: string | undefined,
  /** His players per club id. Empty when the picks could not be read. */
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
     six — so this is a ranking, not a `[0]`. */
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
   * Which of two matches is more worth watching, most-interesting first: the
   * one with more of his own players in it, then the stronger pair on paper —
   * so a week where he owns nobody in any of the ten still picks something
   * sensible rather than the first in the list.
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
    crestDark: crestDarkOf(team.short_name),
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

/* --- The numbers ----------------------------------------------------------- */

/** Rank against the rank before. Null when either is unknown, so the card
 *  draws no arrow rather than a guessed one. */
export function rankMove(now: number | null, before: number | null): RankMove | null {
  if (now === null || before === null) return null;
  if (now < before) return "up";
  if (now > before) return "down";
  return "same";
}

/**
 * What each of his players scored *for him* in one gameweek — their points
 * times the multiplier they actually ended the week on.
 *
 * `picks` is the team as picked, not as scored, so two things are applied here
 * that the API leaves beside it: the automatic substitutions, and the armband
 * passing to the vice-captain when the captain does not play. The armband only
 * moves once the week is `finished` — through a live week, a captain on 0
 * minutes may simply not have kicked off yet.
 *
 * Checked against his official score for gameweeks 1–3 (63, 83, 74, one of
 * them a Bench Boost): exact, to the point.
 */
export function weekTally(
  picks: ApiPicks,
  live: Map<number, { points: number; minutes: number }>,
  finished: boolean,
): Map<number, number> {
  const multiplier = new Map(picks.picks.map((p) => [p.element, p.multiplier]));

  for (const sub of picks.automatic_subs ?? []) {
    multiplier.set(sub.element_in, 1);
    multiplier.set(sub.element_out, 0);
  }

  if (finished) {
    const captain = picks.picks.find((p) => p.is_captain);
    const vice = picks.picks.find((p) => p.is_vice_captain);
    const played = (element: number) => (live.get(element)?.minutes ?? 0) > 0;
    if (captain && vice && !played(captain.element) && played(vice.element)) {
      /* The captain's *picked* multiplier, not the map's — an autosub may
         already have zeroed the captain, and a Triple Captain passes on 3. */
      multiplier.set(vice.element, captain.multiplier);
      multiplier.set(captain.element, 0);
    }
  }

  const tally = new Map<number, number>();
  for (const [element, m] of multiplier) {
    if (m <= 0) continue;
    tally.set(element, (live.get(element)?.points ?? 0) * m);
  }
  return tally;
}

/** The highest total in a tally. A tie goes to whoever reached it first — a
 *  Map keeps the order players first appeared in his team. */
export function leader(tally: Map<number, number>): { element: number; points: number } | null {
  let best: { element: number; points: number } | null = null;
  for (const [element, points] of tally) {
    if (!best || points > best.points) best = { element, points };
  }
  return best;
}

/** A day. A settled gameweek's numbers are final, so its fetches are cached
 *  this long rather than for five minutes. */
const DAY = 86_400;

/** Gameweeks fetched at once. Two requests per week — 76 of them by May — and
 *  the FPL API is somebody else's server. */
const CONCURRENCY = 6;

/** Settled gameweeks' tallies, per server instance. A week with its bonus
 *  added (`data_checked`) never changes again, so it is worked out once and
 *  only the live week is re-read on each render. */
const settled = new Map<string, Map<number, number>>();

/**
 * The season so far, as points-for-him per player.
 *
 * This is the one thing on the card that needs every gameweek: FPL keeps no
 * running "points this player earned for this manager", so it is rebuilt from
 * each week's picks and each week's scores. `null` if any week will not load —
 * a total with a week missing would crown the wrong player, and no line is
 * better than a confidently wrong one.
 */
async function seasonTally(
  entry: string,
  gws: number[],
  events: ApiEvent[],
): Promise<Map<number, number> | null> {
  if (gws.length === 0) return null;
  const byId = new Map(events.map((e) => [e.id, e]));

  const week = async (gw: number) => {
    const key = `${entry}:${gw}`;
    const hit = settled.get(key);
    if (hit) return hit;

    const event = byId.get(gw);
    const final = Boolean(event?.finished && event.data_checked);
    const revalidate = final ? DAY : REVALIDATE;
    const [picks, live] = await Promise.all([
      get<ApiPicks>(`/entry/${entry}/event/${gw}/picks/`, { revalidate }),
      get<ApiLive>(`/event/${gw}/live/`, { revalidate }),
    ]);
    if (!picks || !live) return null;

    const scores = new Map(
      live.elements.map((e) => [e.id, { points: e.stats.total_points, minutes: e.stats.minutes }]),
    );
    const tally = weekTally(picks, scores, Boolean(event?.finished));
    if (final) settled.set(key, tally);
    return tally;
  };

  const weeks: (Map<number, number> | null)[] = [];
  for (let i = 0; i < gws.length; i += CONCURRENCY) {
    weeks.push(...(await Promise.all(gws.slice(i, i + CONCURRENCY).map(week))));
  }
  if (weeks.some((w) => w === null)) return null;

  const season = new Map<number, number>();
  for (const w of weeks as Map<number, number>[]) {
    for (const [element, points] of w) {
      season.set(element, (season.get(element) ?? 0) + points);
    }
  }
  return season;
}

/**
 * A player's headshot, from the Premier League's own CDN.
 *
 * 110x140 is the smallest rendition the CDN has, and at ~100KB of PNG it is
 * still two orders of magnitude more than a 44px disc needs — which is why the
 * card draws it through `next/image` rather than as a bare `<img>`.
 */
function photoOf(code: number): string {
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
}

/* --- The written-down card ------------------------------------------------- */

/**
 * Phase 1's fixture, rebuilt through the same types. No numbers: a stat line
 * made up to fill the space would be worse than the dashes the card draws.
 */
function writtenCard(): Fantasy {
  const { fixture } = written;
  const side = (short: string, name: string): Side => {
    const { color, colorDark } = toneOf(short);
    return {
      name,
      short,
      crest: crestOf(short),
      crestDark: crestDarkOf(short),
      color,
      colorDark,
      score: null,
    };
  };

  return {
    fixture: {
      state: "upcoming",
      kickoff: fixture.kickoff,
      minutes: 0,
      home: side(fixture.home.short, fixture.home.name),
      away: side(fixture.away.short, fixture.away.name),
    },
    stats: { total: null, rank: null, move: null },
    top: null,
    source: "written",
  };
}

/* --- The card -------------------------------------------------------------- */

export async function readFantasy(): Promise<Fantasy> {
  const entry = process.env.FPL_ENTRY_ID?.trim() || written.entry;
  const club = process.env.FPL_CLUB?.trim().toLowerCase() || undefined;

  const boot = await bootstrap();
  if (!boot) return writtenCard();

  const teams = new Map(boot.teams.map((t) => [t.id, t]));
  const elements = new Map(boot.elements.map((e) => [e.id, e]));

  /* The current gameweek, or the next one if the season has not started and
     `is_current` is therefore on nothing. */
  const current = boot.events.find((e) => e.is_current);
  const next = boot.events.find((e) => e.is_next);
  const event = current ?? next;
  if (!event) return writtenCard();

  /* WHICH WEEK THE FIXTURE COMES FROM IS NOT WHICH WEEK THE STATS COME FROM.
     Once the current gameweek is closed, its matches are all behind it and the
     card would sit on "Full time" for most of a week. The top half is about
     what to watch, so between gameweeks it looks at the next one; the stats
     stay on the week that has numbers. */
  const watch = event.finished && next ? next : event;

  const [fixtures, history, summary, picks] = await Promise.all([
    get<ApiFixture[]>(`/fixtures/?event=${watch.id}`),
    get<ApiHistory>(`/entry/${entry}/history/`),
    /* TWO ENDPOINTS FOR ONE ROW, AND THE REASON IS THAT THEY DISAGREE.

       `history` is the record of finished gameweeks and it is authoritative
       for those. It is NOT authoritative for the one being played: through a
       live gameweek it repeats the previous week's overall rank and holds the
       total still, and only settles once the week is verified. Read alone it
       once made this card claim a rank of 2.4m when the real figure was 1.0m.

       `/entry/` carries the live pair — `summary_overall_points` and
       `summary_overall_rank` — so the headline numbers come from here and the
       week-by-week record behind them from `history`. */
    get<ApiEntry>(`/entry/${entry}/`),
    /* His fifteen for the stats week — what makes the fixture *his*, and where
       the top scorer comes from. 404 before the season's first deadline. */
    current ? get<ApiPicks>(`/entry/${entry}/event/${current.id}/picks/`) : Promise.resolve(null),
  ]);

  /* His players per club, counted once. Only the ones who count — a benched
     player is not on the pitch and should not make a match look like it
     matters more than it does. */
  const squad = new Map<number, number>();
  for (const pick of picks?.picks ?? []) {
    if (pick.multiplier <= 0) continue;
    const team = elements.get(pick.element)?.team;
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
    fixture = {
      state: stateOf(picked),
      kickoff: picked.kickoff_time,
      minutes: picked.minutes,
      home: sideOf(home, picked.team_h_score),
      away: sideOf(away, picked.team_a_score),
    };
  }

  /* --- The stats --- */
  const weeks = history?.current ?? [];
  const last = weeks.at(-1);
  const rank = summary?.summary_overall_rank ?? last?.overall_rank ?? null;
  /* Against the week BEFORE the current one, never against `history`'s entry
     for the current one — through a live week that entry still holds last
     week's rank, and the arrow would compare a number with itself. */
  const before = weeks.find((w) => w.event === event.id - 1)?.overall_rank ?? null;

  const stats: Stats = {
    total: summary?.summary_overall_points ?? last?.total_points ?? null,
    rank,
    move: rankMove(rank, before),
  };

  /* --- The top scorer, over the whole season ---
     The weeks come from `history`, not from 1..current: a manager who joined
     in gameweek 5 has no picks for 1–4, and asking for them would 404 the
     whole tally away. */
  let top: TopPlayer | null = null;
  const season = await seasonTally(entry, weeks.map((w) => w.event), boot.events);
  const best = season ? leader(season) : null;
  const player = best ? elements.get(best.element) : undefined;
  /* The club they play for now, which after a January move is not the one
     most of the points were scored at — the name is who they are today. */
  const team = player ? teams.get(player.team) : undefined;

  if (best && player && team) {
    const { color, colorDark } = toneOf(team.short_name);
    top = {
      name: player.web_name,
      points: best.points,
      photo: photoOf(player.code),
      color,
      colorDark,
    };
  }

  return {
    fixture,
    stats,
    top,
    source: picked || history ? "live" : "written",
  };
}
