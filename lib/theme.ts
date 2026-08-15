/* ===========================================================================
   The contract between the pre-paint script in layout.tsx and ThemeToggle.

   Two pieces of code write the same attribute at two very different moments —
   one as a string inside <head>, one as React on the client — so the names
   they agree on live here rather than being typed twice.
   =========================================================================== */

export type Theme = "light" | "dark";

/** Set on <html>. Both themes are explicit; there is no "unset" state after
 *  the pre-paint script has run. */
export const THEME_ATTR = "data-theme";

export const THEME_KEY = "sy-theme";

/**
 * The pre-paint script, as source.
 *
 * Injected into <head> and run synchronously before the browser paints
 * anything, which is the entire point: read the choice, stamp the attribute,
 * and let first paint already be in the right theme. Deferring this by even
 * one frame — a `useEffect`, a `<Script>` strategy, anything React-scheduled —
 * shows every dark-mode visitor a full white page first. The flash is worst
 * on a slow connection, which is exactly when it is least excusable.
 *
 * Wrapped in try/catch because `localStorage` throws outright in Safari's
 * private mode and under some embedded webviews. A theme is not worth a blank
 * page, so a failure here falls through to the light default in globals.css.
 *
 * Kept as a string, and deliberately terse — it ships in the HTML on every
 * request, and it is small enough that a build step would cost more than it
 * saves. It is minified by hand; the readable version is:
 *
 *     const stored = localStorage.getItem(THEME_KEY);
 *     const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
 *     const theme = stored === "light" || stored === "dark"
 *       ? stored
 *       : prefersDark ? "dark" : "light";
 *     document.documentElement.setAttribute(THEME_ATTR, theme);
 *
 * Note the precedence: a stored choice always wins over the OS. Someone who
 * picked light on a dark-mode machine meant it.
 */
export const THEME_SCRIPT = `try{var s=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});var t=s==="light"||s==="dark"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTR,
)},t)}catch(e){}`;

/* ===========================================================================
   The theme as an external store.

   The active theme genuinely lives outside React — it is an attribute on
   <html>, written by the pre-paint script above before React exists and read
   back by every control that displays it. So it is exposed the way React asks
   external state to be exposed, via `useSyncExternalStore`, rather than being
   copied into component state inside an effect.

   That also makes the multi-instance case free: the toggle is rendered on the
   homepage, in the case-study modal and in the canvas, and all three
   read the same attribute rather than three copies that could drift.
   =========================================================================== */

const EVENT = "sy-themechange";

/** What the pre-paint script left on <html>. Client-side only. */
export function readTheme(): Theme {
  return document.documentElement.getAttribute(THEME_ATTR) === "dark"
    ? "dark"
    : "light";
}

/**
 * The snapshot React hydrates with.
 *
 * Necessarily a guess — the server cannot know the visitor's choice, which is
 * the whole reason the decision was pushed into a pre-paint script. React
 * renders this once during hydration and then immediately re-reads the real
 * value, so a dark-mode visitor sees the *control* settle a frame late. The
 * page itself does not: it was already dark before first paint.
 */
export const serverTheme = (): Theme => "light";

export function subscribeTheme(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  // Another tab of the same site. Cheap to support, and without it two windows
  // sit on different themes with no way to notice.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Apply a theme and remember it.
 *
 * Writing the attribute is what changes the page — every themed value is a
 * custom property under `html[data-theme="dark"]`, so one attribute flip
 * repaints the whole site with no React re-render involved anywhere.
 */
export function writeTheme(theme: Theme) {
  document.documentElement.setAttribute(THEME_ATTR, theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage denied. The theme still applies for this page; it just won't
    // survive a reload, which is a better outcome than throwing.
  }
  window.dispatchEvent(new Event(EVENT));
}
