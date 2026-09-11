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

/** Fired on window whenever the theme on <html> changes — by the toggle, or
 *  by the pre-paint script following the device. */
export const THEME_EVENT = "sy-themechange";

/**
 * The browser chrome's colour, per theme — the page as *painted*, which is not
 * `--page-base`.
 *
 * Modern mobile Safari and Chrome tint their own toolbars with the page's
 * `theme-color` rather than drawing a bar above it, which is why the site
 * appears to run edge to edge there. That is the browser's design and there is
 * no opting out of it; what there *is* to get right is which colour it uses.
 *
 * `app/layout.tsx` declares two `theme-color` metas behind
 * `prefers-color-scheme`, which is correct until the visitor uses the toggle:
 * a stored choice always beats the OS on this site (see `THEME_SCRIPT`), and
 * nothing was telling the chrome that. Pick light on a dark-mode phone and the
 * toolbars stayed #111 above a #f3f3f3 page — the blend the browser is going
 * for, in the wrong direction.
 *
 * So one more meta, written by us, carrying no `media` and therefore always
 * matching. The spec says the first matching one wins, so it is inserted at
 * the top of <head>; the two declared ones stay underneath as the answer for a
 * visitor with JavaScript off.
 */
export const CHROME_ID = "sy-chrome";

/* NOT `--page-base`. That is the colour under the wash, and the wash is opaque
   where it starts — so the base is never what anyone actually sees.
 *
 * `body` paints `--page-base` and then a `--page-wash-from` -> `--page-wash-to`
 * gradient over it at 97deg, `background-attachment: fixed`. Compositing the
 * one over the other across the viewport's width:
 *
 *              left edge   middle    right edge
 *     light      #ebebeb   #ededed      #f0f0f0
 *     dark       #131313   #111111      #101010
 *
 * The toolbars are one flat colour across a band the page varies along, so the
 * middle is the closest a single value can sit to all of it. Light was set to
 * the base, #f3f3f3 — three to eight levels lighter than any pixel beside it,
 * which is exactly enough to read as a white strip laid over the page rather
 * than as the page continuing. Dark's base already happened to land on the
 * middle, which is why only one of the two ever looked wrong.
 *
 * If the wash changes, recompute these. The arithmetic is premultiplied-alpha
 * interpolation along the gradient, then `over` the base — the same thing the
 * compositor does. */
export const CHROME: Record<Theme, string> = {
  light: "#ededed",
  dark: "#111111",
};

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
 * Storage is read inside its own try/catch, because `localStorage` throws
 * outright in Safari's private mode and under some embedded webviews. It used
 * to wrap the whole script, so a private window got the light default in
 * globals.css whatever the device said; now it just reads as "nothing chosen"
 * and the device decides.
 *
 * Kept as a string, and deliberately terse — it ships in the HTML on every
 * request, and it is small enough that a build step would cost more than it
 * saves. It is minified by hand; the readable version is:
 *
 *     const system = matchMedia("(prefers-color-scheme: dark)");
 *     const stored = () => { try { return localStorage.getItem(THEME_KEY) } catch { return null } };
 *     const paint = (theme) => {
 *       document.documentElement.setAttribute(THEME_ATTR, theme);
 *       // replace, don't edit, the browser-chrome meta — see paintChrome
 *     };
 *     const s = stored();
 *     paint(s === "light" || s === "dark" ? s : system.matches ? "dark" : "light");
 *     system.addEventListener("change", (e) => {
 *       if (stored()) return;
 *       paint(e.matches ? "dark" : "light");
 *       dispatchEvent(new Event(THEME_EVENT));
 *     });
 *
 * THE PRECEDENCE, AND THE WAY BACK. A stored choice wins over the device —
 * someone who picked light on a dark-mode machine meant it. But there used to
 * be no way to un-choose: one press of the toggle pinned the site to that
 * theme on every later visit, even after switching back, and nobody could
 * tell why the site had stopped following their device. So picking the theme
 * the device already asks for now stores nothing (see `storedChoice`), and the
 * site is back to following it.
 *
 * FOLLOWING IT LIVE. With nothing stored, a device that changes appearance —
 * macOS going dark at sunset — used to leave an open tab in the old theme
 * until a reload. The listener above repaints it and tells the toggles. It
 * lives in this script, not in React, so it is registered once per page load
 * whatever else has or has not loaded.
 */
export const THEME_SCRIPT = `try{var q=matchMedia("(prefers-color-scheme: dark)");function g(){try{return localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})}catch(e){return null}}function p(t){document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTR,
)},t);var o=document.getElementById(${JSON.stringify(
  CHROME_ID,
)});if(o)o.remove();var m=document.createElement("meta");m.id=${JSON.stringify(
  CHROME_ID,
)};m.name="theme-color";m.content=t==="dark"?${JSON.stringify(
  CHROME.dark,
)}:${JSON.stringify(
  CHROME.light,
)};document.head.insertBefore(m,document.head.firstChild)}var s=g();p(s==="light"||s==="dark"?s:q.matches?"dark":"light");q.addEventListener("change",function(e){if(g())return;p(e.matches?"dark":"light");dispatchEvent(new Event(${JSON.stringify(
  THEME_EVENT,
)}))})}catch(e){}`;

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

const EVENT = THEME_EVENT;

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
/**
 * Keep the browser chrome on the theme the site is actually showing.
 *
 * THE META IS REPLACED, NOT EDITED, AND THAT IS THE WHOLE POINT.
 *
 * Setting `content` on the meta that is already there is the obvious way to do
 * this and it does not work on iOS Safari: the toolbars keep whichever colour
 * they resolved at load, so the site toggles underneath a bar that stays on
 * the old theme for the rest of the visit. Safari re-resolves `theme-color`
 * when the set of candidate metas changes, not when one of them mutates.
 * Removing the node and inserting a fresh one is a change it notices.
 *
 * The others are rewritten too. `app/layout.tsx` declares two more behind
 * `prefers-color-scheme`, and once JavaScript is running they are stale by
 * definition — the visitor's stored choice beats the OS here, so a phone in OS
 * dark showing the site in light has a `(prefers-color-scheme: dark)` meta
 * sitting in the head claiming #111. The spec says the first *matching* meta
 * wins and ours is first, but Safari has not always agreed, and the cheapest
 * way to not depend on that is to leave nothing behind that could win and be
 * wrong. With JavaScript off they are untouched and still correct.
 *
 * Creating the meta if the pre-paint script could not — that script is wrapped
 * in a try/catch for Safari's private mode, and a theme is not worth a blank
 * page, so this cannot assume it ran.
 */
export function paintChrome(theme: Theme) {
  const colour = CHROME[theme];

  document.getElementById(CHROME_ID)?.remove();

  const meta = document.createElement("meta");
  meta.id = CHROME_ID;
  meta.name = "theme-color";
  meta.content = colour;
  document.head.insertBefore(meta, document.head.firstChild);

  /* The `media` ones from layout.tsx. Left alone they are a second opinion
     that disagrees with the toggle. */
  for (const other of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"][media]',
  )) {
    other.content = colour;
  }
}

/** What the device asks for, right now. Client-side only. */
export function systemTheme(): Theme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * What to remember for a choice: nothing at all when it is what the device
 * already asks for — see "the precedence, and the way back" over
 * `THEME_SCRIPT`. The toggle stays a plain two-way switch; picking the
 * device's own theme is simply how you hand the decision back to the device.
 */
export function storedChoice(theme: Theme, system: Theme): Theme | null {
  return theme === system ? null : theme;
}

export function writeTheme(theme: Theme) {
  document.documentElement.setAttribute(THEME_ATTR, theme);
  paintChrome(theme);
  try {
    const keep = storedChoice(theme, systemTheme());
    if (keep) localStorage.setItem(THEME_KEY, keep);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Storage denied. The theme still applies for this page; it just won't
    // survive a reload, which is a better outcome than throwing.
  }
  window.dispatchEvent(new Event(EVENT));
}
