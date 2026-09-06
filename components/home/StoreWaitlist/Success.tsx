"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./StoreWaitlist.module.css";

/**
 * The mark that lands when somebody joins the waitlist.
 *
 * WHY THIS IS NOT THE GIF IT REPLACED. The old art was a 146x109 GIF, 2.1MB —
 * the second largest file in `public/` and the biggest thing on the budget's
 * watch list — and it carried its own background baked into it. That meant the
 * card had to be painted the exact mint the export happened to dither to, and
 * `StoreWaitlist.module.css` carried a paragraph deriving `#D2FFE2` as the mean
 * of the two palette entries the export alternated between, because sampling
 * either one left a visible rectangle. Any change to the celebration's colour
 * — or the dark theme wanting a different one — meant re-exporting the art.
 *
 * Drawn instead: a ring and a check, both as *strokes* and nothing filled, so
 * there is no background to match. The colour is a CSS `stroke` on the paths
 * lottie renders, which beats the presentation attribute the file carries, so
 * one declaration themes it and the two themes cost one line each rather than
 * two exports. 2.5KB.
 *
 * The loading pattern is `RemarkFinder/Spinner`'s, which is this repo's one
 * established way of using lottie: the light player build only, the JSON and
 * the player both dynamically imported so neither is in the page's bundle, and
 * a CSS fallback that renders on the first paint so there is never a gap.
 */
/**
 * How long the flying disc takes to arrive, plus the beat the mark waits after
 * it — `--flight` (480ms) and the 80ms delay on `.mark`, both in
 * StoreWaitlist.module.css.
 *
 * The animation is held for exactly that long rather than autoplaying, and
 * that is not a detail: the mark is invisible until the disc lands, so an
 * animation that starts on mount has already drawn its ring by the time
 * anybody can see it. The GIF this replaced had the same structure and *used*
 * it — its opening frames were confetti nobody was meant to see — but a
 * 700ms drawing has nothing to spare.
 *
 * `won.ts` schedules the sound against the same two numbers.
 */
const REVEAL_MS = 560;

export default function Success() {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* Reduced motion keeps the fallback, which is the same mark drawn in CSS
       and not animated. The old GIF could not honour this at all — a GIF plays
       regardless — which is why the component it replaces had to paint a frame
       onto a <canvas> and swap the two to stop it. Nothing to stop here: the
       animation is simply never requested. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dead = false;
    let timer = 0;
    let anim: { destroy: () => void } | null = null;
    const mountedAt = performance.now();

    void (async () => {
      const [player, data] = await Promise.all([
        import("lottie-web/build/player/lottie_light"),
        import("./success.lottie.json"),
      ]);

      // Unmounted while the chunk was in flight — the card closes itself after
      // five seconds, so this is a real case and not an error.
      if (dead || !host.current) return;

      const a = player.default.loadAnimation({
        container: host.current,
        renderer: "svg",
        /* Once. It is a confirmation, not a status: a check that keeps
           re-drawing itself says the thing has not finished happening. */
        loop: false,
        /* Held, not autoplayed — see REVEAL_MS. */
        autoplay: false,
        animationData: data.default,
      });
      anim = a;
      setReady(true);

      /* The chunk may land either side of the reveal. `Math.max(0, …)` so a
         slow one starts immediately rather than waiting out a delay that has
         already passed. */
      const wait = Math.max(0, REVEAL_MS - (performance.now() - mountedAt));
      timer = window.setTimeout(() => a.play(), wait);
    })();

    return () => {
      dead = true;
      window.clearTimeout(timer);
      anim?.destroy();
    };
  }, []);

  return (
    <span className={styles.stamp} data-ready={ready ? "" : undefined}>
      {/* Drawn immediately, in CSS, and hidden once lottie has mounted — so
          the moment of arrival always has a mark in it even on the frame the
          chunk is still streaming. Kept in the tree rather than unmounted, so
          swapping the two costs no layout. */}
      <span className={styles.stampFallback} aria-hidden="true" />
      <span ref={host} className={styles.stampAnim} aria-hidden="true" />
    </span>
  );
}
