import type { CSSProperties } from "react";
import CardShell from "@/components/primitives/CardShell";
import { fantasyCopy } from "@/content/site";
import { readFantasy, type Fixture, type Side, type Week } from "@/lib/fantasy";
import styles from "./FantasyCard.module.css";

/**
 * Kickoff, in the time the fixture is actually quoted in.
 *
 * Premier League kickoffs are published in UK time and that is how anyone
 * following the league reads them, so the card says "Sat 16:30 BST" rather
 * than guessing at the reader's zone — which a statically rendered page cannot
 * know anyway. The abbreviation is not decoration: without it the same string
 * is silently two hours wrong in most of Europe and four and a half in India.
 * The exact instant rides along in the `dateTime` attribute below, which is
 * what a machine reads.
 */
function kickoffLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "");
}

/**
 * An overall rank, short enough for the corner of a 254px card.
 *
 * 912,695 is nine characters and tells nobody anything they could not read off
 * "913k". Above a million it takes a decimal, because the difference between
 * 1.2m and 1.9m is the whole story at that end of the table.
 */
function rankLabel(rank: number): string {
  if (rank >= 1_000_000) return `${(rank / 1_000_000).toFixed(1)}m`;
  if (rank >= 1_000) return `${Math.round(rank / 1_000)}k`;
  return String(rank);
}

/** The green dot and its label. One component; only the tone and the casing
 *  differ between the card's two eyebrows. */
function Marker({
  tone,
  caps = false,
  children,
}: {
  tone: "green" | "live" | "muted";
  caps?: boolean;
  children: string;
}) {
  return (
    <span className={`${styles.marker} ${styles[tone]} ${caps ? styles.caps : ""}`}>
      {/* A `border-radius: 50%` span, not the exported SVG — Figma's asset is a
          circle and nothing else, so as a span it takes `currentColor` and
          themes itself instead of shipping a second hard-coded green. */}
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}

/** One side of the fixture: crest over club name, the name in club colour. */
function Club({ side }: { side: Side }) {
  return (
    <div
      className={styles.side}
      /* The club's pair of tones, handed to CSS so the theme rule can pick
         between them. Inline because they are data — a different pair of clubs
         arrives every gameweek, and a stylesheet cannot hold a value that
         turns up at request time. See lib/clubs.ts. */
      style={{ "--club": side.color, "--club-dark": side.colorDark } as CSSProperties}
    >
      <span className={styles.badge}>
        {/* 64 drawn, 192 shipped, so the crest holds up at 2x on a page where
            `--u` scales it to ~114px by 2560. `alt=""` because the club's name
            is the next line down and a screen reader should say it once. */}
        <img className={styles.crest} src={side.crest} alt="" width={64} height={64} />
      </span>
      {/* Wrapped by the box rather than by a hard break, which is this file's
          rule for every title: Figma's 75px column puts "Manchester" on one
          line and the club on the next, and so does this. */}
      <p className={styles.club}>{side.name}</p>
    </div>
  );
}

/**
 * What sits between the crests.
 *
 * "VS" until the match kicks off, and the score from then on — the middle of a
 * fixture is where the score belongs, and holding "VS" there through a live
 * match would waste the one slot the reader is looking at. The dash is its own
 * element so it can sit back at `--ink-40` and let the two numbers carry.
 */
function Middle({ fixture }: { fixture: Fixture }) {
  const { home, away, state } = fixture;

  if (state === "upcoming" || home.score === null || away.score === null) {
    return <span className={styles.versus}>VS</span>;
  }

  return (
    <span
      className={styles.score}
      aria-label={`${home.name} ${home.score}, ${away.name} ${away.score}`}
    >
      <span>{home.score}</span>
      <i aria-hidden="true">–</i>
      <span>{away.score}</span>
    </span>
  );
}

/**
 * The season so far, as one bar per gameweek played.
 *
 * WHY A CHART AND NOT THE THREE NUMBERS FIGMA DRAWS. Three figures — 64, 86,
 * 73 — have no shape. They are the same three numbers in any order and say
 * nothing about whether the season is going well; the two behind the current
 * one are there to be arithmetic rather than to be read. The same box carries
 * every week he has played, which is a season instead of a sample.
 *
 * WEEKS PLAYED ONLY, AND THAT IS THE SECOND VERSION. The first drew all 38 and
 * showed the weeks still to come as baseline ticks, on the argument that the
 * season's remaining run is information. It is — and it is unusable: at
 * gameweek 3 the chart was 8% data and 92% dotted line, three bars huddled at
 * the left of a box that looked broken rather than early. That is not a
 * September problem either; it reads wrong until about November, which is most
 * of the time anyone would see it. The bars divide the width they have, so the
 * chart is full at every point in the season and simply gets finer as the year
 * runs on — which is its own quiet signal of progress.
 *
 * Built from `<li>` with a height custom property — no canvas, no SVG library,
 * no client component. The card still ships zero JavaScript.
 *
 * The scale is FIXED at `CEILING`, not the data's own maximum. A chart scaled
 * to its best week looks identical every season: the best week is always full
 * height and everything else is a fraction of it. Against a fixed ceiling a
 * good week is *tall*, which is the thing the chart is for.
 */
const CEILING = 120;

function Season({ weeks, current }: { weeks: Week[]; current: number }) {
  return (
    <ol className={styles.season}>
      {weeks.map((week) => {
        const now = week.gw === current;
        /* A pending week that has not scored yet is drawn as a stub rather than
           as a week worth nothing — the Saturday-morning case the `pending`
           flag exists for. It fills in through the weekend. */
        const scored = !(week.pending && week.score === 0);

        return (
          <li
            key={week.gw}
            /* The called-out state is `data-state` alone — one source, rather
               than a class and an attribute that have to agree. */
            className={styles.week}
            data-state={now ? "now" : "played"}
            style={
              { "--h": `${Math.min(1, week.score / CEILING) * 100}%` } as CSSProperties
            }
            data-empty={scored ? undefined : ""}
          >
            {/* The hover readout, one per bar, all stacked in the same place.
                Which one you see is decided by the pointer — no JavaScript and
                no shared state to keep in step. */}
            <span className={styles.tip} aria-hidden="true">
              <b>GW {week.gw}</b> {scored ? week.score : "–"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Figma "Fantasy" (node 952:8828) — 254x315, pad 24, space-between.
 *
 * A server component that reads live data: the fixture list and Siddhant's
 * gameweek history come from the public FPL API through `lib/fantasy.ts`, and
 * the card still ships **no JavaScript**. Everything that moves — the live
 * pulse — is CSS, and the one thing that would have needed a client (a ticking
 * countdown) was deliberately not built: an absolute kickoff time is correct
 * for as long as the page is cached, and a relative one is wrong the moment it
 * is.
 *
 * WHAT PHASE 3 ADDED TO THE DRAWING, AND WHY THE CARD IS STILL 315 TALL
 *
 * The frame has two eyebrow rows that use about half their width — "Watching
 * next" is 89 of 206, "FANTASY POINTS" is 108. Live data needs somewhere to
 * put a kickoff time and an overall rank, and a card whose height is holding
 * three columns level (see app/page.module.css) cannot grow a row to hold
 * them. So both eyebrows became two-column rows and the card gained two facts
 * without gaining a pixel or losing its silhouette.
 *
 * The rest is state. The eyebrow reads "Watching next", "Live" or "Full time";
 * the dot goes from green to a pulsing `--live` and then to muted ink; the
 * middle of the fixture turns from "VS" into the score; and the right-hand
 * slot shows the minute while the match is on and the kickoff either side of
 * it. None of that is decoration — it is the difference between a card that
 * shows a match and a card that follows one.
 */
export default async function FantasyCard() {
  const { fixture, points, overallRank, source } = await readFantasy();
  const live = fixture.state === "live";

  /* The week the card is about. `points` is oldest-first, so this is the last
     entry rather than the first — and it is the one the chart calls out and the
     readout names. */
  const current = points.at(-1);

  const eyebrow =
    fixture.state === "live"
      ? fantasyCopy.live
      : fixture.state === "finished"
        ? fantasyCopy.finished
        : fantasyCopy.upcoming;

  return (
    <CardShell
      radius={32}
      /* `none`, then the fill is set in the stylesheet. Figma draws this card
         at rgba(255,255,255,0.4) — `--surface-glass` — which CardShell only
         offers as `glass`, and `glass` also carries `backdrop-filter`. The
         homepage already pays for four fixed backdrop-blur layers and that is
         most of what makes it feel heavy; a fifth for a fill this card can
         state directly is not worth it. See the stylesheet for the dark half. */
      surface="none"
      className={styles.card}
      data-card="fantasy"
      /* Not rendered anywhere — it is here so that "why is the card showing
         last week's fixture" is one glance at the element inspector rather
         than a debugging session. */
      data-source={source}
    >
      <div className={styles.top}>
        <div className={styles.eyebrow}>
          <Marker tone={live ? "live" : fixture.state === "finished" ? "muted" : "green"}>
            {eyebrow}
          </Marker>

          {live ? (
            /* The clock, while there is one to show. */
            <span className={styles.aside}>{fixture.minutes}&prime;</span>
          ) : fixture.kickoff ? (
            <time className={styles.aside} dateTime={fixture.kickoff}>
              {kickoffLabel(fixture.kickoff)}
            </time>
          ) : null}
        </div>

        <div className={styles.fixture}>
          <Club side={fixture.home} />
          <Middle fixture={fixture} />
          <Club side={fixture.away} />
        </div>

        {/* WHY THIS MATCH. Without it the fixture and the points below are two
            unrelated facts sharing a card; with it, the match on screen is the
            one his gameweek is riding on. Absent — no players, or no manager
            configured — the line is not drawn at all rather than saying zero,
            and the block closes up. */}
        {fixture.players ? (
          <p
            className={styles.players}
            /* The colour it warms to on hover, chosen here because only this
               side knows which club the players are on. Both tones travel, and
               the stylesheet picks by theme exactly as `.side` does. `both`
               sends none: when he owns players on each side, naming one club's
               colour would be a lie. */
            style={
              fixture.players.side === "both"
                ? undefined
                : ({
                    "--players": fixture[fixture.players.side].color,
                    "--players-dark": fixture[fixture.players.side].colorDark,
                  } as CSSProperties)
            }
          >
            {fixture.players.count === 1
              ? fantasyCopy.playersOne
              : fantasyCopy.players.replace("{n}", String(fixture.players.count))}
          </p>
        ) : null}
      </div>

      <div className={styles.bottom}>
        {/* THE SCORE IS THE HEADLINE AND THE SEASON IS ITS CONTEXT.

            The chart alone was the wrong form for most of a season. At
            gameweek 3 there are three bars, and three bars are not a trend —
            they read as a segmented progress bar and say less than the three
            plain figures Figma drew, which at least carried their values. The
            job this data actually has, early on, is *a single headline*: what
            did this week score. So the number is the number, at the size a
            headline is, and the season runs beside it as the shape it makes —
            thin context at gameweek 3, a real trend line by May, and never the
            thing competing for the first read. */}
        <div className={styles.summary}>
          <p className={styles.headline}>
            <span className={styles.headlineLabel}>
              GW {current?.gw ?? "–"}
            </span>
            <span className={styles.headlineScore}>
              {current && !(current.pending && current.score === 0)
                ? current.score
                : /* Open and not yet scored. A bare 0 in the headline slot
                     reads as a broken card rather than as a Saturday morning;
                     it fills in as the matches are played. */
                  <span className={styles.pointsPending}>–</span>}
            </span>
          </p>

          <div className={styles.chart}>
            <Season weeks={points} current={current?.gw ?? 0} />
          </div>
        </div>

        <div className={styles.eyebrow}>
          <Marker tone="green" caps>
            {fantasyCopy.points}
          </Marker>

          {/* The one number that gives the three above it a meaning. Only when
              the API knows it — the written-down card has no rank to show and
              renders the row exactly as the frame draws it. */}
          {overallRank !== null ? (
            <span className={styles.aside}>
              {rankLabel(overallRank)} <span className={styles.rankUnit}>{fantasyCopy.rank}</span>
            </span>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
}
