"use client";

import { episode1 as ep } from "@/content/found/episode1";
import type { AppId } from "@/content/found/types";
import { deductionOpen, type CaseState } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import type { Nav } from "../apps/types";
import { AppGlyph } from "./icons";
import styles from "./Home.module.css";

const GRID: { app: AppId; label: string }[] = [
  { app: "health", label: "Health" },
  { app: "memos", label: "Voice Memos" },
  { app: "calculator", label: "Calculator" },
  { app: "settings", label: "Settings" },
];

const DOCK: { app: AppId; label: string }[] = [
  { app: "messages", label: "Messages" },
  { app: "photos", label: "Photos" },
  { app: "maps", label: "Maps" },
  { app: "notes", label: "Case file" },
];

/**
 * The home screen, with one addition a real phone wouldn't have: the widget
 * at the top is the player's open question. It's the quiet answer to "what
 * am I supposed to be doing", and it's always one tap from the case file.
 */
export default function Home({ state, nav, unread }: { state: CaseState; nav: Nav; unread: number }) {
  const open = ep.deductions.find((d) => deductionOpen(state, d));

  return (
    <div className={styles.home}>
      <button type="button" className={styles.widget} onClick={() => nav.go("notes")}>
        <span className={styles.widgetLabel}>{open ? "Open question" : "Case file"}</span>
        <span className={styles.widgetText}>
          {open ? say(open.question, state.cast) : "Look around. What you open, you keep."}
        </span>
      </button>

      <div className={styles.grid}>
        {GRID.map(({ app, label }) => (
          <Icon key={app} app={app} label={label} onOpen={() => nav.go(app)} />
        ))}
      </div>

      <div className={styles.dock}>
        {DOCK.map(({ app, label }) => (
          <Icon key={app} app={app} label={label} badge={app === "messages" ? unread : 0} onOpen={() => nav.go(app)} />
        ))}
      </div>
    </div>
  );
}

function Icon({ app, label, badge = 0, onOpen }: { app: AppId; label: string; badge?: number; onOpen: () => void }) {
  return (
    <button type="button" className={styles.icon} onClick={onOpen}>
      <span className={styles.tile}>
        <AppGlyph app={app} />
        {badge > 0 && <span className={styles.badge}>{badge}</span>}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
