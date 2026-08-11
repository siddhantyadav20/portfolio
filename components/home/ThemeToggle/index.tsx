import styles from "./ThemeToggle.module.css";

/**
 * Rendered, but intentionally inert.
 *
 * The site is light-only for now and no dark palette has been designed, so the
 * dark option is genuinely disabled rather than pretending to work. When the
 * dark theme lands this becomes a real two-state control in the same markup.
 */
export default function ThemeToggle() {
  return (
    <div
      className={[styles.toggle, "squircle"].filter(Boolean).join(" ")}
      role="group"
      aria-label="Colour theme"
      data-prox-card=""
    >
      <button
        type="button"
        className={`${styles.option} ${styles.active}`}
        aria-pressed="true"
      >
        <img src="/icons/sun.svg" alt="" width={24} height={24} />
        <span className="srOnly">Light mode</span>
      </button>

      <button
        type="button"
        className={styles.option}
        aria-pressed="false"
        disabled
        title="Dark mode is coming soon"
      >
        <img src="/icons/moon.svg" alt="" width={24} height={24} />
        <span className="srOnly">Dark mode (coming soon)</span>
      </button>
    </div>
  );
}
