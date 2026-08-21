"use client";

/**
 * Somewhere for the site to say that something went wrong.
 *
 * There was nothing before this. `app/error.tsx` said so in a comment and fell
 * back to `console.error`, which reaches exactly one person: whoever already
 * has the failing page open with devtools up. For a portfolio whose whole job
 * is to be opened by strangers on hardware you will never see, a silent
 * failure on a recruiter's phone is the most expensive thing that can happen
 * and was also the one thing guaranteed to go unnoticed.
 *
 * ---------------------------------------------------------------------------
 * Deliberately not a platform. PROJECT.md asks for the smallest architecture
 * and no external services without a real requirement; "I need to know when it
 * breaks" is a real requirement, and it justifies one endpoint, not an SDK.
 *
 * So: no dependency, no vendor, no cookie, no identifier, and nothing sent at
 * all unless `NEXT_PUBLIC_TELEMETRY_URL` names somewhere to send it. Point it
 * at a serverless function, a log drain, or a hosted analytics ingest — the
 * payload below is plain JSON and deliberately dull.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_TELEMETRY_URL;

type Event =
  | { kind: "vital"; name: string; value: number; rating: string }
  | { kind: "error"; message: string; digest?: string; fatal: boolean };

export function report(event: Event) {
  if (!ENDPOINT || typeof navigator === "undefined") return;

  const body = JSON.stringify({
    ...event,
    // Enough to tell a broken page from a broken browser, and no more. No
    // identifier of any kind: nothing here distinguishes one visitor from
    // another, or the same visitor across two visits.
    path: window.location.pathname,
    at: Date.now(),
  });

  // `sendBeacon` survives the page being closed, which matters for both of
  // these: a vital is measured at the end of a visit and an error frequently
  // precedes someone giving up. `fetch` with `keepalive` is the fallback for
  // the browsers that lack it.
  try {
    if (navigator.sendBeacon?.(ENDPOINT, body)) return;
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(
      () => {},
    );
  } catch {
    // Telemetry must never be the thing that breaks the page it is reporting
    // on. If it cannot send, it stops.
  }
}
