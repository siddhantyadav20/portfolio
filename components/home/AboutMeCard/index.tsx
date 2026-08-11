import Image from "next/image";
import CardShell from "@/components/primitives/CardShell";
import { about } from "@/content/site";
import styles from "./AboutMeCard.module.css";

/** Static state. The tool-icon hover animation is Phase 5 and isn't designed yet. */
export default function AboutMeCard() {
  return (
    <CardShell
      as="a"
      href={about.href}
      radius={16}
      className={styles.card}
      aria-label="About me"
    >
      <span className={styles.photo}>
        <Image src="/media/portrait.png" alt="" width={32} height={32} />
      </span>
      <span className={styles.dest}>
        <span className={styles.eyebrow}>{about.eyebrow}</span>
        <span className={styles.title}>{about.title}</span>
      </span>
    </CardShell>
  );
}
