"use client";

/**
 * How anything on the site asks for the colophon.
 *
 * The reader is owned by the footer's link — see `ColophonLink` — and there is
 * exactly one other caller: ⌘K. An event rather than context or a prop, for
 * the reason `lib/palette` gives for the same choice: the palette is mounted
 * once in the root layout, the link is at the bottom of the homepage, and they
 * share no provider. A context would mean wrapping the app to let one row talk
 * to one button.
 *
 * It also keeps the reader lazily loadable. The palette fires this without
 * importing a line of the colophon; nothing is fetched until somebody actually
 * asks for it, which is what keeps the homepage's budget intact.
 */
export const MAKING_OPEN = "sy-making-open";

export function openMaking() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MAKING_OPEN));
}
