import styles from "./SystemPreview.module.css";

type Props = {
  /** Which of the system's two colour modes this copy paints in. */
  mode: "light" | "dark";
  className?: string;
};

/**
 * The WinConnect dashboard, in miniature, built out of the system's own
 * measurements.
 *
 * This is not a screenshot and deliberately so. Every number in the stylesheet
 * next to this file is a component token lifted straight out of the Figma
 * library — the nav row is 44px because `nav/vertical/item-root-height` is 44,
 * the header is 72 because `header/desktop-height` is 72, cards round at 16
 * because `card/radius` is 16, the shell is 280 + 1160 because
 * `container/vertical/width` is 1160. A screenshot would show the same picture
 * and prove nothing; this is the system actually running.
 *
 * It draws at the artboard's real 1440x1024 and is scaled down as a whole,
 * rather than being redrawn small. That keeps every proportion exactly the
 * library's at any size, and it is why the same component can be the 346px
 * thumbnail on the card and the full-width hero in the study.
 *
 * How far down is `--ds-scale`, inherited rather than passed: two copies of
 * this are stacked to make the light/dark seam, and a scale they each held
 * separately would be two numbers that have to agree.
 *
 * Colour comes entirely from custom properties. The mode pair (`--ds-paper`,
 * `--ds-text`, ...) is set by `[data-mode]` in CSS, because those two tables
 * are fixed and belong with the styles. The one thing that moves — the primary
 * — is written from JavaScript onto an ancestor. Nothing in here knows which
 * hue it is painting, which is the entire point of the demonstration.
 *
 * Presentational only: `aria-hidden`, no text worth announcing, nothing
 * focusable. It lives inside the card's `<a>`, so it must not contain
 * anything interactive.
 */
export default function SystemPreview({ mode, className }: Props) {
  return (
    <div
      className={[styles.stage, className].filter(Boolean).join(" ")}
      data-mode={mode}
      aria-hidden="true"
    >
      <div className={styles.frame}>
        <aside className={styles.nav}>
          <div className={styles.brand}>
            <span className={styles.mark} />
            <span className={styles.wordmark} />
          </div>

          <p className={styles.subheader}>Overview</p>
          <NavItem label="Dashboard" />
          <NavItem label="Analytics" />

          <p className={styles.subheader}>Products</p>
          <NavItem label="CRM" active />
          <NavItem label="Inspections" />
          <NavItem label="Learning" />
          <NavItem label="Admin" />
          <NavItem label="SME Toolkit" />
        </aside>

        <div className={styles.main}>
          <header className={styles.header}>
            <span className={styles.search} />
            <span className={styles.grow} />
            <span className={styles.bell}>
              <span className={styles.badge} />
            </span>
            <span className={styles.avatar} />
          </header>

          <div className={styles.content}>
            {/* The banner is the loudest thing the primary owns, and it is
                first on purpose — it is what makes the sweep read at 346px. */}
            <section className={styles.banner}>
              <div className={styles.bannerCopy}>
                <p className={styles.bannerTitle}>Welcome back</p>
                <p className={styles.bannerBody}>
                  Twelve products, one system.
                </p>
                <span className={styles.bannerCta}>Go now</span>
              </div>
              <span className={styles.bannerArt} />
            </section>

            <div className={styles.row}>
              <Stat label="Active users" value="9,990" />
              <Stat label="Reports filed" value="10,989" />
              {/* Not "Adoption". The three values here are furniture — an
                  arithmetic sequence chosen so the sweep reads — but the study
                  this specimen sits in states in as many words that no adoption
                  baseline was ever taken, and a tile labelled Adoption directly
                  above that line reads as a number being claimed. */}
              <Stat label="Inspections" value="11,988" />
            </div>

            <div className={styles.row}>
              <section className={styles.chart}>
                <div className={styles.cardHead}>
                  <p className={styles.cardTitle}>Usage by product</p>
                  <span className={styles.chip}>Last 12 months</span>
                </div>
                <div className={styles.bars}>
                  {BARS.map((h, i) => (
                    <span key={i} className={styles.barGroup}>
                      <span className={styles.bar} style={{ height: `${h}%` }} />
                      <span
                        className={styles.barAlt}
                        style={{ height: `${h * 0.55}%` }}
                      />
                    </span>
                  ))}
                </div>
              </section>

              <section className={styles.side}>
                <div className={styles.cardHead}>
                  <p className={styles.cardTitle}>Coverage</p>
                </div>
                <span className={styles.donut} />
                <div className={styles.legend}>
                  <span className={styles.legendRow}>
                    <span className={styles.dot} />
                    <span className={styles.legendBar} />
                  </span>
                  <span className={styles.legendRow}>
                    <span className={`${styles.dot} ${styles.dotMuted}`} />
                    <span className={styles.legendBar} />
                  </span>
                </div>
                <div className={styles.controls}>
                  <span className={styles.button} />
                  <span className={styles.buttonGhost} />
                  <span className={styles.toggle} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bar heights, as percentages of the plot. Fixed rather than random: this
 *  component renders twice on the card, once per mode, and the two copies have
 *  to be pixel-identical or the diagonal seam between them would not line up. */
const BARS = [42, 66, 38, 78, 54, 88, 61, 46, 72, 58, 94, 69];

function NavItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={styles.navItem} data-active={active ? "" : undefined}>
      <span className={styles.navIcon} />
      <span className={styles.navLabel}>{label}</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <section className={styles.stat}>
      <span className={styles.statIcon} />
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <span className={styles.statTrack}>
        <span className={styles.statFill} />
      </span>
    </section>
  );
}
