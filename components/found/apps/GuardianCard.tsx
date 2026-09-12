import { story as ep } from "@/content/found/story";
import type { AppId } from "@/content/found/types";
import { buildReport, has, type CaseState } from "@/lib/found/engine";
import styles from "./GuardianCard.module.css";

const APP_NAMES: Record<AppId, string> = {
  envelope: "Envelope",
  lock: "Lock screen",
  messages: "Messages",
  photos: "Photos",
  maps: "Maps",
  calculator: "Calculator",
  health: "Health",
  settings: "Settings",
  memos: "Voice Memos",
  notes: "Notes",
  guardian: "Guardian",
  nightcam: "NightCam",
  news: "News",
  food: "Dabba",
};

/**
 * Mum's Guardian report of Monday morning: the player's own session, as the
 * police saw it. Until the player admits who that was, it's "{name}'s
 * phone"; after, every line says "you".
 */
export default function GuardianCard({ state }: { state: CaseState }) {
  const r = state.report ?? buildReport(ep, state);
  const you = has(state, "solved:e2-who");
  const top = Math.max(1, ...r.apps.map((a) => a.minutes));

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.badge}>Guardian</span>
        <span className={styles.title}>{you ? "You, on this phone" : `${state.cast.name}'s phone`} · Monday</span>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>
          <b>{r.firstPickup}</b>
          {you ? "you picked it up" : "first pickup"}
        </span>
        <span className={styles.stat}>
          <b>{r.pickups}</b>
          pickups
        </span>
        <span className={styles.stat}>
          <b>{r.minutes}m</b>
          on screen
        </span>
      </div>
      <div className={styles.apps}>
        {r.apps.map((a) => (
          <div key={a.app} className={styles.app}>
            <span className={styles.appName}>{APP_NAMES[a.app]}</span>
            <span className={styles.track}>
              <span className={styles.bar} style={{ width: `${(a.minutes / top) * 100}%` }} />
            </span>
            <span className={styles.appMin}>{a.minutes}m</span>
          </div>
        ))}
      </div>
      {r.timeline.length > 0 && (
        <div className={styles.timeline}>
          {r.timeline.slice(0, 7).map((t) => (
            <div key={t.label} className={styles.moment}>
              <span className={styles.time}>{t.time}</span>
              <span>{you ? `You · ${t.label}` : t.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
