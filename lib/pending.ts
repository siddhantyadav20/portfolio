/* ===========================================================================
   The card you pressed, while what it opens is on its way.

   Every surface that opens out of a card here — a case study, the canvas,
   the About reader, the colophon — morphs out of the card itself, and every
   one of them has to have its code (and its hero) in hand before the morph
   can start. Hovering fetches all of that ahead of time, so on a laptop the
   wait is nothing. On a phone there is no hover, and on a slow connection
   the tap was answered by nothing at all until the study appeared.

   So the card answers it. If the wait outlasts a beat, the pressed card
   becomes the loader for what is coming out of it: a ring of light leaves
   the point you touched and keeps leaving it, the opening scene's light
   (see lib/scene.ts) in the one frame the content will grow from. Where the
   content is coming from is the whole message, and it is already true.

   UNDER A BEAT, NOTHING. A loader that flashes for one frame on a fast load
   is worse than none, so it waits `DELAY_MS` before it shows, and a wait that
   ends first never drew anything.

   GONE BEFORE THE MORPH. The attribute comes off in the same task the wait
   ends in, before `morph()` snapshots the card — so the snapshot is the card
   at rest, never a card mid-ring.
   =========================================================================== */

/** How long a wait has to be before it is shown. */
export const DELAY_MS = 140;

let last: { x: number; y: number } | null = null;

if (typeof document !== "undefined") {
  /* Where the press was. Captured for every press rather than passed in,
     because the open handlers are reached from clicks, from keys and from
     the palette, and only one of those has a point to give. */
  document.addEventListener(
    "pointerdown",
    (e) => {
      last = { x: e.clientX, y: e.clientY };
    },
    { capture: true, passive: true },
  );
}

/**
 * Await `work`, showing it on `el` if it takes longer than a beat.
 *
 * `el` may be anything or nothing — a handler opened from the keyboard has no
 * card to show it on, and simply waits.
 */
export async function pending<T>(
  el: Element | null | undefined,
  work: Promise<T>,
): Promise<T> {
  if (!(el instanceof HTMLElement)) return work;

  const show = window.setTimeout(() => {
    const r = el.getBoundingClientRect();
    const p =
      last &&
      last.x >= r.left &&
      last.x <= r.right &&
      last.y >= r.top &&
      last.y <= r.bottom
        ? { x: last.x - r.left, y: last.y - r.top }
        : { x: r.width / 2, y: r.height / 2 };
    // Far enough to clear the farthest corner from where it starts.
    const reach = Math.hypot(
      Math.max(p.x, r.width - p.x),
      Math.max(p.y, r.height - p.y),
    );
    el.style.setProperty("--pending-x", `${p.x}px`);
    el.style.setProperty("--pending-y", `${p.y}px`);
    el.style.setProperty("--pending-reach", `${Math.ceil(reach)}px`);
    el.setAttribute("data-pending", "");
    el.setAttribute("aria-busy", "true");
  }, DELAY_MS);

  try {
    return await work;
  } finally {
    window.clearTimeout(show);
    el.removeAttribute("data-pending");
    el.removeAttribute("aria-busy");
  }
}
