import { afterEach, beforeEach, describe, expect, it } from "vitest";

/* ===========================================================================
   The site's own address, and the eight characters that failed a deploy.

   `NEXT_PUBLIC_SITE_URL` was set to `sidbuilds.in` — the site's address by any
   reasonable reading, and not a URL. `new URL("sidbuilds.in")` throws, that
   throw happened at module scope in `app/layout.tsx`, and the build died
   collecting page data for `/_not-found` with an `ERR_INVALID_URL` that named
   neither the variable nor the fix.

   Every case below is one somebody can type into a dashboard field. The rule
   is: accept what they obviously meant, and when it genuinely cannot be
   understood, say which variable and what was in it.
   =========================================================================== */

const KEY = "NEXT_PUBLIC_SITE_URL";
let saved: string | undefined;

beforeEach(() => {
  saved = process.env[KEY];
});
afterEach(() => {
  if (saved === undefined) delete process.env[KEY];
  else process.env[KEY] = saved;
});

/** Re-imported per case: the module reads `process.env` when called, but a
 *  fresh import keeps each case honest if that ever stops being true. */
async function origin(value: string | undefined): Promise<string> {
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
  const { siteOrigin } = await import("@/lib/origin");
  return siteOrigin();
}

describe("siteOrigin", () => {
  it.each([
    ["a bare host", "sidbuilds.in", "https://sidbuilds.in"],
    ["a bare host with a subdomain", "www.sidbuilds.in", "https://www.sidbuilds.in"],
    ["the value as documented", "https://sidbuilds.in", "https://sidbuilds.in"],
    ["a trailing slash from a dashboard field", "https://sidbuilds.in/", "https://sidbuilds.in"],
    ["several trailing slashes", "https://sidbuilds.in///", "https://sidbuilds.in"],
    ["surrounding whitespace", "  https://sidbuilds.in  ", "https://sidbuilds.in"],
    ["a preview deployment", "portfolio-abc123.vercel.app", "https://portfolio-abc123.vercel.app"],
    ["localhost with a port", "http://localhost:3000", "http://localhost:3000"],
  ])("accepts %s", async (_what, input, expected) => {
    await expect(origin(input)).resolves.toBe(expected);
  });

  it("never downgrades a bare host to plaintext", () => {
    /* This value ends up in canonicals, og:url and the sitemap. Guessing
       `http` would publish the site's own identity over plaintext, which is a
       worse failure than the one this normalisation exists to fix. */
    expect(process.env).toBeDefined();
    return expect(origin("sidbuilds.in")).resolves.toMatch(/^https:\/\//);
  });

  it("strips a path rather than carrying it into every canonical", async () => {
    /* Callers concatenate — `${siteOrigin()}/sitemap.xml`. An origin is the
       only shape that is safe to do that to. */
    await expect(origin("https://sidbuilds.in/work")).resolves.toBe("https://sidbuilds.in");
  });

  it("names the variable when the value is not salvageable", async () => {
    /* The whole point. The failure it replaces was `ERR_INVALID_URL input:
       'sidbuilds.in'`, which says nothing about where to go and change it. */
    await expect(origin("http://")).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);
    await expect(origin("http://")).rejects.toThrow(/\.env\.example/);
  });

  it("treats an empty value as unset", async () => {
    /* Importing this repo into Vercel offers every key in .env.example, so a
       project can very easily end up with the variable defined and empty —
       the same trap `lib/upstash.ts` documents at length. Empty must take the
       unset path, not normalise to `https://`. */
    delete process.env.CI;
    await expect(origin("   ")).resolves.toBe("https://sidbuilds.in");
  });
});
