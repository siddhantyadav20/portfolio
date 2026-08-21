"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Whether an element is worth animating right now.
 *
 * Two conditions, and both matter on the canvas:
 *
 *   - It is on screen. The board is 3000x3000 and the camera shows a fraction
 *     of it, so most widgets are outside the viewport most of the time. An
 *     IntersectionObserver is exactly right here even though the world is
 *     inside a transform: intersection is computed against the viewport after
 *     transforms, so panning away really does report `false`.
 *
 *   - The tab is in the foreground. Browsers throttle rAF in a background tab
 *     but do not stop it, and a throttled loop that still repaints three
 *     canvases is the kind of thing that shows up in someone's battery menu
 *     with this site's name next to it.
 *
 * Used by the widgets whose idle animation would otherwise never stop — the
 * drawing canvas's turbulence and the scratch card's foil sheen.
 *
 * `rootMargin` is generous on purpose: starting a widget's animation a screen
 * before it arrives costs nothing and means nothing is ever caught frozen at
 * the moment it becomes visible.
 */
export function useVisible(
  ref: RefObject<Element | null>,
  rootMargin = "200px",
): boolean {
  // No observer (very old browsers, some test environments) — assume visible
  // rather than silently freezing the widget. Decided at init rather than in
  // the effect below so the fallback costs no extra render.
  const [onScreen, setOnScreen] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const [foreground, setForeground] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);

  useEffect(() => {
    const onChange = () => setForeground(!document.hidden);
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return onScreen && foreground;
}
