import styles from "./Frame.module.css";

/**
 * A correctly-sized, correctly-placed stand-in for a widget still being ported
 * from references/canvas.
 *
 * Each remaining one is a substantial component with its own state, and each
 * arrives separately. Framing them at their real size, angle, radius and tone
 * means the board's composition is already true — the gaps, the weights and
 * where the eye travels are judged against the finished layout rather than
 * against a hole.
 */
export default function Frame({
  label,
  tone = "light",
  radius = 32,
}: {
  label: string;
  tone?: "light" | "dark" | "paper";
  radius?: 32 | 48;
}) {
  return (
    <div
      className={`${styles.frame} ${styles[tone]} ${radius === 48 ? styles.r48 : styles.r32} squircle`}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.hint}>porting</span>
    </div>
  );
}
