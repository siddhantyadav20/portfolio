"use client";

import { useSyncExternalStore } from "react";
import {
  readTheme,
  serverTheme,
  subscribeTheme,
  writeTheme,
  type Theme,
} from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

/**
 * The site's one theme control.
 *
 * Rendered in three places — the homepage's top-right corner, the case-study
 * modal's action cluster, and the canvas — all reading the same
 * attribute on <html>, so they cannot disagree.
 *
 * The theme is not React state. It is set on the document by a pre-paint
 * script before React exists, and one attribute flip repaints the whole site
 * through custom properties. So it is read as an external store rather than
 * mirrored into `useState` inside an effect — see lib/theme.ts.
 *
 * No `data-prox-card`: the proximity field is for the composition's cards, and
 * a control that shifts as you reach for it is just a harder control to hit.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);

  return (
    <div
      className={[styles.toggle, "liquid", className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Colour theme"
    >
      <Option theme="light" active={theme === "light"} />
      <Option theme="dark" active={theme === "dark"} />
    </div>
  );
}

const GLYPH: Record<Theme, { icon: string; label: string }> = {
  light: { icon: "sun", label: "Light mode" },
  dark: { icon: "moon", label: "Dark mode" },
};

function Option({ theme, active }: { theme: Theme; active: boolean }) {
  const { icon, label } = GLYPH[theme];
  return (
    <button
      type="button"
      className={`${styles.option} ${active ? styles.active : ""}`}
      aria-pressed={active}
      onClick={() => writeTheme(theme)}
    >
      <span
        className="inkIcon"
        style={{
          ["--icon" as string]: `url(/icons/${icon}.svg)`,
          width: 24,
          height: 24,
        }}
      />
      <span className="srOnly">{label}</span>
    </button>
  );
}
