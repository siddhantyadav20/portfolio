"use client";

import Image from "next/image";
import { useState } from "react";
import CtaPill from "@/components/primitives/CtaPill";
import { intro } from "@/content/site";
import styles from "./Introduction.module.css";

export default function Introduction({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(intro.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the address is still announced below for screen
      // readers and can be selected manually.
      setCopied(false);
    }
  }

  return (
    <section className={[styles.intro, className].filter(Boolean).join(" ")}>
      <Image
        src="/media/logo.png"
        alt="Siddhant Yadav"
        width={52}
        height={40}
        className={styles.logo}
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
          icon={<img src="/icons/chat.svg" alt="" width={20} height={20} />}
        >
          {copied ? "Copied!" : "Copy Email"}
        </CtaPill>

        <CtaPill
          as="a"
          href={intro.storeHref ?? undefined}
          data-placeholder={intro.storeHref ? undefined : ""}
          aria-disabled={intro.storeHref ? undefined : true}
          icon={<img src="/icons/cart.svg" alt="" width={20} height={20} />}
        >
          Go to Store
        </CtaPill>
      </div>

      <p className={styles.srOnlyEmail} aria-live="polite">
        {copied ? `Copied ${intro.email} to clipboard` : ""}
      </p>
    </section>
  );
}
