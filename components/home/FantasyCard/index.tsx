import type { CSSProperties } from "react";
import Image from "next/image";
import CardShell from "@/components/primitives/CardShell";
import { fantasyCopy } from "@/content/site";
import {
  readFantasy,
  type Fixture,
  type RankMove,
  type Side,
  type TopPlayer,
} from "@/lib/fantasy";
import Countdown from "./Countdown";
import { countdownLabel } from "./countdownLabel";
import styles from "./FantasyCard.module.css";

/**
 * Kickoff, in the time the fixture is actually quoted in.
 *
 * Premier League kickoffs are published in UK time and that is how anyone
 * following the league reads them, so this says "Sat 16:30 BST" rather than
 * guessing at the reader's zone. It is the countdown's tooltip, and the whole
 * label once a fixture is over.
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
 * An overall rank, short enough for its slot — "664k", "1.2m".
 *
 * Above a million it takes a decimal, because the difference between 1.2m and
 * 1.9m is the whole story at that end of the table.
 */
function rankLabel(rank: number): string {
  if (rank >= 1_000_000) return `${(rank / 1_000_000).toFixed(1)}m`;
  if (rank >= 1_000) return `${Math.round(rank / 1_000)}k`;
  return String(rank);
}

/** A club's pair of tones, handed to CSS so the theme rule can pick between
 *  them. Inline because they are data — a different club arrives every week,
 *  and a stylesheet cannot hold a value that turns up at request time. See
 *  lib/clubs.ts. */
function tones({ color, colorDark }: { color: string; colorDark: string }) {
  return { "--club": color, "--club-dark": colorDark } as CSSProperties;
}

/** The dot and its label — both of the card's eyebrows. */
function Marker({
  tone,
  pulse = false,
  children,
}: {
  tone: "brand" | "muted";
  pulse?: boolean;
  children: string;
}) {
  return (
    <span className={`${styles.marker} ${styles[tone]} ${pulse ? styles.pulse : ""}`}>
      {/* A `border-radius: 50%` span, not the exported SVG — Figma's asset is a
          circle and nothing else, so as a span it takes `currentColor` and
          themes itself instead of shipping a hard-coded colour. */}
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}

/** One side of the fixture. The crest alone — the redesign drops the club
 *  names, so the name moves into the image's alt text rather than vanishing. */
function Crest({ side }: { side: Side }) {
  return (
    <span className={styles.side}>
      {/* 64 drawn, 192 shipped, so the crest holds up at 2x.

          TWO FILES, ONE SHOWN PER THEME. Every league badge carries a white
          keyline that disappears on the light card and rings the crest in
          white on the dark one; the dark set has it stripped (see
          scripts/fetch-crests.mjs). Not `<picture media>`, which follows the
          OS setting — this site's theme is a toggle on <html>. `lazy` is what
          keeps the hidden one from downloading: a lazy image that is
          `display: none` is never fetched, so each visitor pays for one. */}
      <img
        className={`${styles.crest} ${styles.crestLight}`}
        src={side.crest}
        alt={side.name}
        width={64}
        height={64}
        loading="lazy"
      />
      <img
        className={`${styles.crest} ${styles.crestDark}`}
        src={side.crestDark}
        alt={side.name}
        width={64}
        height={64}
        loading="lazy"
      />
    </span>
  );
}

/**
 * What sits between the crests: "VS" until kickoff, then the score, each
 * number in its own club's colour so the reader never has to work out which
 * side is which — Figma's live frame draws United's 2 in red and City's 1 in
 * sky blue, and those are exactly the two tones lib/clubs.ts derives.
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
      <span className={styles.tone} style={tones(home)}>
        {home.score}
      </span>
      <i aria-hidden="true">-</i>
      <span className={styles.tone} style={tones(away)}>
        {away.score}
      </span>
    </span>
  );
}

/**
 * Figma's "Up/Down Indicator" — its exported vector, inlined rather than
 * shipped as a file, for the same reason the dot is a span: the asset is a
 * #58A942 disc with a white arrow, and a file cannot take the theme's green or
 * turn red. As markup the disc reads `currentColor` and the arrow the raised
 * surface, so it works in both themes and both directions.
 *
 * The drawing points down. Figma flips it for "up" (`-scale-y-100`), and so
 * does the stylesheet.
 */
function RankArrow({ move }: { move: Exclude<RankMove, "same"> }) {
  return (
    <svg
      className={`${styles.arrow} ${move === "up" ? styles.rankUp : styles.rankDown}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <rect width="16" height="16" rx="8" fill="currentColor" />
      <path
        d="M7.625 4C7.625 3.79289 7.79289 3.625 8 3.625C8.20711 3.625 8.375 3.79289 8.375 4L8 4L7.625 4ZM8 12L5.83494 8.25L10.1651 8.25L8 12ZM8 4L8.375 4L8.375 8.625L8 8.625L7.625 8.625L7.625 4L8 4Z"
        fill="var(--surface-raised)"
      />
    </svg>
  );
}

/** "13 · Most points scored" over the player's name, in their club's colour. */
function TopScorer({ player }: { player: TopPlayer }) {
  return (
    <div className={styles.scorer}>
      <span className={styles.photo}>
        {/* The CDN's smallest rendition is 110x140 and ~100KB of PNG; drawn at
            44 wide, `next/image` serves it as a few KB of AVIF instead. `alt`
            is empty because the name is the next thing a screen reader says. */}
        <Image
          className={styles.photoImg}
          src={player.photo}
          alt=""
          width={44}
          height={56}
        />
      </span>

      <div className={styles.scorerText}>
        <p className={styles.scorerHead}>
          <span className={styles.scorerPoints} aria-label={`${player.points} points this season`}>
            {player.points}
          </span>
          <span className={styles.sep} aria-hidden="true" />
          <span className={styles.statLabel}>{fantasyCopy.topScorer}</span>
        </p>
        <p className={`${styles.scorerName} ${styles.tone}`} style={tones(player)}>
          {player.name}
        </p>
      </div>
    </div>
  );
}

/**
 * Figma "Football Card" — nodes 1043:470 (upcoming) and 1011:9655 (live).
 * 254x315, pad 20, two blocks 32 apart.
 *
 * A server component that reads live data through `lib/fantasy.ts`. The only
 * JavaScript it ships is the countdown, and only while there is a kickoff to
 * count down to — see Countdown.tsx for why that one number cannot be HTML.
 *
 * WHAT THE REDESIGN CHANGED. The top half is the same fixture without the club
 * names. The bottom half stopped being a chart of the season and became three
 * facts: the season total, the overall rank with which way it moved, and the
 * player in his team who scored the most this week.
 *
 * States: "Watching next" with a countdown; "Watching now" with the minute and
 * a pulsing dot; and "Full time", muted, only at the end of a season when
 * there is no next gameweek to look ahead to.
 */
export default async function FantasyCard() {
  const { fixture, stats, top, source } = await readFantasy();
  const live = fixture.state === "live";
  const finished = fixture.state === "finished";

  const eyebrow = live
    ? fantasyCopy.live
    : finished
      ? fantasyCopy.finished
      : fantasyCopy.upcoming;

  /* The countdown's first paint. An async server component renders once per
     request and never re-renders, so the purity rule's concern — a value that
     shifts between renders — has nothing to act on here; the browser's own
     reading replaces this straight after hydration (Countdown.tsx). */
  const until = fixture.kickoff
    ? // eslint-disable-next-line react-hooks/purity
      countdownLabel(Date.parse(fixture.kickoff) - Date.now())
    : null;

  return (
    <CardShell
      radius={40}
      /* 40% white, no blur — the fill every non-case-study card shares. */
      surface="soft"
      className={styles.card}
      data-card="fantasy"
      /* Not rendered anywhere — it is here so that "why is the card showing
         made-up numbers" is one glance at the element inspector. */
      data-source={source}
    >
      <div className={styles.watching}>
        <div className={styles.eyebrow}>
          <Marker tone={finished ? "muted" : "brand"} pulse={live}>
            {eyebrow}
          </Marker>

          {live ? (
            <span className={styles.aside}>{fixture.minutes}&rsquo;</span>
          ) : fixture.kickoff && !finished ? (
            <Countdown
              className={styles.aside}
              kickoff={fixture.kickoff}
              initial={until ?? fantasyCopy.kickoff}
              due={fantasyCopy.kickoff}
              title={kickoffLabel(fixture.kickoff)}
            />
          ) : fixture.kickoff ? (
            <time className={styles.aside} dateTime={fixture.kickoff}>
              {kickoffLabel(fixture.kickoff)}
            </time>
          ) : null}
        </div>

        <div className={styles.fixture}>
          <Crest side={fixture.home} />
          <Middle fixture={fixture} />
          <Crest side={fixture.away} />
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statsHead}>
          <Marker tone="brand">{fantasyCopy.stats}</Marker>

          <dl className={styles.figures}>
            <div className={styles.figure}>
              <dt className={styles.statLabel}>{fantasyCopy.total}</dt>
              <dd className={styles.statValue}>{stats.total ?? "–"}</dd>
            </div>
            <div className={styles.figure}>
              <dt className={styles.statLabel}>{fantasyCopy.rank}</dt>
              <dd className={styles.statValue}>
                {stats.move === "up" || stats.move === "down" ? (
                  <RankArrow move={stats.move} />
                ) : null}
                {stats.rank !== null ? rankLabel(stats.rank) : "–"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Absent on the written-down card and before the season's first
            deadline — the block above stays where it is and this simply is
            not drawn, rather than inventing a player. */}
        {top ? <TopScorer player={top} /> : null}
      </div>
    </CardShell>
  );
}
