"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { PALETTE_OPEN, type PaletteIntent } from "@/lib/palette";
import { playTour, STEPS, type TourStep } from "./tour";
import styles from "./PaletteHost.module.css";

/* ===========================================================================
   What ships eagerly.

   This file and `lib/palette.ts` are the only palette code in the homepage's
   initial graph, and that is the point. `scripts/check-budget.mjs` caps the
   homepage at 600KB of JavaScript and it currently sits around 538KB, so a
   palette that arrived with the page would be spending a fifth of the
   remaining headroom on a panel most visitors never open. The rest is fetched
   on the first ⌘K, the same way `CaseStudyModal/lazy.ts` and `CanvasCard`
   fetch what they need.

   The module is cached outside the component so a second open is instant and
   does not re-enter the import machinery.
   =========================================================================== */

type PaletteProps = {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialAnswer?: "shortcuts";
  onStartTour: () => void;
};

let cached: ComponentType<PaletteProps> | null = null;

/* ⌘K is the only key this claims, and that is a decision rather than an
   omission.

   The obvious second door is a bare `/`, which is what a lot of sites use. It
   is already taken: the canvas binds `/` and `?` to its shortcuts sheet, and
   both are printed inside that sheet as the way to reach it. Claiming `/` here
   too meant that on `/canvas` one keystroke opened the sheet *and* the palette,
   one over the other.

   ⌘K does not have that problem — the canvas keymap explicitly bails on
   `metaKey`/`ctrlKey` before it reads anything — and unlike `/` it is also
   never a character somebody was trying to type. The visible field in the
   Introduction card is the second door, and it is a better one, because it is
   the only one a recruiter on a phone can use. */

export default function PaletteHost() {
  const [Palette, setPalette] = useState<ComponentType<PaletteProps> | null>(
    cached,
  );
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<PaletteIntent>({});
  const [tour, setTour] = useState<{ index: number; step: TourStep } | null>(
    null,
  );
  const stopTour = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    if (cached) return cached;
    const mod = await import("./CommandPalette");
    cached = mod.default;
    setPalette(() => cached);
    return cached;
  }, []);

  const show = useCallback(
    async (next: PaletteIntent) => {
      // Stop a running tour before putting a panel over it — otherwise the
      // page keeps scrolling underneath the thing you just opened.
      stopTour.current?.();
      setIntent(next);
      await load();
      setOpen(true);
    },
    [load],
  );

  /* The hotkey, and the site's own request event. Registered once, for the
     life of the page, and holding no palette code — see the header. */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const combo = (e.metaKey || e.ctrlKey) && !e.altKey;

      if (combo && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (open) setOpen(false);
        else void show({});
        return;
      }

    }

    function onRequest(e: Event) {
      const detail = (e as CustomEvent<PaletteIntent>).detail ?? {};
      void show(detail);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_OPEN, onRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_OPEN, onRequest);
    };
  }, [open, show]);

  /**
   * Warm the chunk on the first sign somebody has a keyboard.
   *
   * A palette that takes a network round trip to appear the first time reads
   * as broken, and the first time is the only impression that matters. Any
   * modifier press is enough of a hint, costs one idle fetch, and never fires
   * on a phone.
   */
  useEffect(() => {
    if (cached) return;

    const warm = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      // Removed on the first *modifier*, not the first keypress. The first
      // version passed `{ once: true }`, which took the listener off again on
      // whatever key happened to come first — so anyone who typed a letter
      // before reaching for ⌘K got no warm-up at all, which is most people.
      window.removeEventListener("keydown", warm);
      void load();
    };

    window.addEventListener("keydown", warm);
    return () => window.removeEventListener("keydown", warm);
  }, [load]);

  useEffect(() => () => stopTour.current?.(), []);

  const startTour = useCallback(() => {
    setOpen(false);

    /* Deferred by a task rather than a frame, so the panel is gone before the
       page starts moving — a tour that begins underneath its own overlay shows
       nothing.
    
       `setTimeout` and not `requestAnimationFrame`, which is the bug this
       replaced: browsers suspend rAF in a backgrounded tab, so starting the
       tour and glancing at another window left it never started at all — the
       palette had closed and nothing followed. `useStudyUrl` documents the
       same trap at its own arrival read, for the same reason, and reaches for
       the same fix: timers still run. */
    window.setTimeout(() => {
      stopTour.current = playTour(
        (index, step) => setTour({ index, step }),
        () => {
          stopTour.current = null;
          setTour(null);
        },
      );
    }, 0);
  }, []);

  return (
    <>
      {Palette && (
        <Palette
          open={open}
          onClose={() => setOpen(false)}
          initialQuery={intent.query}
          initialAnswer={intent.answer}
          onStartTour={startTour}
        />
      )}
      {tour && <TourBar index={tour.index} step={tour.step} />}
    </>
  );
}

/**
 * The caption under a running tour.
 *
 * Lives here rather than in the palette because it outlives it: the panel
 * closes on the way in, and a bar owned by a component that has unmounted is a
 * bar nobody sees.
 *
 * Not `.liquid`, and that is load-bearing rather than a style preference:
 * `.liquid` sets `position: relative` (globals.css, under "Liquid glass"), and
 * at equal specificity it won over this element's own `position: fixed`. The
 * bar rendered correctly, announced correctly, and sat 1645px down a page 830px
 * tall — present in the DOM, past the bottom of the screen, invisible. Anything
 * positioned against the viewport has to keep away from that class. The surface
 * here is opaque anyway, exactly like the shortcuts sheet, so the glass was
 * decoration over an already-solid background.
 */
function TourBar({ index, step }: { index: number; step: TourStep }) {
  return (
    <div className={styles.tour} role="status" aria-live="polite">
      <div className={styles.bar} aria-hidden="true">
        <span
          className={styles.fill}
          style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <p className={styles.caption}>{step.caption}</p>
      <p className={styles.hint}>Press any key to stop</p>
    </div>
  );
}
