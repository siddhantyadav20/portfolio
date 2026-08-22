import Image from "next/image";
import Link from "next/link";
import { STUDIES, heroStill, studyHref, type CaseStudy } from "@/content/work";
import Contact from "./Contact";
import Engagement from "./Engagement";
import styles from "./StudyOutro.module.css";

type Props = { study: CaseStudy };

/**
 * The end of a case study.
 *
 * Not in Figma — the file stops at "How Might We" and a study that stops at
 * its last paragraph gives a reader who has just spent ten minutes on it
 * nowhere to go. Three things, in the order they are wanted: say whether it
 * was any good, say something about it, and then either read another one or
 * get in touch.
 *
 * Built to the reader's own vocabulary rather than as a new visual language —
 * the same 1120 measure, the same dashed rule between blocks, the same glass
 * pills the homepage uses for its CTAs. It should read as the last section of
 * the study, not as a widget bolted to the bottom of it.
 */
export default function StudyOutro({ study }: Props) {
  const others = STUDIES.filter((s) => s.slug !== study.slug);

  return (
    <section className={styles.outro} aria-labelledby="outro-heading">
      <div className={styles.separator} />

      <h2 id="outro-heading" className="srOnly">
        After this study
      </h2>

      <Engagement slug={study.slug} />

      {others.length > 0 && (
        <nav className={styles.next} aria-label="Other case studies">
          <p className={styles.nextLabel}>Read another</p>

          <ul className={styles.nextList}>
            {others.map((other) => (
              <li key={other.slug} className={styles.nextItem}>
                {/* A real link to a real prerendered page. Opened from the
                    modal this leaves the overlay rather than swapping the
                    study inside it, which is the honest behaviour: the URL
                    changes, so the page should too. */}
                <Link href={studyHref(other.slug)} className={`${styles.card} squircle`}>
                  {other.hero && (
                    <span className={styles.cardArt}>
                      <Image
                        src={heroStill(other.hero).src}
                        alt=""
                        width={other.hero.width}
                        height={other.hero.height}
                        className={styles.cardImage}
                        loading="lazy"
                        sizes="(max-width: 900px) 100vw, 544px"
                      />
                    </span>
                  )}

                  <span className={styles.cardText}>
                    <span className={styles.cardTitle}>{other.title}</span>
                    <span className={styles.cardSubtitle}>{other.subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className={styles.separator} />

      <div className={styles.sendOff}>
        <p className={styles.sendOffLine}>
          If any of this is the kind of problem you are working on, I&rsquo;d
          like to hear about it.
        </p>
        <Contact />
      </div>
    </section>
  );
}
