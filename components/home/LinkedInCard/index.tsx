"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import { linkedin } from "@/content/site";
import { externalLinkProps } from "@/lib/externalLink";
import { createChime, type Chime } from "./chime";
import styles from "./LinkedInCard.module.css";

const toneClass: Record<string, string> = {
  ink: styles.ink,
  blue: styles.blue,
  red: styles.red,
  green: styles.green,
};

/**
 * Whether the card makes any noise. Turn this off and every reference to the
 * synth below no-ops — nothing else has to change.
 *
 * It is also off under reduced motion, and it stays silent on a page the user
 * has not yet interacted with, because browsers refuse to start audio there.
 */
const SOUND = true;

/**
 * Everything on the card except the link itself, rendered twice: once for
 * real, and once inside the flood wearing the hover colours. Which of the two
 * you are looking at is decided by the flood's clip, pixel by pixel — so a
 * word turns white at the exact moment the blue edge crosses it, rather than
 * cross-fading on a timer that can only approximate where that edge is.
 *
 * That is also why there are no staggered colour delays anywhere in the
 * stylesheet. There is nothing left for them to approximate.
 */
function Face() {
  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div className={styles.who}>
          <p className={styles.name}>{linkedin.name}</p>
          <p className={styles.role}>{linkedin.role}</p>
        </div>
        <span className={styles.logo} aria-hidden="true">
          <img src="/icons/linkedin.svg" alt="" width={20} height={20} />
        </span>
      </div>

      <p className={styles.blurb}>
        {linkedin.blurb.map((run, i) => (
          <span key={i} className={toneClass[run.tone]}>
            {run.text}
          </span>
        ))}
      </p>
    </div>
  );
}

/**
 * Figma "LinkedIn" (node 80:7629), Default and Hover.
 *
 * The hover variant is the whole card going LinkedIn blue: the plate fills,
 * the type inverts, and the three @-handles swap to the light versions of
 * their colours so they still separate against the blue. Figma leaves the
 * logo tile at #1178AB in both, which on the blue card means it disappears —
 * that is the design, not a miss, and here it is the point (see the flood in
 * the stylesheet).
 *
 * It is driven by the CTA rather than the card, which is the honest reading of
 * "hovers on Let's Connect": the whole card lighting up is feedback about the
 * thing under the pointer, and that thing is the link. Keyboard focus does the
 * same, so the state isn't mouse-only.
 */
export default function LinkedInCard() {
  const [lit, setLit] = useState(false);

  const chime = useRef<Chime | null>(null);
  /** Built at most once, whether or not it worked — a browser that won't give
   *  us a context shouldn't be asked again on every hover. */
  const tried = useRef(false);

  const light = useCallback(() => {
    setLit(true);
    if (!SOUND) return;
    if (!tried.current) {
      tried.current = true;
      const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!quiet) {
        try {
          // Built on the first hover, not on mount: an AudioContext per card
          // on every page load is a cost for a sound most visitors never hear.
          chime.current = createChime();
        } catch {
          chime.current = null;
        }
      }
    }
    chime.current?.connect();
  }, []);

  useEffect(() => () => chime.current?.dispose(), []);

  return (
    <CardShell
      radius={32}
      className={`${styles.card} ${lit ? styles.lit : ""}`}
      data-card="linkedin"
    >
      <Face />

      <a
        className={styles.cta}
        href={linkedin.href}
        {...externalLinkProps(linkedin.href)}
        // Pointer rather than mouse events so pens are included, and touch
        // excluded: on a phone this would fire in the instant before the tap
        // navigates away, which is a sound with nothing to say.
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") light();
        }}
        onPointerLeave={() => setLit(false)}
        onFocus={light}
        onBlur={() => setLit(false)}
      >
        {linkedin.cta}
      </a>

      {/* The blue, before it is anywhere. It sits clipped to exactly the logo
          tile's rectangle, so at rest the only part of it you can see *is*
          the tile. Hovering the CTA releases the clip and it becomes the
          card, carrying the hover copy of everything with it. Painted over
          the real content, but `pointer-events: none`, so the link
          underneath is still the thing you are hovering. */}
      <span className={`${styles.flood} squircle`} aria-hidden="true">
        <Face />
        <span className={`${styles.cta} ${styles.ctaFace}`}>{linkedin.cta}</span>
      </span>
    </CardShell>
  );
}
