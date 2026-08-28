"use client";

import { useEffect, useState } from "react";
import { footer } from "@/content/site";
import { formatVisitors, VISITOR_KEY, type Visitors } from "@/lib/visitors";
import styles from "./SiteFooter.module.css";

/**
 * The visitor total in the footer — Figma 244:9343, the dot and the number.
 *
 * The one client island in an otherwise server-rendered footer, and a small
 * one on purpose: `SiteFooter` renders on every page the site has, including
 * three static case studies, and a number that changes with every arrival is
 * the exact opposite of something to prerender. So the markup ships as the
 * dash it has always shown and the total arrives a moment later — the same
 * bargain `Comments` makes, and for the same reason.
 *
 * THE DASH IS NOT A LOADING STATE, it is the answer when there is nothing to
 * ask. With no database attached the server says `configured: false` and this
 * keeps showing exactly what the footer showed before any of this existed: a
 * dash, and a title saying why. A zero would be a measurement, and this would
 * not have made one.
 *
 * One request, on mount. There is no polling and no heartbeat because there is
 * nothing live about a running total — it moves when somebody new arrives, and
 * the person who would see that tick is the one who caused it.
 */
export default function VisitorCount() {
  const [visitors, setVisitors] = useState<Visitors | null>(null);

  useEffect(() => {
    const abort = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/visitors", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: browserId() }),
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setVisitors((await res.json()) as Visitors);
      } catch {
        // Offline, or the store is unreachable. `null` is already the state and
        // it renders as the dash.
      }
    })();

    return () => abort.abort();
  }, []);

  const total = visitors?.configured ? visitors.total : null;

  return (
    <p
      className={styles.visitors}
      data-placeholder={total === null ? "" : undefined}
      title={total === null ? "Visitor count is not connected yet" : undefined}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span>
        {total === null ? "—" : formatVisitors(total)}{" "}
        {total === 1 ? footer.visitorLabel : footer.visitorsLabel}
      </span>
    </p>
  );
}

/**
 * This browser's id, minted once and kept.
 *
 * The reason the count can mean "people" at all rather than "addresses" — see
 * the note at the top of `lib/visitorStore.ts`. It is a random UUID and it is
 * the only thing this site stores on anybody's machine: it identifies a
 * browser to a counter and to nothing else, it is never joined to anything,
 * and clearing site data ends it.
 *
 * Every access is wrapped, and not out of caution: `localStorage` *throws* on
 * access — not returns null — in a Safari private window and under a browser
 * set to block site data. An unguarded read here would take the whole footer
 * down in exactly the configurations most likely to be running it.
 *
 * A browser that cannot store gets a fresh id per page load and is counted
 * again each time. That is an over-count, it is small, and the alternative is
 * either not counting those visitors at all or fingerprinting them, which is
 * the thing this design is deliberately not doing.
 */
function browserId(): string {
  try {
    const kept = localStorage.getItem(VISITOR_KEY);
    if (kept) return kept;

    const minted = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, minted);
    return minted;
  } catch {
    return crypto.randomUUID();
  }
}
