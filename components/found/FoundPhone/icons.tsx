import type { AppId } from "@/content/found/types";
import styles from "./icons.module.css";

/* The phone's app icons. The OS is our own, so are these: one glyph per app,
   drawn in white on a tile of that app's colour, nothing borrowed. */

const TILE: Record<AppId, string> = {
  envelope: "#a9814f",
  lock: "#3a3a3c",
  messages: "linear-gradient(160deg, #ff9a52, #e2560f)",
  photos: "linear-gradient(160deg, #f5d27a, #d9822b)",
  maps: "linear-gradient(160deg, #5fc28a, #2f8f5b)",
  health: "linear-gradient(160deg, #ff6b8b, #d9304f)",
  memos: "linear-gradient(160deg, #3b3b3f, #151517)",
  notes: "linear-gradient(160deg, #f7e27c, #e5b72b)",
  calculator: "linear-gradient(160deg, #505055, #232326)",
  settings: "linear-gradient(160deg, #8e8e93, #545458)",
  guardian: "linear-gradient(160deg, #6fa8ff, #2e5fd6)",
  nightcam: "linear-gradient(160deg, #26263a, #07070d)",
  news: "linear-gradient(160deg, #f4f1ea, #d8d2c4)",
  food: "linear-gradient(160deg, #ff7a59, #d93a1f)",
};

function Glyph({ app }: { app: AppId }) {
  switch (app) {
    case "messages":
      return <path d="M12 4c4.6 0 8 3.2 8 7.2s-3.4 7.3-8 7.3c-1 0-2-.2-2.9-.5L5 19.6l1.3-3.5C4.8 14.8 4 13.1 4 11.2 4 7.2 7.4 4 12 4Z" fill="#fff" />;
    case "photos":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="m4.5 16 4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5" />
          <circle cx="15.5" cy="9.5" r="1.3" fill="#fff" stroke="none" />
        </g>
      );
    case "maps":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M9 4.5 3.8 6.3v13.2L9 17.7l6 1.8 5.2-1.8V4.5L15 6.3 9 4.5Z" />
          <path d="M9 4.5v13.2M15 6.3v13.2" />
        </g>
      );
    case "health":
      return <path d="M12 19.5s-7.5-4.4-7.5-9.7A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4c0 5.3-7.5 9.7-7.5 9.7Z" fill="#fff" />;
    case "memos":
      return (
        <g stroke="#ff453a" strokeWidth="2" strokeLinecap="round">
          <path d="M5 11v2M8 8.5v7M11 6v12M14 9v6M17 7.5v9M20 11v2" />
        </g>
      );
    case "notes":
      return (
        <g fill="none" stroke="#6b5310" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 8.5h12M6 12h12M6 15.5h8" />
        </g>
      );
    case "calculator":
      return (
        <g fill="#fff">
          <rect x="5" y="5" width="6" height="6" rx="3" fill="#ff9f0a" />
          <rect x="13" y="5" width="6" height="6" rx="3" />
          <rect x="5" y="13" width="6" height="6" rx="3" />
          <rect x="13" y="13" width="6" height="6" rx="3" />
        </g>
      );
    case "settings":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="7" strokeDasharray="3 2.5" strokeWidth="3" />
        </g>
      );
    case "guardian":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 4 5.5 6.5v5c0 4 2.8 7 6.5 8.5 3.7-1.5 6.5-4.5 6.5-8.5v-5L12 4Z" />
          <path d="m9 12 2.2 2.2L15.5 10" strokeLinecap="round" />
        </g>
      );
    case "nightcam":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M4.5 8.5h3l1.5-2h6l1.5 2h3v10h-15v-10Z" />
          <path d="M14.2 11.3a3 3 0 1 0 0 4.4 2.4 2.4 0 0 1 0-4.4Z" fill="#fff" stroke="none" />
        </g>
      );
    case "news":
      return (
        <g fill="none" stroke="#2c2c2e" strokeWidth="1.6" strokeLinecap="round">
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M8 9h8M8 12h8M8 15h5" />
        </g>
      );
    case "food":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 12h15a7.5 7.5 0 0 1-15 0Z" />
          <path d="M9 8.5c0-1.5 1-1.5 1-3M13 8.5c0-1.5 1-1.5 1-3" />
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
      <svg viewBox="0 0 24 24" className={styles.glyph} aria-hidden="true">
        <Glyph app={app} />
      </svg>
    </span>
  );
}
