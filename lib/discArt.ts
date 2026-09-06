"use client";

import type { DiscArt } from "@/app/api/music/discs/route";

/* ===========================================================================
   The six records' sleeves, fetched once.

   A module singleton with `useSyncExternalStore` rather than context, for the
   same reason `lib/audio.ts` is one: the discs are siblings deep inside a
   transformed world, and threading a provider through `CanvasWorld` for one
   fetch would make more of the board a client component than already is.

   IT HAS TO BE A FETCH. `CanvasSurface` is `"use client"` and imports the whole
   world from it, so nothing under `CanvasWorld` can await anything — the
   sleeves cannot be resolved on the server the way the homepage card's are.

   `prefetchDiscArt` is idempotent and is called from two places: the homepage
   canvas card on hover, and the board itself on mount. The first is the one
   that usually wins — the morph into the canvas takes about six hundred
   milliseconds, which is long enough for six sleeves to arrive, so the artwork
   is normally there before the board is legible. Arriving during a zoom reads
   as focus pulling rather than as a pop; arriving into a settled board would
   not, which is why the widget draws a real sleeve underneath either way.
   =========================================================================== */

export type DiscArtMap = Readonly<Record<string, DiscArt>>;

const EMPTY: DiscArtMap = {};

let state: DiscArtMap = EMPTY;
let started = false;
const listeners = new Set<() => void>();

export function subscribeDiscArt(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The same object until it actually changes — `useSyncExternalStore` compares
 *  snapshots by identity and would loop forever on a fresh one each call. */
export const discArt = (): DiscArtMap => state;
export const noDiscArtServerSide = (): DiscArtMap => EMPTY;

export function prefetchDiscArt(): void {
  if (started) return;
  started = true;

  void fetch("/api/music/discs")
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      if (!json || typeof json !== "object") return;
      state = json as DiscArtMap;
      for (const fn of listeners) fn();
    })
    .catch(() => {
      /* Offline, or the storefront is unreachable. Every record keeps its
         drawn sleeve and stays silent, which is a board rather than a
         collection of grey squares — see Disc.module.css. */
    });
}
