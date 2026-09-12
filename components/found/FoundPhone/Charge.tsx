"use client";

import { useState } from "react";

import { keyTap } from "@/lib/found/buzz";
import styles from "./Charge.module.css";

/**
 * Episode 2's cold open. The phone is dead, and the last thing it said was
 * "Keep it charged." Plugging it in is the first thing the player does, and
 * it's exactly what both people who texted it wanted.
 */
export default function Charge({ onPlug }: { onPlug: () => void }) {
  const [plugged, setPlugged] = useState(false);

  const plug = () => {
    if (plugged) return;
    setPlugged(true);
    keyTap();
    window.setTimeout(onPlug, 1800);
  };

  return (
    <div className={styles.charge}>
      <p className={styles.echo}>“Keep it charged.”</p>
      <span className={styles.cell} data-on={plugged || undefined}>
        <span className={styles.level} />
      </span>
      <p className={styles.state}>{plugged ? "Charging" : "Monday, 19:40. The phone is dead."}</p>
      <button
        type="button"
        className={styles.cable}
        data-in={plugged || undefined}
        onClick={plug}
        aria-label="Plug the phone in"
      >
        <span className={styles.plug} />
        <span className={styles.cord} />
      </button>
      {!plugged && <p className={styles.hint}>Plug it in</p>}
    </div>
  );
}
