import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

/* Phase, not `NODE_ENV`.
 *
 * This file used to read `process.env.NODE_ENV` to decide the dev-only
 * `X-Frame-Options` relaxation below. It is `"development"` inside the running
 * app — `app/dev/responsive/page.tsx` reads it and renders rather than
 * 404s — but it is *not* `"development"` at the moment Next evaluates this
 * config, so the relaxation never applied and `/dev/responsive` served
 * `DENY` to its own iframes. The bench has therefore never worked: three
 * empty frames, no error in the page, nothing to grep for.
 *
 * `phase` is the value Next passes for exactly this question, and it is the
 * documented API for it. Production is unchanged and still `DENY`. */
const buildConfig = (phase: string): NextConfig => ({
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

    /* A year, and the reason to keep it is that the default 60s makes a repeat
       visitor re-validate every image on the board.

       An earlier note here said these are content-hashed by the optimiser and
       a stale cache is therefore not a risk. They are not. `/_next/image` keys
       on the *source path* — `?url=/media/foo.png&w=…&q=…` — so replacing a
       file's bytes under the same name leaves everyone who has already seen it
       on the old picture for the length of this TTL. That happened once, with
       the JIRA backlog figure, and the fix was to give the new export a new
       name. Re-export freely; rename whenever the content changes. */
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
             clickjack.

             `SAMEORIGIN` in development, and only there. Figma has no phone
             frames for this site, so the mobile layouts are designed in the
             browser — and the only way to see three viewport widths at once,
             live, is to frame the site in itself (`/dev/responsive`). `DENY`
             refuses that from its own origin too.

             The relaxation costs nothing real: the threat is a *hostile* site
             framing this one, `SAMEORIGIN` still refuses every origin but our
             own, and `next dev` is bound to localhost. Production is
             untouched — anything deployed still says DENY. */
          {
            key: "X-Frame-Options",
            value: phase === PHASE_DEVELOPMENT_SERVER ? "SAMEORIGIN" : "DENY",
          },
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
});

export default buildConfig;
