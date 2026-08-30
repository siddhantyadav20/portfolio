"use client";

import { useEffect, useRef } from "react";
import styles from "./CanvasCursor.module.css";

/** Elements that keep their native cursor, because its shape carries meaning:
 *  the I-beam over text entry, and anything opting out with
 *  `data-cursor="native"` — see the matching block in globals.css. */
const NATIVE_CURSOR =
  'input, textarea, select, [contenteditable="true"], [data-cursor="native"]';

/** Opt-in attribute for the "View Project" variant, e.g. the Inspection card.
 *  Anything without it gets the default Page arrow. */
const VARIANT_TARGET = "[data-cursor]";

/**
 * A control that is its own click target, and so its own answer to "what
 * happens if I press here".
 *
 * This exists because a card can now offer "View Project" while holding things
 * that do something else. The Inspection and Design System cards are anchors all
 * the way down — every pixel of them opens the study, so the badge is honest
 * everywhere. The Search card is not: it is a `div` holding a live search field,
 * a library picker, and an Add button per finding, and a 132px disc reading
 * "View Project" hovering over `Add` promises a case study to a press that adds
 * a remark to a report.
 *
 * So the rule is about nesting rather than about any one card: a control found
 * *inside* the element offering the variant takes precedence over it, and the
 * pointer goes back to the plain arrow. A card that is itself the control — the
 * two anchors — finds itself here and is unaffected, because it is the element
 * carrying the attribute rather than something within it.
 *
 * And a nested control that *does* lead where the badge says opts back in by
 * declaring the variant on itself: the lookup below takes the nearest
 * `[data-cursor]`, so such an element becomes its own holder and this rule
 * stops applying to it. The Search card's heading link is the case that needs
 * it — the badge would otherwise vanish over the one thing on that card which
 * really does open the project.
 */
const CONTROL =
  'a[href], button, select, textarea, input, label, [role="button"], [role="option"], [contenteditable="true"]';

/**
 * The site's cursor, replacing the OS arrow to give the page a designer's-canvas
 * feel. Two variants, both straight out of Figma's "Custom Cursors"
 * component:
 *
 *   Page          the default — the arrow glyph, tip on the pointer.
 *   View Project  a 132px disc of tinted glass, centred on the pointer. Shown
 *                 only over elements carrying `data-cursor="view-project"`.
 *                 The variant is read off the attribute rather than hard-coded
 *                 to a selector, so the next card that needs one only has to
 *                 declare it — and a control nested inside such a card takes
 *                 the plain arrow back. See CONTROL.
 *
 * A third variant, Scrub, used to live here for the timeline's ruler, because
 * `cursor: grab` could not: the `cursor: none` rule this component switches on
 * is universal and `!important`. The ruler now opts out of the custom cursor
 * altogether (`data-cursor="native"`) and wears the OS grab hand, which every
 * user already knows — so the drawn chevrons went with it.
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

      const holder = t?.closest(VARIANT_TARGET) ?? null;
      let variant = holder?.getAttribute("data-cursor") ?? null;

      // `data-cursor="none"` means the surface draws its own pointer and this
      // one would be a second cursor on screen — the drawing canvas has a
      // brush ring, the scratch card has a coin. Suppress ours entirely
      // rather than swapping it for a variant.
      if (variant === "none") {
        hide();
        el!.removeAttribute("data-variant");
        return;
      }

      // Over a control the card merely contains — see CONTROL. The variant is
      // dropped rather than the cursor hidden, so what is under the pointer is
      // the ordinary arrow and not nothing.
      if (variant) {
        const control = t?.closest(CONTROL) ?? null;
        if (control && control !== holder && holder!.contains(control)) {
          variant = null;
        }
      }

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
