import { footer } from "@/content/site";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <a
        className={`${styles.linkedin} squircle`}
        href={footer.linkedinHref ?? undefined}
        data-placeholder={footer.linkedinHref ? undefined : ""}
        aria-disabled={footer.linkedinHref ? undefined : true}
        aria-label="LinkedIn"
      >
        <img src="/icons/linkedin.svg" alt="" width={20} height={20} />
      </a>

      <div className={styles.row}>
        {/* Keeps the Figma position and treatment, but shows a dash until a
            real presence source exists — a hard-coded "1" would be a claim. */}
        <p
          className={styles.visitors}
          data-placeholder={footer.visitors === null ? "" : undefined}
          title={
            footer.visitors === null
              ? "Live visitor count is not connected yet"
              : undefined
          }
        >
          <span className={styles.dot} aria-hidden="true" />
          {footer.visitors ?? "—"} {footer.visitorsLabel}
        </p>

        <p className={styles.credit}>
          <span className={styles.copyright}>{footer.copyright}</span>
          <span>{footer.credit}</span>
        </p>

        <a
          className={styles.making}
          href={footer.makingOf ?? undefined}
          data-placeholder={footer.makingOf ? undefined : ""}
          aria-disabled={footer.makingOf ? undefined : true}
        >
          How I made this portfolio?
        </a>
      </div>
    </footer>
  );
}
