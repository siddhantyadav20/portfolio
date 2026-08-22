"use client";

import Image from "next/image";
import { useState } from "react";
import CtaPill from "@/components/primitives/CtaPill";
import { intro } from "@/content/site";
import { copyToClipboard } from "@/lib/clipboard";
import styles from "./Introduction.module.css";

export default function Introduction({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

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

      <div className={styles.ctas}>
        <CtaPill
          onClick={copyEmail}
          icon={<span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/chat.svg)", width: 20, height: 20 }} />}
        >
          {copied ? "Copied!" : failed ? intro.email : "Copy Email"}
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
