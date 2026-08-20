import type { Metadata, Viewport } from "next";
import CanvasCursor from "@/components/interaction/CanvasCursor";
import { intro, linkedin } from "@/content/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { canela, newsreader, outfit } from "./fonts";
import "./globals.css";

/**
 * The canonical origin.
 *
 * `metadataBase` is what turns every relative `openGraph.url` and image path
 * below into the absolute URL the crawlers require — without it Next warns and
 * falls back to localhost, which is how a shared link ends up previewing
 * nothing. Set `NEXT_PUBLIC_SITE_URL` in the deployment; the fallback is only
 * so local builds are quiet.
 */
const SITE = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://siddhantyadav.com",
);

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
 * track the theme or the address bar stays white above a dark page. The two
 * values are `--page-base` from globals.css, light and dark.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1c1e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${canela.variable} ${outfit.variable} ${newsreader.variable}`}
      // The pre-paint script writes data-theme here before React sees the
      // document, so the server's markup and the client's disagree by design.
      // Without this, React "corrects" the attribute back off on hydration and
      // the page flashes to light — the exact bug the script exists to prevent.
      suppressHydrationWarning
    >
      <head>
        {/* Must be inline and in <head>: it has to run before first paint.
            See THEME_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
        {children}
        {/* Site-wide, so the canvas cursor survives navigation. */}
        <CanvasCursor />
      </body>
    </html>
  );
}
