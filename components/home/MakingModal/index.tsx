"use client";

import { useEffect, useRef } from "react";
import ThemeToggle from "@/components/home/ThemeToggle";
import ModalSurface, { MODAL_VT } from "@/components/primitives/ModalSurface";
import { making } from "@/content/making";
import { externalLinkProps } from "@/lib/externalLink";
import { AttemptsScene, ReceiptScene, TerminalScene, TokensScene } from "./Scenes";
import styles from "./MakingModal.module.css";

type Props = {
  open: boolean;
  /** Playing the exit animation — only ever true on the no-morph path. */
  closing?: boolean;
  onClose: () => void;
};

/* ===========================================================================
   The colophon.

   FOUR SCENES AND ELEVEN SENTENCES. `content/making.ts` explains why this is
   not a case study; the shape here is the consequence. Each beat is a drawing
   that plays when you reach it, an eyebrow, and one line. There is no
   introduction, no conclusion and no "lessons learned" — a reader who scrolls
   past the fourth scene has read the whole thing in about forty seconds, which
   is the correct length for a colophon on somebody else's portfolio.

   The reader scrolls rather than steps. A stepper would be the obvious build —
   four slides, two arrows — and it would be wrong twice over: it puts a
   control between the visitor and four twenty-second drawings, and it makes
   the piece impossible to skim, which is the one thing a recruiter with eleven
   tabs open is definitely going to do. Scrolling costs nothing and can be done
   at any speed, including instantly.
   =========================================================================== */

/** Which drawing a scene's `kind` names. */
const DRAWINGS = {
  tokens: TokensScene,
  terminal: TerminalScene,
  attempts: AttemptsScene,
  receipt: ReceiptScene,
} as const;

export default function MakingModal({ open, closing = false, onClose }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  /**
   * A scene plays when you reach it.
   *
   * `data-play` is written straight to the DOM rather than held in state: four
   * observers firing four re-renders of a reader that is mid-scroll is a cost
   * with nothing to show for it, and the CSS is already watching for the
   * attribute. Same reasoning as the shell's own `data-enter`.
   *
   * Never unset. A drawing that rewinds when it leaves the viewport and plays
   * again on the way back up is a distraction on the second pass — these are
   * illustrations, not a loop, and the second time you scroll past you are
   * looking for a line you already read.
   *
   * `rootMargin` pulls the trigger 12% up from the bottom edge so a scene has
   * begun by the time it is properly in view rather than starting under the
   * fold; the threshold is deliberately low, because a 400px drawing on a
   * short window may never be 50% visible at all.
   */
  useEffect(() => {
    if (!open) return;
    const root = scrollerRef.current;
    if (!root) return;

    const scenes = [...root.querySelectorAll<HTMLElement>("[data-scene]")];

    // No observer under reduced motion: everything is simply already played,
    // which is what the stylesheet's reduced-motion block draws.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scenes.forEach((el) => el.setAttribute("data-play", ""));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-play", "");
          io.unobserve(entry.target);
        }
      },
      { root, rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );

    scenes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [open]);

  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={onClose}
      label={making.title}
      actions={<ThemeToggle />}
    >
      <div ref={scrollerRef} className={styles.reader}>
        <header className={styles.head}>
          <p className={styles.eyebrow} data-stage="title" style={MODAL_VT.meta}>
            {making.eyebrow}
          </p>
          <h1 className={styles.title} data-stage="title" style={MODAL_VT.title}>
            {making.title}
          </h1>
          <p className={styles.lede} data-stage="body" style={MODAL_VT.body}>
            {making.lede}
          </p>
        </header>

        {making.scenes.map((scene, i) => {
          const Drawing = DRAWINGS[scene.kind];
          return (
            <section key={scene.id} className={styles.scene} data-scene>
              {/* The number is generated, not written: these are beats in an
                  order, and an author who renumbers them by hand eventually
                  ships a "3" twice. */}
              <p className={styles.sceneEyebrow}>
                <span className={styles.sceneIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {scene.eyebrow}
              </p>

              <div className={styles.stage}>
                <Drawing />
              </div>

              <p className={styles.sceneLine}>
                {scene.line}
                {/* Only the last scene carries one — see `content/making.ts`.
                    A real anchor with the site's own external-link props, not
                    a button that calls `window.open`: it is a link to another
                    site, and middle-click, ⌘-click and "copy link address"
                    should all work on it. */}
                {"link" in scene && (
                  <a
                    className={styles.sceneLink}
                    href={scene.link.href}
                    {...externalLinkProps(scene.link.href)}
                  >
                    {scene.link.label}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                )}
              </p>
            </section>
          );
        })}
      </div>
    </ModalSurface>
  );
}
