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

/** An app's top bar: an optional back button, a title, and room on the right. */
export default function AppBar({
  title = "",
  onBack,
  backLabel = "Back",
  end,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  end?: React.ReactNode;
}) {
  return (
    <header className={styles.bar}>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack}>
          <Chevron back />
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <h2 className={styles.title}>{title}</h2>
      <span className={styles.barEnd}>{end}</span>
    </header>
  );
}
