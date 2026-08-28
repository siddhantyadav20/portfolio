import { externalLinkProps } from "@/lib/externalLink";
import { footer } from "@/content/site";
import VisitorCount from "./VisitorCount";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <a
        className={`${styles.linkedin} squircle`}
        href={footer.linkedinHref ?? undefined}
        {...externalLinkProps(footer.linkedinHref)}
        data-placeholder={footer.linkedinHref ? undefined : ""}
        aria-disabled={footer.linkedinHref ? undefined : true}
        aria-label="LinkedIn"
      >
        {/* A stencil, not the export. The file draws this glyph in ink on the
            homepage (244:9343) and in the study's accent inside a case study
            (821:1329) — one mark, two colours — and the export has its fill
            baked in at white, which is LinkedIn's own treatment for the plate
            on `LinkedInCard` and invisible here. See "Ink icons" in
            globals.css. */}
        <span
          className={`inkIcon ${styles.mark}`}
          style={{ ["--icon" as string]: "url(/icons/linkedin.svg)" }}
        />
      </a>

      <div className={styles.row}>
        {/* The one client island in this footer, and the only thing on the
            page that cannot be prerendered: it changes with every new arrival.
            Everything else here, including the year, is baked at build time. */}
        <VisitorCount />

        <p className={styles.credit}>
          {/* Server component, so this is the build's year baked into the
              prerendered HTML — no hydration mismatch, and no literal to
              remember to bump. */}
          <span className={styles.copyright}>
            © {new Date().getFullYear()} {footer.copyrightName}
          </span>
          <span>{footer.credit}</span>
        </p>

        <a
          className={styles.making}
          href={footer.makingOf ?? undefined}
          {...externalLinkProps(footer.makingOf)}
          data-placeholder={footer.makingOf ? undefined : ""}
          aria-disabled={footer.makingOf ? undefined : true}
        >
          How I made this portfolio?
        </a>
      </div>
    </footer>
  );
}
