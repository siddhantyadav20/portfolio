/* ===========================================================================
   The first scene: frames first, then what goes in them.

   Every document load of the homepage (and of a case study) opens on the page
   as a set of empty frames — each card's own outline, and inside it a bone
   exactly where each line of its text, each photo and each pill is going to
   be. Then the content lands into them, in a ripple, and the frames let go.

   IT IS THE REAL LAYOUT. Nothing here is a drawing of a page. The skeleton is
   read off the page the server already sent: every frame is a card's measured
   rect with that card's own corner, every text bone is one *line box* of that
   card's text (so a two-line headline is two bars, the second one shorter,
   the way it will actually set), every media bone is the image it stands in
   for. A loader that says "something is coming" is the generic version. This
   one says *what* is coming and exactly where — the same argument the boot's
   pen tool makes by drawing the mark's real anchors rather than a pen.

   WHEN. Before React. The decision is made by `BOOT_SCRIPT` in <head>, which
   sets `SCENE_ATTR` on <html>; the stylesheet holds the content back from the
   first frame; and `SCENE_SCRIPT`, beside it, reads the layout and draws the
   skeleton the moment the document is parsed. So on a slow connection the
   skeleton is what is on screen while the JavaScript is still arriving: an
   honest loader, not a flourish that waits for hydration to tell you there
   was a wait.

   Then:
     - first ever visit  → the boot's pen draws the mark in a clearing of the
                           skeleton, and the boot calls `land()` when the mark
                           is on its way home;
     - reload, a new tab → the content lands as soon as the fonts are in and
                           each card's media has decoded — card by card, so a
                           slow photo holds only its own frame;
     - back/forward, a client-side navigation, reduced motion → none of it.

   THE SCROLL. The skeleton is laid out in *document* coordinates, so it scrolls
   with the page, and a reload that restores the reader to the middle of the
   homepage finds the frames where they were. Who lands, and from where, is
   decided at the moment of landing against wherever the viewport is by then:
   the ripple starts from the card the eye is on — the Introduction if it is in
   view, otherwise whatever is nearest the middle of the screen — and only what
   is on screen animates. Anything above is simply there; anything below is
   handed to `HomeRise`, which raises it as it is scrolled to.

   NEVER LOAD-BEARING. The content is in the document from the first byte and
   only its opacity is held. If the runtime throws, the stylesheet lets it go
   on its own (`scene-failsafe`); if the runtime stalls, it lands itself.
   =========================================================================== */

/** Set on <html> by `BOOT_SCRIPT`; its value names which page is opening. */
export const SCENE_ATTR = "data-scene";

/** Dispatched on `window` once the scene has torn itself down. */
export const SCENE_END = "scene:end";

export type SceneKind = keyof typeof SCENE_PAGES;

/**
 * Which surfaces are frames, per page.
 *
 * `items` must match the hide rule in globals.css ("Scene") exactly — an item
 * the stylesheet hides and this does not list is invisible until the scene
 * ends, and one this lists that the stylesheet does not hide is drawn twice.
 */
export const SCENE_PAGES = {
  /* No `:has()` anywhere in these. They are matched by a stylesheet rule
     that is in force for the life of the page, and a `:has()` there made
     every change inside <main> — a timeline tick, an image arriving — a
     style recalculation of the whole document on a phone. The chrome that is
     not a card says so with an attribute instead. */
  home: {
    items:
      "#main :is([data-prox-card],[data-prox-passive])," +
      "#main > .liquid," +
      "#main [data-scene-item]",
    focal: '[data-card="introduction"]',
  },
  /* A study is a document, not a grid: its frames are the blocks a reader
     meets in order — the chrome, the intro's three blocks, each section's
     own blocks, the ending — so the skeleton is the shape of the page being
     read, paragraph by paragraph. */
  study: {
    items:
      "#main [data-scene-item]," +
      "#main #intro > *," +
      '#main #intro ~ [data-stage="rule"],' +
      "#main #intro ~ * > section > *," +
      "#main #comments," +
      "#main footer",
    focal: '#main [data-stage="title"]',
  },
  /* Everything else — the insights page, the 404. A page opts in by marking
     its root `data-scene-root`; its children are the frames. The canvas does
     not: its board has an arrival of its own, slot by slot, and a scene laid
     over it would replace a designed entrance with a generic one. */
  page: {
    items: "[data-scene-root] > *",
    focal: "[data-scene-focal]",
  },
} as const;

/**
 * The pace, in milliseconds. Perceptual constants, not a schedule — see the
 * notes in the runtime for what each one is protecting.
 */
export const SCENE_MS = {
  /** The least time the frames are on screen before anything lands. Long
   *  enough for the ripple of frames to reach the far side of the screen and
   *  be read as a layout — under that, a reload is a flicker. */
  hold: 420,
  /** The most. Past this the content lands whether its media is in or not;
   *  a loader that outlives its usefulness is just a slower page. */
  wait: 2600,
  /** How far the landing ripple spreads, at most, from first card to last. */
  spread: 460,
  /** One card's landing — the drop spring's whole run. */
  land: 820,
  /** How long the boot may take to call `land()` before the scene stops
   *  waiting for it. The boot's own bail is BOOT_MS * 2 after hydration. */
  bootWait: 12000,
} as const;

type Page = { items: string; focal: string };
type Pace = typeof SCENE_MS;

export type SceneApi = {
  /** Land every frame, starting `at` ms from now, rippling from the focal. */
  land: (at?: number) => void;
};

declare global {
  interface Window {
    __scene?: SceneApi;
    /** A landing the boot asked for before the runtime existed. */
    __sceneAt?: number;
  }
}

/**
 * The runtime. Serialised into an inline script with `.toString()`, so it
 * must be self-contained: no imports, no module scope, nothing a compiler
 * would hoist into a helper. Plain loops over NodeLists for the same reason.
 */
function runScene(page: Page, pace: Pace, boot: boolean) {
  const d = document;
  const html = d.documentElement;
  if (!html.hasAttribute("data-scene")) return;

  type Bone = {
    k: "t" | "m" | "c";
    x: number;
    y: number;
    w: number;
    h: number;
    r: string;
  };
  type Item = {
    el: HTMLElement;
    frame: HTMLElement | null;
    cx: number;
    cy: number;
    landed: boolean;
    /** Holds something `position: fixed` — see `drop`. */
    pinned: boolean;
  };

  const t0 = performance.now();
  let items: Item[] = [];
  let layer: HTMLElement | null = null;
  let style: HTMLStyleElement | null = null;
  let fontsIn = !d.fonts;
  let landing = false;
  let ended = false;
  let rules = "";
  let lastEnd = 0;
  let poll = 0;

  const alpha = (c: string) => {
    if (!c || c === "transparent") return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 1;
    const p = m[1].split(/[ ,/]+/).filter(Boolean);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  };
  const filled = (cs: CSSStyleDeclaration) =>
    alpha(cs.backgroundColor) > 0.02 ||
    (cs.backgroundImage !== "none" &&
      cs.backgroundImage.indexOf("gradient") > -1) ||
    (cs.backdropFilter && cs.backdropFilter !== "none");
  const pictured = (el: Element, cs: CSSStyleDeclaration) => {
    const t = el.tagName;
    return (
      t === "IMG" ||
      t === "VIDEO" ||
      t === "CANVAS" ||
      t === "PICTURE" ||
      t === "IFRAME" ||
      t === "svg" ||
      t === "SVG" ||
      cs.backgroundImage.indexOf("url(") > -1 ||
      // An icon drawn as a mask over a fill — the theme toggle's sun and moon.
      (cs.maskImage && cs.maskImage !== "none") ||
      (cs.webkitMaskImage && cs.webkitMaskImage !== "none")
    );
  };
  const shown = (cs: CSSStyleDeclaration) =>
    cs.display !== "none" &&
    cs.display !== "contents" &&
    cs.visibility !== "hidden" &&
    parseFloat(cs.opacity) > 0.05;

  /* --- Reading the layout ------------------------------------------------ */

  /** The surface a frame is drawn as: the item itself if it paints a ground,
   *  otherwise a descendant that covers most of it (the About chip is a bare
   *  wrapper around its card). None, and the frame is bones only — the
   *  Introduction is words on the page, not a card, and its skeleton says so. */
  const surfaceOf = (el: HTMLElement, r: DOMRect) => {
    const q: HTMLElement[] = [el];
    for (let depth = 0; depth < 3 && q.length; depth++) {
      const next: HTMLElement[] = [];
      for (let i = 0; i < q.length; i++) {
        const n = q[i];
        const cs = getComputedStyle(n);
        const b = n.getBoundingClientRect();
        if (
          b.width * b.height >= r.width * r.height * 0.7 &&
          (filled(cs) || pictured(n, cs))
        )
          return { el: n, cs, b, media: !filled(cs) };
        for (let j = 0; j < n.children.length; j++)
          next.push(n.children[j] as HTMLElement);
      }
      q.length = 0;
      for (let j = 0; j < next.length; j++) q.push(next[j]);
    }
    return null;
  };

  let sawFixed = false;
  const bonesOf = (root: HTMLElement, f: DOMRect, skip: Element | null) => {
    const out: Bone[] = [];
    sawFixed = false;
    const range = d.createRange();
    const clip = (
      x: number,
      y: number,
      w: number,
      h: number,
      k: Bone["k"],
      r: string,
    ) => {
      const x0 = Math.max(x, f.left);
      const y0 = Math.max(y, f.top);
      const x1 = Math.min(x + w, f.right);
      const y1 = Math.min(y + h, f.bottom);
      if (x1 - x0 < 3 || y1 - y0 < 3) return;
      out.push({ k, x: x0 - f.left, y: y0 - f.top, w: x1 - x0, h: y1 - y0, r });
    };
    const walk = (el: Element, fs: number) => {
      if (out.length > 90) return;
      for (let n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          if (!n.textContent || !n.textContent.trim()) continue;
          range.selectNodeContents(n);
          const rects = range.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            const lr = rects[i];
            if (lr.width < 2) continue;
            // A cap-height bar, centred on the line box.
            const bar = Math.max(4, Math.min(fs * 0.64, lr.height * 0.8));
            clip(
              lr.left,
              lr.top + (lr.height - bar) / 2,
              lr.width,
              bar,
              "t",
              Math.min(bar / 2, 7) + "px",
            );
          }
          continue;
        }
        if (n.nodeType !== 1 || n === skip) continue;
        const c = n as Element;
        const cs = getComputedStyle(c);
        if (!shown(cs)) {
          // `display: contents` paints nothing itself but its children do.
          if (cs.display === "contents") walk(c, fs);
          continue;
        }
        /* Fixed to the viewport — the study page's close button, a modal open
           inside its card. It is not part of this frame's layout, so it gets
           no bones here, and the item it lives in must never be given a
           `translate` or `scale` (see `drop`). */
        if (cs.position === "fixed") {
          sawFixed = true;
          continue;
        }
        const b = c.getBoundingClientRect();
        if (b.width < 3 || b.height < 3) continue;
        if (pictured(c, cs)) {
          if (b.width < 8 && b.height < 8) continue;
          /* Pictures layered on pictures — the hand, the phone in it, the
             screen in the phone — are one object to the eye. Stacked, their
             bones added up to the brightest thing on the page. */
          let covered = false;
          for (let i = 0; i < out.length; i++) {
            const o = out[i];
            if (o.k !== "m") continue;
            const ix =
              Math.min(o.x + o.w, b.right - f.left) -
              Math.max(o.x, b.left - f.left);
            const iy =
              Math.min(o.y + o.h, b.bottom - f.top) -
              Math.max(o.y, b.top - f.top);
            if (
              ix > 0 &&
              iy > 0 &&
              ix * iy > Math.min(b.width * b.height, o.w * o.h) * 0.5
            )
              covered = true;
          }
          if (covered) continue;
          const small = Math.min(b.width, b.height);
          clip(
            b.left,
            b.top,
            b.width,
            b.height,
            "m",
            /* Its own corner if it has one; otherwise an icon is a soft dot
               and a picture a gently rounded plate. */
            cs.borderRadius !== "0px"
              ? cs.borderRadius
              : small < 30
                ? "50%"
                : small > 60
                  ? "12px"
                  : "30%",
          );
          continue;
        }
        if (
          filled(cs) &&
          b.width >= 12 &&
          b.height >= 12 &&
          b.width * b.height < f.width * f.height * 0.6
        )
          clip(b.left, b.top, b.width, b.height, "c", cs.borderRadius);
        walk(c, parseFloat(cs.fontSize) || fs);
      }
    };
    walk(root, parseFloat(getComputedStyle(root).fontSize) || 14);

    /* One bar per line, not per text node: "Hi, I'm Siddhant" set as three
       runs of inline markup is still one line of headline. */
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    const merged: Bone[] = [];
    for (let i = 0; i < out.length; i++) {
      const b = out[i];
      const p = merged[merged.length - 1];
      if (
        p &&
        p.k === "t" &&
        b.k === "t" &&
        Math.abs(p.y - b.y) < 2 &&
        Math.abs(p.h - b.h) < 2 &&
        b.x - (p.x + p.w) < b.h * 0.9 &&
        b.x >= p.x
      ) {
        p.w = b.x + b.w - p.x;
        continue;
      }
      merged.push(b);
    }
    return merged.slice(0, 80);
  };

  /* --- Drawing ----------------------------------------------------------- */

  const focalPoint = () => {
    const vw = innerWidth;
    const vh = innerHeight;
    const f = d.querySelector(page.focal);
    if (f) {
      const r = f.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh && r.width > 0)
        return {
          x: r.left + r.width / 2 + scrollX,
          y: r.top + r.height / 2 + scrollY,
        };
    }
    /* Not in view: the visible item nearest the middle of the screen, so the
       ripple starts where the eye is rather than off the top of it. */
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const y = it.cy - scrollY;
      if (y < 0 || y > vh) continue;
      const dd = Math.hypot(it.cx - scrollX - vw / 2, y - vh / 2);
      if (dd < bd) {
        bd = dd;
        best = { x: it.cx, y: it.cy };
      }
    }
    return best || { x: vw / 2 + scrollX, y: vh / 2 + scrollY };
  };

  const build = () => {
    if (ended) return;
    const els = d.querySelectorAll<HTMLElement>(page.items);
    const list: HTMLElement[] = [];
    for (let i = 0; i < els.length; i++) {
      let nested = false;
      for (let j = 0; j < list.length; j++)
        if (list[j].contains(els[i])) nested = true;
      if (!nested) list.push(els[i]);
    }

    /* Not a <div>. This is appended to <body> mid-parse, between the
       server's markup and React's hydration of it, and React skips an
       unexpected sibling in <body> only when its tag differs from the one it
       is looking for — a <div> here was taken for BottomBlur's root, failed
       to match it, and threw the whole page back to a client render. */
    const next = d.createElement("x-scene");
    next.className = "scene";
    next.setAttribute("aria-hidden", "true");
    next.style.height = d.documentElement.scrollHeight + "px";
    const prev = items;
    items = [];

    const sx = scrollX;
    const sy = scrollY;
    const o = focalPoint();
    for (let i = 0; i < list.length; i++) {
      const el = list[i];
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      /* Frames only near where the reader is. A study is twelve thousand
         pixels long and walking all of it for bones nobody will see is the
         one cost here that grows with the page. Far items still land — they
         just have no frame to land in. */
      if (r.bottom < -innerHeight * 0.25 || r.top > innerHeight * 1.25) {
        items.push({
          el,
          frame: null,
          cx: r.left + sx + r.width / 2,
          cy: r.top + sy + r.height / 2,
          landed: false,
          pinned: false,
        });
        continue;
      }
      const surf = surfaceOf(el, r);
      const fr = surf ? surf.b : r;
      const frame = d.createElement("div");
      frame.className =
        "scene-frame" +
        (surf && !surf.media ? " is-filled" : "") +
        (surf && surf.media ? " is-pictured" : "");
      /* The corner comes from whichever of the two has one. A photograph
         filling a card has square corners of its own and is cut to the
         card's squircle by the card, so the card is the shape. */
      if (surf) {
        const own =
          surf.el.classList.contains("squircle") ||
          surf.cs.borderRadius !== "0px";
        const shape = own ? surf.el : el;
        const scs = own ? surf.cs : getComputedStyle(el);
        if (shape.classList.contains("squircle")) {
          frame.classList.add("squircle");
          frame.style.setProperty("--sq-r", scs.getPropertyValue("--sq-r"));
        } else frame.style.borderRadius = scs.borderRadius;
      }
      frame.style.left = fr.left + sx + "px";
      frame.style.top = fr.top + sy + "px";
      frame.style.width = fr.width + "px";
      frame.style.height = fr.height + "px";

      const bones = bonesOf(el, fr, surf && surf.media ? surf.el : null);
      for (let j = 0; j < bones.length; j++) {
        const b = bones[j];
        const bone = d.createElement("i");
        bone.className = "scene-bone is-" + b.k;
        bone.style.cssText =
          "left:" +
          b.x +
          "px;top:" +
          b.y +
          "px;width:" +
          b.w +
          "px;height:" +
          b.h +
          "px;border-radius:" +
          b.r +
          ";--i:" +
          Math.min(j, 14) +
          /* When the light reaches it: its own distance from the focal, so
             the light is one ring travelling outward across every frame
             rather than a shimmer per box. */
          ";--g:" +
          Math.round(
            Math.min(
              Math.hypot(
                fr.left + sx + b.x + b.w / 2 - o.x,
                fr.top + sy + b.y + b.h / 2 - o.y,
              ) / 1.3,
              1000,
            ),
          ) +
          "ms";
        frame.appendChild(bone);
      }
      next.appendChild(frame);
      items.push({
        el,
        frame,
        cx: fr.left + sx + fr.width / 2,
        cy: fr.top + sy + fr.height / 2,
        landed: false,
        pinned: sawFixed,
      });
    }

    /* A rebuild keeps who has landed — the fonts can arrive after the first
       cards are already down. */
    for (let i = 0; i < items.length; i++)
      for (let j = 0; j < prev.length; j++)
        if (prev[j].el === items[i].el && prev[j].landed) {
          items[i].landed = true;
          if (items[i].frame) items[i].frame!.remove();
          items[i].frame = null;
        }

    /* The frames open as a ripple from wherever the eye is. Delays are a
       distance over a speed — two frames equally far from the focal open
       together — capped so a tall phone column does not queue. */
    let far = 1;
    for (let i = 0; i < items.length; i++)
      far = Math.max(far, Math.hypot(items[i].cx - o.x, items[i].cy - o.y));
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.frame) continue;
      const dist = Math.hypot(it.cx - o.x, it.cy - o.y);
      it.frame.style.setProperty(
        "--in",
        Math.round(Math.min(dist / 2.2, (dist / far) * 300)) + "ms",
      );
    }
    /* Every delay in the skeleton is counted from the first build, so a
       rebuild — the fonts landing a beat after parse — picks the ripple and
       the light up where they were rather than starting them again. */
    next.style.setProperty(
      "--clock",
      -Math.round(performance.now() - t0) + "ms",
    );

    if (layer) layer.replaceWith(next);
    else d.body.appendChild(next);
    layer = next;
  };

  /* --- Landing ----------------------------------------------------------- */

  /** A selector that names exactly this element, from <body> down — the
   *  landing rules are written as these, so nothing in the server's markup
   *  has to change before hydration. Body's children are only ever appended
   *  to (portals, this layer), so an index taken now still holds. */
  const pathOf = (el: Element) => {
    const parts: string[] = [];
    let n: Element | null = el;
    while (n && n !== d.body) {
      const p: Element | null = n.parentElement;
      if (!p) return null;
      let i = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling)
        i++;
      parts.unshift(":nth-child(" + i + ")");
      n = p;
    }
    return n ? "body>" + parts.join(">") : null;
  };

  const ready = (it: Item) => {
    if (!fontsIn) return false;
    /* Pictures only. A video here is a prototype recording that plays on
       hover over a still that is already an <img> — Inspection's is 9MB and
       not even requested at load — so waiting on it held the card to the
       ceiling every time. */
    const media = it.el.querySelectorAll("img");
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      if (!m.getClientRects().length) continue; // not drawn — a theme's other crest
      if (!m.complete) return false;
    }
    return true;
  };

  /** Land these items, `at` ms from now, rippling out from the focal. */
  const drop = (batch: Item[], at: number, onScreenOnly: boolean) => {
    if (!batch.length) return;
    const vh = innerHeight;
    const o = focalPoint();
    let far = 1;
    const dist: number[] = [];
    for (let i = 0; i < batch.length; i++) {
      dist.push(Math.hypot(batch[i].cx - o.x, batch[i].cy - o.y));
      far = Math.max(far, dist[i]);
    }
    for (let i = 0; i < batch.length; i++) {
      const it = batch[i];
      it.landed = true;
      const r = it.el.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < vh;
      const path = pathOf(it.el);
      if (!visible && onScreenOnly) {
        /* Off screen: no motion for nobody to see. Above, it is just there;
           below, it stays held until the end, where HomeRise takes it. */
        if (r.bottom <= 0 && path)
          rules += "html[data-scene] " + path + "{opacity:1;animation:none}";
        if (it.frame) it.frame.remove();
        it.frame = null;
        continue;
      }
      const delay = Math.round(
        at + Math.min(dist[i] / 1.6, (dist[i] / far) * pace.spread),
      );
      /* `translate` and `scale` make the element they are on the containing
         block for everything `position: fixed` inside it, for as long as
         they are set. An item holding a fixed control, or a modal open
         inside its card, would see that control or that modal jump to the
         card's corner and slide back with the spring — the layout breaking
         on reload. Those items arrive by opacity alone. */
      const still = it.pinned || !!it.el.querySelector('[aria-modal="true"]');
      if (path)
        rules +=
          "html[data-scene] " +
          path +
          (still
            ? "{opacity:1;animation:scene-fade " +
              Math.round(pace.land * 0.4) +
              "ms var(--ease-out) "
            : "{opacity:1;animation:scene-land " +
              pace.land +
              "ms var(--spring-drop) ") +
          delay +
          "ms backwards}";
      if (it.frame) {
        it.frame.style.setProperty("--out", delay + "ms");
        it.frame.dataset.out = "";
      }
      lastEnd = Math.max(lastEnd, performance.now() + delay + pace.land);
    }
    if (!style) {
      style = d.createElement("style");
      d.head.appendChild(style);
    }
    /* And for a modal that opens *after* its card was given a drop: the
       same rule, applied the moment the dialog exists. */
    style.textContent =
      rules +
      'html[data-scene] :is(#main,[data-scene-root]) :has([aria-modal="true"]){animation-name:scene-fade!important}';
  };

  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(poll);
    html.removeAttribute("data-scene");
    if (layer) layer.remove();
    if (style) style.remove();
    d.removeEventListener("load", onMedia, true);
    d.removeEventListener("error", onMedia, true);
    removeEventListener("resize", onResize);
    removeEventListener("pointerdown", now, true);
    removeEventListener("keydown", now, true);
    removeEventListener("wheel", now, true);
    clearInterval(watch);
    delete window.__scene;
    dispatchEvent(new Event("scene:end"));
  };

  const finishWhenDown = () => {
    if (items.every((it) => it.landed)) {
      clearTimeout(poll);
      poll = window.setTimeout(
        end,
        Math.max(0, lastEnd - performance.now()) + 60,
      );
      return true;
    }
    return false;
  };

  const tick = () => {
    if (ended || landing) return;
    const age = performance.now() - t0;
    if (age >= pace.hold || hurry) {
      const late = age >= pace.wait || hurry;
      /* Only what is on screen waits for its pictures. Off screen there is
         nothing to wait *for* — its lazy images will not even be requested
         until it is scrolled to — and holding it held the whole scene to
         the ceiling on every load. */
      const vh = innerHeight;
      const batch = items.filter((it) => {
        if (it.landed) return false;
        const r = it.el.getBoundingClientRect();
        return late || r.bottom <= 0 || r.top >= vh || ready(it);
      });
      if (batch.length) {
        if (layer) layer.dataset.landing = "";
        drop(batch, 0, true);
      }
      if (finishWhenDown()) return;
    }
    clearTimeout(poll);
    poll = window.setTimeout(tick, age < pace.hold ? pace.hold - age : 120);
  };

  const onMedia = () => {
    if (!boot) tick();
  };
  let resizeT = 0;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(build, 120);
  };

  /* Somebody is already doing something. A press, a key, a scroll of the
     wheel, or a modal opening (a shared link, a card tapped mid-scene) means
     the page is wanted now: everything still waiting lands at once. Not
     during the boot, which is deliberately not skippable — see the note in
     `BootSequence`. */
  let hurry = false;
  const now = () => {
    if (boot || hurry || ended) return;
    hurry = true;
    tick();
  };
  const watch = window.setInterval(() => {
    if (d.querySelector('[aria-modal="true"]')) {
      if (boot && window.__scene) window.__scene.land(0);
      else now();
    }
  }, 150);
  addEventListener("pointerdown", now, true);
  addEventListener("keydown", now, true);
  addEventListener("wheel", now, { capture: true, passive: true });

  build();
  d.addEventListener("load", onMedia, true);
  d.addEventListener("error", onMedia, true);
  addEventListener("resize", onResize);
  if (d.fonts) {
    /* Whether the faces were already in when the bones were measured. A
       reload has them from cache before the parser is done, and walking the
       whole layout a second time for an identical answer was a second
       main-thread stall during hydration on a phone. */
    const measuredInFace = d.fonts.status === "loaded";
    d.fonts.ready.then(() => {
      fontsIn = true;
      // Text bones were measured in the fallback face; measure the real one.
      if (!measuredInFace) build();
      if (!boot) tick();
    });
  }

  window.__scene = {
    land: (at) => {
      if (ended || landing) return;
      landing = true;
      clearTimeout(poll);
      if (layer) {
        // The boot's clearing closes when the content starts down, not now.
        layer.style.setProperty("--land-at", (at || 0) + "ms");
        layer.dataset.landing = "";
      }
      /* The boot holds the page at the top, so everything is on screen or
         directly under it, and everything lands — the ones below the fold
         with the tail of the ripple, where nobody is looking yet. */
      drop(
        items.filter((it) => !it.landed),
        at || 0,
        false,
      );
      finishWhenDown();
    },
  };

  if (boot) {
    /* The boot may have got there first: it runs after hydration, and
       hydration can finish before the document has. It leaves the moment
       it wanted, as a time, and that moment still stands. */
    const asked = window.__sceneAt;
    delete window.__sceneAt;
    if (asked !== undefined)
      window.__scene.land(Math.max(0, asked - performance.now()));
    // The boot calls `land`. If it never does, stop waiting for it.
    else
      poll = window.setTimeout(
        () => window.__scene && window.__scene.land(0),
        pace.bootWait,
      );
  } else tick();
}

/**
 * Ask the scene to land, `at` ms from now — from the boot.
 *
 * The runtime starts once the document is parsed and the boot starts once
 * React has hydrated, and the second can come first. So if the runtime is not
 * there yet the request is left for it, as a moment rather than a delay, and
 * it lands on time when it arrives.
 */
export function landScene(at: number) {
  if (window.__scene) window.__scene.land(at);
  else if (document.documentElement.hasAttribute(SCENE_ATTR))
    window.__sceneAt = performance.now() + at;
}

/**
 * The inline script, for <head>.
 *
 * In <head> rather than after <main>, where it reads, because a <script> in
 * a page's own tree is one React renders: on a client-side navigation back to
 * that page it builds the element again, refuses to run it, and says so on
 * the console. Here it is the layout's, which a navigation never re-renders.
 * So it waits for the parser instead — `DOMContentLoaded`, which on a slow
 * connection still comes well before the JavaScript has arrived, so the
 * skeleton is still what is on screen while the page is loading.
 */
export const SCENE_SCRIPT = `try{(function(){var h=document.documentElement,k=h.getAttribute(${JSON.stringify(
  SCENE_ATTR,
)}),P=${JSON.stringify(SCENE_PAGES)};if(!k||!P[k])return;var run=function(){try{(${runScene.toString()})(P[k],${JSON.stringify(
  SCENE_MS,
)},h.hasAttribute("data-booting"))}catch(e){h.removeAttribute(${JSON.stringify(
  SCENE_ATTR,
)})}};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",run):run()})()}catch(e){}`;
