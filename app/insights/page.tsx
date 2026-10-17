import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { mayView, readInsights, type Day, type Insights } from "@/lib/insights";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

/**
 * What visitors have done on the site, for Siddhant only.
 *
 * Open under `next dev`; everywhere else it needs `?key=<INSIGHTS_TOKEN>` and
 * is a plain 404 without it — the same rule as Found's funnel endpoint, and
 * for the same reason: nothing here is dangerous, but it is not something to
 * publish by accident. Bookmark it with the key.
 *
 * Server-rendered on every request and never cached; the numbers are read
 * straight from Redis by `lib/insights.ts`.
 */
export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  const { key } = await searchParams;
  if (!mayView(key)) notFound();

  const data = await readInsights();

  return (
    <main id="main" className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Insights</p>
        <h1 className={styles.title}>Who’s been here</h1>
        <p className={styles.meta}>
          {data.configured
            ? `Live from the site’s database · ${stamp(data.at)}`
            : "No database connected — set the Upstash variables to see live numbers."}
          {" · "}
          <a
            className={styles.link}
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Page views and referrers live in Vercel Analytics ↗
          </a>
        </p>
      </header>

      <Figures data={data} />
      <VisitorChart days={data.visitors.days} />

      <div className={styles.split}>
        <Studies data={data} />
        <Latest data={data} />
      </div>

      <Found data={data} />
      <Tracks data={data} />
    </main>
  );
}

/* --- Headline numbers ------------------------------------------------------ */

function Figures({ data }: { data: Insights }) {
  const days = data.visitors.days;
  const today = days.at(-1);
  /* Only the days since counting began: the sets did not exist before
     17 Oct 2026, and averaging their zeroes in would understate every day. */
  const started = days.findIndex((d) => d.seen > 0);
  const week = started < 0 ? [] : days.slice(Math.max(started, days.length - 7));
  const weekAvg = week.length ? week.reduce((s, d) => s + d.seen, 0) / week.length : 0;
  const likes = data.studies.reduce((s, r) => s + r.likes, 0);
  const comments = data.studies.reduce((s, r) => s + r.comments, 0);

  const figures = [
    { label: "Visitors, all time", value: n(data.visitors.total), note: "Distinct browsers since the count began" },
    { label: "Today", value: n(today?.seen ?? 0), note: `${n(today?.fresh ?? 0)} new` },
    { label: "Daily average", value: weekAvg < 10 ? weekAvg.toFixed(1) : n(Math.round(weekAvg)), note: week.length < 7 ? `Over ${week.length} day${week.length === 1 ? "" : "s"} counted` : "Over the last 7 days" },
    { label: "Study likes", value: n(likes), note: `${n(comments)} comment${comments === 1 ? "" : "s"}` },
    { label: "Found opened", value: n(data.found.counts.open ?? 0), note: `${n(data.found.counts.end ?? 0)} finished Episode 1` },
  ];

  return (
    <section className={styles.figures} aria-label="Headline numbers">
      {figures.map((f) => (
        <div key={f.label} className={`${styles.card} ${styles.figure}`}>
          <p className={styles.figureLabel}>{f.label}</p>
          <p className={styles.figureValue}>{f.value}</p>
          <p className={styles.figureNote}>{f.note}</p>
        </div>
      ))}
    </section>
  );
}

/* --- Visitors per day ------------------------------------------------------- */

function VisitorChart({ days }: { days: readonly Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.seen));
  const top = niceMax(max);
  const empty = days.every((d) => d.seen === 0);

  return (
    <section className={`${styles.card} ${styles.block}`} aria-labelledby="visitors-title">
      <div className={styles.blockHead}>
        <div>
          <h2 id="visitors-title" className={styles.blockTitle}>Visitors per day</h2>
          <p className={styles.blockSub}>Last {days.length} days, India time</p>
        </div>
        <ul className={styles.legend} aria-label="Legend">
          <li><span className={`${styles.swatch} ${styles.swatchNew}`} />New</li>
          <li><span className={`${styles.swatch} ${styles.swatchBack}`} />Returning</li>
        </ul>
      </div>

      {empty ? (
        <p className={styles.empty}>
          Daily counts started on 17 October 2026. The first bar appears with the next visit to the homepage.
        </p>
      ) : (
        <div className={styles.chart}>
          <div className={styles.axis} aria-hidden>
            <span>{n(top)}</span>
            <span>{n(top / 2)}</span>
            <span>0</span>
          </div>
          <ol className={styles.columns}>
            {days.map((d, i) => {
              const back = d.seen - d.fresh;
              const label = `${dayLabel(d.date)}: ${d.seen} visitor${d.seen === 1 ? "" : "s"}, ${d.fresh} new`;
              return (
                <li key={d.date} className={styles.col} tabIndex={0} aria-label={label}>
                  <span className={styles.stack} style={{ height: `${(d.seen / top) * 100}%` }}>
                    {d.fresh > 0 && <span className={styles.segNew} style={{ flexGrow: d.fresh }} />}
                    {back > 0 && <span className={styles.segBack} style={{ flexGrow: back }} />}
                  </span>
                  <span className={styles.tip} role="tooltip">
                    <strong>{dayLabel(d.date)}</strong>
                    <span>{d.seen} visitors</span>
                    <span>{d.fresh} new · {back} returning</span>
                  </span>
                  {/* Weekly, counted back from today, so the last tick is
                      always today and never collides with a neighbour. */}
                  {(days.length - 1 - i) % 7 === 0 && (
                    <span className={styles.tick} aria-hidden>{shortDay(d.date)}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

/* --- Case studies ----------------------------------------------------------- */

function Studies({ data }: { data: Insights }) {
  return (
    <section className={`${styles.card} ${styles.block}`} aria-labelledby="studies-title">
      <h2 id="studies-title" className={styles.blockTitle}>Case studies</h2>
      <p className={styles.blockSub}>Likes and comments on each study</p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Study</th>
            <th scope="col" className={styles.num}>Likes</th>
            <th scope="col" className={styles.num}>Comments</th>
          </tr>
        </thead>
        <tbody>
          {data.studies.map((s) => (
            <tr key={s.slug}>
              <td>
                <a className={styles.rowLink} href={s.href}>{s.title}</a>
                <span className={styles.rowSub}>
                  {s.lastAt ? `Last comment ${ago(s.lastAt, data.at)}` : "No comments yet"}
                </span>
              </td>
              <td className={styles.num}>{n(s.likes)}</td>
              <td className={styles.num}>{n(s.comments)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Latest({ data }: { data: Insights }) {
  return (
    <section className={`${styles.card} ${styles.block}`} aria-labelledby="latest-title">
      <h2 id="latest-title" className={styles.blockTitle}>Latest comments</h2>
      <p className={styles.blockSub}>Newest first, across every study</p>
      {data.latest.length === 0 ? (
        <p className={styles.empty}>Nobody has commented yet.</p>
      ) : (
        <ol className={styles.comments}>
          {data.latest.map((c) => (
            <li key={`${c.href}:${c.id}`} className={styles.comment}>
              <p className={styles.commentHead}>
                <strong>{c.name || "Anonymous"}</strong>
                <span>on <a className={styles.link} href={c.href}>{c.study}</a></span>
                <span>· {ago(c.at, data.at)}</span>
                {c.likes > 0 && <span>· {c.likes} like{c.likes === 1 ? "" : "s"}</span>}
              </p>
              <p className={styles.commentBody}>{c.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* --- Found ------------------------------------------------------------------ */

const EP1: readonly [string, string][] = [
  ["open", "Opened the envelope"],
  ["unlock", "Unlocked the phone"],
  ["d1", "Solved: went home?"],
  ["d2", "Solved: was Dev there?"],
  ["vault", "Opened the vault"],
  ["d3", "Solved: where at 23:52?"],
  ["end", "Battery died (finished)"],
];

const EP2: readonly [string, string][] = [
  ["ep2-start", "Started Episode 2"],
  ["e2-who", "Solved: who unlocked it?"],
  ["e2-wanted", "Solved: who wanted it?"],
  ["e2-why", "Solved: why a stranger?"],
  ["e2-wifi", "Turned Wi-Fi on"],
  ["e2-alive", "Solved: alive?"],
  ["e2-trust", "Trusted 3107"],
  ["e2-delivered", "Solved: who delivered it?"],
  ["ep2-end", "Finished Episode 2"],
];

const PUZZLES: Record<string, string> = {
  passcode: "Phone passcode",
  vault: "Vault code",
  "went-home": "Went home after the party?",
  dev: "Was Dev there?",
  "last-seen": "Where at 23:52?",
  "e2-who": "Who unlocked it on Monday?",
  "e2-wanted": "Who wanted it unlocked?",
  "e2-why": "Why give a stranger the phone?",
  "e2-alive": "Alive?",
  "e2-delivered": "Who put it in the letterbox?",
};

function Found({ data }: { data: Insights }) {
  const c = data.found.counts;
  const get = (k: string) => c[k] ?? 0;

  const struggles = Object.keys(PUZZLES)
    .map((id) => ({
      id,
      wrong: get(`wrong:${id}`),
      hints: get(`hint:${id}:1`) + get(`hint:${id}:2`) + get(`hint:${id}:3`),
    }))
    .filter((p) => p.wrong + p.hints > 0)
    .sort((a, b) => b.wrong + b.hints - (a.wrong + a.hints))
    .slice(0, 5);

  const verdicts = [
    { label: "Want Episode 2", yes: get("ep2:yes"), no: get("ep2:no") },
    { label: "Want Episode 3", yes: get("ep3:yes"), no: get("ep3:no") },
  ];

  return (
    <section className={`${styles.card} ${styles.block}`} aria-labelledby="found-title">
      <div className={styles.blockHead}>
        <div>
          <h2 id="found-title" className={styles.blockTitle}>Found</h2>
          <p className={styles.blockSub}>How far players get, and where they stall</p>
        </div>
        <ul className={styles.chips}>
          <li className={styles.chip}>
            <strong>{data.found.medianSeconds ? duration(data.found.medianSeconds) : "—"}</strong>
            <span>Median time to finish</span>
          </li>
          <li className={styles.chip}>
            <strong>{n(get("resume"))}</strong>
            <span>Came back to a saved case</span>
          </li>
          <li className={styles.chip}>
            <strong>{n(get("email"))}</strong>
            <span>Left an email</span>
          </li>
        </ul>
      </div>

      <div className={styles.funnels}>
        <Funnel title="Episode 1" steps={EP1} get={get} />
        <Funnel title="Episode 2" steps={EP2} get={get} />
      </div>

      <div className={styles.foundFoot}>
        <div>
          <h3 className={styles.minorTitle}>Hardest moments</h3>
          {struggles.length === 0 ? (
            <p className={styles.empty}>No wrong answers or hints recorded yet.</p>
          ) : (
            <ul className={styles.list}>
              {struggles.map((p) => (
                <li key={p.id}>
                  <span>{PUZZLES[p.id]}</span>
                  <span className={styles.listNum}>{p.wrong} wrong · {p.hints} hints</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className={styles.minorTitle}>What players chose</h3>
          <ul className={styles.list}>
            <li><span>Told Mum a lie</span><span className={styles.listNum}>{get("mum:lie")}</span></li>
            <li><span>Told Mum the truth</span><span className={styles.listNum}>{get("mum:truth")}</span></li>
            <li><span>Said nothing to Mum</span><span className={styles.listNum}>{get("mum:silence")}</span></li>
            <li><span>Threatened K.</span><span className={styles.listNum}>{get("k:threat")}</span></li>
          </ul>
        </div>
        <div>
          <h3 className={styles.minorTitle}>Did it land?</h3>
          <ul className={styles.list}>
            {verdicts.map((v) => (
              <li key={v.label}>
                <span>{v.label}</span>
                <span className={styles.listNum}>{v.yes} yes · {v.no} no</span>
              </li>
            ))}
            <li>
              <span>Saw the turn coming</span>
              <span className={styles.listNum}>
                {get("e2-saw:yes")} yes · {get("e2-saw:maybe")} maybe · {get("e2-saw:no")} no
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Funnel({
  title,
  steps,
  get,
}: {
  title: string;
  steps: readonly [string, string][];
  get: (k: string) => number;
}) {
  const first = get(steps[0][0]);
  const base = Math.max(1, first);

  return (
    <div>
      <h3 className={styles.minorTitle}>{title}</h3>
      <ol className={styles.funnel}>
        {steps.map(([k, label]) => {
          const v = get(k);
          return (
            <li key={k} className={styles.step}>
              <span className={styles.stepLabel}>{label}</span>
              <span className={styles.bar} aria-hidden>
                <span style={{ width: `${Math.min(100, (v / base) * 100)}%` }} />
              </span>
              <span className={styles.stepNum}>
                {n(v)}
                {first > 0 && <span className={styles.pct}>{Math.round((v / first) * 100)}%</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* --- Music ------------------------------------------------------------------ */

function Tracks({ data }: { data: Insights }) {
  return (
    <section className={`${styles.card} ${styles.block}`} aria-labelledby="tracks-title">
      <h2 id="tracks-title" className={styles.blockTitle}>Music reactions</h2>
      <p className={styles.blockSub}>Thumbs on the tracks in the listening card</p>
      {data.tracks.length === 0 ? (
        <p className={styles.empty}>No reactions yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Track</th>
              <th scope="col" className={styles.num}>Up</th>
              <th scope="col" className={styles.num}>Down</th>
            </tr>
          </thead>
          <tbody>
            {data.tracks.map((t) => (
              <tr key={t.key}>
                <td>
                  <span className={styles.rowTitle}>{t.title}</span>
                  <span className={styles.rowSub}>{t.artist}</span>
                </td>
                <td className={styles.num}>{n(t.up)}</td>
                <td className={styles.num}>{n(t.down)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* --- Formatting ------------------------------------------------------------- */

const TZ = "Asia/Kolkata";

function n(value: number): string {
  return value.toLocaleString("en-US");
}

/** A clean axis top: 1, 2, 5 × a power of ten, at or above `max`. */
function niceMax(max: number): number {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((m) => m * pow >= max) ?? 10;
  return step * pow;
}

function stamp(at: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at) + " IST";
}

/** `2026-10-17` → `Sat 17 Oct`. Noon UTC is inside the same India-time day. */
function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

function shortDay(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 30 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return shortDay(new Date(at).toISOString().slice(0, 10));
}

function duration(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
