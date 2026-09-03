"use client";

/**
 * How the footer asks for the colophon.
 *
 * An event rather than context or a prop, for the reason `lib/palette` gives
 * for the same choice: `SiteFooter` is a server component rendered in two
 * places, `MakingCard` is a client island at the bottom of the homepage, and
 * they share no provider. A context would mean wrapping the page to let one
 * link talk to one card.
 *
 * It also keeps the reader lazily reachable without the footer importing any
 * of it — the footer's link is nine lines and knows nothing about what it
 * opens.
 */
export const MAKING_OPEN = "sy-making-open";

export function openMaking() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MAKING_OPEN));
}
