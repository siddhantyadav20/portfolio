import Image from "next/image";
import { linkedInCard } from "@/content/workspace";
import styles from "./LinkedInCard.module.css";

/** The LinkedIn card — cover photo, avatar over its lower edge, one line of
 *  what I'm doing, and the link out. */
export default function LinkedInCard() {
  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        <Image
          src={linkedInCard.cover}
          alt=""
          width={306}
          height={120}
          className={styles.coverArt}
          loading="lazy"
        />
      </div>

      <Image
        src={linkedInCard.avatar}
        alt=""
        width={56}
        height={56}
        className={styles.avatar}
      />

      <div className={styles.body}>
        <h3 className={styles.name}>{linkedInCard.name}</h3>
        <p className={styles.role}>{linkedInCard.role}</p>
        <p className={styles.blurb}>{linkedInCard.blurb}</p>
      </div>

      <span className={styles.cta}>
        <span
          className="inkIcon"
          style={{ ["--icon" as string]: "url(/icons/linkedin.svg)", width: 14, height: 14 }}
        />
        {linkedInCard.cta}
      </span>
    </article>
  );
}
