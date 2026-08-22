/**
 * Finding the element a given node actually scrolls inside.
 *
 * The reader has two homes and they scroll differently. On `/work/<slug>` the
 * page scrolls, so progress is `document.documentElement.scrollTop`. Inside the
 * modal the page behind is locked and the scrolling element is the overlay —
 * a `position: fixed` box with `overflow-y: auto` — so the document's scroll
 * position is a constant zero and anything reading it draws a progress bar
 * that never moves.
 *
 * Rather than passing the container down from whichever surface built it, a
 * chrome element walks up from itself and asks. That keeps `StudyReader` free
 * of a prop that only exists because of where it happens to be mounted, and it
 * is correct for any future container without being told about it.
 */
export function findScrollRoot(from: Element | null): HTMLElement | null {
  const { body, documentElement } = document;

  for (let node = from?.parentElement; node; node = node.parentElement) {
    /* <body> and <html> are never the answer, and this is not a shortcut.
       `overflow-x: hidden` on <body> — which this site sets, to stop the
       canvas card overhanging into a horizontal scrollbar — computes the
       *other* axis from `visible` to `auto`. So a plain page's <body> reports
       `overflow-y: auto` while scrolling nothing: its scrollHeight and
       clientHeight are equal, `max` comes out zero, and a progress bar
       measured against it reads as fully scrolled from the first frame. That
       was the bar sitting at full width at the top of the page. */
    if (node === body || node === documentElement) break;

    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }

  // Null means the document — the route's case, and the caller's default.
  return null;
}

/** Scroll position and total scrollable distance, for either root. */
export function scrollMetrics(root: HTMLElement | null): {
  top: number;
  max: number;
  viewport: number;
} {
  const el = root ?? document.documentElement;
  const viewport = root ? root.clientHeight : window.innerHeight;
  return {
    top: root ? root.scrollTop : window.scrollY,
    max: Math.max(el.scrollHeight - viewport, 0),
    viewport,
  };
}
