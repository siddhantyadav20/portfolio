import type { MetadataRoute } from "next";
import { STUDIES } from "@/content/work";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://siddhantyadav.com";

/**
 * Every page worth indexing, generated from the same registry the routes are.
 *
 * `/canvas` is here deliberately. It is a real route with real content rather
 * than a decoration — it exists precisely so a shared link, a crawler and a
 * JavaScript-less visitor get the board — and leaving it out would mean the
 * one page that is hardest to describe in words is also the one nobody can
 * find.
 */
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
    ...STUDIES.map((study) => ({
      url: `${SITE}/work/${study.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
