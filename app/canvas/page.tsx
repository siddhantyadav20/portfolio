import type { Metadata } from "next";
import CanvasSurface from "@/components/canvas/CanvasSurface";

export const metadata: Metadata = {
  title: "Canvas — Siddhant Yadav",
  description: "A board of the things I read, listen to, build and keep.",
};

/**
 * The canvas as a route.
 *
 * The homepage will open the canvas as an overlay that morphs out of the
 * Canvas card, because that transition is most of the point. This route
 * exists anyway, for the cases the overlay cannot serve: a shared link, an
 * opened-in-new-tab, a crawler, and JavaScript disabled. It is also, for now,
 * the only way to see the canvas at all — the card is not wired up until the
 * morph lands.
 *
 * `content.canvas.href` has always pointed here. Until this file existed it
 * pointed at a 404.
 */
export default function CanvasPage() {
  return <CanvasSurface />;
}
