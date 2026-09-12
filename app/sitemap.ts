import type { MetadataRoute } from "next";
import { found } from "@/content/found";
import { STUDIES } from "@/content/work";
import { siteOrigin } from "@/lib/origin";

/**
 * Every page worth indexing, generated from the same registry the routes are.
 *
 * `/canvas` is here deliberately. It is a real route with real content rather
 * than a decoration — it exists precisely so a shared link, a crawler and a
 * JavaScript-less visitor get the board — and leaving it out would mean the
 * one page that is hardest to describe in words is also the one nobody can
 * find.
 */
const SITE = siteOrigin();

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE}/canvas`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}${found.href}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...STUDIES.map((study) => ({
      url: `${SITE}/work/${study.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
