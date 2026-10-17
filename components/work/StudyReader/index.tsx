import SiteFooter from "@/components/home/SiteFooter";
import { MODAL_VT } from "@/components/primitives/ModalSurface";
import QuickLinks, { type QuickLink } from "@/components/work/StudyChrome/QuickLinks";
import ScrollProgress from "@/components/work/StudyChrome/ScrollProgress";
import StudyHero from "@/components/work/StudyHero";
import StudyEnd from "@/components/work/StudyEnd";
import StudyMap from "@/components/work/StudyMap";
import StudyMotion from "@/components/work/StudyMotion";
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
 *
 * It ends in a full-bleed band — Figma 821:1142, the closing block and the
 * site footer on a ground tinted with the study's accent — which is why this
 * returns a fragment rather than one element: the band is the width of the
 * page, not of the 1120 column everything above it is in, so it cannot live
 * inside `.inner`.
 */
export default function StudyReader({ study }: Props) {
  const links = quickLinks(study);

  return (
    <>
      <div className={styles.inner}>
      <ScrollProgress />
      {links.length > 1 && <QuickLinks items={links} />}
      {study.journey && (
        <StudyMap
          journey={study.journey}
          timeline={timelineOf(study, study.journey.after)}
        />
      )}

      <div className={styles.content}>
        <StudyMotion />

        <section id="intro" className={styles.intro}>
          <div className={styles.titleBlock} data-stage="title" style={MODAL_VT.title}>
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

            <p className={styles.subtitle}>{study.subtitle}</p>
          </div>

          {/* Figma 71:7448 — Title, Impact, then Prototype, 64 apart. The
              numbers come *before* the artwork: the outcome of the work is
              the reason to look at a picture of it, and a reader who scrolls
              one screen and leaves should have seen them. This used to be
              Title, hero, then outcomes. */}
          {study.outcomes && (
            <div className={styles.outcomes}>
              <div
                className={styles.outcomeRow}
                /* The sky cards arrive and count; the tinted ones of the
                   other studies are left exactly as they were. */
                data-reveal={study.outcomes.look ? "" : undefined}
              >
                {study.outcomes.items.map((outcome, i) => (
                  <div
                    key={outcome.label}
                    className={`${styles.outcome} squircle`}
                    data-tint={outcome.tint}
                    data-look={study.outcomes?.look}
                    style={{ ["--i" as string]: i }}
                  >
                    {/* The number and what it measures are one figure, 4px
                        apart; the card's own 12px gap is between that pair
                        and the sentence under it. Figma 529:11941. The sky
                        look (1617:9064) puts the figure and an icon on one
                        row, 8 apart inside the figure. */}
                    <div className={styles.outcomeHead}>
                      <div className={styles.outcomeFigure}>
                        <p
                          className={styles.outcomeValue}
                          data-count={study.outcomes?.look ? "" : undefined}
                        >
                          {outcome.value}
                        </p>
                        <p className={styles.outcomeLabel}>{outcome.label}</p>
                      </div>
                      {outcome.icon && (
                        <span
                          className={`inkIcon ${styles.outcomeIcon}`}
                          style={{ ["--icon" as string]: `url(${outcome.icon})` }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <p className={styles.outcomeNote}>{outcome.note}</p>
                    {outcome.fineprint && (
                      <p className={styles.outcomeFineprint}>
                        {outcome.fineprint}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {study.outcomes.note && (
                <p className={styles.outcomeFootnote}>{study.outcomes.note}</p>
              )}
            </div>
          )}

          {study.hero && <StudyHero hero={study.hero} />}

          {study.body && (
            <p className={styles.body} data-stage="body" style={MODAL_VT.body}>
              {study.body}
            </p>
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

        <div className={`dashRule ${styles.separator}`} data-stage="rule" />

        <StudySections sections={study.sections} />
      </div>
      </div>

      {/* Figma 821:1142 — the study ends on a ground of its own.

          It is a sibling of the column rather than the last block in it, and
          that is the whole change: the frame is 1440 wide with its own fill,
          so the ending is a band across the page with the reader's 1120
          re-established inside it. Nested in `.content` it could only have
          been as wide as the column, and a tint that stops 160px short of each
          edge reads as a card somebody forgot to give a radius.

          The footer is inside it, because Figma 821:1327 is inside 821:1142 —
          the closing band runs to the bottom of the page rather than handing
          off to the grey again underneath the last thing on it. */}
      <div className={styles.band}>
        {/* The reader's rule, now the band's own top edge, and full width
            because the band is. */}
        <div className="dashRule" />

        <div className={styles.bandInner}>
          <StudyEnd study={study} />
        </div>

        {/* The same footer component the homepage renders; this is the second
            surface it has, not a second copy of it. Inside the band it takes
            the study's accent for its live dot and its LinkedIn mark. */}
        <div className={styles.footer}>
          <SiteFooter />
        </div>
      </div>
    </>
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
 *
 * The last one is the exception, and it is fixed: every study ends in the same
 * block, so "Comments" is not derived from anything.
 */
function quickLinks(study: CaseStudy): readonly QuickLink[] {
  return [
    { id: "intro", label: "Intro" },
    ...(study.sections ?? []).map((section) => ({
      id: section.id,
      label: section.label ?? section.heading,
    })),
    /* The end of the study is a place you might want to go straight to —
       somebody returning to leave a comment should not have to scroll the
       whole write-up to reach the box. Written here rather than derived,
       because unlike the sections above it this one is not content: every
       study has it, and it is the same words on all of them. */
    { id: "comments", label: "Comments" },
  ];
}

/**
 * The timeline the journey map is converted from — the first timeline block
 * in the section the map takes over from. The map carries a copy of its
 * drawing for the flight from the page into the corner.
 */
function timelineOf(study: CaseStudy, section: string) {
  const blocks = study.sections?.find((s) => s.id === section)?.blocks ?? [];
  for (const block of blocks) {
    if (block.kind === "timeline") return block.timeline;
  }
  return undefined;
}
