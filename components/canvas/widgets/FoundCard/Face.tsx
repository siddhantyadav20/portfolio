import Image from "next/image";
import { found, teaser } from "@/content/found";
import styles from "./FoundCard.module.css";

/* ===========================================================================
   The phone, lying face up on the board.

   No hooks and no client directive: the homepage's canvas preview paints this
   as a still (CanvasWorld/Still), and the live canvas wraps it in FoundCard,
   which only decides how many messages have arrived and whether it's buzzing.
   One object, drawn once, so the morph between card and canvas has nothing to
   reconcile.

   A real lock screen, not a poster: the day and the clock, the battery at 4%
   in red, and messages from people who are frightened. The pitch is one quiet
   line and a white key cap at the bottom, where "swipe up" would be.
   =========================================================================== */

/** How many notifications fit the stack, plus the one on its way out. */
export const SHOWN = 3;

export type Note = { key: number; from: string; text: string };

/** The stack after `count` messages have arrived: newest first, then the one leaving. */
export function notesAt(count: number): Note[] {
  return Array.from({ length: SHOWN + 1 }, (_, i) => {
    const key = count - 1 - i;
    const n = teaser[((key % teaser.length) + teaser.length) % teaser.length];
    return { key, from: n.from, text: n.text };
  }).filter((n) => n.key >= 0);
}

export default function Face({
  count = SHOWN,
  buzzing = false,
  sizes,
}: {
  count?: number;
  buzzing?: boolean;
  /** What the wallpaper is actually painted at: tiny in the homepage preview. */
  sizes: string;
}) {
  const notes = notesAt(count);
  return (
    <span className={styles.phone} data-buzzing={buzzing || undefined}>
      <span className={styles.screen}>
        <Image
          src={found.wallpaper}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          loading="eager"
          fetchPriority="low"
          className={styles.wallpaper}
        />
        <span className={styles.scrim} />

        <span className={styles.battery}>
          4%
          <span className={styles.cell}>
            <span className={styles.charge} />
          </span>
        </span>

        <span className={styles.time}>
          <span className={styles.day}>Monday</span>
          <span className={styles.clock}>08:12</span>
        </span>

        <span className={styles.stack} aria-hidden="true">
          {notes.map((n, i) => (
            <span
              key={n.key}
              className={styles.note}
              data-leaving={i >= SHOWN || undefined}
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className={styles.app} />
              <span className={styles.body}>
                <span className={styles.from}>{n.from}</span>
                <span className={styles.text}>{n.text}</span>
              </span>
              <span className={styles.when}>{i === 0 ? "now" : `${i * 3}m`}</span>
            </span>
          ))}
        </span>

        <span className={styles.pitch}>
          <span className={styles.eyebrow}>{found.title}: a mystery in one sitting</span>
          <span className={styles.cta}>Pick it up</span>
        </span>
        <span className={styles.homeBar} />
      </span>
    </span>
  );
}
