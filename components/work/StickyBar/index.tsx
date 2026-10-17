"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./StickyBar.module.css";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * A strip that pins to the top of the screen while its section scrolls under
 * it — the version strip of Figma 1617:9574, which is the navigation for the
 * whole of "The Products".
 *
 * Sticky does the pinning; this only answers the one question CSS cannot,
 * which is *whether* it is pinned right now, and writes `data-stuck`. The
 * frosted backing is drawn only then: at rest, in its place in the page, the
 * strip is exactly the design, and the glass appears the moment there is
 * something scrolling underneath it to be frosted.
 *
 * Its own section is its sticky container, so it lets go when the section
 * ends rather than riding over the comments.
 */
export default function StickyBar({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    /* A 1px inset at the top: pinned at `top: 0`, the bar's top edge sits on
       that line and the bar stops being wholly inside it. Below the fold it
       is not wholly inside either, so the bar's own position decides which
       of the two it is. */
    const io = new IntersectionObserver(
      ([entry]) => {
        const pinned =
          entry.intersectionRatio < 1 &&
          entry.boundingClientRect.top <= (entry.rootBounds?.top ?? 0) + 1;
        if (pinned) el.dataset.stuck = "";
        else delete el.dataset.stuck;
      },
      { rootMargin: "-1px 0px 0px 0px", threshold: [0, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.bar} ${className ?? ""}`}>
      {children}
    </div>
  );
}
