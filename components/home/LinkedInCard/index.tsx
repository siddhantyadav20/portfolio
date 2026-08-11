import CardShell from "@/components/primitives/CardShell";
import { linkedin } from "@/content/site";
import styles from "./LinkedInCard.module.css";

const toneClass: Record<string, string> = {
  ink: styles.ink,
  blue: styles.blue,
  red: styles.red,
  green: styles.green,
};

/** Static state. The blue hover fill and its sound cue are Phase 8. */
export default function LinkedInCard() {
  return (
    <CardShell radius={24} className={styles.card}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.who}>
            <p className={styles.name}>{linkedin.name}</p>
            <p className={styles.role}>{linkedin.role}</p>
          </div>
          <span className={styles.logo} aria-hidden="true">
            <img src="/icons/linkedin.svg" alt="" width={20} height={20} />
          </span>
        </div>

        <p className={styles.blurb}>
          {linkedin.blurb.map((run, i) => (
            <span key={i} className={toneClass[run.tone]}>
              {run.text}
            </span>
          ))}
        </p>
      </div>

      <a
        className={`${styles.cta} squircle`}
        href={linkedin.href ?? undefined}
        data-placeholder={linkedin.href ? undefined : ""}
        aria-disabled={linkedin.href ? undefined : true}
      >
        {linkedin.cta}
      </a>
    </CardShell>
  );
}
