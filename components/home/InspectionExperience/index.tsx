import Image from "next/image";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import { inspection } from "@/content/site";
import styles from "./InspectionExperience.module.css";

/**
 * Static default state only. The hover behaviour (prototype video inside the
 * phone, "View Project" cursor) is Phase 2 — the three image layers below are
 * kept separate precisely so the phone screen can be swapped for a <video>
 * without touching the rest of the composition.
 */
export default function InspectionExperience() {
  return (
    <CardShell
      as="a"
      href={inspection.href}
      radius={32}
      surface="none"
      className={styles.card}
      aria-label={`${inspection.title} — open case study`}
    >
      <Image
        src="/media/inspection-bg.png"
        alt=""
        width={362}
        height={560}
        className={styles.bg}
        priority
      />

      <h2 className={styles.title}>{inspection.title}</h2>

      <GlassChip className={styles.chip}>
        <p className={styles.stat}>{inspection.stat}</p>
      </GlassChip>

      {/* Hand holding the device, then the app screen composited into it.
          Both run off the card edge exactly as in Figma and are clipped.
          Phase 2 replaces `.screen` with a <video> at the identical rect. */}
      <Image
        src="/media/inspection-hand.png"
        alt=""
        width={557}
        height={687}
        className={styles.hand}
      />
      <Image
        src="/media/inspection-screen.png"
        alt=""
        width={146}
        height={395}
        className={styles.screen}
      />
    </CardShell>
  );
}
