import type { Metadata } from "next";
import CanvasSurface from "@/components/canvas/CanvasSurface";

const DESCRIPTION = "A board of the things I read, listen to, build and keep.";

export const metadata: Metadata = {
  /** Half a title. The root's `template` supplies the other half — spelling
   *  out the full thing here ran it through the template anyway and shipped
   *  `Canvas — Siddhant Yadav — Siddhant Yadav`. */
  title: "Canvas",
  description: DESCRIPTION,
  /** Without this the root's `canonical: "/"` cascades down, and the canvas
   *  spends its life in the sitemap telling crawlers it is the homepage. */
  alternates: { canonical: "/canvas" },
  /** Same: unset, every share of this URL previews as the homepage. */
  openGraph: {
    title: "Canvas — Siddhant Yadav",
    description: DESCRIPTION,
    url: "/canvas",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Canvas — Siddhant Yadav",
    description: DESCRIPTION,
  },
};

/**
 * The canvas as a route.
 *
 * The homepage opens the canvas as an overlay that morphs out of the Canvas
 * card, because that transition is most of the point — see
 * `components/home/CanvasCard`, which intercepts the click and interpolates
 * the card's board into this one. This route is what that cannot serve: a
 * shared link, an opened-in-new-tab, a crawler, and JavaScript disabled. The
 * card's CTA is a real `<a href="/canvas">` for exactly that reason.
 *
 * `content.canvas.href` has always pointed here. Until this file existed it
 * pointed at a 404.
 */
export default function CanvasPage() {
  return <CanvasSurface />;
}
