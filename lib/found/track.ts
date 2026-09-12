/**
 * Tell the funnel something happened. Fire-and-forget, like `lib/telemetry`:
 * `sendBeacon` survives the tab closing, which is exactly when "got this far
 * and gave up" gets decided. Never throws, never blocks, sends no identifier.
 */
export function track(event: string, seconds?: number): void {
  if (typeof navigator === "undefined") return;
  const body = JSON.stringify(seconds === undefined ? { event } : { event, seconds: Math.round(seconds) });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/found", blob)) return;
    void fetch("/api/found", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {
    // Measuring the game must never be the thing that breaks it.
  }
}
