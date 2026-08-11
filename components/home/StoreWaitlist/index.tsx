import CardShell from "@/components/primitives/CardShell";
import { store } from "@/content/site";
import styles from "./StoreWaitlist.module.css";

/**
 * Figma "Store - My Product", Default state.
 *
 * The other three states (Input / Entered / Success) and the submission
 * adapter are Phase 8. The button is a real button so the interaction has
 * somewhere to attach without restructuring.
 */
export default function StoreWaitlist() {
  return (
    <CardShell radius={24} className={styles.card}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{store.eyebrow}</p>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{store.title}</h2>
          <p className={styles.description}>{store.description}</p>
        </div>
      </div>

      <button type="button" className={`${styles.cta} squircle`}>
        <span className={styles.plus} aria-hidden="true" />
        {store.cta}
      </button>
    </CardShell>
  );
}
