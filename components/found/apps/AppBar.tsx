import styles from "./App.module.css";

export function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 8 14" className={back ? undefined : styles.chev} aria-hidden="true">
      <path
        d={back ? "M7 1 1 7l6 6" : "m1 1 6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * An app's top bar: an optional back button, a title (which can open
 * something, like a contact's details), and room on the right.
 *
 * The back button carries `data-back`: swiping a screen right presses the
 * last one on the phone, so every screen with a back button can be swiped.
 */
export default function AppBar({
  title = "",
  onBack,
  backLabel = "Back",
  onTitle,
  end,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  onTitle?: () => void;
  end?: React.ReactNode;
}) {
  return (
    <header className={styles.bar}>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack} data-back>
          <Chevron back />
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      {onTitle ? (
        <button type="button" className={styles.titleButton} onClick={onTitle}>
          <span className={styles.title}>{title}</span>
          <Chevron />
        </button>
      ) : (
        <h2 className={styles.title}>{title}</h2>
      )}
      <span className={styles.barEnd}>{end}</span>
    </header>
  );
}
