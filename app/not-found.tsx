import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

/** Without this a 404 inherits the root default and is titled
 *  "Siddhant Yadav — Product Designer" — a dead link that reports itself to
 *  the tab bar, and to anyone who pastes it, as the homepage.
 *
 *  No `robots` here: Next emits `noindex` for this boundary on its own, and
 *  adding it produced two `<meta name="robots">` tags in the output. */
export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The 404.
 *
 * There was no `not-found` boundary at all before this, so a stale case-study
 * link or a mistyped path got Next's stock development-looking page — on a
 * site whose whole argument is that the details were attended to.
 *
 * Kept plain on purpose: someone who lands here wanted something else, and the
 * useful thing is a way back, not a performance.
 */
export default function NotFound() {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.block}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>That page isn’t here.</h1>
        <p className={styles.body}>
          The link may be out of date, or the project may have moved.
        </p>
        <Link href="/" className={styles.back}>
          <span aria-hidden="true">&larr;</span> Back to the homepage
        </Link>
      </div>
    </main>
  );
}
