"use client";

import { useEffect, useRef } from "react";
import { studyHref } from "@/content/work";

/**
 * Keeping the address bar honest about which case study is open.
 *
 * Before this, opening a study from the homepage changed nothing about the
 * URL. Back did not close the modal, the address bar could not be copied, and
 * the Share button existed to paper over both — handing out `/?study=<slug>`,
 * a URL that serves the *homepage* to every crawler and link-preview bot. A
 * case study pasted into Slack previewed as the homepage.
 *
 * `/work/<slug>` has been a real prerendered route since `33a1fa1`, with its
 * own `<h1>`, canonical and share card. So the modal does not need a URL of
 * its own — it needs to stop lying about the one that already exists.
 *
 * This is the half of that job which is identical for every study. The other
 * half — the morph, and what else has to move on the way in and out — differs
 * per card, which is why `useStudyModal` and `InspectionExperience` keep
 * separate copies of it and share this.
 *
 * `open` is owned by the caller, passed in and set back through `setOpen`,
 * because the caller's open and close are already choreography and this hook
 * has no business being the one to schedule them.
 */
export function useStudyUrl(
  slug: string,
  open: boolean,
  setOpen: (open: boolean) => void,
  /** `false` for a card that is a copy of another card — see `StudyCardMode`.
   *  It has no modal to open, so it has no business reading the URL or
   *  writing one. */
  enabled = true,
) {
  /**
   * Reading the URL: on arrival, and on every Back or Forward afterwards.
   *
   * The arrival is deferred by a task rather than a frame. `CanvasCard` learned
   * this the hard way (see its own note at the `?canvas` reader): browsers
   * suspend requestAnimationFrame in a background tab, and opening a link in a
   * background tab is the normal way people open links — so a shared link
   * would sit on the homepage and never open anything. Timers still run.
   */
  useEffect(() => {
    if (!enabled) return;
    const href = studyHref(slug);

    const t = window.setTimeout(() => {
      const legacy =
        new URLSearchParams(window.location.search).get("study") === slug;

      if (legacy) {
        // Normalise the old share format before opening. Left in place, the
        // close below would walk Back onto `/?study=<slug>` — which this very
        // effect reads on the way past and reopens the modal from.
        window.history.replaceState(null, "", "/");
        setOpen(true);
        return;
      }

      if (window.location.pathname === href) setOpen(true);
    }, 0);

    const onPop = () => setOpen(window.location.pathname === href);
    window.addEventListener("popstate", onPop);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("popstate", onPop);
    };
  }, [slug, setOpen, enabled]);

  /**
   * Writing the URL.
   *
   * `pushed` records whether this modal is the thing that put the study on the
   * history stack, because that decides how it should come off. Opened from
   * the homepage, closing is a genuine Back — one entry in, one entry out, and
   * the stack ends where it started. Opened any other way there is nothing of
   * ours to pop, so the URL is replaced instead and no history is invented.
   */
  const pushed = useRef(false);
  const synced = useRef(false);

  useEffect(() => {
    // The first run is skipped, and that is not defensive coding — it is the
    // same bug `CanvasCard` documents at its own sync effect. On mount `open`
    // is false while the address bar may already name a study; without this
    // guard the effect saw them disagree, decided the URL was wrong, and
    // rewrote it before the reader above could act on it.
    if (!enabled) return;

    if (!synced.current) {
      synced.current = true;
      return;
    }

    const href = studyHref(slug);
    const here = window.location.pathname === href;

    if (open) {
      if (here) return;
      window.history.pushState(null, "", href);
      pushed.current = true;
      return;
    }

    // Already gone — a Back closed this, and popstate moved the URL before the
    // state caught up. Nothing to undo.
    if (!here) {
      pushed.current = false;
      return;
    }

    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/");
    }
  }, [open, slug, enabled]);
}
