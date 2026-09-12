import type { CaseState } from "./engine";

/* ===========================================================================
   The playthrough, kept.

   The same shape as `lib/brief`'s handed-in record: a module value, read once
   from localStorage, written on every change, read by components through
   `useSyncExternalStore`. The server snapshot is always "no case yet", and
   the cast is only dealt when the envelope is opened (a click, never a
   render), so a random pick can't make the server and the browser disagree.

   Saves from before Episode 2 (v1) are upgraded in place: same flags, same
   cast, an empty record of use. Someone who finished Episode 1 last week
   comes back to an end card that now says "Charge it".
   =========================================================================== */

const KEY = "sy-found-v1";

let state: CaseState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** A stored value, as today's shape — or null if it isn't a save at all. */
export function upgrade(x: unknown): CaseState | null {
  if (!isRecord(x)) return null;
  const cast = x.cast as Record<string, unknown> | undefined;
  const basic =
    typeof x.run === "string" &&
    isRecord(cast) &&
    (cast.gender === "girl" || cast.gender === "boy") &&
    typeof cast.name === "string" &&
    Array.isArray(x.flags) &&
    x.flags.every((f) => typeof f === "string") &&
    isRecord(x.hints) &&
    typeof x.started === "number";
  if (!basic) return null;

  if (x.v === 1) {
    return { ...(x as unknown as Omit<CaseState, "v" | "at" | "usage" | "opens" | "names">), v: 2, at: {}, usage: {}, opens: {}, names: {} };
  }
  if (x.v === 2 && isRecord(x.at) && isRecord(x.usage) && isRecord(x.opens) && isRecord(x.names)) {
    return x as unknown as CaseState;
  }
  return null;
}

export function readProgress(): CaseState | null {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      state = raw ? upgrade(JSON.parse(raw)) : null;
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
