import { episode1 as ep } from "@/content/found/episode1";
import type { Cast, Gender } from "@/content/found/types";
import * as engine from "@/lib/found/engine";
import { MILESTONE_OF } from "@/lib/found/events";
import { commit, readProgress } from "@/lib/found/progress";
import { track } from "@/lib/found/track";
import { pickCast } from "@/lib/found/voice";
import { wakeAudio } from "@/lib/found/buzz";

/* ===========================================================================
   Everything the phone can do to the case, in one place.

   Each action reads the latest saved state, runs the engine, saves the result,
   and counts any milestone it crossed. Components call these directly rather
   than threading callbacks through eight apps; the state comes back to them
   through the progress store.
   =========================================================================== */

function save(next: engine.CaseState): void {
  const prev = readProgress();
  if (!prev || next === prev) return;
  for (const f of next.flags) {
    if (prev.flags.includes(f)) continue;
    const milestone = MILESTONE_OF[f];
    if (milestone) track(milestone, milestone === "end" ? (Date.now() - next.started) / 1000 : undefined);
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
  commit(engine.newCase(devCast() ?? pickCast(ep.names), runId(), Date.now()));
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
  if (r.ok) save(r.state);
  else track(`wrong:${lockId}`);
  return r.ok;
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
  if (s) save(engine.die(s));
}

/** Back in the envelope. The next open deals a new cast. */
export function reset(): void {
  commit(null);
}

export function resumed(): void {
  track("resume");
}

export function verdict(event: "ep2:yes" | "ep2:no" | "email"): void {
  track(event);
}
