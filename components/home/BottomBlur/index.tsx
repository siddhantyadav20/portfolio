import styles from "./BottomBlur.module.css";

/**
 * Softens whatever is passing under the bottom edge of the viewport as the page
 * scrolls — a blur that ramps in over the last 72px rather than a bar with a
 * blur in it. The four layers are the ramp; see BottomBlur.module.css.
 *
 * Purely decorative and inert — `aria-hidden` plus `pointer-events: none`, so
 * it neither reads out nor intercepts a click on anything scrolling under it.
 */
export default function BottomBlur() {
  return (
    <div className={styles.ramp} aria-hidden>
      <div className={styles.layer} />
      <div className={styles.layer} />
      <div className={styles.layer} />
      <div className={styles.layer} />
    </div>
  );
}
