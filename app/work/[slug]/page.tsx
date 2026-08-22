import type { Metadata } from "next";
import ThemeToggle from "@/components/home/ThemeToggle";
import GlassAction, { CloseGlyph } from "@/components/primitives/GlassAction";
import StudyReader from "@/components/work/StudyReader";
import { STUDIES, getStudy, studyHref } from "@/content/work";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

/**
 * A case study as a real URL.
 *
 * The primary way into a study is the homepage card morphing into
 * `CaseStudyModal`, exactly as the Canvas card morphs into `CanvasSurface`.
 * This route is the same fallback `app/canvas/page.tsx` is: a shared link, an
 * opened-in-new-tab, a crawler, JavaScript disabled.
 *
 * It used to be a *different layout* over the same data — a narrower column of
 * prose with a "← Back" link where the modal has its control cluster, no
 * outcomes, no rail, and a flat still where the modal runs the prototype. So
 * the Share button handed out a link that opened something other than what the
 * person who copied it was looking at. Both surfaces now render `StudyReader`,
 * and the only thing this file still owns is the chrome around it: the same
 * two clusters the modal draws, with the close going home instead of popping
 * an overlay.
 */

export function generateStaticParams() {
  return STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const study = getStudy(slug);
  if (!study) return {};

  return {
    title: study.title,
    description: study.subtitle,
    alternates: { canonical: studyHref(study.slug) },
    openGraph: {
      title: study.title,
      description: study.subtitle,
      url: studyHref(study.slug),
      type: "article",
    },
    /** Not redundant with `openGraph`. Unset, these fall through to the root's
     *  twitter block, so X advertised the homepage's title and description for
     *  a URL LinkedIn was correctly showing as the study — one link, two
     *  identities, depending on where it was pasted. */
    twitter: {
      card: "summary_large_image",
      title: study.title,
      description: study.subtitle,
    },
  };
}

export default async function StudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const study = getStudy(slug);

  // A slug that isn't in the registry is a stale or mistyped link, not an
  // error worth a stack trace.
  if (!study) notFound();

  return (
    // The same purple the modal selects in, so a shared link reads as the
    // surface it stands in for. See "Selection" in globals.css.
    <main id="main" className={styles.page} data-selection="violet">
      {/* Share is deliberately absent from this surface and not a gap: the
          address bar already holds exactly the URL the modal's button copies,
          and a control that duplicates the browser's own is a control that
          has to be explained. */}
      <div className={styles.controls}>
        <ThemeToggle />
        <GlassAction href="/" label="Close this case study">
          <CloseGlyph />
        </GlassAction>
      </div>

      <StudyReader study={study} />
    </main>
  );
}
