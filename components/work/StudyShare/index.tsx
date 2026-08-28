"use client";

import { useCallback, useState } from "react";
import GlassAction from "@/components/primitives/GlassAction";
import { copyToClipboard } from "@/lib/clipboard";
import styles from "./StudyShare.module.css";

/**
 * Figma 258:9690 — the Share disc, alone at the top left of a case study.
 *
 * Both surfaces wear it, which is the reason it is its own file. It used to
 * live inside `CaseStudyModal`, so the `/work/<slug>` route — the surface a
 * shared link actually opens — had no way to hand the link on again. The note
 * that used to stand where this now renders argued the address bar was enough;
 * it is not the same thing, because the modal's own button is what taught the
 * reader that a study is shareable, and the route is where most readers arrive.
 *
 * `"use client"` for the clipboard, and nothing else — the route stays a
 * server component and this is the only island in its chrome.
 */
export default function StudyShare() {
  const [copied, setCopied] = useState(false);
  /* The URL the copy failed on, so the fallback can show it. A string rather
     than a flag because there is nothing to read at render time: the address
     bar is rewritten by `useStudyUrl` when the modal opens, and on the server
     there is no address bar at all. */
  const [failed, setFailed] = useState<string | null>(null);

  const share = useCallback(async () => {
    // Whatever the address bar says, which on the route is already
    // `/work/<slug>` and which `useStudyUrl` has made `/work/<slug>` inside
    // the modal. This used to build `/?study=<slug>` by hand, and that URL
    // serves the homepage to every crawler and link-preview bot: a case study
    // pasted into Slack previewed as the homepage.
    const url = window.location.href;

    if (!(await copyToClipboard(url))) {
      /* Both routes refused. The previous version swallowed this and left the
         button doing nothing at all, which is indistinguishable from a broken
         button. Say so, and hand over the URL so there is still a way to take
         it. */
      setFailed(url);
      window.setTimeout(() => setFailed(null), 8000);
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <>
      <GlassAction label="Copy a link to this case study" onClick={share}>
        {copied ? (
          <TickGlyph />
        ) : (
          <span
            className="inkIcon"
            style={{
              ["--icon" as string]: "url(/icons/export.svg)",
              width: 24,
              height: 24,
            }}
          />
        )}
      </GlassAction>

      {/* Only drawn when the copy was refused — the browser can deny the
          clipboard and there is no asking it twice, so the URL itself is the
          fallback and it is selectable. */}
      {failed && (
        <span className={styles.fallback}>
          <span className={styles.fallbackLabel}>
            Your browser blocked the copy. Here is the link:
          </span>
          <code className={styles.fallbackUrl}>{failed}</code>
        </span>
      )}

      {/* The confirmation, in a region that exists before there is anything to
          say. The button's own name never changes — a label changing
          underneath the control you are already focused on is not reliably
          re-read. */}
      <span className="srOnly" role="status">
        {copied ? "Link copied to clipboard" : ""}
        {failed ? `Copying was blocked. The link is ${failed}` : ""}
      </span>
    </>
  );
}

/** Shown for two seconds after a copy. Inline because it swaps in and out of
 *  the same button as the export glyph, and a changing `src` flickers. */
function TickGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M8.06 14.2a.94.94 0 0 1-.66-.28l-3.2-3.2a.94.94 0 1 1 1.33-1.32l2.53 2.53 6.4-6.4a.94.94 0 1 1 1.33 1.33l-7.07 7.06a.94.94 0 0 1-.66.28z"
        fill="currentColor"
      />
    </svg>
  );
}
