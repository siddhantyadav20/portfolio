import { story as ep } from "@/content/found/story";
import type { AppId, Cast, Gender } from "@/content/found/types";
import * as engine from "@/lib/found/engine";
import { MILESTONE_OF } from "@/lib/found/events";
import { commit, readProgress } from "@/lib/found/progress";
import { track } from "@/lib/found/track";
import { pickCast } from "@/lib/found/voice";
import { wakeAudio } from "@/lib/found/buzz";

/* ===========================================================================
   Everything the phone can do to the case, in one place.

   Each action reads the latest saved state, runs the engine, stamps the time
   on every flag it newly set (that's the clock Mum's report is written in),
   saves the result, and counts any milestone it crossed. Components call
   these directly rather than threading callbacks through a dozen apps; the
   state comes back to them through the progress store.
   =========================================================================== */

function save(next: engine.CaseState): void {
  const prev = readProgress();
  if (!prev || next === prev) return;
  const fresh = next.flags.filter((f) => !prev.flags.includes(f));
  if (fresh.length) {
    const now = Date.now();
    const at: Record<string, number> = { ...next.at };
    for (const f of fresh) {
      at[f] ??= now;
      const milestone = MILESTONE_OF[f];
      if (milestone) track(milestone, milestone === "end" ? (now - next.started) / 1000 : undefined);
    }
    next = { ...next, at };
  }
  commit(next);
}

/** `?cast=girl`, `?cast=boy` or `?cast=<name>` in dev, to play a specific version. */
function devCast(): Cast | null {
  if (process.env.NODE_ENV !== "development") return null;
  const q = new URLSearchParams(window.location.search).get("cast");
  if (!q) return null;
  for (const gender of ["girl", "boy"] as Gender[]) {
    if (q === gender) return { gender, name: ep.names[gender][0] };
    const name = ep.names[gender].find((n) => n.toLowerCase() === q.toLowerCase());
    if (name) return { gender, name };
  }
  return null;
}

function runId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/** The envelope is opened: deal the cast and start the case. Runs in a click. */
export function start(): void {
  wakeAudio();
  const s = engine.newCase(devCast() ?? pickCast(ep.names), runId(), Date.now());
  commit(engine.see(ep, s, ep.envelope.evidence));
  track("open");
}

export function see(id: string | undefined): void {
  const s = readProgress();
  if (s && id) save(engine.see(ep, s, id));
}

export function seeAll(ids: readonly (string | undefined)[]): void {
  const s = readProgress();
  if (!s) return;
  let next = s;
  for (const id of ids) if (id) next = engine.see(ep, next, id);
  save(next);
}

export function unlock(lockId: string, input: string): boolean {
  const s = readProgress();
  if (!s) return false;
  const r = engine.tryUnlock(ep, s, lockId, input);
  save(r.state);
  if (!r.ok) track(`wrong:${lockId}`);
  return r.ok;
}

/** After the phone restarts in Episode 2 it wants the passcode again. */
export function unlockAfterRestart(input: string): boolean {
  const s = readProgress();
  const passcode = ep.locks.find((l) => l.id === "passcode")?.answer;
  if (!s || engine.digits(input) !== passcode) return false;
  save(engine.perform(ep, s, "unlock-2"));
  return true;
}

export function answer(deductionId: string, pick: readonly string[] | string): engine.Answer | null {
  const s = readProgress();
  if (!s) return null;
  const r = engine.answer(ep, s, deductionId, pick);
  if (r.ok) save(r.state);
  else track(`wrong:${deductionId}`);
  return r;
}

export function hint(id: string): string | null {
  const s = readProgress();
  if (!s) return null;
  const h = engine.hint(ep, s, id);
  if (!h) return null;
  save(h.state);
  track(`hint:${id}:${h.tier}`);
  return h.text;
}

export function fire(eventId: string): void {
  const s = readProgress();
  if (s) save(engine.fire(s, eventId));
}

export function die(): void {
  const s = readProgress();
  if (s) save(engine.die(ep, s));
}

/** Something done to the phone itself. False if it wasn't possible (yet). */
export function perform(actionId: string): boolean {
  const s = readProgress();
  if (!s) return false;
  const next = engine.perform(ep, s, actionId);
  save(next);
  return next !== s;
}

/** Send a reply from the phone. */
export function choose(replyId: string, optionId: string): void {
  const s = readProgress();
  if (s) save(engine.choose(ep, s, replyId, optionId));
}

export function nameContact(threadId: string, name: string): void {
  const s = readProgress();
  if (s) commit(engine.nameContact(s, threadId, name));
}

/** Time spent in an app: the minutes Mum's report will show. */
export function logUsage(app: AppId, ms: number): void {
  const s = readProgress();
  if (s) commit(engine.logUsage(s, app, ms));
}

/** An app opened from the home screen: a pickup, as Guardian counts them. */
export function openApp(): void {
  const s = readProgress();
  if (s) commit(engine.openApp(s));
}

/** Back in the envelope. The next open deals a new cast. */
export function reset(): void {
  commit(null);
}

export function resumed(): void {
  track("resume");
}

/** A vote or a reaction, counted and nothing else. */
export function verdict(event: string): void {
  track(event);
}
