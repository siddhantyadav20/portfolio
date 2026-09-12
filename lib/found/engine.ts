import type {
  AppId,
  Cast,
  Deduction,
  Evidence,
  Flag,
  LiveEvent,
  Lock,
  Message,
  Reply,
  ReplyOption,
  Stage,
  Story,
} from "@/content/found/types";

/* ===========================================================================
   The rules of a playthrough, and nothing else.

   Pure: every function takes a state and returns a new one, so the whole
   story can be played start to finish in a Node test (the solvability check
   in tests/found.test.ts does exactly that). Nothing here touches the DOM,
   storage or the clock; `components/found/FoundPhone/actions.ts` keeps the
   state, stamps the time each flag was set, and the components call these.

   The state remembers what the player did to the phone, not just what they
   found: how long they spent in each app, how often they picked it up, and
   when. That record is the Guardian report Mum shows the police in Episode 2,
   and it is the player's own.
   =========================================================================== */

/** Copy budgets. The UI lays out against them; the tests hold the script to them. */
export const BUBBLE_MAX = 150;
export const LABEL_MAX = 44;
export const DETAIL_MAX = 120;
export const QUESTION_MAX = 60;
export const HEADLINE_MAX = 80;

/** One visit to an app counts for at most this long: a phone left open on a
 *  table isn't being read, and the report shouldn't say it was. */
export const VISIT_CAP_MS = 5 * 60_000;

/** Monday morning, from the moment the envelope is opened. */
const EP1_CLOCK = { base: "08:10", cap: 100 };
/** Monday evening, from the moment the phone is plugged in. */
const EP2_CLOCK = { base: "19:40", cap: 150 };

export type Report = {
  readonly firstPickup: string;
  readonly pickups: number;
  readonly minutes: number;
  readonly apps: readonly { readonly app: AppId; readonly minutes: number }[];
  readonly timeline: readonly { readonly time: string; readonly label: string }[];
};

export type CaseState = {
  readonly v: 2;
  /** A random id for this playthrough. Never shown, never sent. */
  readonly run: string;
  readonly cast: Cast;
  readonly flags: readonly Flag[];
  /** How many hints each lock or question has given. */
  readonly hints: Readonly<Record<string, number>>;
  /** When the envelope was opened (ms). Monday 08:10 in the story. */
  readonly started: number;
  /** When each flag was first set (ms), stamped by the caller. */
  readonly at: Readonly<Record<string, number>>;
  /** Milliseconds each app was on screen, keyed `<episode>:<app>`. */
  readonly usage: Readonly<Record<string, number>>;
  /** How many times an app was opened, keyed by episode. */
  readonly opens: Readonly<Record<string, number>>;
  /** What the player named unknown numbers, by thread id. */
  readonly names: Readonly<Record<string, string>>;
  /** Monday morning, as Mum's app saw it. Frozen when Episode 1's battery dies. */
  readonly report?: Report;
};

export function newCase(cast: Cast, run: string, now: number): CaseState {
  return { v: 2, run, cast, flags: [], hints: {}, started: now, at: {}, usage: {}, opens: {}, names: {} };
}

export const has = (s: CaseState, flag: Flag): boolean => s.flags.includes(flag);

export const all = (s: CaseState, flags: readonly Flag[] = []): boolean => flags.every((f) => has(s, f));

const anyOf = (s: CaseState, flags: readonly Flag[] = []): boolean => flags.some((f) => has(s, f));

function add(s: CaseState, flag: Flag): CaseState {
  return has(s, flag) ? s : { ...s, flags: [...s.flags, flag] };
}

export const episodeOf = (s: CaseState): 1 | 2 => (has(s, "ep:2") ? 2 : 1);

/* --- Evidence ---------------------------------------------------------------- */

/** Readable before the passcode: the lock screen's own, and the envelope. */
const BEFORE_UNLOCK: ReadonlySet<AppId> = new Set<AppId>(["lock", "envelope"]);

export function evidenceAvailable(s: CaseState, e: Evidence): boolean {
  if (!BEFORE_UNLOCK.has(e.app) && !has(s, "lock:passcode")) return false;
  return all(s, e.requires);
}

/** The player has looked at it. Unknown or not-yet-reachable ids change nothing. */
export function see(ep: Story, s: CaseState, evidenceId: string): CaseState {
  const e = ep.evidence.find((x) => x.id === evidenceId);
  if (!e || !evidenceAvailable(s, e)) return s;
  return add(s, `seen:${e.id}`);
}

/** The case file, in the order the player found things. */
export function caseFile(ep: Story, s: CaseState): Evidence[] {
  const out: Evidence[] = [];
  for (const f of s.flags) {
    if (!f.startsWith("seen:")) continue;
    const e = ep.evidence.find((x) => `seen:${x.id}` === f);
    if (e) out.push(e);
  }
  return out;
}

/* --- Locks -------------------------------------------------------------------- */

export const lockAvailable = (s: CaseState, l: Lock): boolean => all(s, l.requires);

export const digits = (input: string): string => input.replace(/\D/g, "");

/** A wrong code is remembered (`did:wrong:<lock>`): the phone photographs whoever typed it. */
export function tryUnlock(ep: Story, s: CaseState, lockId: string, input: string): { state: CaseState; ok: boolean } {
  const l = ep.locks.find((x) => x.id === lockId);
  if (!l || !lockAvailable(s, l)) return { state: s, ok: false };
  if (has(s, `lock:${l.id}`)) return { state: s, ok: true };
  const ok = digits(input) === l.answer;
  return { state: add(s, ok ? `lock:${l.id}` : `did:wrong:${l.id}`), ok };
}

/* --- Deductions --------------------------------------------------------------- */

export const deductionOpen = (s: CaseState, d: Deduction): boolean =>
  all(s, d.requires) && !has(s, `solved:${d.id}`);

/** Lower case, letters, digits and apostrophes, single spaces. */
export const normaliseAnswer = (t: string): string =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export type Answer = { state: CaseState; ok: boolean; reply: string };

/**
 * Put a pick to a question: evidence ids for "show me", a place id for "pin
 * it", or typed words. Evidence the player hasn't seen doesn't count, so a
 * guessed id in a crafted request solves nothing. A wrong pick costs nothing
 * but a nudge.
 */
export function answer(ep: Story, s: CaseState, deductionId: string, pick: readonly string[] | string): Answer {
  const d = ep.deductions.find((x) => x.id === deductionId);
  if (!d || !all(s, d.requires)) return { state: s, ok: false, reply: "" };
  if (has(s, `solved:${d.id}`)) return { state: s, ok: true, reply: d.right };

  let ok: boolean;
  let keys: string[];
  switch (d.answer.kind) {
    case "place": {
      const place = typeof pick === "string" ? pick : (pick[0] ?? "");
      keys = [place];
      ok = place === d.answer.place;
      break;
    }
    case "text": {
      const typed = normaliseAnswer(typeof pick === "string" ? pick : pick.join(" "));
      keys = [typed, typed === s.cast.name.toLowerCase() ? "{name}" : ""];
      ok = d.answer.accepts.includes(typed);
      break;
    }
    default: {
      const accepts = d.answer.accepts;
      const picked = [...new Set(typeof pick === "string" ? [pick] : pick)].filter((id) => has(s, `seen:${id}`));
      keys = picked;
      // The right evidence and nothing else. Accepting anything that merely
      // contained it let "tick everything, press Show" solve every question.
      const within = accepts.find((combo) => combo.every((id) => picked.includes(id)));
      ok = !!within && picked.length === within.length;
      if (within && !ok) return { state: s, ok, reply: TOO_MUCH };
    }
  }

  if (ok) return { state: add(s, `solved:${d.id}`), ok, reply: d.right };
  const nudge = keys.map((k) => d.nudges[k]).find(Boolean);
  return { state: s, ok, reply: nudge ?? d.otherwise };
}

/** The reply to the right evidence shown with extra alongside it. */
export const TOO_MUCH = "Some of that proves it. Take out what doesn't.";

/* --- Hints -------------------------------------------------------------------- */

/** The next hint for a lock or a question: 1, 2, then 3 (the answer), then 3 again. */
export function hint(ep: Story, s: CaseState, id: string): { state: CaseState; tier: 1 | 2 | 3; text: string } | null {
  const hints = (ep.locks.find((l) => l.id === id) ?? ep.deductions.find((d) => d.id === id))?.hints;
  if (!hints) return null;
  const tier = Math.min(3, (s.hints[id] ?? 0) + 1) as 1 | 2 | 3;
  return { state: { ...s, hints: { ...s.hints, [id]: tier } }, tier, text: hints[tier - 1] };
}

/* --- Live events -------------------------------------------------------------- */

/** Events whose moment has come and which haven't happened yet, in script order. */
export function dueEvents(ep: Story, s: CaseState): LiveEvent[] {
  return ep.events.filter((e) => !has(s, `fired:${e.id}`) && all(s, e.when) && !anyOf(s, e.unless));
}

export const fire = (s: CaseState, eventId: string): CaseState => add(s, `fired:${eventId}`);

/* --- Replies ------------------------------------------------------------------ */

/** The exchange waiting on the player in a thread, if there is one. */
export function openReply(ep: Story, s: CaseState, threadId: string): Reply | undefined {
  return ep.replies.find((r) => r.thread === threadId && all(s, r.when) && !has(s, `said:${r.id}`));
}

/** What the player can say right now: unlocked, and not already said. */
export function replyOptions(s: CaseState, r: Reply): ReplyOption[] {
  return r.options.filter((o) => all(s, o.requires) && !has(s, `said:${r.id}:${o.id}`));
}

export function choose(ep: Story, s: CaseState, replyId: string, optionId: string): CaseState {
  const r = ep.replies.find((x) => x.id === replyId);
  if (!r || !all(s, r.when) || has(s, `said:${r.id}`)) return s;
  const o = r.options.find((x) => x.id === optionId);
  if (!o || !all(s, o.requires) || has(s, `said:${r.id}:${o.id}`)) return s;
  const next = add(s, `said:${r.id}:${o.id}`);
  return !r.repeat || o.final ? add(next, `said:${r.id}`) : next;
}

/* --- Things the player does to the phone -------------------------------------- */

export function actionAvailable(ep: Story, s: CaseState, id: string): boolean {
  const a = ep.actions.find((x) => x.id === id);
  return !!a && all(s, a.requires) && !has(s, a.sets);
}

export function perform(ep: Story, s: CaseState, id: string): CaseState {
  const a = ep.actions.find((x) => x.id === id);
  return a && actionAvailable(ep, s, id) ? add(s, a.sets) : s;
}

/** Time on screen in one app. A visit counts for `VISIT_CAP_MS` at most. */
export function logUsage(s: CaseState, app: AppId, ms: number): CaseState {
  if (!(ms > 0)) return s;
  const key = `${episodeOf(s)}:${app}`;
  return { ...s, usage: { ...s.usage, [key]: (s.usage[key] ?? 0) + Math.min(ms, VISIT_CAP_MS) } };
}

/** Opening an app from the home screen: what the report calls a pickup. */
export function openApp(s: CaseState): CaseState {
  const key = String(episodeOf(s));
  return { ...s, opens: { ...s.opens, [key]: (s.opens[key] ?? 0) + 1 } };
}

export function nameContact(s: CaseState, threadId: string, name: string): CaseState {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 24);
  const names = { ...s.names };
  if (clean) names[threadId] = clean;
  else delete names[threadId];
  return { ...s, names };
}

/* --- Where the story is ------------------------------------------------------- */

export function stage(ep: Story, s: CaseState): Stage {
  const list = ep.stages.filter((x) => x.episode === episodeOf(s));
  let current = list[0];
  for (const st of list) if (all(s, st.when)) current = st;
  return current;
}

export const battery = (ep: Story, s: CaseState): number => stage(ep, s).battery;

/** The battery gives out at the end of Episode 1, and Mum's app files its report. */
export function die(ep: Story, s: CaseState): CaseState {
  const next = add(s, "dead");
  return next.report ? next : { ...next, report: buildReport(ep, next) };
}

/* --- Time, in the story -------------------------------------------------------- */

function hhmm(base: string, minutes: number): string {
  const [h, m] = base.split(":").map(Number);
  const t = h * 60 + m + minutes;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const minutesSince = (from: number, at: number, cap: number) =>
  Math.min(cap, Math.max(0, Math.floor((at - from) / 60_000)));

/** Monday morning's clock: 08:10 when the envelope opens, one story minute
 *  per real one, stopping short of the police arriving at 11:52. */
export const morning = (s: CaseState, at: number): string =>
  hhmm(EP1_CLOCK.base, minutesSince(s.started, at, EP1_CLOCK.cap));

/** What the status bar reads right now. */
export function clockNow(s: CaseState, now: number): string {
  if (episodeOf(s) === 1) return morning(s, now);
  const plugged = s.at["did:plugged"];
  return plugged ? hhmm(EP2_CLOCK.base, minutesSince(plugged, now, EP2_CLOCK.cap)) : EP2_CLOCK.base;
}

/** When something happened, as the phone would print it. */
function stamp(s: CaseState, at: number | undefined): string {
  if (at === undefined) return "now";
  const ep2 = s.at["ep:2"];
  return `Mon ${ep2 !== undefined && at >= ep2 ? clockNow({ ...s, flags: [...s.flags, "ep:2"] }, at) : morning(s, at)}`;
}

/* --- Mum's report --------------------------------------------------------------- */

/** For a save from before any of this was measured: a plausible morning. */
const FALLBACK_APPS: Report["apps"] = [
  { app: "messages", minutes: 9 },
  { app: "photos", minutes: 7 },
  { app: "maps", minutes: 5 },
  { app: "calculator", minutes: 4 },
  { app: "settings", minutes: 2 },
];

export function buildReport(ep: Story, s: CaseState): Report {
  const measured = Object.entries(s.usage)
    .filter(([k]) => k.startsWith("1:"))
    .map(([k, ms]) => ({ app: k.slice(2) as AppId, minutes: Math.round(ms / 60_000) }))
    .filter((a) => a.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const apps = measured.length ? measured.slice(0, 5) : FALLBACK_APPS;
  const unlocked = s.at["lock:passcode"] ?? s.started + 4 * 60_000;
  const timeline = ep.guardian.timeline
    .filter((t) => s.at[t.flag] !== undefined)
    .map((t) => ({ at: s.at[t.flag], label: t.label }))
    .sort((a, b) => a.at - b.at)
    .map((t) => ({ time: morning(s, t.at), label: t.label }));
  return {
    firstPickup: morning(s, unlocked),
    pickups: Math.max(measured.length ? 1 : 17, s.opens["1"] ?? 0),
    minutes: Math.max(1, apps.reduce((n, a) => n + a.minutes, 0)),
    apps,
    timeline,
  };
}

/** The player's own numbers, for `say()`: what the story quotes back at them. */
export function sessionVars(ep: Story, s: CaseState): Record<string, string> {
  const r = s.report ?? buildReport(ep, s);
  const maps = r.apps.find((a) => a.app === "maps")?.minutes ?? 0;
  const pinned = s.at["solved:last-seen"];
  return {
    firstPickup: r.firstPickup,
    pickups: String(r.pickups),
    minutes: String(r.minutes),
    mapsTime: maps <= 1 ? "a minute" : `${maps} minutes`,
    pinnedAt: pinned !== undefined ? morning(s, pinned) : "09:02",
  };
}

/* --- Threads -------------------------------------------------------------------- */

/**
 * Every message in a thread right now, in the order it happened.
 *
 * The script's own messages come first; a message gated on a flag lands where
 * that flag was set (Episode 2's backlog arrives when `ep:2` does); live
 * events and the player's replies land where they fired, stamped with the
 * story's clock at that moment.
 */
export function threadMessages(ep: Story, s: CaseState, threadId: string): Message[] {
  const pos = (f: Flag) => s.flags.indexOf(f);
  const rows: { pos: number; seq: number; m: Message }[] = [];
  let seq = 0;

  const thread = ep.threads.find((t) => t.id === threadId) ?? (ep.vault.thread.id === threadId ? ep.vault.thread : undefined);
  for (const m of thread?.messages ?? []) {
    if (!all(s, m.requires)) continue;
    const at = Math.max(-1, ...(m.requires ?? []).map(pos));
    const scrubbed = m.scrubbedBy && has(s, m.scrubbedBy);
    rows.push({ pos: at, seq: seq++, m: scrubbed ? { ...m, text: "This message was deleted.", photo: undefined, evidence: undefined } : m });
  }

  s.flags.forEach((f, i) => {
    if (f.startsWith("fired:")) {
      const e = ep.events.find((x) => `fired:${x.id}` === f);
      if (e?.thread !== threadId) return;
      const when = stamp(s, s.at[f]);
      for (const m of e.messages) if (all(s, m.requires)) rows.push({ pos: i, seq: seq++, m: m.at === "now" ? { ...m, at: when } : m });
    } else if (f.startsWith("said:")) {
      const [, rid, oid] = f.split(":");
      if (!oid) return;
      const r = ep.replies.find((x) => x.id === rid);
      if (r?.thread !== threadId) return;
      const o = r.options.find((x) => x.id === oid);
      if (o?.text) rows.push({ pos: i, seq: seq++, m: { from: "owner", at: stamp(s, s.at[f]), text: o.text } });
    }
  });

  return rows.sort((a, b) => a.pos - b.pos || a.seq - b.seq).map((r) => r.m);
}
