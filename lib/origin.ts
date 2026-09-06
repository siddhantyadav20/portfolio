import "server-only";

/**
 * The one place the site's own address is written down.
 *
 * It used to be written in three — `app/layout.tsx`, `app/robots.ts` and
 * `app/sitemap.ts` each carried their own copy of the production domain — and
 * three copies of a domain string is exactly how a domain move ends up half
 * done: the pages move, the sitemap keeps pointing at the old host, and
 * nothing fails because both strings are perfectly valid URLs.
 *
 * Consolidating also closed a real inconsistency. `layout.tsx` refused to
 * build on CI with the variable unset, on the reasoning that a preview deploy
 * publishing production canonicals is worse than a failed build. The other two
 * had no such guard and fell back silently, so the same misconfigured build
 * that could not produce a canonical would still emit a `robots.txt` and a
 * `sitemap.xml` claiming to be production. One definition, one rule.
 */

/**
 * Used only where getting it wrong is harmless: `next dev`, and the local
 * `next build` someone runs to check that something compiles.
 *
 * Vercel, Netlify and GitHub Actions all set `CI=true`, which is the tell that
 * a build's output will actually be served to somebody.
 */
const FALLBACK = "https://sidbuilds.in";

export function siteOrigin(): string {
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

/** The same value as a `URL`, which is what `metadataBase` wants. */
export const siteUrl = () => new URL(siteOrigin());
