import type { StudyStat } from "@/content/work";
import SourceLine from "@/components/work/SourceLine";
import styles from "./StudyStats.module.css";

type Props = {
  heading: string;
  cards: readonly StudyStat[];
};

/**
 * Figma 1617:9410 — "Then the inspectors", and the three ways they were
 * asked: a number, what it counts, where it came from, and what it was for.
 *
 * The source line is the evidence chip of the design language — the
 * channel's own mark in its own colour — rather than a caption, because
 * "1031 feedbacks" is only as good as the reader's sense of how they were
 * gathered.
 */
export default function StudyStats({ heading, cards }: Props) {
  return (
    <div className={styles.block}>
      <h3 className={styles.heading}>{heading}</h3>

      <div className={styles.row} data-reveal="">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className={`${styles.card} squircle`}
            style={{ ["--i" as string]: i }}
          >
            <div className={styles.figure}>
              <p className={styles.value} data-count="">
                {card.value}
              </p>
              <p className={styles.label}>{card.label}</p>
            </div>
            <SourceLine source={card.source} />
            <p className={styles.body}>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
