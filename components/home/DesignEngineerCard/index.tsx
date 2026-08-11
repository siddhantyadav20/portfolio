import CardShell from "@/components/primitives/CardShell";
import { designEngineer } from "@/content/site";
import styles from "./DesignEngineerCard.module.css";

/**
 * Static state: the plane sits at its Figma position on the dashed arc.
 * Flying it from DES to ENG on hover is Phase 5 (undesigned in Figma).
 */
export default function DesignEngineerCard() {
  const { from, to } = designEngineer;

  return (
    <CardShell radius={20} className={styles.card}>
      <span className={styles.start}>
        <span className={styles.abbrFrom}>{from.abbr}</span>
        <span className={styles.labelFrom}>{from.label}</span>
      </span>

      <img
        src="/icons/journey.svg"
        alt=""
        className={styles.journey}
        aria-hidden="true"
      />
      <span className={styles.planeBadge} aria-hidden="true">
        <img src="/icons/plane.svg" alt="" className={styles.plane} />
      </span>

      <span className={styles.dest}>
        <span className={styles.abbrTo}>{to.abbr}</span>
        <span className={styles.labelTo}>{to.label}</span>
      </span>
    </CardShell>
  );
}
