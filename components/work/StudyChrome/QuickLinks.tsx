"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { findScrollRoot, scrollMetrics } from "@/lib/scrollRoot";
import styles from "./StudyChrome.module.css";

export type QuickLink = {
  /** The `id` of the section this line scrolls to. */
  readonly id: string;
  /** What the line says when you point at it. */
  readonly label: string;
};

type Props = {
  items: readonly QuickLink[];
};

/**
 * Figma node 544:12173 — the rail of short lines down the left edge.
 *
 * Ported from the Framer component that prototyped it, with two changes.
 *
 * The geometry is Figma's, not the prototype's: 3px lines with a 12px radius,
 * 8px apart, 20px wide at rest and 28px when active, in the reader's blue at
 * full strength for the current section and 40% for the rest. The prototype
 * drew white lines 24px wide, 6px apart, and expressed its states as opacity —
 * which is the same idea sketched before the colours existed.
 *
 * The behaviour is the prototype's, and it is the half Figma cannot draw: the
 * label fades in beside the line under the pointer, the line grows, and a
 * click scrolls to the section. What the prototype could not know is that the
 * reader sometimes scrolls inside the modal overlay rather than the page, so
 * both the listener and `scrollIntoView` have to be aimed at whichever of the
 * two this copy is mounted in — see `findScrollRoot`.
 *
 * The active section is the last one whose top has passed 40% of the viewport.
 * That threshold is the prototype's and it is a good one: keying on the
 * section actually in the middle of the screen means the rail changes when the
 * reading changes, rather than the instant a heading clips the top edge.
 */
export default function QuickLinks({ items }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;

    const root = findScrollRoot(nav);
    const target: HTMLElement | Window = root ?? window;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const { viewport } = scrollMetrics(root);
      // Four tenths down the scrollport. Everything is measured against that
      // line rather than against absolute document offsets, which is what
      // lets one expression serve both a scrolling page and a scrolling
      // overlay: `getBoundingClientRect` is already relative to the viewport,
      // and subtracting the root's own rect makes it relative to the root.
      const line = viewport * 0.4;
      const origin = root ? root.getBoundingClientRect().top : 0;

      let found = 0;
      items.forEach((item, i) => {
        const el = document.getElementById(item.id);
        if (!el) return;
        if (el.getBoundingClientRect().top - origin <= line) found = i;
      });
      setActive(found);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Sections move down the page as the images above them lay out, so the
    // first measure is taken against a document that does not exist yet.
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
  }, [items]);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  return (
    <nav ref={ref} className={styles.rail} aria-label="Sections">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          className={styles.link}
          data-active={i === active ? "" : undefined}
          onClick={() => go(item.id)}
          onPointerEnter={() => setHovered(i)}
          onPointerLeave={() => setHovered(null)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(null)}
          aria-current={i === active ? "true" : undefined}
        >
          <span className={styles.line} />
          {/* Hidden with opacity rather than `visibility` or a second
              screen-reader-only copy: an element at zero opacity is still in
              the accessibility tree, so this one span is both the label that
              fades in under the pointer and the button's accessible name. */}
          <span className={styles.label} data-shown={hovered === i ? "" : undefined}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
