"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import LogoMark from "@/components/brand/LogoMark";
import Compose from "@/components/home/Compose";
import CtaPill from "@/components/primitives/CtaPill";
import { intro } from "@/content/site";
import { useMounted } from "@/lib/clientValue";
import { commandKeyLabel, openPalette } from "@/lib/palette";
import styles from "./Introduction.module.css";

export default function Introduction({ className }: { className?: string }) {
  const [composing, setComposing] = useState(false);
  // The pill is what the compose popover hangs off, and what it names.
  const pillId = useId();
  const composeId = useId();
  /* The address the last letter went from, for as long as the pill says
     "Sent!" — and for the announcement, which names it so a screen-reader
     user hears where the reply will arrive. */
  const [sentFrom, setSentFrom] = useState<string | null>(null);
  const sentTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(sentTimer.current), []);

  function sent(from: string) {
    setSentFrom(from);
    window.clearTimeout(sentTimer.current);
    sentTimer.current = window.setTimeout(() => setSentFrom(null), 2500);
  }

  /* The key legend is ⌘ on a Mac and Ctrl everywhere else, which is only
     knowable from the client. Rendered as ⌘ on the server and corrected after
     hydration — the alternative is HTML that disagrees with itself and a
     warning on every Windows visit. `useMounted` is the sanctioned way to read
     a browser-only value; see the note at the top of `lib/clientValue`. */
  const mounted = useMounted();

  return (
    // Passive in the proximity field: the composition can carry it when a
    // neighbouring card is active, but it is never an interaction target
    // itself — it never becomes the active card and never scales.
    <section
      className={[styles.intro, className].filter(Boolean).join(" ")}
      data-prox-passive=""
      data-card="introduction"
    >
      {/* One mark, one element, both themes.

          This was two `next/image` PNGs — one per theme, both always in the
          DOM, CSS hiding whichever did not apply — because the mark is
          two-tone and `currentColor` cannot carry two colours. As geometry it
          is two fills and two tokens, so the swap is gone and so are 24KB of
          bitmap. See `content/logo.ts` for where the paths came from.

          `data-logo` is how the arrival sequence finds it: it renders this same
          component, flies it here, and hands over. A CSS-module class would be
          hashed and unreachable from the loader. */}
      <LogoMark
        className={styles.logo}
        title="Siddhant Yadav"
        data-logo=""
      />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{intro.title}</h1>
          <p className={styles.tagline}>{intro.tagline}</p>
        </div>
        <p className={styles.note}>{intro.note}</p>
      </div>

      {/* Two pills, per Figma 516:11435 — Send Email (Copy Email in the frame,
          replaced by request), and the palette's front door beside it.

          The door used to be a full-width bordered field above this row: a
          button dressed as an input, which is a small lie the moment anybody
          tries to type into it. As a pill it says what it does, sits in the row
          where every other action on this card already is, and still carries
          the ⌘K legend for the people who will never press it.

          A palette nobody opens is worth nothing, and ⌘K is a power-user
          gesture on a page whose most important visitor is a recruiter — often
          on Windows, usually on a phone, where the shortcut does not exist at
          all. So the shortcut is the accelerator and this is the affordance. */}
      <div className={styles.ctas}>
        <CtaPill
          id={pillId}
          onClick={() => setComposing((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={composing}
          aria-controls={composing ? composeId : undefined}
          icon={
            <span
              className="inkIcon"
              style={{ ["--icon" as string]: "url(/icons/chat.svg)" }}
            />
          }
        >
          {sentFrom ? intro.compose.sent : intro.compose.cta}
        </CtaPill>

        <CtaPill
          className={styles.searchPill}
          onClick={() => openPalette()}
          /* The AI mark, and a photographic one rather than an ink glyph — the
             one place on this card with colour in it, which is why it is a
             bitmap where its neighbour is a mask. 88px source for a 22px box,
             so it stays sharp at 2x. */
          icon={
            <Image
              src="/icons/ai-mark.png"
              alt=""
              width={22}
              height={22}
              /* Unoptimized deliberately. The mark is a photograph of knit, and
                 the optimizer's WebP-q75 pass at 48px flattens exactly what
                 makes it read: measured against the source, chroma falls from
                 34.4 to 29.3 and the centre triangle picks up green/magenta
                 fringing. The 88px source is 17KB — less than the two variants
                 it would have generated — so there is nothing to win here and a
                 washed-out logo to lose. */
              unoptimized
            />
          }
          trailing={
            <kbd className={styles.searchKey} aria-hidden="true">
              {mounted ? commandKeyLabel() : "⌘"}K
            </kbd>
          }
        >
          {intro.searchCta}
        </CtaPill>
      </div>

      {/* Mounted for the life of the card, so a draft survives closing it. */}
      <Compose
        id={composeId}
        anchorId={pillId}
        open={composing}
        onClose={() => setComposing(false)}
        onSent={sent}
      />

      <p className={styles.srOnlyEmail} aria-live="polite">
        {sentFrom ? `Sent. Siddhant will reply to ${sentFrom}` : ""}
      </p>
    </section>
  );
}
