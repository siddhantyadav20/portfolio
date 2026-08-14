import Image from "next/image";
import { caseStudy } from "@/content/workspace";
import styles from "./CaseStudyCard.module.css";

/** The one piece of actual work on the board. Deliberately singular — the
 *  canvas is for personality; the case studies live on the homepage. */
export default function CaseStudyCard() {
  return (
    <article className={styles.card}>
      <span className={styles.tag}>{caseStudy.cta}</span>

      <div className={styles.art}>
        <Image
          src={caseStudy.art}
          alt=""
          width={226}
          height={170}
          className={styles.image}
          loading="lazy"
        />
      </div>

      <div className={styles.body}>
        <p className={styles.eyebrow}>{caseStudy.eyebrow}</p>
        <h3 className={styles.title}>{caseStudy.title}</h3>
        <p className={styles.text}>{caseStudy.body}</p>
      </div>
    </article>
  );
}
