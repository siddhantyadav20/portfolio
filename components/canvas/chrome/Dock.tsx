"use client";

import { CLUSTERS, CLUSTER_LABELS, type Cluster } from "@/content/canvas";
import styles from "./Dock.module.css";

/* ===========================================================================
   The dock.

   The single most important thing on this canvas that is not a widget. A
   3000x3000 board that is 22% covered has a failure mode: someone arrives,
   drags into empty space, finds nothing, and leaves. The dock is the answer —
   five named places, always reachable, one tap each.

   It flies the camera rather than jumping it, so you keep your bearings: you
   see which direction the board moved and roughly how far, which is what stops
   a jump-cut canvas feeling like five unrelated screens.
   =========================================================================== */

const ICONS: Record<Cluster, string> = {
  me: "M12 12.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM5.5 19.4c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6",
  read: "M4 5.6h6a2 2 0 0 1 2 2v11a2.4 2.4 0 0 0-2-1.2H4zM20 5.6h-6a2 2 0 0 0-2 2v11a2.4 2.4 0 0 1 2-1.2h6z",
  listen: "M9 18.2V7.4l10-2v10.4M9 18.2a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0zm10-2.4a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0z",
  play: "M7 8.6h1.6M7.8 7.8v1.6M15.6 9.4h.01M18 7.8h.01M6.2 16.2h11.6a3 3 0 0 0 3-3.4l-.5-3.6a3.4 3.4 0 0 0-3.4-3H8.1a3.4 3.4 0 0 0-3.4 3l-.5 3.6a3 3 0 0 0 3 3.4z",
  work: "M4.4 8.6h15.2v10.2H4.4zM8.8 8.6V6.4a1.6 1.6 0 0 1 1.6-1.6h3.2a1.6 1.6 0 0 1 1.6 1.6v2.2",
};

export default function Dock({
  active,
  onPick,
}: {
  active: Cluster | null;
  onPick: (cluster: Cluster) => void;
}) {
  return (
    <nav className={`${styles.dock} liquid`} aria-label="Places on the canvas">
      {CLUSTERS.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.tab}
          data-on={active === c ? "" : undefined}
          onClick={() => onPick(c)}
          aria-current={active === c ? "true" : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={ICONS[c]}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.label}>{CLUSTER_LABELS[c]}</span>
        </button>
      ))}
    </nav>
  );
}
