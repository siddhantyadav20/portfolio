import styles from "./Switch.module.css";

/** The phone's on/off switch. Some of the phone's switches only go one way. */
export default function Switch({
  on,
  disabled,
  onChange,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onChange?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.switch}
      data-on={on || undefined}
      disabled={disabled}
      onClick={onChange}
    >
      <span className={styles.knob} />
    </button>
  );
}
