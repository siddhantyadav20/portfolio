"use client";

import { useState } from "react";

import { story as ep } from "@/content/found/story";
import type { AppId } from "@/content/found/types";
import { deductionOpen, sessionVars, type CaseState } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import type { Nav } from "../apps/types";
import { AppGlyph } from "./icons";
import styles from "./Home.module.css";

/** Two pages, like any phone: what gets used, and what got installed once and forgotten. */
const PAGES: { app: AppId; label: string }[][] = [
  [
    { app: "health", label: "Health" },
    { app: "memos", label: "Voice Memos" },
    { app: "calculator", label: "Calculator" },
    { app: "settings", label: "Settings" },
    { app: "news", label: "News" },
    { app: "nightcam", label: "NightCam" },
  ],
  [
    { app: "guardian", label: "Guardian" },
    { app: "food", label: "Dabba" },
  ],
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
 * Page two is where Mum's app has sat since 2021.
 *
 * It stays mounted under an open app (`covered`): pushed back, dimmed and
 * out of reach, so that pulling the app away shows it, as a phone does.
 */
export default function Home({
  state,
  nav,
  unread,
  covered = false,
}: {
  state: CaseState;
  nav: Nav;
  unread: number;
  covered?: boolean;
}) {
  const [page, setPage] = useState(0);
  const open = [...ep.deductions].reverse().find((d) => deductionOpen(state, d));

  return (
    <div className={styles.home} data-covered={covered || undefined} inert={covered} aria-hidden={covered || undefined}>
      <button type="button" className={styles.widget} onClick={() => nav.go("notes")}>
        <span className={styles.widgetLabel}>{open ? "Open question" : "Case file"}</span>
        <span className={styles.widgetText}>
          {open ? say(open.question, state.cast, sessionVars(ep, state)) : "Look around. What you open, you keep."}
        </span>
      </button>

      <div
        className={styles.pages}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {PAGES.map((icons, i) => (
          <div key={i} className={styles.page}>
            <div className={styles.grid}>
              {icons.map(({ app, label }) => (
                <Icon key={app} app={app} label={label} onOpen={() => nav.go(app)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.dots} aria-hidden="true">
        {PAGES.map((_, i) => (
          <span key={i} className={styles.pageDot} data-on={i === page || undefined} />
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
    <button type="button" className={styles.icon} onClick={onOpen} aria-label={badge > 0 ? `${label}, ${badge} unread` : label}>
      <span className={styles.tile}>
        <AppGlyph app={app} />
        {badge > 0 && <span className={styles.badge}>{badge}</span>}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
