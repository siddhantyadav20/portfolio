import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeToggle from "@/components/home/ThemeToggle";
import StudyLiveBlock from "@/components/work/StudyLiveBlock";
import StudySections from "@/components/work/StudySections";
import { STUDIES, getStudy, heroStill, studyHref } from "@/content/work";
import styles from "./page.module.css";

/**
 * A case study as a real URL.
 *
 * The primary way into a study is the homepage card morphing into
 * `CaseStudyModal`, exactly as the Canvas card morphs into `CanvasSurface`.
 * This route is the same fallback `app/canvas/page.tsx` is: a shared link, an
 * opened-in-new-tab, a crawler, JavaScript disabled. Both surfaces read the
 * same `content/work` entry, so neither can tell a different story.
 *
 * Until this file existed, `search.href` and `designSystem.href` pointed at
 * 404s — and they were rendered as live anchors, so the homepage was shipping
 * two dead links.
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
      <header className={styles.bar}>
        <Link href="/" className={styles.back}>
          <span aria-hidden="true">&larr;</span> Back
        </Link>
        <ThemeToggle />
      </header>

      <article className={styles.article}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{study.title}</h1>
          <p className={styles.subtitle}>{study.subtitle}</p>
        </div>

        {/* The prototype hero is the modal's own trick — it needs a client
            component and a recording — so it renders here as a still, which is
            what a shared link or a crawler should get.

            A `live` hero is different: it is DOM, it server-renders at its rest
            state, and it costs no image at all. Downgrading it to a screenshot
            on the one surface a recruiter is most likely to open in a new tab
            would be throwing the argument away to save nothing. */}
        {study.hero?.kind === "live" && (
          <div className={`${styles.hero} ${styles.heroLive} squircle`}>
            <StudyLiveBlock view={study.hero.view} bare />
          </div>
        )}

        {study.hero && study.hero.kind !== "live" && (
          <div className={`${styles.hero} squircle`}>
            <Image
              src={heroStill(study.hero).src}
              alt={heroStill(study.hero).alt}
              width={study.hero.width}
              height={study.hero.height}
              className={styles.heroImage}
              // The hero is this page's LCP element, and there is nothing above
              // it that could displace it.
              priority
              sizes="(max-width: 1024px) 100vw, 960px"
            />
          </div>
        )}

        {study.body && <p className={styles.body}>{study.body}</p>}

        <div className={styles.separator} />

        <dl className={styles.meta}>
          {study.meta.map((item) => (
            <div key={item.label} className={styles.metaItem}>
              <dt className={styles.metaLabel}>{item.label}</dt>
              <dd
                className={styles.metaValue}
                data-placeholder={item.value ? undefined : ""}
              >
                {item.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>

        <StudySections sections={study.sections} />
      </article>
    </main>
  );
}
