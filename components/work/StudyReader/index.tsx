import { MODAL_VT } from "@/components/primitives/ModalSurface";
import QuickLinks, { type QuickLink } from "@/components/work/StudyChrome/QuickLinks";
import ScrollProgress from "@/components/work/StudyChrome/ScrollProgress";
import StudyHero from "@/components/work/StudyHero";
import StudyOutro from "@/components/work/StudyOutro";
import StudySections from "@/components/work/StudySections";
import type { CaseStudy } from "@/content/work";
import styles from "./StudyReader.module.css";

type Props = {
  study: CaseStudy;
};

/**
 * A case study, from the helpers line down to the last section — Figma
 * "Case Study - Modal", node 62:3688.
 *
 * One component, two homes, and that is the point rather than a convenience.
 * The modal that a homepage card morphs into and the `/work/<slug>` route a
 * shared link opens used to be two different layouts over one data file: the
 * modal was the design, and the route was a plainer column of prose with a
 * "← Back" link at the top. So the person who pasted the link and the person
 * who received it were looking at two different pages, which is the thing
 * `useStudyUrl` and the Share button exist to prevent.
 *
 * Now the route renders this, the modal renders this inside `ModalSurface`,
 * and the only difference left between them is the shell around it — a plate
 * with a close button, or the page itself.
 *
 * No `"use client"`, deliberately. Rendered from the route it stays a server
 * component and ships nothing but the two chrome islands and the hero's
 * playback controls; rendered from inside the modal, which is a client
 * component, it compiles into that graph instead. Same file, both ways.
 */
export default function StudyReader({ study }: Props) {
  const links = quickLinks(study);

  return (
    <div className={styles.inner}>
      <ScrollProgress />
      {links.length > 1 && <QuickLinks items={links} />}

      <div className={styles.content}>
        <section id="intro" className={styles.intro}>
          <div className={styles.titleBlock} data-stage="title" style={MODAL_VT.title}>
            <div className={styles.titleGroup}>
              {study.helpers && (
                <p className={styles.helpers}>
                  {study.helpers.map((helper, i) => (
                    <span key={helper} className={styles.helper}>
                      {/* The dot is drawn rather than typed: Figma has it as a
                          6px ellipse at 25% ink, which is a shade and a size
                          no interpunct in the UI face happens to be. */}
                      {i > 0 && <span className={styles.dot} aria-hidden="true" />}
                      {helper}
                    </span>
                  ))}
                </p>
              )}

              <h1 className={styles.title}>{study.title}</h1>
            </div>

            <p className={styles.subtitle}>{study.subtitle}</p>
          </div>

          {study.hero && <StudyHero hero={study.hero} />}

          {study.body && (
            <p className={styles.body} data-stage="body" style={MODAL_VT.body}>
              {study.body}
            </p>
          )}

          {study.outcomes && (
            <div className={styles.outcomes}>
              <div className={styles.outcomeRow}>
                {study.outcomes.items.map((outcome) => (
                  <div
                    key={outcome.label}
                    className={`${styles.outcome} squircle`}
                    data-tint={outcome.tint}
                  >
                    {/* The number and what it measures are one figure, 4px
                        apart; the card's own 12px gap is between that pair
                        and the sentence under it. Figma 529:11941. */}
                    <div className={styles.outcomeFigure}>
                      <p className={styles.outcomeValue}>{outcome.value}</p>
                      <p className={styles.outcomeLabel}>{outcome.label}</p>
                    </div>
                    <p className={styles.outcomeNote}>{outcome.note}</p>
                  </div>
                ))}
              </div>

              {study.outcomes.note && (
                <p className={styles.outcomeFootnote}>{study.outcomes.note}</p>
              )}
            </div>
          )}

          {/* The four-row meta list, for the two studies that have not been
              through the redesign. A study with a `helpers` line has said all
              of this above the title already. */}
          {!study.helpers && study.meta.length > 0 && (
            <dl className={styles.meta} data-stage="meta" style={MODAL_VT.meta}>
              {study.meta.map((item) => (
                <div key={item.label} className={styles.metaItem}>
                  <dt className={styles.metaLabel}>{item.label}</dt>
                  {/* An em dash, not an empty cell: the row is part of the
                      study's scaffold and should stay legible while
                      unwritten. */}
                  <dd
                    className={styles.metaValue}
                    data-placeholder={item.value ? undefined : ""}
                  >
                    {item.value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <div className={styles.separator} data-stage="rule" />

        <StudySections sections={study.sections} />

        <StudyOutro study={study} />
      </div>
    </div>
  );
}

/**
 * The rail's items — the intro, then every section that has an `id`.
 *
 * Derived rather than authored, so a section cannot be published without
 * appearing in the rail and the rail cannot point at a heading that does not
 * exist. Figma draws five lines for this study and three of the five sections
 * are written; the two that are not simply have no entry yet, which is a more
 * honest thing for the rail to say than a line that scrolls nowhere.
 */
function quickLinks(study: CaseStudy): readonly QuickLink[] {
  return [
    { id: "intro", label: "Intro" },
    ...(study.sections ?? []).map((section) => ({
      id: section.id,
      label: section.label ?? section.heading,
    })),
  ];
}
