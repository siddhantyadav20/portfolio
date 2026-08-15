"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMounted } from "@/lib/clientValue";
import CanvasWorld from "@/components/canvas/CanvasWorld";
import ThemeToggle from "@/components/home/ThemeToggle";
import { createCamera } from "@/lib/camera";
import { frameDelta } from "@/lib/spring";
import { HOME, WORLD_H, WORLD_W } from "@/content/canvas";
import styles from "./CanvasSurface.module.css";

/** Background grid pitch, world px. */
const GRID = 80;

/** One notch of the keyboard / button zoom. */
const ZOOM_STEP = 1.25;

/**
 * ⌘/Ctrl + wheel deltas are in the same units as scroll deltas, so they need
 * converting to a scale factor. The exponential keeps a pinch symmetric —
 * zooming in by some amount and back out by the same amount returns exactly
 * where you started, which a linear factor does not.
 */
const ZOOM_SENSITIVITY = 0.0022;

/**
 * The name the Canvas card and this canvas share while morphing.
 *
 * Set inline by both, never in a module: CSS Modules scope
 * `view-transition-name` exactly as they scope a class, so written in a
 * stylesheet it reaches the browser mangled and every `::view-transition-*`
 * rule silently fails to match. globals.css documents the same trap for the
 * modal names.
 */
export const CANVAS_MORPH = "canvas-frame";

type Props = {
  /** Provided when the canvas is an overlay over the homepage. Omitted on the
   *  standalone /canvas route, where closing is a navigation instead. */
  onClose?: () => void;
};

/**
 * The canvas — pan, zoom, momentum. Nothing else yet.
 *
 * Deliberately still a skeleton: placeholder tiles rather than widgets, and no
 * card morph. The feel is decided here, and it is much easier to judge
 * momentum and rubber-banding against plain rectangles than against artwork.
 *
 * ---------------------------------------------------------------------------
 * Why the transform is written in two places.
 *
 * `render()` is called both from the rAF loop *and* directly out of the
 * pointermove handler. That is on purpose. Deferring a drag to the next frame
 * adds a frame of latency between the finger and the content, and that latency
 * is precisely what "smoothed" drags feel like. Anything the hand is doing
 * gets written in the same tick as the event; anything the spring is doing
 * gets written by the loop.
 *
 * The loop therefore only runs while the camera is actually integrating —
 * glide and fly — and stops itself the moment it isn't.
 */
export default function CanvasSurface({ onClose }: Props) {
  const mounted = useMounted();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /**
   * Closing means two different things depending on how you got here.
   *
   * Opened from the card, the canvas is an overlay and the homepage is still
   * mounted behind it — `onClose` collapses it back into the card it grew out
   * of. Arrived at /canvas directly, there is nothing behind it, so closing
   * is a navigation. Same button, same glyph, same position either way.
   */
  const close = useCallback(() => {
    if (onClose) onClose();
    else router.push("/");
  }, [onClose, router]);

  /**
   * Escape, on its own effect.
   *
   * It is the one key whose handler depends on React state — `close` changes
   * identity whenever `onClose` does — and the camera's effect must stay on an
   * empty dependency list, because re-running it would tear down and rebuild
   * the camera mid-gesture. Two listeners is the cheap, correct answer; the
   * alternative (a ref written during render) is what React 19 now flags.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Widgets with a text field of their own get Escape first — the terminal
      // is a real prompt, and closing the whole canvas because someone
      // abandoned a half-typed command would be its own small betrayal. Blur
      // instead, and a second Escape closes as usual.
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        active.blur();
        return;
      }
      e.preventDefault();
      close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const surface = surfaceRef.current;
    const world = worldRef.current;
    if (!surface || !world) return;

    const camera = createCamera(WORLD_W, WORLD_H);
    // The camera owns what reduced motion means — indirect moves land at once
    // and flicks don't throw — so nothing below has to branch on it.
    camera.setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );

    /* The rAF handle is the *only* record of whether the loop is running.
       There used to be a `running` boolean alongside it, and the two could
       drift apart: anything that cancelled the pending frame without clearing
       the flag — a cleanup, a thrown step — left `running` stuck true, and
       every later `start()` returned early. The loop then looked alive and was
       dead, which is why wheel panning still worked (it renders inline) while
       keyboard zoom silently did nothing (it needs the loop).

       0 means "no frame pending", and `tick` clears it before doing anything
       else, so the flag cannot outlive the frame it describes. */
    let frame = 0;
    let lastTime = 0;

    function render() {
      const { x, y, scale } = camera.state;
      world!.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      // The grid lives on `.surface::before` and is a mask, not a background —
      // see the module. A pseudo-element can't be written to directly, so the
      // camera sets custom properties on the host and the mask reads them.
      surface!.style.setProperty("--grid-pitch", `${GRID * scale}px`);
      surface!.style.setProperty("--grid-x", `${x}px`);
      surface!.style.setProperty("--grid-y", `${y}px`);
    }

    function tick(now: number) {
      frame = 0;
      const dt = frameDelta(now, lastTime);
      lastTime = now;
      const moving = camera.step(dt);
      render();
      if (moving) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    }

    function start() {
      if (frame) return;
      lastTime = 0;
      frame = requestAnimationFrame(tick);
    }

    /* --- Sizing ------------------------------------------------------------ */

    function measure() {
      camera.setViewport(surface!.clientWidth, surface!.clientHeight);
      render();
    }

    measure();
    // Framed on the contact card and what surrounds it, not on the board's
    // geometric centre — arriving in empty space is how a canvas loses people.
    camera.jumpTo(HOME.x, HOME.y, 1);
    render();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(surface);

    /* --- Pointer ----------------------------------------------------------- */

    let dragging = false;

    function onPointerDown(e: PointerEvent) {
      // Left button only, and never on something that wants the click itself.
      //
      // The second test is not optional decoration. Starting a drag calls
      // setPointerCapture on the surface, which redirects the rest of that
      // pointer's events away from whatever was actually clicked — so a button
      // that falls through to here never receives its click at all. That is
      // what broke the theme toggle and the close cross: they sit in the
      // canvas's own chrome and carried no marker, so every click on them was
      // silently eaten by a one-pixel pan.
      //
      // Native controls are matched by tag as well as by the explicit marker,
      // so the next widget with a button in it cannot reintroduce this.
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "[data-canvas-interactive], button, a, input, textarea, select, [role='button']",
        )
      ) {
        return;
      }

      dragging = true;
      surface!.setPointerCapture(e.pointerId);
      camera.beginDrag(e.clientX, e.clientY);
      render();
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      camera.drag(e.clientX, e.clientY);
      render(); // same tick as the event — see the note above
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      if (surface!.hasPointerCapture(e.pointerId)) {
        surface!.releasePointerCapture(e.pointerId);
      }
      camera.endDrag();
      start();
    }

    /* --- Wheel ------------------------------------------------------------- */

    function onWheel(e: WheelEvent) {
      e.preventDefault();

      // ⌘/Ctrl + wheel is what a trackpad pinch arrives as, on every platform.
      if (e.ctrlKey || e.metaKey) {
        camera.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * ZOOM_SENSITIVITY));
        render();
        return;
      }

      camera.panBy(e.deltaX, e.deltaY);
      render();
    }

    /* --- Keyboard ---------------------------------------------------------- */

    function editable() {
      const a = document.activeElement;
      return (
        a instanceof HTMLElement &&
        (a.tagName === "INPUT" ||
          a.tagName === "TEXTAREA" ||
          a.isContentEditable)
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (editable() || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          camera.zoomBy(ZOOM_STEP);
          break;
        case "-":
        case "_":
          e.preventDefault();
          camera.zoomBy(1 / ZOOM_STEP);
          break;
        case "r":
        case "R":
          e.preventDefault();
          camera.flyTo(HOME.x, HOME.y, 1);
          break;
        default:
          return;
      }
      start();
    }

    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove);
    surface.addEventListener("pointerup", onPointerUp);
    surface.addEventListener("pointercancel", onPointerUp);
    // Not passive: the whole point is to stop the page scrolling underneath.
    surface.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerUp);
      surface.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  /**
   * Portalled to <body>, for the reason ModalSurface is.
   *
   * The canvas is rendered by the Canvas card, which lives several cards
   * deep inside the composition — and `position: fixed` is contained by any
   * transformed ancestor, `overflow: hidden` clips it, and its z-index only
   * competes inside that card's stacking context. Left in place it opened
   * *underneath* the homepage: the intro, the music and LinkedIn cards, the
   * search, the theme toggle and the footer all painted over the top of it.
   *
   * At <body> none of that applies and one z-index settles it.
   */
  if (!mounted) return null;

  return createPortal(
    <div
      ref={surfaceRef}
      className={styles.surface}
      // Handed over from the card, which released it as this mounted.
      style={{ viewTransitionName: CANVAS_MORPH }}
    >
      <CanvasWorld ref={worldRef} />

      {/* Fixed to the viewport, deliberately outside the transformed world:
          these must not scale with the camera, and they are the only place on
          the canvas where `.liquid` glass is allowed — nothing here is
          transformed on a per-frame basis. Same 64px discs, same 16px gap and
          same corner inset as ModalSurface's cluster, so closing the canvas
          and closing a case study look like the same gesture. */}
      <div className={styles.controls} data-canvas-interactive="">
        <ThemeToggle />

        <button
          type="button"
          className={`${styles.action} liquid`}
          onClick={close}
        >
          <span className={`${styles.bar} ${styles.barBack}`} />
          <span className={`${styles.bar} ${styles.barForward}`} />
          <span className="srOnly">Close the canvas</span>
        </button>
      </div>

      <div className={styles.hint} aria-hidden="true">
        drag to pan · ⌘ + scroll to zoom · + − · R to reset
      </div>
    </div>,
    document.body,
  );
}
