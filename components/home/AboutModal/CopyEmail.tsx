"use client";

import { useCallback, useRef, useState } from "react";
import { intro } from "@/content/site";
import { copyToClipboard } from "@/lib/clipboard";
import styles from "./AboutModal.module.css";

/**
 * The email, as a button rather than a `mailto:`.
 *
 * Same decision the homepage's `Introduction` makes, for the same reason: a
 * `mailto:` on a machine with no mail client configured does nothing visible,
 * and on one where the browser hands it to a webmail tab it navigates away
 * from the page somebody was reading. Copying is the thing almost everybody
 * wanted anyway.
 *
 * It shows the address, so this is never a mystery box — and when the clipboard
 * refuses, which it does with no focused document and under some Firefox
 * permission settings, `copyToClipboard` reports the failure and the label says
 * so instead of silently claiming success. A button that lies about having
 * copied is the failure this site has already fixed once.
 */
export default function CopyEmail() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);

  const copy = useCallback(async () => {
    const ok = await copyToClipboard(intro.email);
    setState(ok ? "copied" : "failed");

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2400);
  }, []);

  return (
    <button
      type="button"
      className={styles.link}
      data-state={state === "idle" ? undefined : state}
      onClick={() => void copy()}
    >
      <span className={styles.linkLabel}>Email</span>
      <span className={styles.linkValue}>{intro.email}</span>
      <span className={styles.linkArrow} aria-hidden="true">
        {state === "copied" ? "✓" : state === "failed" ? "!" : "⧉"}
      </span>
      {/* Announced, because the only other signal is a glyph swap. */}
      <span className="srOnly" role="status">
        {state === "copied"
          ? "Email address copied"
          : state === "failed"
            ? `Copying was blocked. The address is ${intro.email}`
            : ""}
      </span>
    </button>
  );
}
