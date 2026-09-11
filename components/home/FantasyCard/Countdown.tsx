"use client";

import { useSyncExternalStore } from "react";
import { countdownLabel } from "./countdownLabel";

/**
 * "1d 23h" to kickoff — the card's one client island.
 *
 * WHY THIS IS JAVASCRIPT WHEN THE REST OF THE CARD IS NOT. The first version of
 * this card refused a countdown on the argument that a relative time is wrong
 * the moment the page is cached, and it was right: a server-rendered "1d 23h"
 * is still saying "1d 23h" to whoever reads it the next evening. The redesign
 * draws one, so this computes it in the reader's browser, from the absolute
 * instant, where it cannot go stale — and ticks it over every half minute.
 *
 * The server's string is the first paint (and the whole of it without
 * JavaScript), handed to the store as its server snapshot so hydration matches
 * byte for byte; the client's own reading replaces it straight after.
 */

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, TICK_MS);
  return () => window.clearInterval(id);
}

export default function Countdown({
  kickoff,
  initial,
  due,
  title,
  className,
}: {
  /** ISO 8601, UTC. */
  kickoff: string;
  /** The server's reading, used until the browser has its own. */
  initial: string;
  /** What to say once kickoff has passed. */
  due: string;
  /** The absolute kickoff, for the tooltip — "Sat 16:30 BST". */
  title: string;
  className?: string;
}) {
  const label = useSyncExternalStore(
    subscribe,
    () => countdownLabel(Date.parse(kickoff) - Date.now()) ?? due,
    () => initial,
  );

  return (
    <time className={className} dateTime={kickoff} title={title}>
      {label}
    </time>
  );
}
