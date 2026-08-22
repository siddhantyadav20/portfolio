"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  type PaletteEntry,
  type PaletteGroup,
  type PaletteHit,
  emptyState,
  nearestWord,
  searchPalette,
} from "@/content/palette";
import { STUDY_SLUGS } from "@/content/work";
import { commandKeyLabel } from "@/lib/palette";
import { useModalShell } from "@/lib/modalShell";
import { answerFor, type Answer } from "../answers";
import { recents, remember } from "../recents";
import { AnswerPanel } from "./Answer";
import { Peek } from "./Peek";
import { Results, rowId } from "./Results";
import { run } from "../run";
import styles from "./CommandPalette.module.css";

/* ===========================================================================
   The command palette.

   Why this exists, in one line: `content/work/search.ts` is subtitled
   "Navigation first to search first, ~51m saved", and until now this site was
   navigation-first. It is the case study's own argument, applied to the
   portfolio that contains it.

   Deliberately NOT <dialog>, for the two reasons ModalSurface documents: the
   browser's top layer paints above `CanvasCursor`, which with `cursor: none`
   set globally would leave this with no visible pointer; and the top layer
   sits outside view transitions. Escape, the focus trap and the focus restore
   are `useModalShell`'s, which is where they already lived.

   Deliberately NO `view-transition-name` anywhere in here either. Naming an
   element makes it a backdrop root, and a backdrop root has nothing behind it
   to filter — the `backdrop-filter` blurring the page behind this would simply
   switch off. Same trap `ModalSurface` records beside its control cluster.

   And deliberately not `.liquid`, which the panel wore briefly. That class
   sets `position: relative`, which is right for a control and wrong for
   anything that positions itself against the viewport; it cost the tour bar an
   afternoon. The panel is an opaque `--surface-raised` sheet, the same
   material as the shortcuts sheet and the case-study reader.
   =========================================================================== */

type Props = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  /** Open straight onto an answer panel — the canvas hands `/` over this way. */
  initialAnswer?: "shortcuts";
  /**
   * Ask the host to run the tour.
   *
   * The tour outlives this component — it closes the palette and then drives
   * the page for a minute — so it cannot be owned here. The first version was,
   * and the progress bar never appeared once: `onClose` unmounts the portal,
   * which took the bar down with it on the same frame it went up.
   */
  onStartTour: () => void;
};

/** What the panel is currently showing. */
type View = { kind: "search" } | { kind: "answer"; answer: Answer };

export default function CommandPalette({
  open,
  onClose,
  initialQuery,
  initialAnswer,
  onStartTour,
}: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery ?? "");
  const [active, setActive] = useState(0);
  const [view, setView] = useState<View>({ kind: "search" });
  const [toast, setToast] = useState<string | null>(null);

  /* What this visitor last opened, read once per opening rather than per
     keystroke: it only changes when a row is run, and by then the panel is on
     its way out. */
  const [history, setHistory] = useState<PaletteEntry[]>([]);

  const hits = useMemo(
    () => (query ? searchPalette(query, currentContext()) : emptyState(history)),
    [query, history],
  );
  const suggestion = useMemo(
    () => (hits.length === 0 ? nearestWord(query) : undefined),
    [hits.length, query],
  );

  /* Grouped for display, and the group order comes from the ranking rather
     than from `GROUPS`.

     This was the subtler half of a bug worth recording. `hits` is sorted
     best-first, and the first version drew the groups in the fixed order
     `GROUPS` declares — so searching "tokens" ranked "281 Reusable Tokens"
     first and then painted it fourth, under a WORK heading that scored lower,
     because WORK is declared before EVIDENCE. All the ranking work was being
     thrown away by the layout.

     A `Map` keeps insertion order, and `hits` is walked in score order, so
     taking the keys back out is the same thing as "groups in the order their
     best result earned". `GROUPS` still governs the empty state, where nothing
     has a score and the declared order is the editorial one.

     The flat `ordered` array below stays the source of truth for the arrow
     keys, so Down is always "the next row you can see". Sorting for the eye
     and indexing for the keyboard out of two different arrays is how a palette
     ends up highlighting one row and running another. */
  const sections = useMemo(() => {
    const by = new Map<PaletteGroup, PaletteHit[]>();
    for (const hit of hits) {
      const list = by.get(hit.group) ?? [];
      list.push(hit);
      by.set(hit.group, list);
    }
    /* Each section carries where it starts in the flat list. The first version
       incremented a counter inside the JSX, which is a render-time mutation:
       correct on a first pass and undefined behaviour the moment React
       re-renders part of the tree without re-running the rest.

       The prefix sum is quadratic in the number of *groups*, of which there
       are seven, so this is a pure expression rather than an accumulator for
       no measurable cost. */
    const present = [...by.keys()];
    return present.map((g, i) => ({
      group: g,
      hits: by.get(g)!,
      offset: present
        .slice(0, i)
        .reduce((n, before) => n + by.get(before)!.length, 0),
    }));
  }, [hits]);

  /** Flat, in the order the eye reads them. */
  const ordered = useMemo(() => sections.flatMap((s) => s.hits), [sections]);

  /* Resetting on change, during render rather than in an effect.

     Both of these used to be effects and both were wrong in the same way: an
     effect runs *after* a render, so there was always one painted frame with
     the new results and the old highlight — open the palette on a stale query
     and row four was lit before it snapped to row one. Adjusting during render
     is React's documented answer for exactly this, and it never paints the
     intermediate state. */
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActive(0);
  }

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQuery(initialQuery ?? "");
      setPrevQuery(initialQuery ?? "");
      setActive(0);
      setHistory(recents());
      const opening = initialAnswer ? answerFor(initialAnswer) : null;
      setView(opening ? { kind: "answer", answer: opening } : { kind: "search" });
      setToast(null);
    }
  }

  // A toast is a status line, not a state machine. It clears itself.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  /**
   * Escape, one layer at a time.
   *
   * A palette that closes on the first Escape while you are three words into a
   * query throws away the query and the panel together. So Escape backs out of
   * whatever is deepest — a tour, then an answer panel, then a non-empty
   * query — and only closes when there is nothing left to back out of. This is
   * exactly the first-refusal hook `useModalShell.onEscape` was written for;
   * `ModalSurface` uses the same hook for a half-written comment.
   */
  const onEscape = useCallback(() => {
    if (view.kind !== "search") {
      setView({ kind: "search" });
      return true;
    }
    if (query) {
      setQuery("");
      return true;
    }
    return false;
  }, [query, view.kind]);

  useModalShell({
    active: open,
    rootRef: panelRef,
    onClose,
    initialFocusRef: inputRef,
    onEscape,
  });

  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute("data-modal-open", "");
    const page = document.getElementById("main");
    page?.setAttribute("inert", "");
    const raf = requestAnimationFrame(() =>
      panelRef.current?.setAttribute("data-enter", ""),
    );
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.removeAttribute("data-modal-open");
      page?.removeAttribute("inert");
    };
  }, [open]);

  // Keep the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = useCallback(
    async (entry: PaletteEntry) => {
      remember(entry);

      if (entry.to.kind === "answer") {
        if (entry.to.answer === "tour") {
          onStartTour();
          return;
        }

        const answer = answerFor(entry.to.answer);
        if (answer) setView({ kind: "answer", answer });
        return;
      }

      const result = await run(entry.to, (href) => router.push(href));
      if (result.toast) setToast(result.toast);
      if (!result.keepOpen) onClose();
    },
    [onClose, onStartTour, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (view.kind !== "search") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(ordered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(ordered.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = ordered[active];
      if (hit) void go(hit.entry);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const activeId = ordered[active] ? rowId(ordered[active].entry) : undefined;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Search this site"
      >
        <div className={styles.field}>
          <span className={`inkIcon ${styles.glyph}`} aria-hidden="true" />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What do you want to know?"
            aria-label="Search this site"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={activeId}
            autoComplete="off"
            spellCheck={false}
          />
          {/* A real button, not a hint.

              It read `esc` and did nothing, which is correct on a desktop and
              a dead end on a phone: the sheet is full-screen there, so there
              is no backdrop left to tap and no Escape key to press. The panel
              could be opened and not closed. It still says `esc` where that
              key exists and becomes a close control where it does not. */}
          <button
            type="button"
            className={styles.esc}
            onClick={onClose}
            aria-label="Close"
          >
            <span className={styles.escKey}>esc</span>
            <span className={styles.escGlyph} aria-hidden="true">
              ✕
            </span>
          </button>
        </div>

        {view.kind === "answer" ? (
          <AnswerPanel answer={view.answer} onPick={go} />
        ) : (
          /* Results and peek are siblings in one grid rather than the peek
             being a child of the list, so the list scrolls and the peek does
             not move with it. Below the breakpoint the second column is simply
             not drawn — see the stylesheet. */
          <div className={styles.body}>
            <Results
              ref={listRef}
              sections={sections}
              ordered={ordered}
              active={active}
              query={query}
              suggestion={suggestion}
              onHover={setActive}
              onPick={go}
              onSuggest={setQuery}
            />
            <Peek preview={ordered[active]?.entry.preview} />
          </div>
        )}

        <div className={styles.foot}>
          {/* A status line rather than a floating toast: it is already the
              lowest thing on the panel, and a copied-email confirmation that
              flies in over the results covers the results. */}
          <span aria-live="polite" className={styles.toast}>
            {toast}
          </span>
          <span className={styles.hints}>
            <kbd>↑↓</kbd> move <kbd>↵</kbd> open{" "}
            <kbd>{commandKeyLabel()}K</kbd> toggle
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Which study, if any, the reader currently has open.
 *
 * Read from the path rather than passed in, because both surfaces put it
 * there: `/work/<slug>` is the route, and the homepage modal pushes the same
 * path while it is open. One check covers both.
 */
function currentContext() {
  if (typeof window === "undefined") return {};
  const slug = window.location.pathname.replace(/^\/work\//, "");
  return STUDY_SLUGS.includes(slug) ? { study: slug } : {};
}
