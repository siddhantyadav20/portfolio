/* ===========================================================================
   Values that only exist in the browser.

   React 19 rejects `setState` called synchronously in an effect, and the
   pattern it keeps catching is the same one every time: read something the
   server cannot know — the theme, a media query, whether we have mounted at
   all — into state on mount. `useSyncExternalStore` is the sanctioned way to
   do that, and these two wrap it so the widgets don't each reinvent it.

   Both return a primitive from `getSnapshot`, which matters: returning a fresh
   object each call hands React a new reference every render and spins it.
   =========================================================================== */

import { useCallback, useSyncExternalStore } from "react";

/** Never fires. Used where the value is fixed for the life of the document. */
const never = () => () => {};

/**
 * `false` while rendering on the server and during hydration, `true` after.
 *
 * For anything that must not be in the server's HTML — a portal into
 * `document.body`, most obviously.
 */
export function useMounted() {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}

/**
 * A live media query.
 *
 * Server-rendered as `false`, which is the safe default for every query this
 * codebase asks: hover capability, reduced motion, coarse pointer. Rendering
 * the richer branch on the server and retracting it is the worse mistake.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
