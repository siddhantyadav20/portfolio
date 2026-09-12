import type { AppId } from "@/content/found/types";
import styles from "./icons.module.css";

/* The phone's app icons, in the iPhone's idiom: a rounded-square tile in the
   app's own colour (white for the apps that are mostly paper), one simple
   glyph, and a soft light along the top edge. All drawn here: the language
   is borrowed, none of Apple's artwork is. */

const TILE: Record<AppId, string> = {
  envelope: "linear-gradient(180deg, #c9a06a, #9c7543)",
  lock: "linear-gradient(180deg, #4a4a4e, #2c2c2e)",
  messages: "linear-gradient(180deg, #6af07e 0%, #16c23a 100%)",
  photos: "linear-gradient(180deg, #ffffff 0%, #eeeef2 100%)",
  maps: "linear-gradient(160deg, #f4f1e6 0%, #e3eed8 100%)",
  health: "linear-gradient(180deg, #ffffff 0%, #f0f0f3 100%)",
  memos: "linear-gradient(180deg, #2c2c2e 0%, #050505 100%)",
  notes: "linear-gradient(180deg, #ffd84a 0%, #f8c81c 24%, #ffffff 24.5%, #f7f7f2 100%)",
  calculator: "linear-gradient(180deg, #3a3a3c 0%, #111113 100%)",
  settings: "linear-gradient(180deg, #d8d8dd 0%, #8e8e93 100%)",
  guardian: "linear-gradient(180deg, #5eb0ff 0%, #1d6fe6 100%)",
  nightcam: "linear-gradient(180deg, #2a2f5c 0%, #080a18 100%)",
  news: "linear-gradient(180deg, #ff6a6a 0%, #e4283f 100%)",
  food: "linear-gradient(180deg, #ffb347 0%, #ff7a1a 100%)",
};

/** Glyphs that are the whole picture (a map, a page) rather than a mark on a tile. */
const FULL: ReadonlySet<AppId> = new Set<AppId>(["maps", "notes"]);

function Glyph({ app }: { app: AppId }) {
  switch (app) {
    case "messages":
      return (
        <path
          d="M12 4.6c4.8 0 8.4 3 8.4 6.9s-3.6 6.9-8.4 6.9c-1 0-1.9-.1-2.8-.4-1 .9-2.6 1.7-4.5 1.9.8-.8 1.4-1.9 1.5-3-1.6-1.3-2.6-3.2-2.6-5.4 0-3.9 3.6-6.9 8.4-6.9Z"
          fill="#fff"
        />
      );
    case "photos":
      return (
        <g>
          <circle cx="16.4" cy="7.6" r="2.5" fill="#ff9f0a" />
          <path d="M2.8 19.6 9.3 10.9l5.4 6.6-1.7 2.1Z" fill="#5ac8fa" />
          <path d="m8.4 19.6 6.9-7.8 5.9 7.8Z" fill="#30d158" />
        </g>
      );
    case "maps":
      return (
        <g>
          <path d="M14 0h10v9.5H14z" fill="#c2e5a9" />
          <path d="M7.6-1 10.8 25" stroke="#fff" strokeWidth="2.2" />
          <path d="M-1 19.8 25 10.2" stroke="#fff" strokeWidth="4.6" />
          <path d="M-1 19.8 25 10.2" stroke="#ffc933" strokeWidth="2.8" />
          <circle cx="16.2" cy="17" r="3.5" fill="#0a84ff" stroke="#fff" strokeWidth="1.4" />
          <path d="m16.2 14.7 1.6 3.9-1.6-.9-1.6.9Z" fill="#fff" />
        </g>
      );
    case "health":
      return (
        <path d="M12 20s-7.8-4.6-7.8-10.2A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 7.8 2.6C19.8 15.4 12 20 12 20Z" fill="#ff2d55" />
      );
    case "memos":
      return (
        <path
          d="M4.5 11v2M7 9v6M9.5 6.5v11M12 4.5v15M14.5 7.5v9M17 9.5v5M19.5 11v2"
          stroke="#ff375f"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      );
    case "notes":
      return (
        <g>
          <path d="M0 5.9h24" stroke="#d6a900" strokeWidth="0.7" strokeDasharray="0.7 1.1" />
          <path d="M3.6 10.8h16.8M3.6 14.4h16.8M3.6 18h10.4" stroke="#d1d1d6" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      );
    case "calculator":
      return (
        <g strokeLinecap="round" strokeWidth="1.3">
          <circle cx="7.4" cy="7.4" r="4.1" fill="#a5a5aa" />
          <circle cx="16.6" cy="7.4" r="4.1" fill="#ff9f0a" />
          <circle cx="7.4" cy="16.6" r="4.1" fill="#5a5a5f" />
          <circle cx="16.6" cy="16.6" r="4.1" fill="#ff9f0a" />
          <path d="M7.4 5.6v3.6M5.6 7.4h3.6" stroke="#1c1c1e" />
          <path d="M14.8 7.4h3.6" stroke="#fff" />
          <path d="m6.1 15.3 2.6 2.6m0-2.6-2.6 2.6" stroke="#fff" />
          <path d="M14.8 15.8h3.6M14.8 17.4h3.6" stroke="#fff" />
        </g>
      );
    case "settings":
      return (
        <g>
          {/* Twelve teeth: a thick dashed ring, 2.3 on and 1.73 off round r 7.7. */}
          <circle cx="12" cy="12" r="7.7" fill="none" stroke="#3c3c40" strokeWidth="3.2" strokeDasharray="2.3 1.73" />
          <circle cx="12" cy="12" r="6.4" fill="#3c3c40" />
          <circle cx="12" cy="12" r="4.3" fill="#c7c7cc" />
          <circle cx="12" cy="12" r="2.1" fill="#3c3c40" />
        </g>
      );
    case "guardian":
      return (
        <g>
          <path d="M12 3.6 5.2 6.2v5.3c0 4.3 2.9 7.4 6.8 8.9 3.9-1.5 6.8-4.6 6.8-8.9V6.2L12 3.6Z" fill="#fff" />
          <path
            d="m8.8 12.1 2.2 2.2 4.2-4.4"
            fill="none"
            stroke="#1d6fe6"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case "nightcam":
      return (
        <g>
          <path
            d="M4 8.6h3.1l1.4-2.1h7l1.4 2.1H20a1 1 0 0 1 1 1v8.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.6a1 1 0 0 1 1-1Z"
            fill="#fff"
          />
          <circle cx="12" cy="13.6" r="3.7" fill="#0d1030" />
          <path d="M13.4 11.9a2.1 2.1 0 1 0 0 3.4 1.7 1.7 0 0 1 0-3.4Z" fill="#ffd60a" />
        </g>
      );
    case "news":
      return (
        <g>
          <path d="M5 6.5h11.5v11a1.5 1.5 0 0 0 1.5 1.5H6.5A1.5 1.5 0 0 1 5 17.5Z" fill="#fff" />
          <path d="M16.5 9.5H19v8a1.25 1.25 0 0 1-2.5 0Z" fill="#fff" opacity="0.75" />
          <path d="M7.3 9.3h6.9M7.3 12h6.9M7.3 14.6h4.4" stroke="#e4283f" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );
    case "food":
      return (
        <g fill="#fff">
          {/* A dabba: three tiers and the handle that clips them together. */}
          <path d="M8.5 7V5.4a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="#fff" strokeWidth="1.6" />
          <rect x="6" y="7" width="12" height="3.6" rx="1.2" />
          <rect x="6" y="11.4" width="12" height="3.6" rx="1.2" opacity="0.9" />
          <rect x="6" y="15.8" width="12" height="3.6" rx="1.2" opacity="0.8" />
        </g>
      );
    case "envelope":
      return (
        <g>
          <rect x="3.5" y="6.5" width="17" height="11" rx="1.6" fill="#fff" />
          <path d="m4 7.2 8 6 8-6" fill="none" stroke="#9c7543" strokeWidth="1.4" strokeLinejoin="round" />
        </g>
      );
    case "lock":
      return (
        <g>
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#fff" strokeWidth="1.8" />
          <rect x="6.5" y="10.5" width="11" height="8.5" rx="2" fill="#fff" />
        </g>
      );
    default:
      return null;
  }
}

/** A tile with its glyph, filling whatever box it's put in. */
export function AppGlyph({ app }: { app: AppId }) {
  return (
    <span className={styles.tile} style={{ background: TILE[app] }}>
      <svg viewBox="0 0 24 24" className={styles.glyph} data-full={FULL.has(app) || undefined} aria-hidden="true">
        <Glyph app={app} />
      </svg>
    </span>
  );
}
