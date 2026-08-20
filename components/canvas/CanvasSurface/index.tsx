"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMounted } from "@/lib/clientValue";
import CanvasWorldLive from "@/components/canvas/CanvasWorld/Live";
import Confetti from "@/components/canvas/chrome/Confetti";
import Dock from "@/components/canvas/chrome/Dock";
import Minimap from "@/components/canvas/chrome/Minimap";
import Oneko from "@/components/canvas/chrome/Oneko";
import Shortcuts from "@/components/canvas/chrome/Shortcuts";
import ThemeToggle from "@/components/home/ThemeToggle";
import { createCamera } from "@/lib/camera";
import { frameDelta } from "@/lib/spring";
import {
  CANVAS_MORPH,
  clusterBounds,
  HOME,
  WORLD_H,
  WORLD_W,
  type Cluster,
} from "@/content/canvas";
import type { CameraState } from "@/lib/camera";
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

/** Re-exported for the canvas's own callers; defined in content/canvas.ts so
 *  the homepage card can name the morph without importing this module. */
export { CANVAS_MORPH };

type Props = {
  /** Provided when the canvas is an overlay over the homepage. Omitted on the
   *  standalone /canvas route, where closing is a navigation instead. */
  onClose?: () => void;
};

/**
 * The canvas — pan, zoom, momentum, and the board itself.
 *
 * It began as a skeleton of placeholder tiles, because momentum and
 * rubber-banding are far easier to judge against plain rectangles than against
 * artwork. The widgets and the card morph have both landed since.
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

  /* Chrome state. The camera itself stays outside React — these are only what
     the chrome needs to draw, published once a frame by the loop below. */
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [view, setView] = useState<{ cam: CameraState; w: number; h: number }>({
    cam: { x: 0, y: 0, scale: 1 },
    w: 1,
    h: 1,
  });

  /* The chrome talks to the camera through these, filled in by the effect that
     owns it. Refs rather than state: the camera must not be a dependency of
     anything, or it gets rebuilt mid-gesture. */
  const flyToCluster = useRef<(c: Cluster) => void>(() => {});
  const flyToPoint = useRef<(x: number, y: number) => void>(() => {});
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
    //
    // Read *and* subscribed. This effect deliberately never re-runs (rebuilding
    // the camera mid-gesture would be worse than the bug), so a one-time read
    // meant someone who turned the preference on while the canvas was open
    // kept the full momentum until they reloaded. Every widget on the board
    // already tracks the change reactively; the camera was the exception.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedMotion = () =>
      camera.setReducedMotion(reducedMotion.matches);
    onReducedMotion();
    reducedMotion.addEventListener("change", onReducedMotion);

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
    /** Pending second leg of the Space "lift off". See the handler. */
    let liftOff = 0;

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

    /* The chrome needs the camera's state to draw the minimap, but the camera
       is deliberately outside React. Publishing it once a frame — and only
       while something is actually moving — keeps the two in step without
       putting a re-render inside the pan loop. */
    function publish() {
      const { x, y, scale } = camera.state;
      setView((prev) =>
        prev.cam.x === x && prev.cam.y === y && prev.cam.scale === scale
          ? prev
          : { cam: { x, y, scale }, w: surface!.clientWidth, h: surface!.clientHeight },
      );
    }

    function tick(now: number) {
      frame = 0;
      const dt = frameDelta(now, lastTime);
      lastTime = now;
      const moving = camera.step(dt);
      render();
      publish();
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
      // The minimap draws the viewport rectangle from the published state, and
      // a resize changes that rectangle without moving the camera. Without
      // this the rect stayed the old shape until the next pan — most visible
      // on an orientation change, where it is wrong by a whole aspect ratio.
      publish();
    }

    measure();
    // Framed on the contact card and what surrounds it, not on the board's
    // geometric centre — arriving in empty space is how a canvas loses people.
    camera.jumpTo(HOME.x, HOME.y, 1);
    render();

    publish();

    /* --- Tab flies the camera -------------------------------------------------
       The best interaction on this canvas, and it costs almost nothing.

       Focus already walks the widgets in reading order because CanvasWorld
       gives each slot a tabIndex. All this does is bring the camera along, so
       a keyboard user is never focused on something off-screen — and a sighted
       user gets a guided tour of the whole board for free by holding Tab.

       Listening for focusin on the world rather than binding per widget: the
       slots are data-driven and there are twenty-two of them.
       ------------------------------------------------------------------------- */
    function onFocusIn(e: FocusEvent) {
      const slot = (e.target as HTMLElement)?.closest<HTMLElement>("[data-widget]");
      if (!slot) return;
      const wx = parseFloat(slot.style.left) + parseFloat(slot.style.width) / 2;
      const wy = parseFloat(slot.style.top) + parseFloat(slot.style.height) / 2;
      // Only move if it is actually out of comfortable view — nudging the
      // camera for something already on screen is motion sickness, not help.
      const s = camera.state;
      const sx = wx * s.scale + s.x;
      const sy = wy * s.scale + s.y;
      const pad = 140;
      const outside =
        sx < pad ||
        sy < pad ||
        sx > surface!.clientWidth - pad ||
        sy > surface!.clientHeight - pad;
      if (!outside) return;
      camera.flyTo(wx, wy, Math.max(camera.state.scale, 0.75));
      start();
    }
    world.addEventListener("focusin", onFocusIn);

    flyToPoint.current = (wx, wy) => {
      camera.flyTo(wx, wy, camera.state.scale);
      start();
    };
    flyToCluster.current = (c) => {
      const b = clusterBounds(c);
      // Frame the whole cluster with a margin, clamped so a two-widget cluster
      // does not slam into the zoom ceiling.
      const fit = Math.min(
        surface!.clientWidth / (b.w + 420),
        surface!.clientHeight / (b.h + 420),
      );
      camera.flyTo(b.x, b.y, Math.max(0.4, Math.min(1.1, fit)));
      start();
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(surface);

    /* --- Pointer ----------------------------------------------------------- */

    let dragging = false;

    /* --- Touch ---------------------------------------------------------------
       Pointer events give us multi-touch for free as long as we track the live
       pointers ourselves. One finger pans through the same path as a mouse
       drag; two fingers pinch, and while pinching the pan is suspended so the
       gesture cannot fight itself.
       ----------------------------------------------------------------------- */
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; scale: number } | null = null;

    const spread = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const midpoint = () => {
      const [a, b] = [...touches.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

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

      if (e.pointerType === "touch") {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) {
          // A second finger ends the pan and starts a pinch, from wherever the
          // first one had got to.
          camera.endDrag();
          dragging = false;
          pinch = { dist: spread(), scale: camera.state.scale };
          return;
        }
        if (touches.size > 2) return;
      }

      dragging = true;
      surface!.setPointerCapture(e.pointerId);
      camera.beginDrag(e.clientX, e.clientY);
      render();
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType === "touch" && touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (pinch && touches.size === 2) {
        const m = midpoint();
        // Zoom about the midpoint, so the board stays under the fingers —
        // the same fixed-point rule the trackpad pinch uses.
        camera.zoomAt(m.x, m.y, (spread() / pinch.dist) * (pinch.scale / camera.state.scale));
        render();
        publish();
        return;
      }

      if (!dragging) return;
      camera.drag(e.clientX, e.clientY);
      render(); // same tick as the event — see the note above
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerType === "touch") {
        touches.delete(e.pointerId);
        if (touches.size < 2) pinch = null;
        // Lifting one of two fingers should not throw the board: re-seat the
        // drag on the finger that is still down rather than gliding.
        if (touches.size === 1) {
          const [only] = [...touches.values()];
          camera.beginDrag(only.x, only.y);
          dragging = true;
          return;
        }
      }
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
        publish();
        return;
      }

      camera.panBy(e.deltaX, e.deltaY);
      render();
      publish();
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
        case "c":
        case "C":
          e.preventDefault();
          setConfetti((n) => n + 1);
          return;
        case "/":
        case "?":
          e.preventDefault();
          setShortcuts((v) => !v);
          return;
        case " ":
          // Lift off: a hard zoom out and back, so you see the whole board and
          // land where you were. The reference's one flourish, and the only
          // thing Space could sensibly mean here.
          e.preventDefault();
          {
            const held = camera.state;
            const w = camera.toWorld(surface!.clientWidth / 2, surface!.clientHeight / 2);
            camera.flyTo(WORLD_W / 2, WORLD_H / 2, 0.35, 520);
            // Tracked so the cleanup can cancel it. Closing the canvas mid
            // lift-off used to leave this pending, and it fired against a
            // camera whose effect had already torn down.
            window.clearTimeout(liftOff);
            liftOff = window.setTimeout(() => {
              camera.flyTo(w.x, w.y, held.scale, 620);
              start();
            }, 780);
          }
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
      window.clearTimeout(liftOff);
      reducedMotion.removeEventListener("change", onReducedMotion);
      resizeObserver.disconnect();
      world.removeEventListener("focusin", onFocusIn);
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerUp);
      surface.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  /**
   * Portalled to <body> — but only as an overlay.
   *
   * Opened from the card, the canvas is rendered several cards deep inside the
   * composition, and `position: fixed` is contained by any transformed
   * ancestor while `overflow: hidden` clips it and z-index only competes
   * inside that card's stacking context. Left in place it opened *underneath*
   * the homepage: the intro, the music and LinkedIn cards, the search and the
   * footer all painted over the top of it. At <body> none of that applies.
   *
   * On /canvas there is nothing to escape, and portalling there actively hurt:
   * a portal renders nothing on the server, so the standalone route — which
   * exists precisely so a shared link, a crawler and a JS-less visitor get the
   * board — was serving an empty page. `onClose` is the tell: overlays have
   * one, the route does not.
   */
  const overlay = onClose !== undefined;
  if (overlay && !mounted) return null;

  const tree = (
    <div
      ref={surfaceRef}
      className={styles.surface}
      // Handed over from the card, which released it as this mounted.
      style={{ viewTransitionName: CANVAS_MORPH }}
    >
      <CanvasWorldLive ref={worldRef} />

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

      <Minimap
        camera={view.cam}
        viewport={{ w: view.w, h: view.h }}
        onJump={(x, y) => flyToPoint.current(x, y)}
      />

      <Dock
        active={cluster}
        onPick={(c) => {
          setCluster(c);
          flyToCluster.current(c);
        }}
      />

      <button
        type="button"
        className={styles.hint}
        onClick={() => setShortcuts(true)}
      >
        press <kbd>/</kbd> for shortcuts
      </button>

      <Shortcuts open={shortcuts} onClose={() => setShortcuts(false)} />
      <Confetti fire={confetti} />
      <Oneko />
    </div>
  );

  return overlay ? createPortal(tree, document.body) : tree;
}
