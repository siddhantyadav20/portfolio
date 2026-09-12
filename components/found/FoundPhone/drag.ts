import type { PointerEvent as ReactPointerEvent } from "react";

/* ===========================================================================
   One drag, for every gesture the phone has: lifting the lock screen,
   pulling an app down to go home, swiping a screen back, flicking a banner
   away, pulling a photo down to put it away.

   A drag doesn't claim the pointer until it has moved a few pixels the way
   its gesture wants (`engage`). Anything else (a tap, a scroll, the other
   axis) is left alone and the drag steps aside. Once it has claimed the
   pointer, the click that would follow is swallowed, so letting go of a
   swipe never also presses whatever it started on.
   =========================================================================== */

export type DragEnd = {
  dx: number;
  dy: number;
  /** Speed at release, in px per ms. Zero if the finger had stopped. */
  vx: number;
  vy: number;
};

type Gesture = {
  /** Given the movement so far, is this our gesture? Asked once, past the slop. */
  engage: (dx: number, dy: number) => boolean;
  move: (dx: number, dy: number) => void;
  end: (at: DragEnd) => void;
};

const SLOP = 6;
/** A finger that stopped this long before lifting has no flick left in it. */
const STALE_MS = 90;

export function drag(e: ReactPointerEvent, g: Gesture): void {
  if (e.button !== 0) return;
  const id = e.pointerId;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let engaged = false;
  let last = { x: x0, y: y0, t: e.timeStamp };
  let v = { x: 0, y: 0 };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    const dx = ev.clientX - x0;
    const dy = ev.clientY - y0;
    if (!engaged) {
      if (Math.hypot(dx, dy) < SLOP) return;
      if (!g.engage(dx, dy)) {
        stop();
        return;
      }
      engaged = true;
    }
    const dt = Math.max(1, ev.timeStamp - last.t);
    v = { x: (ev.clientX - last.x) / dt, y: (ev.clientY - last.y) / dt };
    last = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
    g.move(dx, dy);
  };

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    stop();
    if (!engaged) return;
    swallowClick();
    const fresh = ev.timeStamp - last.t < STALE_MS;
    g.end({ dx: ev.clientX - x0, dy: ev.clientY - y0, vx: fresh ? v.x : 0, vy: fresh ? v.y : 0 });
  };

  // The browser took the pointer (a scroll won, the tab lost focus): settle
  // wherever the drag had got to, with no flick.
  const onCancel = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    stop();
    if (engaged) g.end({ dx: last.x - x0, dy: last.y - y0, vx: 0, vy: 0 });
  };

  function stop() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
}

/**
 * Eat the click a finished drag would otherwise deliver to what it began on.
 * Only the browser's own (`isTrusted`): a click the gesture makes itself,
 * like swipe-back pressing the back button, has to get through.
 */
function swallowClick() {
  const eat = (ev: MouseEvent) => {
    if (!ev.isTrusted) return;
    ev.preventDefault();
    ev.stopPropagation();
    window.removeEventListener("click", eat, true);
  };
  window.addEventListener("click", eat, true);
  window.setTimeout(() => window.removeEventListener("click", eat, true), 350);
}
