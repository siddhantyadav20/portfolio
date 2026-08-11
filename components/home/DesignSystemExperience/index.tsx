import Image from "next/image";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import { designSystem } from "@/content/site";
import styles from "./DesignSystemExperience.module.css";

/** Static state. The hover scale-up is Phase 4. */
export default function DesignSystemExperience() {
  return (
    <CardShell
      as="a"
      href={designSystem.href}
      radius={24}
      className={styles.card}
      aria-label={`${designSystem.eyebrow} ${designSystem.title} ${designSystem.subtitle} — open case study`}
    >
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{designSystem.eyebrow}</p>
        <h2 className={styles.title}>{designSystem.title}</h2>
        <p className={styles.eyebrow}>{designSystem.subtitle}</p>
      </div>

      {/* Exported pre-clipped: the artwork runs past the card edge in Figma. */}
      <Image
        src="/media/design-system.png"
        alt=""
        width={274}
        height={256}
        className={styles.shot}
      />

      <GlassChip className={styles.chip}>
        <p className={styles.stat}>{designSystem.stat}</p>
        <p className={styles.statDetail}>{designSystem.statDetail}</p>
      </GlassChip>
    </CardShell>
  );
}
