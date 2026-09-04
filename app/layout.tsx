import type { Metadata, Viewport } from "next";
import BootSequence from "@/components/boot/BootSequence";
import CanvasCursor from "@/components/interaction/CanvasCursor";
import NoTabFocus from "@/components/interaction/NoTabFocus";
import PaletteHost from "@/components/palette/PaletteHost";
import { intro, linkedin } from "@/content/site";
import { BOOT_SCRIPT } from "@/lib/boot";
import { CHROME, THEME_SCRIPT } from "@/lib/theme";
import { canela, outfit } from "./fonts";
import WebVitals from "./vitals";
import "./globals.css";

/**
 * The canonical origin.
 *
 * `metadataBase` is what turns every relative `openGraph.url` and image path
 * below into the absolute URL the crawlers require — without it Next warns and
 * falls back to localhost, which is how a shared link ends up previewing
 * nothing.
 *
 * The production domain used to be a silent fallback, and silence was the
 * problem: a preview deploy with the variable unset built happily and shipped
 * canonicals, `og:url`s and a sitemap all pointing at the live site. Every
 * preview quietly told crawlers it was production. Now an unset variable is
 * only tolerated where it is genuinely harmless — `next dev`, and the
 * `next build` a developer runs locally to check something compiles.
 *
 * Vercel, Netlify and GitHub Actions all set CI=true, which is the tell.
 */
const FALLBACK = "https://siddhantyadav.com";

function resolveSite() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;

  if (process.env.CI) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is unset. Set it to this deployment's own origin " +
        "— falling back to " +
        FALLBACK +
        " would publish production canonicals, og:url and sitemap entries " +
        "from a build that is not production. See .env.example.",
    );
  }

  return FALLBACK;
}

const SITE = new URL(resolveSite());

export const metadata: Metadata = {
  metadataBase: SITE,
  title: {
    default: "Siddhant Yadav — Product Designer",
    /** Case studies and the canvas supply their own half. */
    template: "%s — Siddhant Yadav",
  },
  description:
    "I design tools for people who work with their hands, not a mouse.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Siddhant Yadav",
    title: "Siddhant Yadav — Product Designer",
    description:
      "I design tools for people who work with their hands, not a mouse.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Siddhant Yadav — Product Designer",
    description:
      "I design tools for people who work with their hands, not a mouse.",
  },
};

/**
 * `themeColor` is the browser chrome around the page on mobile, and it has to
 * track the theme or the address bar stays white above a dark page.
 *
 * These two are the JavaScript-off answer only. With the theme script running,
 * `paintChrome` overwrites them on every toggle, because a stored choice beats
 * the OS here and a `prefers-color-scheme` meta cannot know that.
 *
 * The values come from `CHROME` rather than being written out again — they are
 * the page as painted, wash included, and the note there explains why that is
 * not `--page-base`.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: CHROME.light },
    { media: "(prefers-color-scheme: dark)", color: CHROME.dark },
  ],
  /**
   * The page draws into the notch and the home-indicator area rather than
   * being letterboxed away from them, and the layout pads itself back off the
   * hardware with `env(safe-area-inset-*)`.
   *
   * Without this line those `env()` calls are not merely approximate — they
   * resolve to their `0px` fallback and do nothing at all. There are six of
   * them (`app/page.module.css`, `app/work/[slug]/page.module.css`) and every
   * one was dead code until this was set.
   */
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      /* Newsreader is deliberately absent: it is only ever used by the books
         on the canvas, so it rides with `CanvasSurface` instead of being
         declared for every route. See `app/fonts-serif.ts` for what that
         actually saves and where. */
      className={`${canela.variable} ${outfit.variable}`}
      // The pre-paint script writes data-theme here before React sees the
      // document, so the server's markup and the client's disagree by design.
      // Without this, React "corrects" the attribute back off on hydration and
      // the page flashes to light — the exact bug the script exists to prevent.
      suppressHydrationWarning
    >
      <head>
        {/* Both must be inline and in <head>: they have to run before first
            paint. THEME_SCRIPT decides which palette the first frame is drawn
            in; BOOT_SCRIPT decides whether this is somebody's first arrival,
            which the stylesheet needs to know before it paints the page it
            would otherwise have to hide a moment later. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        {/* Who this is, in the form a search engine will actually read. The
            values come from content/site.ts so the structured data cannot
            drift from the page describing the same person. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: linkedin.name,
              jobTitle: linkedin.role,
              url: SITE.toString(),
              email: `mailto:${intro.email}`,
              description: intro.tagline,
              sameAs: [linkedin.href],
            }),
          }}
        />
        {/* First stop on every page.
            The homepage puts roughly forty focusable things — three case-study
            cards, the timeline slider, the waitlist, the search field, the
            music transport — ahead of its own prose, and until this existed a
            keyboard or switch user had to walk all of them on every visit.
            Off-screen until focused; see `.skipLink` in globals.css. */}
        <a href="#main" className="skipLink">
          Skip to content
        </a>
        {children}
        {/* First arrival only, homepage only, and it takes itself down. */}
        <BootSequence />
        {/* Site-wide, and deliberately here rather than on the homepage: ⌘K has
            to work on a case study and on the canvas too. Ships only the
            hotkey listener; the panel itself is fetched on first open. */}
        <PaletteHost />
        {/* Site-wide, so the canvas cursor survives navigation. */}
        <CanvasCursor />
        {/* Renders nothing. Refuses Tab site-wide — see the note in that file,
            which carries what that costs. */}
        <NoTabFocus />
        {/* Renders nothing; reports nothing unless configured. */}
        <WebVitals />
      </body>
    </html>
  );
}
