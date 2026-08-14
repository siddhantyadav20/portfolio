import Image from "next/image";
import styles from "./BookCover.module.css";

/**
 * A book, face up.
 *
 * Clicking opens the reading spread — cover, rating, year, page count, genres
 * and the opening line. That panel comes with the interactions; the cover is
 * the whole widget until then.
 */
export default function BookCover({
  title,
  author,
  cover,
}: {
  title: string;
  author: string;
  cover: string;
}) {
  return (
    <div className={styles.book}>
      <Image
        src={cover}
        alt={`${title} by ${author}`}
        width={160}
        height={240}
        className={styles.art}
        loading="lazy"
      />
      {/* The bound edge, as a gradient over the artwork rather than a border —
          it has to darken whatever the cover happens to be. */}
      <span className={styles.spine} aria-hidden="true" />
    </div>
  );
}
