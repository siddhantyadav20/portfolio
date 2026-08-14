"use client";

import { useEffect, useRef } from "react";
import styles from "./CanvasCursor.module.css";

/** Elements that keep their native cursor, because its shape carries meaning. */
const NATIVE_CURSOR = 'input, textarea, select, [contenteditable="true"]';

/** Opt-in attribute for the "View Project" variant, e.g. the Inspection card.
 *  Anything without it gets the default Page arrow. */
const VARIANT_TARGET = "[data-cursor]";

/**
 * The site's cursor, replacing the OS arrow to give the page a designer's-canvas
 * feel. Two variants, both straight out of Figma's "Custom Cursors" component:
 *
 *   Page          the default — the arrow glyph, tip on the pointer.
 *   View Project  a 132px disc of tinted glass, centred on the pointer. Shown
 *                 only over elements carrying `data-cursor="view-project"`,
 *                 which today is the Inspection case-study card and nothing
 *                 else. The variant is read off the attribute rather than
 *                 hard-coded to a selector so the next card that needs one only
 *                 has to declare it.
 *
 * It tracks the pointer 1:1 with no easing or lag — it is a cursor, not an
 * effect, and anything less than exact tracking reads as broken. Position is
 * written straight to the element's transform inside a rAF so a burst of
 * pointer events collapses into one paint per frame. The variant swap is the
 * one thing that *is* eased, and that happens in CSS.
 *
 * Only mounts for fine pointers, and steps aside for text inputs, where the
 * native I-beam is doing real work. The `data-canvas-cursor` attribute it puts
 * on <html> is what switches `cursor: none` on in globals.css, so if this never
 * runs the OS cursor is simply left alone.
 */
export default function CanvasCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Touch has no cursor to replace, and under reduced-motion the OS cursor —
    // which the user may have sized or themed for accessibility — is left be.
    if (!finePointer.matches || reduced.matches) return;

    const html = document.documentElement;
    html.setAttribute("data-canvas-cursor", "");

    let x = 0;
    let y = 0;
    let frame = 0;
    let visible = false;
    let overNative = false;
    /** The glass surface under the pointer, if any — see `lightGlass`. */
    let litGlass: HTMLElement | null = null;

    function draw() {
      frame = 0;
      el!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      lightGlass();
    }

    /**
     * Puts the specular where the pointer is.
     *
     * iOS moves this highlight as the device tilts; on a desktop the honest
     * analogue is the pointer, so `.liquid` reads `--lx` / `--ly` for the
     * centre of its highlight and this writes them. Delegated off the one
     * pointermove this component already runs rather than adding a listener
     * per pill — the page has two global pointermove handlers as it is.
     *
     * Writing custom properties never touches React and never invalidates
     * layout, so this costs one paint on an element that was already
     * compositing for its backdrop-filter.
     */
    function lightGlass() {
      if (!litGlass) return;
      const r = litGlass.getBoundingClientRect();
      litGlass.style.setProperty("--lx", `${x - r.left}px`);
      litGlass.style.setProperty("--ly", `${y - r.top}px`);
    }

    function show() {
      if (visible || overNative) return;
      visible = true;
      el!.setAttribute("data-visible", "");
    }

    function hide() {
      if (!visible) return;
      visible = false;
      el!.removeAttribute("data-visible");
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(draw);
      show();
    }

    function onPointerOver(e: PointerEvent) {
      const t = e.target instanceof Element ? e.target : null;

      overNative = !!t?.closest(NATIVE_CURSOR);
      if (overNative) hide();
      else show();

      const variant = t?.closest(VARIANT_TARGET)?.getAttribute("data-cursor");
      if (variant) el!.setAttribute("data-variant", variant);
      else el!.removeAttribute("data-variant");

      // Hand the highlight over. The old surface keeps its last position so
      // the specular fades out where it was rather than jumping to the middle.
      const glass = t?.closest<HTMLElement>(".liquid") ?? null;
      if (glass !== litGlass) litGlass = glass;
    }

    // The pointer leaving the window, or the window losing focus, should not
    // leave a stray arrow parked at the last position.
    function onLeave() {
      hide();
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      html.removeAttribute("data-canvas-cursor");
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className={styles.cursor} aria-hidden="true">
      <div className={styles.arrow}>
        {/* Zero-sized anchor so the -45deg rotation pivots on the exact point
            Figma rotates about, rather than on a box's centre. */}
        <div className={styles.pivot}>
          <div className={styles.glyph}>
            <img src="/icons/cursor-page.svg" alt="" className={styles.art} />
          </div>
        </div>
      </div>

      {/* Both discs are true circles, so no `squircle` here — corner smoothing
          on a fully-rounded box would flatten it back into a rounded square. */}
      <div className={`${styles.badge} liquid`}>
        <div className={styles.lens} />
        <div className={styles.inner}>
          <span className={styles.label}>View Project</span>
        </div>
      </div>
    </div>
  );
}
