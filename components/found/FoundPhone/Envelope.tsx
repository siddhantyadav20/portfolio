"use client";

import { episode1 as ep } from "@/content/found/episode1";
import styles from "./Envelope.module.css";

/**
 * The cold open, in the site's own voice: Canela, an orange eyebrow, a white
 * key. Everything after this is the phone's voice instead. The envelope
 * shivers every few seconds, because the phone inside it is buzzing.
 */
export default function Envelope({ onOpen }: { onOpen: () => void }) {
  return (
    <div className={styles.stage}>
      <p className={styles.eyebrow}>Episode 1 · {ep.title}</p>
      <div className={styles.envelope} aria-hidden="true">
        <span className={styles.phone} />
        <span className={styles.front} />
        <span className={styles.label}>
          To you
          <br />
          By hand
        </span>
      </div>
      <div className={styles.lines}>
        {ep.envelope.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <button type="button" className={styles.cta} onClick={onOpen}>
        {ep.envelope.cta}
      </button>
      <p className={styles.small}>Sound on. About 30 minutes. Your progress is saved on this device.</p>
    </div>
  );
}
