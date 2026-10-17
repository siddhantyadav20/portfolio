import type { StudyConstraint } from "@/content/work";
import styles from "./StudyConstraints.module.css";

type Props = {
  items: readonly StudyConstraint[];
  last: StudyConstraint;
};

/**
 * Figma 1619:9975 — the pile-up of constraints: six cells two to a row, and
 * the one that outweighed all of them across the foot on solid white.
 *
 * One rounded block cut into cells by 8px of the page showing through, rather
 * than seven cards: the file clips the whole grid to a single 24 corner, so
 * only the four outer corners are round and the cells meet square.
 */
export default function StudyConstraints({ items, last }: Props) {
  return (
    <ul className={`${styles.grid} squircle`} data-reveal="">
      {items.map((item, i) => (
        <Cell key={item.lead} item={item} index={i} />
      ))}
      <Cell item={last} index={items.length} last />
    </ul>
  );
}

function Cell({
  item,
  index,
  last,
}: {
  item: StudyConstraint;
  index: number;
  last?: boolean;
}) {
  return (
    <li
      className={styles.cell}
      data-last={last || undefined}
      /* Row by row, left then right: the pair in a row lands together-ish and
         the rows follow each other down, the way the eye reads the grid. */
      style={{ ["--i" as string]: Math.floor(index / 2) + (index % 2) * 0.5 }}
    >
      <span
        className={`inkIcon ${styles.icon}`}
        style={{ ["--icon" as string]: `url(${item.icon})` }}
        aria-hidden="true"
      />
      <p className={styles.text}>
        <strong className={styles.lead}>{item.lead}</strong> {item.body}
      </p>
    </li>
  );
}
