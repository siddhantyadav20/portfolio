import Image from "next/image";
import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyMedia } from "@/content/work";
import styles from "./StudyScreens.module.css";

type Props = {
  pills: readonly string[];
  active: number;
  phones: readonly {
    readonly media: Omit<StudyMedia, "caption">;
    readonly label: string;
  }[];
  caption: StudyCaption;
};

/**
 * Figma 1617:9608 — the flows the MVP shipped, as a row of pills, over the
 * same screen in each version.
 *
 * The pills are labels, not tabs. The file draws the first one filled and
 * has screens for that one only, so a pill that switched the phones would
 * switch them to the same three pictures; it names the flows instead, and
 * the filled one is the flow on show. When the other flows are exported this
 * becomes a tablist.
 */
export default function StudyScreens({ pills, active, phones, caption }: Props) {
  return (
    <figure className={styles.block} data-reveal="">
      <div className={`${styles.panel} squircle`}>
        <ul className={styles.pills}>
          {pills.map((pill, i) => (
            <li
              key={pill}
              className={styles.pill}
              aria-current={i === active ? "true" : undefined}
              style={{ ["--i" as string]: i }}
            >
              {pill}
            </li>
          ))}
        </ul>

        <div className={styles.phones}>
          {phones.map((phone, i) => (
            <div
              key={phone.label}
              className={styles.phone}
              style={{ ["--i" as string]: i }}
            >
              <Image
                src={phone.media.src}
                alt={phone.media.alt}
                width={phone.media.width}
                height={phone.media.height}
                className={`${styles.screen} squircle`}
                loading="lazy"
                sizes="236px"
              />
              <span className={styles.label}>{phone.label}</span>
            </div>
          ))}
        </div>
      </div>

      <FigureLabel caption={caption} />
    </figure>
  );
}
