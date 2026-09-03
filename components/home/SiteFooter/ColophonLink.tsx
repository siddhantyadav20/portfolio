"use client";

import { openMaking } from "@/lib/making";
import styles from "./SiteFooter.module.css";

/**
 * The footer's way into the colophon.
 *
 * This link was already in the footer, `aria-disabled` against a null
 * `footer.makingOf`, waiting for something to point at. There is now something
 * to point at and it is not a URL — it is the modal `MakingCard` owns at the
 * bottom of the same page — so the anchor becomes a button and the announced
 * behaviour becomes honest: it opens a dialog, and it always did want to.
 *
 * A `<button>` rather than an anchor with a click handler. There is no
 * href that would work if this were middle-clicked or opened in a new tab, and
 * an anchor that lies about that is worse than a button that does not pretend.
 * The colophon is reachable from the card itself and from ⌘K; neither of those
 * is a link either.
 *
 * Rendered only where the card exists — the homepage. `SiteFooter` also draws
 * inside the About reader, and a second full-screen modal opening over the
 * first would leave two shells both claiming Escape and both clearing
 * `data-modal-open` on the way out, so that footer keeps the placeholder.
 */
export default function ColophonLink() {
  return (
    <button
      type="button"
      className={styles.making}
      onClick={openMaking}
      aria-haspopup="dialog"
    >
      How I made this portfolio?
    </button>
  );
}
