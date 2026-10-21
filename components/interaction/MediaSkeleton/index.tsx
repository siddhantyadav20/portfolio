"use client";

import { useEffect } from "react";

/* ===========================================================================
   Pictures that have not arrived yet, inside a study.

   The opening scene (lib/scene.ts) covers the first screen of a page. A case
   study is much longer than that, and most of its pictures are lazy: they are
   asked for as the reader nears them, so on a slow connection — or a phone on
   a train — the reader scrolls into a run of empty, correctly sized holes.
   This fills each hole with its own frame until the picture is in.

   THE SAME LIGHT. A ring leaves the middle of the frame and keeps leaving it —
   the light the scene's skeleton runs on, and the one a pressed card shows
   while its study is on the way (lib/pending.ts). Three loaders, one
   gesture: wherever something is coming, light moves outward from where it
   will be.

   THE PICTURE DEVELOPS rather than appearing: it lands soft and a little pale
   and resolves over half a second, the way a print comes up in the tray.
   `filter` only — never opacity, which would show the page through the hole
   for a frame once the frame's own ground is gone.

   Renders nothing. Scoped to where pictures are the content — an open modal,
   a study page — and to pictures big enough to have a hole worth showing;
   an icon that is late is not a wait anyone notices.
   =========================================================================== */

/** The pictures this looks after. */
const SCOPE = '[aria-modal="true"] img, main[data-accent] img';
/** Smaller than this on either side and it is an icon, not a picture. */
const MIN = 40;
/** How long the develop runs — the `media-develop` keyframes in globals.css. */
const DEVELOP_MS = 560;

export default function MediaSkeleton() {
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;

    const settle = (img: HTMLImageElement) => {
      if (img.dataset.skel !== "loading") return;
      img.dataset.skel = "in";
      window.setTimeout(() => {
        if (img.dataset.skel === "in") delete img.dataset.skel;
      }, DEVELOP_MS);
    };

    /* A picture laid over another picture — the hand holding the phone over
       the house, the screen inside the phone — is a cut-out, and its frame
       would be a grey slab standing in the middle of the photo behind it.
       The picture underneath carries the frame for all of them. */
    const layered = (img: HTMLImageElement, r: DOMRect) => {
      const box = img.parentElement?.parentElement;
      if (!box) return false;
      for (const other of box.querySelectorAll("img")) {
        if (other === img) break; // only what is painted beneath it
        const o = other.getBoundingClientRect();
        const ix = Math.min(r.right, o.right) - Math.max(r.left, o.left);
        const iy = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top);
        if (ix > 0 && iy > 0 && ix * iy > r.width * r.height * 0.5) return true;
      }
      return false;
    };

    const watch = (img: HTMLImageElement) => {
      if (img.dataset.skel) return;
      if (img.complete && img.naturalWidth > 0) return;
      const r = img.getBoundingClientRect();
      if (r.width < MIN || r.height < MIN) return;
      if (layered(img, r)) return;
      img.dataset.skel = "loading";
      const done = () => settle(img);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      /* Already in by the time the listener existed — a cache hit can
         complete between the check above and the line before this one. */
      if (img.complete) done();
    };

    const scan = (root: ParentNode) => {
      root.querySelectorAll<HTMLImageElement>(SCOPE).forEach(watch);
    };

    scan(document);

    /* Modals mount their study when they open, and a study's sections can
       swap pictures (a carousel, a theme's other screenshot), so anything
       added later is looked at too — only the part of the tree that was
       added, never the whole document again. */
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === "attributes") {
          const img = rec.target;
          if (!(img instanceof HTMLImageElement)) continue;
          if (img.dataset.skel !== "loading") delete img.dataset.skel;
          if (img.matches(SCOPE)) watch(img);
          continue;
        }
        rec.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as Element;
          if (el instanceof HTMLImageElement) {
            if (el.matches(SCOPE)) watch(el);
          } else if (el.querySelector("img")) {
            // The node itself may be the modal, or sit inside one.
            if (el.closest('[aria-modal="true"], main[data-accent]')) {
              el.querySelectorAll("img").forEach(watch);
            } else scan(el);
          }
        });
      }
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      // A new `src` on the same element is a new wait.
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });

    return () => mo.disconnect();
  }, []);

  return null;
}
