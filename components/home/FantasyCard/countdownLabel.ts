/**
 * Time to kickoff, as the card's top-right corner says it — "1d 23h", "5h 12m",
 * "42m". Two units at most: the second one is the precision anyone planning
 * around a match wants, and a third would be a clock rather than a countdown.
 *
 * Null once the time has passed, so the caller decides what to say — the
 * fixture has kicked off, and this page cannot know the score yet.
 *
 * Pure and dependency-free so both the server render and the client island
 * compute the same string from the same instant.
 */
export function countdownLabel(ms: number): string | null {
  if (ms <= 0) return null;

  const minutes = Math.floor(ms / 60_000);
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  /* Under a minute still reads as a minute to go, not as "0m". */
  return `${Math.max(1, m)}m`;
}
