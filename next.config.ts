import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Next advertises itself in an `X-Powered-By` response header by default.
     It tells a visitor nothing and tells everyone else which framework and
     therefore which advisories to try. */
  poweredByHeader: false,

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

    /* Deliberately spelled out rather than omitted, and worth knowing that it
       changes nothing: this array is byte-for-byte the Next default. An
       earlier comment here claimed it "adds the rungs the ladder was missing"
       — it does not, and the board's stills at ~42px (see Still.tsx) were
       always served by the default 32/48/64 rungs.

       Kept because the ladder is load-bearing for this site in a way that is
       invisible from the call sites: the canvas paints images at a sixth
       scale, so the small end of it does most of the work here. Written down
       so a future change to it is a decision rather than an accident. */
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    /* A year. These are content-hashed by the optimiser, so a stale cache is
       not a risk and the default 60s means a repeat visitor re-validates
       every image on the board. */
    minimumCacheTTL: 31_536_000,
  },

  /* Response headers the site had none of.

     Deliberately the boring four. No CSP: this site inlines a theme script and
     uses inline styles for the view-transition names, so a useful policy needs
     a nonce and a real pass to get right — a half-written CSP that has to be
     loosened until it stops breaking things is worse than an honest absence.
     Worth doing as its own piece of work. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /* Don't let the browser second-guess a declared Content-Type — the
             main defence against an uploaded file being run as script. */
          { key: "X-Content-Type-Options", value: "nosniff" },
          /* Nothing here is meant to be framed, and not being frameable is
             what stops the page being used as the invisible layer in a
             clickjack. */
          { key: "X-Frame-Options", value: "DENY" },
          /* Send the origin to other sites, the full URL to our own. Without
             this a case-study URL leaks in the Referer of every outbound
             click. */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* The site asks for none of these; say so rather than leaving it to
             the default. */
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
