"use client";

import { useEffect } from "react";
import styles from "./not-found.module.css";

/**
 * The route-level error boundary.
 *
 * There was none, so a throw anywhere in a page produced Next's stock error
 * screen — and in production, one with no message and no way back.
 *
 * `reset()` re-renders the segment rather than reloading, which is usually
 * enough: most of what can throw here is a transient client-side failure in a
 * widget, not a broken page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No error service is wired up yet. Logging unconditionally — rather than
    // behind the NODE_ENV check the rest of the codebase uses — because this
    // is the one place where staying quiet means a production failure leaves
    // no trace at all.
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <main className={styles.page}>
      <div className={styles.block}>
        <p className={styles.code}>Error</p>
        <h1 className={styles.title}>Something went wrong.</h1>
        <p className={styles.body}>
          This one is on the site, not on you.
          {error.digest ? ` Reference: ${error.digest}.` : ""}
        </p>
        <button type="button" className={styles.back} onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
