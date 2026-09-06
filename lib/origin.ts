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

/**
 * What a person means when they type an origin into a dashboard field.
 *
 * WRITTEN AFTER IT COST A PRODUCTION DEPLOY. `NEXT_PUBLIC_SITE_URL` was set to
 * `sidbuilds.in`, which is the site's address by any reasonable reading and is
 * not a URL — `new URL("sidbuilds.in")` throws `ERR_INVALID_URL`. That threw at
 * module scope in `app/layout.tsx`, which failed page-data collection, which
 * failed the build, and the error it printed named neither the variable nor the
 * fix. Eight missing characters, a red deploy, and a log to read.
 *
 * So a bare host gets the scheme it obviously meant. `https`, never `http`:
 * this value ends up in canonicals, `og:url` and the sitemap, and quietly
 * publishing those over plaintext would be a worse failure than the one being
 * fixed.
 *
 * Returning `.origin` rather than the string handles the rest for free: it
 * carries no path and no trailing slash whatever went in, which is the shape
 * callers need because they concatenate onto it — `${siteOrigin()}/sitemap.xml`.
 * Stripping slashes by hand first was the obvious way to do that and was
 * wrong: it turns `https://` into `https:`, which then fails the scheme test
 * and gets a second scheme glued on.
 *
 * What is NOT tolerated is a value that is still not a URL once the scheme is
 * on it. That is a typo rather than a shorthand, and the guard below says so
 * with the variable's name and the value in the message.
 */
function normalise(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is not a valid origin: ${JSON.stringify(raw)}. ` +
        "Set it to this deployment's own origin, e.g. https://sidbuilds.in. " +
        "See .env.example.",
    );
  }
}

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalise(configured);

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
