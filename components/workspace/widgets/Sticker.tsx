import styles from "./Sticker.module.css";

/**
 * A die-cut sticker.
 *
 * The white kiss-cut border is drawn rather than baked into the PNG, so the
 * artwork stays a clean cut-out and the border keeps its width at every zoom.
 * Holographic foil and the click-flight come with the interactions.
 */
export default function Sticker({ label, art }: { label: string; art: string }) {
  return (
    // Die-cut PNGs carrying their own alpha, at 200px. next/image has nothing
    // to win here and its wrapper fights `object-fit: contain`.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={art} alt={label} className={styles.art} loading="lazy" />
  );
}
