"use client";

import { useCallback, useState } from "react";
import CtaPill from "@/components/primitives/CtaPill";
import { intro, linkedin } from "@/content/site";
import { copyToClipboard } from "@/lib/clipboard";
import styles from "./StudyOutro.module.css";

/**
 * What to do next, for someone who has just finished reading.
 *
 * Three pills, all of them things the homepage already offers — the point is
 * that they are offered *here*, at the end of ten minutes of reading, rather
 * than only at the top of a page this person navigated away from.
 *
 * Copy Link repeats the modal's Share button deliberately. That one lives in
 * a fixed corner and is there for someone who decides to send the study on
 * before they have read it; this one is for the far more common case, which
 * is deciding afterwards.
 */
export default function Contact() {
  const [copied, setCopied] = useState<"email" | "link" | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const copy = useCallback(
    async (what: "email" | "link", value: string) => {
      if (await copyToClipboard(value)) {
        setCopied(what);
        window.setTimeout(() => setCopied(null), 2000);
        return;
      }
      // Refused. Show the thing itself rather than nothing — see `lib/clipboard`.
      setFailed(value);
      window.setTimeout(() => setFailed(null), 8000);
    },
    [],
  );

  return (
    <div className={styles.contact}>
      <div className={styles.contactPills}>
        <CtaPill
          onClick={() => copy("email", intro.email)}
          icon={
            <span
              className="inkIcon"
              style={{
                ["--icon" as string]: "url(/icons/chat.svg)",
                width: 20,
                height: 20,
              }}
            />
          }
        >
          {copied === "email" ? "Copied!" : "Copy Email"}
        </CtaPill>

        <CtaPill
          as="a"
          href={linkedin.href}
          target="_blank"
          rel="noreferrer"
          icon={
            <span
              className={styles.brandIcon}
              style={{ backgroundImage: "url(/icons/linkedin.svg)" }}
            />
          }
        >
          {linkedin.cta}
        </CtaPill>

        <CtaPill
          onClick={() => copy("link", window.location.href)}
          icon={
            <span
              className="inkIcon"
              style={{
                ["--icon" as string]: "url(/icons/export.svg)",
                width: 20,
                height: 20,
              }}
            />
          }
        >
          {copied === "link" ? "Copied!" : "Copy Link"}
        </CtaPill>
      </div>

      {failed && (
        <p className={styles.contactFallback}>
          Your browser blocked the copy. Here it is:{" "}
          <code className={styles.contactValue}>{failed}</code>
        </p>
      )}

      <p className="srOnly" role="status">
        {copied === "email" ? `Copied ${intro.email} to clipboard` : ""}
        {copied === "link" ? "Copied a link to this case study" : ""}
        {failed ? `Copying was blocked. The value is ${failed}` : ""}
      </p>
    </div>
  );
}
