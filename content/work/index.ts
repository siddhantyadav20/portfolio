import { designSystem } from "./design-system";
import { inspectionPhotos } from "./inspection-photos";
import { search } from "./search";
import type { CaseStudy } from "./types";

export type {
  CaseStudy,
  StudyHero,
  StudyLive,
  StudyMedia,
  StudyMeta,
  StudySection,
} from "./types";
export { heroStill } from "./types";

/**
 * The registry.
 *
 * Order is the order the studies are offered in — currently only used by
 * `sitemap.ts` and `generateStaticParams`, but it is the reading order if a
 * "next study" control is ever added, so it is meaningful rather than
 * alphabetical.
 */
export const STUDIES = [inspectionPhotos, search, designSystem] as const;

export const STUDY_SLUGS = STUDIES.map((s) => s.slug);

/**
 * Look a study up by slug.
 *
 * Returns `undefined` rather than throwing: both callers (the route, which
 * calls `notFound()`, and the `?study=` deep-link reader, which ignores an
 * unknown value) want to handle a miss themselves, and a stale shared link
 * hitting a hard error would be the worst of the three outcomes.
 */
export function getStudy(slug: string): CaseStudy | undefined {
  return STUDIES.find((s) => s.slug === slug);
}

/** Where a study lives as a real URL. Single source, so links can't drift. */
export function studyHref(slug: string): string {
  return `/work/${slug}`;
}
