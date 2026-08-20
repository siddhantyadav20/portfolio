import Link from "next/link";
import styles from "./not-found.module.css";

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
    <main className={styles.page}>
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
