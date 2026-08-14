import styles from "./Frame.module.css";

/**
 * A correctly-sized, correctly-placed stand-in for a widget still being
 * ported from references/canvas.
 *
 * Four of these remain: the terminal (871 lines), the design receipt (684),
 * the scratch card and the drawing canvas. Each is a substantial component
 * with its own state, and each arrives on its own. Framing them at their real
 * size and angle means the board's composition is already true — the gaps, the
 * weights, and where the eye travels are all being judged against the finished
 * layout rather than against a hole.
 *
 * `tone="dark"` for the objects that are dark in both themes on the reference
 * board, so the balance being judged is the balance that will ship.
 */
export default function Frame({
  label,
  tone = "light",
}: {
  label: string;
  tone?: "light" | "dark" | "paper";
}) {
  return (
    <div className={`${styles.frame} ${styles[tone]}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.hint}>porting</span>
    </div>
  );
}
