import type { StudyCaption } from "@/content/work";
import styles from "./FigureLabel.module.css";

type Props = {
  caption: StudyCaption;
  className?: string;
};

/**
 * Figma 529:11967 — the line that sits under every figure in the reader,
 * right-aligned to its frame: a number, what the thing is, and a pill saying
 * what kind of artefact it is.
 *
 * One component rather than three copies, because it appears under the hero,
 * under the JIRA screenshot and under the flow exhibit, and the three differ
 * only in the strings. The pill's background is the one thing that moves
 * between them in the file — 70% white under the hero, solid white under the
 * exhibit — and that is the panel it happens to be standing on showing
 * through rather than two different pills, so it is `--surface` here and the
 * difference goes away.
 */
export default function FigureLabel({ caption, className }: Props) {
  return (
    <figcaption className={`${styles.row} ${className ?? ""}`}>
      <span className={styles.index}>{caption.index}</span>
      <span className={styles.label}>{caption.label}</span>
      <span className={styles.tag}>{caption.tag}</span>
    </figcaption>
  );
}
