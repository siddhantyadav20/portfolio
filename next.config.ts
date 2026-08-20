import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev overlay out of visual-QA screenshots.
  devIndicators: false,

  /* `next dev` already binds 0.0.0.0, so a phone on the same Wi-Fi can reach
     the machine by LAN IP — but Next blocks the dev-only endpoints (HMR
     socket, the error overlay) for any origin it was not started on, so the
     page loads and then sits there dead. These are the RFC 1918 ranges a
     router or a phone hotspot hands out; dev-only, and never consulted by
     `next build`. */
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],

  images: {
    /* Every raster in public/ is a PNG or a JPEG straight out of Figma —
       nothing was ever re-encoded. AVIF first, WebP as the fallback: on this
       kind of artwork (flat fills, large areas of one colour, screenshots)
       AVIF is routinely a third of the PNG and WebP about half. Ordered by
       preference; Next serves whichever the request's Accept header allows. */
    formats: ["image/avif", "image/webp"],

    /* The board's stills are painted at ~42px (see Still.tsx). The default
       imageSizes ladder starts at 16 and steps 32/48/64/96, so those are
       already served well — this only adds the rungs the ladder was missing
       between the widest still and the narrowest device width. */
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    /* A year. These are content-hashed by the optimiser, so a stale cache is
       not a risk and the default 60s means a repeat visitor re-validates
       every image on the board. */
    minimumCacheTTL: 31_536_000,
  },
};

export default nextConfig;
