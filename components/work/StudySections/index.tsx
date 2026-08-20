import Image from "next/image";
import StudyLiveBlock from "@/components/work/StudyLiveBlock";
import type { StudySection } from "@/content/work";
import styles from "./StudySections.module.css";

type Props = {
  sections: readonly StudySection[] | null;
  className?: string;
};

/**
 * The long-form body of a case study, shared by the modal and the `/work`
 * route so the two can't drift.
 *
 * A section is prose, then any figures, then at most one running specimen.
 * That order is fixed rather than authorable: it is the order an argument is
 * made in — say the thing, show the thing, let them try the thing — and giving
 * content the ability to shuffle it would only produce sections that read
 * worse for no gain.
 *
 * When `sections` is `null` this renders a short, plain note rather than
 * nothing. Rendering nothing would leave a study that looks complete and
 * merely brief; the note says which part is missing. It is deliberately not
 * styled to look like an error — the rest of the study is real.
 *
 * Unlike `[data-placeholder]`, which stays visually identical to the finished
 * thing because those are *links* whose destination is pending, this is
 * missing prose and has to read as missing.
 */
export default function StudySections({ sections, className }: Props) {
  if (!sections || sections.length === 0) {
    return (
      <p className={`${styles.pending} ${className ?? ""}`} data-placeholder="">
        The full write-up for this project is still being written.
      </p>
    );
  }

  return (
    <div className={`${styles.sections} ${className ?? ""}`}>
      {sections.map((section) => (
        <section key={section.heading} className={styles.section}>
          <h2 className={styles.heading}>{section.heading}</h2>
          {section.body.map((paragraph, i) => (
            // Paragraphs have no identity of their own beyond their order, and
            // that order is fixed at build time — the index is the stable key.
            <p key={i} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}

          {section.media?.map((media) => (
            <figure key={media.src} className={styles.figure}>
              <Image
                src={media.src}
                alt={media.alt}
                width={media.width}
                height={media.height}
                className={styles.image}
                // Every figure is below the fold on both surfaces — the modal
                // opens at the title and the route starts at the hero.
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 960px"
              />
              {media.caption && (
                <figcaption className={styles.caption}>
                  {media.caption}
                </figcaption>
              )}
            </figure>
          ))}

          {section.live && <StudyLiveBlock view={section.live} />}
        </section>
      ))}
    </div>
  );
}
