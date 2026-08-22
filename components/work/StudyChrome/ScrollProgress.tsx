"use client";

import { useEffect, useRef } from "react";
import { findScrollRoot, scrollMetrics } from "@/lib/scrollRoot";
import styles from "./StudyChrome.module.css";

/**
 * Figma node 474:11197 — the 8px bar across the top of the reader.
 *
 * In the file it is drawn as a fixed 116px rectangle, which is the designer
 * showing the resting state rather than specifying a width: it is a fraction
 * of the frame's own height scrolled, and the only honest way to draw that on
 * a static artboard is to pick a moment.
 *
 * The width is written straight to the DOM on each frame rather than held in
 * state. A progress bar updates on every scroll event; putting that through
 * React would re-render the entire study — several hundred nodes of prose —
 * sixty times a second to change one number, and the browser has to composite
 * that number anyway. `transform: scaleX` rather than `width` so the change
 * never touches layout.
 */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;

    const root = findScrollRoot(bar);
    const target: HTMLElement | Window = root ?? window;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const { top, max } = scrollMetrics(root);
      // A study short enough not to scroll is 100% read, not 0% — and
      // dividing by a zero `max` is the NaN that left the bar full width.
      const progress = max > 0 ? Math.min(top / max, 1) : 1;
      bar.style.transform = `scaleX(${progress})`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };

    paint();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    /* And re-measure whenever the study gets taller.
       The first paint happens before the hero, the JIRA screenshot and the
       illustration have laid out, and at that moment the page is shorter than
       the viewport — so `max` is zero, the study reads as fully scrolled, and
       the bar sits at full width until something scrolls. Which, at the top of
       the page, nothing does. */
    const observed = root ?? document.documentElement;
    const resize = new ResizeObserver(onScroll);
    resize.observe(observed);
    for (const child of Array.from(observed.children)) resize.observe(child);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* Not a <progress>, and not given a role: this is decoration that duplicates
     something a screen reader already reports far better than a percentage
     could. Announcing "8 percent" on every scroll event would be noise. */
  return <div ref={ref} className={styles.progress} aria-hidden="true" />;
}
