"use client";

import type { PaletteDestination } from "@/content/palette";
import { intro, linkedin } from "@/content/site";
import { copyToClipboard } from "@/lib/clipboard";
import { canvasJump } from "@/lib/palette";
import { readTheme, writeTheme } from "@/lib/theme";
import { studyHref } from "@/content/work";

/* ===========================================================================
   Turning a destination into something that happens.

   `content/palette.ts` describes where a row goes and refuses to know how to
   get there — it is imported by a client island that must not drag the canvas
   or the router into the homepage bundle. This is the other half.

   The interesting decision in here is how a study opens.
   =========================================================================== */

/** What `run` reports back, so the palette knows whether to close. */
export type RunResult = {
  /** A line to show in place of closing — "Copied", and its failures. */
  readonly toast?: string;
  /** Leave the palette open. Default is to close. */
  readonly keepOpen?: boolean;
};

const ON_HOMEPAGE = () => window.location.pathname === "/";

/**
 * Long enough for the palette to unmount and hand focus back.
 *
 * React runs a passive effect's cleanup in a scheduled task rather than
 * synchronously, so "the next tick" is not reliably after it. See the canvas
 * case below for why the ordering matters.
 */
const AFTER_FOCUS_RESTORE = 120;

/**
 * Open a case study the way the homepage does.
 *
 * `useStudyUrl` already listens for `popstate` and opens whenever the path
 * becomes that study's — that is how Back and Forward work on the modal, and
 * how a shared link opens one. So the palette does not need to reach into any
 * card's state or grow an event of its own: it pushes the URL the card is
 * already watching for and lets the card do what it does. The morph runs, the
 * scroll position is kept, and no card had to learn that a palette exists.
 *
 * Off the homepage there is no card to morph, so this is an ordinary
 * navigation to a real prerendered route.
 */
function openStudy(slug: string, section: string | undefined, push: (href: string) => void) {
  const href = studyHref(slug);

  if (!ON_HOMEPAGE()) {
    push(section ? `${href}#${section}` : href);
    return;
  }

  deepLink(href);
  if (section) scrollToId(section);
}

/**
 * Change the URL the way the homepage's own surfaces listen for.
 *
 * `useStudyUrl` and `CanvasCard` both open themselves when a `popstate` says
 * the address now names them — that is how Back, Forward and a shared link all
 * work today. Pushing the URL and announcing it is therefore the whole
 * integration: the palette never touches a card's state, and no card had to
 * learn that a palette exists.
 *
 * `router.push` is deliberately not used for this. A client-side navigation
 * inside the same route updates the address bar without firing `popstate` and
 * without remounting anything, so the URL said `?canvas` and the board stayed
 * shut — the one place where being a good Next citizen produces a dead link.
 */
function deepLink(href: string) {
  window.history.pushState(null, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Wait for something to exist, then scroll to it.
 *
 * Everything this scrolls to arrives late by design — a study section is
 * inside a modal that is still morphing, and a card may be on a page that is
 * still being routed to. Polling a few frames is not elegant and it is honest
 * about the situation: there is no event that means "the thing you asked for
 * is on screen now", and inventing one in three components to serve this would
 * be worse than looking.
 *
 * Gives up after about a second rather than looping forever, so a stale
 * destination fails quietly instead of pinning a frame loop.
 */
function waitFor(find: () => Element | null, then: (el: Element) => void) {
  const started = performance.now();

  // Polled on a timer rather than `requestAnimationFrame`. Frames stop in a
  // backgrounded tab and timers do not, and "open a link in a background tab"
  // is how people open links — the same reasoning `useStudyUrl` records at its
  // own deferred read.
  const look = () => {
    const el = find();
    if (el) return then(el);
    if (performance.now() - started > 1000) return;
    window.setTimeout(look, 32);
  };

  window.setTimeout(look, 0);
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToId(id: string) {
  waitFor(
    () => document.getElementById(id),
    (el) =>
      el.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "start",
      }),
  );
}

/** Scroll to a card on the homepage, and let it play. */
export function scrollToCard(card: string) {
  waitFor(
    () => document.querySelector(`[data-card="${card}"]`),
    (el) =>
      el.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        // Centred rather than top-aligned: these are cards in a bento grid,
        // not sections of a document, and one pinned to the top edge with its
        // neighbours cropped away reads as a broken layout.
        block: "center",
      }),
  );
}

export async function run(
  to: PaletteDestination,
  push: (href: string) => void,
): Promise<RunResult> {
  switch (to.kind) {
    case "study":
      openStudy(to.slug, to.section, push);
      return {};

    case "route":
      push(to.href);
      return {};

    case "external":
      window.open(to.href, "_blank", "noopener,noreferrer");
      return {};

    case "card":
      if (!ON_HOMEPAGE()) push("/");
      scrollToCard(to.card);
      return {};

    case "canvas":
      /* If the board is already on screen this is a camera move and nothing
         else — no navigation, no reload, the palette just closes and the world
         flies. If it is not, `canvasJump` holds the destination and the board
         collects it when it mounts.

         `?canvas` is the homepage card's own deep link: `CanvasCard` reads it
         on arrival and morphs the overlay open, so opening the board from here
         looks exactly like opening it from the card.

         The delay is the interesting part, and it is not a guess at a race.
         The board's camera deliberately follows focus — `CanvasSurface` binds
         `focusin` so that tabbing through the widgets flies you to each one,
         which is a lovely piece of navigation. Closing the palette *also*
         moves focus: `useModalShell` hands it back to whatever opened the
         panel, on purpose, so keyboard users are returned where they started.
         Fly first and that restore lands a fraction later and flies the camera
         straight back — the board would drift toward the last thing you had
         focused instead of the thing you searched for, which is precisely what
         it did. So the camera moves once the palette has finished leaving. */
      window.setTimeout(() => {
        if (!canvasJump({ widget: to.widget, cluster: to.cluster })) {
          if (ON_HOMEPAGE()) deepLink("/?canvas");
          else push("/canvas");
        }
      }, AFTER_FOCUS_RESTORE);
      return {};

    case "answer":
      // Composed inside the palette — see `answers.ts`. Nothing navigates.
      return { keepOpen: true };

    case "action":
      return runAction(to.action);
  }
}

async function runAction(action: string): Promise<RunResult> {
  switch (action) {
    case "copy-email":
      // `copyToClipboard` tries twice and then admits it failed — a button
      // that silently does nothing is the failure this site already fixed
      // once, in `Introduction`.
      return (await copyToClipboard(intro.email))
        ? { toast: "Email copied", keepOpen: true }
        : { toast: intro.email, keepOpen: true };

    case "copy-link":
      return (await copyToClipboard(window.location.href))
        ? { toast: "Link copied", keepOpen: true }
        : { toast: "Couldn’t copy that link", keepOpen: true };

    case "resume":
      // `null` while there is no PDF in `public/`, per the MaybeHref
      // convention — say so rather than opening a 404.
      if (!intro.resumeHref) return { toast: "No résumé yet", keepOpen: true };
      window.open(intro.resumeHref, "_blank", "noopener,noreferrer");
      return {};

    case "linkedin":
      window.open(linkedin.href, "_blank", "noopener,noreferrer");
      return {};

    case "theme":
      writeTheme(readTheme() === "dark" ? "light" : "dark");
      return { keepOpen: true };

    default:
      return { keepOpen: true };
  }
}

/* ===========================================================================
   What Enter is about to do.

   The footer used to read "↑↓ move  ↵ open  ⌘K toggle" no matter which row was
   lit, and "open" is a lie on four of the eight destination kinds — Enter on
   "Copy email" copies, Enter on the canvas flies, Enter on a question composes
   a panel without leaving the box. A hint that is wrong half the time trains
   people to stop reading it.

   So the verb is read off the highlighted row. It lives here rather than in
   the panel because this is the file that knows what each destination does;
   `run` above and `verbFor` below have to be changed in the same edit or the
   label drifts from the behaviour, and being adjacent is what makes that
   obvious.
   =========================================================================== */

export function verbFor(to: PaletteDestination): string {
  switch (to.kind) {
    case "study":
      // A section is a different promise from a study: one opens the reader at
      // the top, the other lands you on a specific heading inside it.
      return to.section ? "Jump to section" : "Open study";
    case "route":
      return "Open page";
    case "external":
      return "Open in new tab";
    case "card":
      return "Show on the page";
    case "canvas":
      return "Fly there";
    case "answer":
      return "Show me";
    case "action":
      switch (to.action) {
        case "copy-email":
          return "Copy email";
        case "copy-link":
          return "Copy this link";
        case "theme":
          return "Switch theme";
        case "resume":
          return "Open résumé";
        case "linkedin":
          return "Open LinkedIn";
      }
  }
}

/**
 * The URL behind a row, where there is one.
 *
 * Only the three destinations that are genuinely a page: ⌘↵ and ⌘-click are
 * "open this somewhere else", and there is no somewhere else for a camera
 * move, a clipboard write or a panel composed inside this one. Those keep
 * their ordinary behaviour under the modifier rather than doing nothing, which
 * is the failure mode of a palette that checks for a modifier and forgets the
 * rows that cannot honour it.
 *
 * A study answers with its real prerendered route even when the homepage would
 * have opened it as a modal — a new tab has no card to morph out of.
 */
export function hrefFor(to: PaletteDestination): string | null {
  switch (to.kind) {
    case "study": {
      const href = studyHref(to.slug);
      return to.section ? `${href}#${to.section}` : href;
    }
    case "route":
      return to.href;
    case "external":
      return to.href;
    default:
      return null;
  }
}
