"use client";

import { useSyncExternalStore } from "react";
import {
  readTheme,
  serverTheme,
  subscribeTheme,
  writeTheme,
  type Theme,
} from "@/lib/theme";
import { switched } from "./switched";
import styles from "./ThemeToggle.module.css";

/**
 * The site's one theme control — Figma 80:7595, both states.
 *
 * Rendered in four places — the homepage's top-right corner, the case-study
 * modal's action cluster, the `/work/<slug>` route and the canvas — all
 * reading the same attribute on <html>, so they cannot disagree.
 *
 * The theme is not React state. It is set on the document by a pre-paint
 * script before React exists, and one attribute flip repaints the whole site
 * through custom properties. So it is read as an external store rather than
 * mirrored into `useState` inside an effect — see lib/theme.ts.
 *
 * The selected half is said three ways, which is the design's own answer and
 * a better one than the single signal this used to carry:
 *
 *   · the pill, which slides between the two halves rather than appearing
 *     under the one you pressed;
 *   · the glyph, which is the filled cut of the icon when selected and the
 *     line cut when not — so the control still reads at a glance in a
 *     screenshot, or for anyone who cannot separate the pill from the plate;
 *   · nothing else. Both glyphs sit at full ink in Figma, and the version of
 *     this that dimmed the unselected one was compensating for a pill that
 *     was invisible in dark.
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
      /* The pill's position, as data rather than as a class on the option it
         happens to be under — it is one element that travels, and the travel
         is the whole point of the control. */
      data-theme-at={theme}
    >
      <span className={styles.thumb} aria-hidden="true">
        <span className={styles.thumbFill} />
      </span>

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
      className={styles.option}
      aria-pressed={active}
      onClick={() => {
        switched(theme);
        writeTheme(theme);
      }}
    >
      {/* Both cuts of the glyph, stacked and cross-faded, rather than one
          element whose mask is swapped. A mask change is instant and cannot be
          transitioned, so switching `--icon` would pop the new shape in halfway
          through the pill's travel — the one moment the eye is on it. */}
      <span className={styles.glyphs} data-active={active ? "" : undefined}>
        <span
          className={`inkIcon ${styles.glyph} ${styles.bold}`}
          style={{ ["--icon" as string]: `url(/icons/${icon}-bold.svg)` }}
        />
        <span
          className={`inkIcon ${styles.glyph} ${styles.line}`}
          style={{ ["--icon" as string]: `url(/icons/${icon}-line.svg)` }}
        />
      </span>

      <span className="srOnly">{label}</span>
    </button>
  );
}
