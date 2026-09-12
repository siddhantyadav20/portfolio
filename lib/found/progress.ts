import type { CaseState } from "./engine";

/* ===========================================================================
   The playthrough, kept.

   The same shape as `lib/brief`'s handed-in record: a module value, read once
   from localStorage, written on every change, read by components through
   `useSyncExternalStore`. The server snapshot is always "no case yet", and
   the cast is only dealt when the envelope is opened (a click, never a
   render), so a random pick can't make the server and the browser disagree.
   =========================================================================== */

const KEY = "sy-found-v1";

let state: CaseState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

/** Anything else in storage (an older shape, a hand-edited value) is ignored. */
function valid(x: unknown): x is CaseState {
  const s = x as CaseState | null;
  return (
    !!s &&
    s.v === 1 &&
    typeof s.run === "string" &&
    !!s.cast &&
    (s.cast.gender === "girl" || s.cast.gender === "boy") &&
    typeof s.cast.name === "string" &&
    Array.isArray(s.flags) &&
    s.flags.every((f) => typeof f === "string") &&
    !!s.hints &&
    typeof s.hints === "object" &&
    typeof s.started === "number"
  );
}

export function readProgress(): CaseState | null {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (valid(parsed)) state = parsed;
    } catch {
      // Private mode, or storage refused: a fresh case, nothing broken.
    }
  }
  return state;
}

export const progressServerSide = (): CaseState | null => null;

export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Save the playthrough, or `null` to put the phone back in the envelope. */
export function commit(next: CaseState | null): void {
  readProgress();
  if (next === state) return;
  state = next;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Full or refused. The case still holds for this visit.
  }
  for (const fn of listeners) fn();
}
