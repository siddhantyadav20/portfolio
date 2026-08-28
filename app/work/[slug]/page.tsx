import type { Metadata } from "next";
import ThemeToggle from "@/components/home/ThemeToggle";
import GlassAction, { CloseGlyph } from "@/components/primitives/GlassAction";
import EscapeHome from "@/components/work/StudyChrome/EscapeHome";
import StudyReader from "@/components/work/StudyReader";
import StudyShare from "@/components/work/StudyShare";
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
    // The study's accent, on the element the whole page hangs off so the chrome
    // above the reader is in it too — see "Accent themes" in globals.css. It
    // also settles what the page highlights in: the `::selection` rules key on
    // this same attribute, so a study cannot be written in one colour and
    // highlight in another. It used to carry a separate `data-selection` naming
    // a violet nothing else on the page used.
    <main id="main" className={styles.page} data-accent={study.accent ?? "blue"}>
      {/* Figma 258:9690 — Share, on its own at the top left.

          It used to be absent here, on the argument that the address bar
          already holds the URL the modal's button copies. That argument is
          about the URL and the button is not: this is the surface a shared
          link opens, so it is where most readers arrive and the only place
          they are ever offered the chance to pass the study on. Leaving it out
          meant the reader who received the link could not send it to anyone
          else without going to the address bar for it. */}
      <div className={styles.leading}>
        <StudyShare />
      </div>

      <div className={styles.controls}>
        <ThemeToggle />
        <GlassAction href="/" label="Close this case study">
          <CloseGlyph />
        </GlassAction>
      </div>

      {/* And the same close from the keyboard. The modal has had Escape since
          it was written and this page had none, which made one of two surfaces
          that are deliberately identical answer a key the other ignored. Draws
          nothing — see `EscapeHome`. */}
      <EscapeHome href="/" />

      <StudyReader study={study} />
    </main>
  );
}
