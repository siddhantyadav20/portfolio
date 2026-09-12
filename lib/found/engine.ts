import type {
  Act,
  Cast,
  Deduction,
  Episode,
  Evidence,
  Flag,
  LiveEvent,
  Lock,
} from "@/content/found/types";

/* ===========================================================================
   The rules of a playthrough, and nothing else.

   Pure: every function takes a state and returns a new one, so the whole
   episode can be played start to finish in a Node test (the solvability check
   in tests/found.test.ts does exactly that). Nothing here touches the DOM,
   storage or the clock; `lib/found/progress.ts` keeps the state and the
   components call these.
   =========================================================================== */

/** Copy budgets. The UI lays out against them; the tests hold the script to them. */
export const BUBBLE_MAX = 150;
export const LABEL_MAX = 44;
export const DETAIL_MAX = 120;
export const QUESTION_MAX = 60;

export type CaseState = {
  readonly v: 1;
  /** A random id for this playthrough. Tracking only; never shown. */
  readonly run: string;
  readonly cast: Cast;
  readonly flags: readonly Flag[];
  /** How many hints each lock or question has given. */
  readonly hints: Readonly<Record<string, number>>;
  readonly started: number;
};

export function newCase(cast: Cast, run: string, now: number): CaseState {
  return { v: 1, run, cast, flags: [], hints: {}, started: now };
}

export const has = (s: CaseState, flag: Flag): boolean => s.flags.includes(flag);

export const all = (s: CaseState, flags: readonly Flag[] = []): boolean =>
  flags.every((f) => has(s, f));

function add(s: CaseState, flag: Flag): CaseState {
  return has(s, flag) ? s : { ...s, flags: [...s.flags, flag] };
}

/* --- Evidence ---------------------------------------------------------------- */

/** Everything past the lock screen needs the phone unlocked first. */
export function evidenceAvailable(s: CaseState, e: Evidence): boolean {
  if (e.app !== "lock" && !has(s, "lock:passcode")) return false;
  return all(s, e.requires);
}

/** The player has looked at it. Unknown or not-yet-reachable ids change nothing. */
export function see(ep: Episode, s: CaseState, evidenceId: string): CaseState {
  const e = ep.evidence.find((x) => x.id === evidenceId);
  if (!e || !evidenceAvailable(s, e)) return s;
  return add(s, `seen:${e.id}`);
}

/** The case file, in the order the player found things. */
export function caseFile(ep: Episode, s: CaseState): Evidence[] {
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

export function tryUnlock(
  ep: Episode,
  s: CaseState,
  lockId: string,
  input: string,
): { state: CaseState; ok: boolean } {
  const l = ep.locks.find((x) => x.id === lockId);
  if (!l || !lockAvailable(s, l)) return { state: s, ok: false };
  if (has(s, `lock:${l.id}`)) return { state: s, ok: true };
  const ok = digits(input) === l.answer;
  return { state: ok ? add(s, `lock:${l.id}`) : s, ok };
}

/* --- Deductions --------------------------------------------------------------- */

export const deductionOpen = (s: CaseState, d: Deduction): boolean =>
  all(s, d.requires) && !has(s, `solved:${d.id}`);

export type Answer = { state: CaseState; ok: boolean; reply: string };

/**
 * Put a pick to a question: evidence ids for "show me", a place id for "pin
 * it". Evidence the player hasn't seen doesn't count, so a guessed id in a
 * crafted request solves nothing. A wrong pick costs nothing but a nudge.
 */
export function answer(
  ep: Episode,
  s: CaseState,
  deductionId: string,
  pick: readonly string[] | string,
): Answer {
  const d = ep.deductions.find((x) => x.id === deductionId);
  if (!d || !all(s, d.requires)) return { state: s, ok: false, reply: "" };
  if (has(s, `solved:${d.id}`)) return { state: s, ok: true, reply: d.right };

  let ok: boolean;
  let picked: readonly string[];
  if (d.answer.kind === "place") {
    picked = [typeof pick === "string" ? pick : pick[0] ?? ""];
    ok = picked[0] === d.answer.place;
  } else {
    picked = (typeof pick === "string" ? [pick] : pick).filter((id) => has(s, `seen:${id}`));
    ok = d.answer.accepts.some((combo) => combo.every((id) => picked.includes(id)));
  }

  if (ok) return { state: add(s, `solved:${d.id}`), ok, reply: d.right };
  const nudge = picked.map((id) => d.nudges[id]).find(Boolean);
  return { state: s, ok, reply: nudge ?? d.otherwise };
}

/* --- Hints -------------------------------------------------------------------- */

/** The next hint for a lock or a question: 1, 2, then 3 (the answer), then 3 again. */
export function hint(
  ep: Episode,
  s: CaseState,
  id: string,
): { state: CaseState; tier: 1 | 2 | 3; text: string } | null {
  const hints = (ep.locks.find((l) => l.id === id) ?? ep.deductions.find((d) => d.id === id))?.hints;
  if (!hints) return null;
  const tier = Math.min(3, (s.hints[id] ?? 0) + 1) as 1 | 2 | 3;
  return { state: { ...s, hints: { ...s.hints, [id]: tier } }, tier, text: hints[tier - 1] };
}

/* --- Live events -------------------------------------------------------------- */

/** Events whose moment has come and which haven't happened yet, in script order. */
export function dueEvents(ep: Episode, s: CaseState): LiveEvent[] {
  return ep.events.filter((e) => !has(s, `fired:${e.id}`) && all(s, e.when));
}

export const fire = (s: CaseState, eventId: string): CaseState => add(s, `fired:${eventId}`);

/** The battery gives out. Only the end of the cliffhanger does this. */
export const die = (s: CaseState): CaseState => add(s, "dead");

/* --- Where the story is ------------------------------------------------------- */

export function act(ep: Episode, s: CaseState): Act {
  if (has(s, "dead")) return "dead";
  if (!has(s, "lock:passcode")) return "locked";
  const [first, second, last] = ep.deductions.map((d) => `solved:${d.id}` as Flag);
  if (has(s, last)) return "cliff";
  if (has(s, second) && has(s, "lock:vault")) return "act3";
  if (has(s, first)) return "act2";
  return "act1";
}

export const battery = (ep: Episode, s: CaseState): number => ep.battery[act(ep, s)];

/** Every message in a thread right now: the script's, then whatever events have added. */
export function threadMessages(ep: Episode, s: CaseState, threadId: string) {
  const thread = ep.threads.find((t) => t.id === threadId);
  const base = thread?.messages ?? [];
  const added = ep.events
    .filter((e) => e.thread === threadId && has(s, `fired:${e.id}`))
    .flatMap((e) => e.messages);
  return [...base, ...added];
}
