"use client";

import { useEffect } from "react";

/* ===========================================================================
   Tab does nothing.

   By request, and it is the end of a line: first the orange ring, then the ink
   one, then the browser's own, and now the traversal itself. Pressing Tab no
   longer moves focus anywhere on this site.

   WHAT THIS COSTS. Everything above about the focus ring was WCAG 2.4.7 —
   focus was invisible but still worked, so a keyboard user could get around
   blind. This is 2.1.1, Keyboard, and it is the harder one: there is now no
   way to reach a control without a pointer. Someone using a keyboard because
   they cannot use a mouse cannot use this site. That is the whole of it, said
   once, and it is one file to delete.

   HOW IT IS DONE, and why not `tabindex="-1"` everywhere. Stripping tabindex
   would mean touching every widget, would fight the canvas's own roving focus,
   and would leave native buttons and inputs reachable anyway. One listener
   that refuses the key is smaller, reversible in a line, and does not lie to
   anything reading the DOM.

   BUBBLE PHASE, DELIBERATELY. Anything that genuinely wants Tab claims it by
   stopping propagation before this sees it — the Terminal does exactly that
   for its command completion, which still works. Listening in capture would
   have taken Tab away from that too, which is not what was asked for and would
   have read as a bug.

   `defaultPrevented` is checked for the same reason: a component that has
   already handled the key has said so, and this must not double-handle it.
   =========================================================================== */

export default function NoTabFocus() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.defaultPrevented) return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
