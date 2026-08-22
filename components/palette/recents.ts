"use client";

import { PALETTE_INDEX, type PaletteEntry } from "@/content/palette";

/* ===========================================================================
   What this visitor looked at last time.

   The smallest possible memory, and the reason it is worth having: a recruiter
   who comes back to a portfolio is almost always coming back to *one specific
   thing* — the study they half-read before a meeting, the number they want to
   quote to a colleague. Every portfolio makes them find it again from the top.

   Stored as ids, not content. The entry itself is looked up in the index at
   read time, so a remembered row whose heading has since been reworded shows
   the new wording, and one whose section has been deleted quietly disappears
   instead of pointing at nothing. That is the same discipline the rest of the
   palette follows: `content/` is the only place facts live.

   Deliberately `localStorage` and deliberately not a cookie, an account or a
   fetch. Nothing here leaves the browser, nothing identifies anyone, and the
   whole feature degrades to "no Recent group" if storage is unavailable —
   which it genuinely is in a private window, and which is not an error.
   =========================================================================== */

const KEY = "sy-palette-recent";

/** Six is what fits above the fold without pushing "Start here" off it. */
const KEEP = 6;

/**
 * Storage that cannot throw.
 *
 * Safari in private mode throws on `setItem` rather than failing quietly, and
 * a palette that crashes on open because it tried to remember something is a
 * far worse trade than one that forgets.
 */
function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Nothing to do, and nothing worth telling anyone about.
  }
}

/**
 * Remember that this row was opened.
 *
 * Most-recent first, de-duplicated, capped. Actions are not remembered — see
 * `remember`'s caller: "Copy email" in a Recent list is noise, because it is
 * already one of four things in the empty state and nobody needs a history of
 * having copied an address.
 */
export function remember(entry: PaletteEntry) {
  if (entry.to.kind === "action" || entry.to.kind === "answer") return;
  write([entry.id, ...read().filter((id) => id !== entry.id)].slice(0, KEEP));
}

/** The remembered rows that still exist, most recent first. */
export function recents(): PaletteEntry[] {
  const byId = new Map(PALETTE_INDEX.map((e) => [e.id, e]));
  return read()
    .map((id) => byId.get(id))
    .filter((e): e is PaletteEntry => Boolean(e));
}

export function forgetAll() {
  write([]);
}
