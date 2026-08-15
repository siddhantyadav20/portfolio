"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import CtaPill from "@/components/primitives/CtaPill";
import CanvasWorld from "@/components/canvas/CanvasWorld";
import CanvasSurface, {
  CANVAS_MORPH,
} from "@/components/canvas/CanvasSurface";
import { HOME } from "@/content/canvas";
import { canvas } from "@/content/site";
import { canMorph, morph } from "@/lib/viewTransition";
import styles from "./CanvasCard.module.css";

/* ===========================================================================
   The Canvas card.

   It shows the *actual board*, at a sixth scale, rather than a screenshot of
   one. That is the whole reason CanvasWorld is a shared component: the card
   and the canvas render the same arrangement, both carry `canvas-frame`,
   and clicking interpolates one into the other. What you see is a camera
   pulling back into a room you were already looking into, rather than a
   crossfade between two pictures.

   The preview is stills, not live widgets — see CanvasWorld's `preview`. A
   322px card has no business booting a terminal.

   The CTA stays a real <a href="/canvas"> and the click is intercepted, so
   with JavaScript off, opened in a new tab, or crawled, the route still works.
   =========================================================================== */

/** How much of the board the card shows.
 *
 *  0.13 puts about 2500x1900 of the world across a 322x246 card — wide enough
 *  that the card is full rather than half desk, and still coarse enough that
 *  the clusters read as an arrangement rather than as confetti. */
const PREVIEW_SCALE = 0.13;

/** How far the board drifts under the pointer, in card px. Small: this is a
 *  card saying "there is more of me", not a parallax showpiece. */
const DRIFT = 14;

/** The card's own size, from its stylesheet. Needed here because the resting
 *  transform has to be correct in the server's HTML — before hydration, with
 *  JavaScript off, and under reduced motion, none of which run the drift. */
const CARD_W = 322;
const CARD_H = 246;

/** Where the board sits when nothing is nudging it: HOME centred in the card,
 *  which is exactly where the canvas opens. The morph then has nothing to
 *  reconcile between the two. */
const REST = {
  x: CARD_W / 2 - HOME.x * PREVIEW_SCALE,
  y: CARD_H / 2 - HOME.y * PREVIEW_SCALE,
};

export default function CanvasCard() {
  const [open, setOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  /* --- Ambient drift -------------------------------------------------------
     The board breathes on its own and leans toward the pointer. Written
     straight to a transform outside React, like ProximityField — this runs on
     the homepage and must not cost a render. */
  useEffect(() => {
    const shell = viewportRef.current;
    const world = worldRef.current;
    if (!shell || !world) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    // Measured rather than assumed, because the card goes fluid under 1000px.
    const r0 = shell.getBoundingClientRect();
    const baseX = r0.width / 2 - HOME.x * PREVIEW_SCALE;
    const baseY = r0.height / 2 - HOME.y * PREVIEW_SCALE;

    let x = baseX;
    let y = baseY;
    let t = 0;

    function tick() {
      t += 0.004;
      // A slow figure-of-eight under the pointer's lean, so the board is never
      // quite still even when nobody is near it.
      const ax = reduced ? 0 : Math.sin(t) * 6;
      const ay = reduced ? 0 : Math.sin(t * 1.6) * 4;
      x += (baseX + targetX + ax - x) * 0.06;
      y += (baseY + targetY + ay - y) * 0.06;
      world!.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${PREVIEW_SCALE})`;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    function onMove(e: PointerEvent) {
      const r = shell!.getBoundingClientRect();
      targetX = -((e.clientX - r.left) / r.width - 0.5) * DRIFT * 2;
      targetY = -((e.clientY - r.top) / r.height - 0.5) * DRIFT * 2;
    }
    function onLeave() {
      targetX = 0;
      targetY = 0;
    }

    shell.addEventListener("pointermove", onMove);
    shell.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      shell.removeEventListener("pointermove", onMove);
      shell.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  /* --- Open and close ------------------------------------------------------ */

  const openCanvas = useCallback(() => {
    const update = () => setOpen(true);
    if (!canMorph()) {
      update();
      return;
    }
    morph(update);
  }, []);

  const close = useCallback(() => {
    if (!canMorph()) {
      setOpen(false);
      return;
    }
    morph(() => setOpen(false));
  }, []);

  /**
   * Arriving on a shared link, and Back closing the canvas.
   *
   * Deferred by a task rather than set during the effect: hydration has to
   * finish before the canvas mounts over the page, and a synchronous set here
   * is a cascading render React 19 rightly refuses.
   *
   * A timer rather than a frame, which is what this was first. Browsers
   * suspend requestAnimationFrame in a background tab, so a shared link opened
   * into one — the normal way people open links — would sit on the homepage
   * and never show the canvas at all. Timers still run.
   */
  useEffect(() => {
    const wanted = () =>
      new URLSearchParams(window.location.search).has("canvas");
    const t = wanted() ? window.setTimeout(() => setOpen(true), 0) : 0;
    const onPop = () => setOpen(wanted());
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  /**
   * Push the state into the URL, so the canvas is shareable and Back closes it.
   *
   * The first run is skipped, and that is not defensive coding — it is a bug
   * this had. On mount `open` is false while the address bar may already say
   * `?canvas`; without the guard this effect saw them disagree, decided the
   * URL was wrong, and stripped the parameter before the deep-link timer above
   * could read it. A shared link opened the homepage and nothing else.
   */
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      return;
    }
    const url = new URL(window.location.href);
    const has = url.searchParams.has("canvas");
    if (open === has) return;
    if (open) url.searchParams.set("canvas", "");
    else url.searchParams.delete("canvas");
    window.history.pushState(null, "", url);
  }, [open]);

  return (
    <>
      <CardShell
        radius={24}
        surface="solid"
        className={styles.card}
        // Released the moment the canvas owns it: two live elements sharing a
        // view-transition name abort the transition.
        style={open ? undefined : { viewTransitionName: CANVAS_MORPH }}
      >
        <div ref={viewportRef} className={styles.viewport} aria-hidden="true">
          <CanvasWorld
            ref={worldRef}
            preview
            className={styles.world}
            style={{
              transform: `translate3d(${REST.x}px, ${REST.y}px, 0) scale(${PREVIEW_SCALE})`,
            }}
          />
        </div>

        <CtaPill
          as="a"
          href={canvas.href}
          className={styles.cta}
          icon={
            <span
              className="inkIcon"
              style={{
                ["--icon" as string]: "url(/icons/mouse-square.svg)",
                width: 20,
                height: 20,
              }}
            />
          }
          onClick={(e: React.MouseEvent) => {
            // Let modified clicks do what they always do — new tab, new window.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            openCanvas();
          }}
        >
          {canvas.cta}
        </CtaPill>
      </CardShell>

      {open && <CanvasSurface onClose={close} />}
    </>
  );
}

/** Where the preview is centred. Exported so the card and the canvas agree. */
export { HOME, PREVIEW_SCALE };
