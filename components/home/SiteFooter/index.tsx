import { externalLinkProps } from "@/lib/externalLink";
import { footer } from "@/content/site";
import ColophonLink from "./ColophonLink";
import VisitorCount from "./VisitorCount";
import styles from "./SiteFooter.module.css";

/**
 * `colophon` is passed only by the homepage.
 *
 * This footer also draws inside the About reader and inside the colophon
 * itself, where opening a second full-screen modal would stack two shells —
 * see `ColophonLink`. There the slot is simply empty; see the note at it.
 */
export default function SiteFooter({ colophon = false }: { colophon?: boolean }) {
  return (
    <footer className={styles.footer}>
      <a
        className={`liquid ${styles.linkedin}`}
        data-press=""
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

        {/* NOTHING WHERE THERE IS NOWHERE TO GO.
            `footer.makingOf` is null and always has been — the colophon is a
            reader this footer opens, not a URL — so the second branch was a
            permanently dead, `aria-disabled`, placeholder-marked link reading
            "How I made this portfolio?". It shipped in the two places this
            footer renders that are not the homepage: the bottom of the About
            reader, and the bottom of the colophon itself, where it offered to
            show the reader the page they had just finished reading.

            The homepage keeps the real control. Should there ever be a written
            piece to link out to, this is where it goes — with an href. */}
        {colophon && <ColophonLink />}
      </div>
    </footer>
  );
}
