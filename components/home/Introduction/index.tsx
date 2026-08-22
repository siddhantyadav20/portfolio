"use client";

import Image from "next/image";
import { useState } from "react";
import CtaPill from "@/components/primitives/CtaPill";
import { intro } from "@/content/site";
import { useMounted } from "@/lib/clientValue";
import { copyToClipboard } from "@/lib/clipboard";
import { commandKeyLabel, openPalette } from "@/lib/palette";
import styles from "./Introduction.module.css";

export default function Introduction({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  /* The key legend is ⌘ on a Mac and Ctrl everywhere else, which is only
     knowable from the client. Rendered as ⌘ on the server and corrected after
     hydration — the alternative is HTML that disagrees with itself and a
     warning on every Windows visit. `useMounted` is the sanctioned way to read
     a browser-only value; see the note at the top of `lib/clientValue`. */
  const mounted = useMounted();

  async function copyEmail() {
    /* Two attempts, then give up honestly — see `lib/clipboard`. This used to
       be a bare `navigator.clipboard.writeText` in a try/catch that set
       `copied` back to false, so a browser that refused the clipboard left
       the button reading "Copy Email" and doing nothing visible. */
    if (!(await copyToClipboard(intro.email))) {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 6000);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    // Passive in the proximity field: the composition can carry it when a
    // neighbouring card is active, but it is never an interaction target
    // itself — it never becomes the active card and never scales.
    <section
      className={[styles.intro, className].filter(Boolean).join(" ")}
      data-prox-passive=""
      data-card="introduction"
    >
      {/* Two files, one mark. The logo is ink-on-nothing in light and a white
          and grey cut in dark, so it cannot be recoloured with `currentColor`
          the way the icon set can — it is two drawings.

          Both are in the DOM and CSS picks one, rather than reading the theme
          in JS: the theme is set on <html> before first paint, so a stylesheet
          swap is correct on the server's HTML and through a toggle, with no
          frame of the wrong mark. They are 5KB and 18KB. */}
      <Image
        src="/media/logo.png"
        alt="Siddhant Yadav"
        width={52}
        height={40}
        className={`${styles.logo} ${styles.logoLight}`}
        priority
      />
      <Image
        src="/media/logo-dark.png"
        alt=""
        aria-hidden="true"
        width={52}
        height={40}
        className={`${styles.logo} ${styles.logoDark}`}
        priority
      />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{intro.title}</h1>
          <p className={styles.tagline}>{intro.tagline}</p>
        </div>
        <p className={styles.note}>{intro.note}</p>
      </div>

      {/* The palette's front door.

          A palette nobody opens is worth nothing, and ⌘K is a power-user
          gesture on a page whose most important visitor is a recruiter — often
          on Windows, usually on a phone, where the shortcut does not exist at
          all. So the shortcut is the accelerator and this is the affordance.

          A button rather than an input, deliberately. It looks like a field and
          it is not one: a real input here would need its own value, its own
          focus handling and its own keyboard behaviour, all of which the panel
          already has and would then have to be handed. Pressing this opens the
          panel with a genuine field already focused, so there is never a moment
          where two search boxes exist and only one of them works. */}
      <button
        type="button"
        className={styles.search}
        onClick={() => openPalette()}
        data-cursor="native"
      >
        <span
          className={`inkIcon ${styles.searchIcon}`}
          style={{ ["--icon" as string]: "url(/icons/search.svg)" }}
          aria-hidden="true"
        />
        <span className={styles.searchLabel}>{intro.searchPlaceholder}</span>
        <kbd className={styles.searchKey} aria-hidden="true">
          {mounted ? commandKeyLabel() : "\u2318"}K
        </kbd>
      </button>

      <div className={styles.ctas}>
        <CtaPill
          onClick={copyEmail}
          icon={<span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/chat.svg)", width: 20, height: 20 }} />}
        >
          {copied ? "Copied!" : failed ? intro.email : "Copy Email"}
        </CtaPill>

        <CtaPill
          as="a"
          href={intro.resumeHref ?? undefined}
          target={intro.resumeHref ? "_blank" : undefined}
          rel={intro.resumeHref ? "noopener noreferrer" : undefined}
          data-placeholder={intro.resumeHref ? undefined : ""}
          aria-disabled={intro.resumeHref ? undefined : true}
          icon={<span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/export.svg)", width: 20, height: 20 }} />}
        >
          Résumé
        </CtaPill>

        <CtaPill
          as="a"
          href={intro.storeHref ?? undefined}
          data-placeholder={intro.storeHref ? undefined : ""}
          aria-disabled={intro.storeHref ? undefined : true}
          icon={<span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/cart.svg)", width: 20, height: 20 }} />}
        >
          Go to Store
        </CtaPill>
      </div>

      <p className={styles.srOnlyEmail} aria-live="polite">
        {copied ? `Copied ${intro.email} to clipboard` : ""}
        {failed ? `Copying was blocked. The address is ${intro.email}` : ""}
      </p>
    </section>
  );
}
