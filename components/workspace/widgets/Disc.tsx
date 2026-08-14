import Image from "next/image";
import styles from "./Disc.module.css";

/**
 * A record, lying on the desk.
 *
 * The vinyl sits *behind* the sleeve and peeks out to the right — which is
 * what makes a 200px square read as a record rather than as album art. On the
 * Framer canvas it slides further out and spins when the track plays; that
 * arrives with the interactions.
 *
 * The sleeve keeps its own colours in both themes. It is a printed object on a
 * desk, not a surface of the page.
 */
export default function Disc({
  title,
  artist,
  cover,
}: {
  title: string;
  artist: string;
  cover: string;
}) {
  return (
    <div className={styles.disc}>
      <div className={styles.vinyl} aria-hidden="true">
        <div className={styles.label} />
      </div>
      <div className={styles.sleeve}>
        <Image
          src={cover}
          alt={`${title} — ${artist}`}
          width={200}
          height={200}
          className={styles.art}
          loading="lazy"
        />
      </div>
    </div>
  );
}
