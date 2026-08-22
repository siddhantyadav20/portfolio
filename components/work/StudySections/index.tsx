import Image from "next/image";
import { Fragment } from "react";
import FigureLabel from "@/components/work/FigureLabel";
import StudyExhibit from "@/components/work/StudyExhibit";
import StudyLiveBlock from "@/components/work/StudyLiveBlock";
import type { StudyBlock, StudySection } from "@/content/work";
import styles from "./StudySections.module.css";

type Props = {
  sections: readonly StudySection[] | null;
  className?: string;
};

/**
 * The long-form body of a case study, shared by the modal and the `/work`
 * route so the two can't drift.
 *
 * A section is an eyebrow, a display heading, and an ordered list of blocks.
 * The blocks used to be three fixed slots — prose, then figures, then at most
 * one specimen — which was the right order for the argument the Design System
 * study makes and had no way to express the Inspection redesign: an aside in
 * the margin, a framed exhibit, a tinted panel the section builds toward. The
 * order is now the author's, because it is part of the writing.
 *
 * Every section carries an `id`, which is what the rail at the left edge
 * scrolls to and what a deep link lands on.
 *
 * When `sections` is `null` this renders a short, plain note rather than
 * nothing. Rendering nothing would leave a study that looks complete and
 * merely brief; the note says which part is missing. It is deliberately not
 * styled to look like an error — the rest of the study is real. The same note
 * appears under a section whose blocks are empty, which is how a heading can
 * be published before the words under it are written.
 *
 * Unlike `[data-placeholder]`, which stays visually identical to the finished
 * thing because those are *links* whose destination is pending, this is
 * missing prose and has to read as missing.
 */
export default function StudySections({ sections, className }: Props) {
  if (!sections || sections.length === 0) {
    return (
      <p className={`${styles.pending} ${className ?? ""}`} data-placeholder="">
        The full write-up for this project is still being written.
      </p>
    );
  }

  return (
    <div className={`${styles.sections} ${className ?? ""}`}>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {/* Figma 553:12412 — the same dashed rule that divides the intro
              from the first section, between every pair after it. Drawn here
              rather than by `StudyReader` because only this component knows
              how many sections there are; the reader draws the first one,
              which is the boundary between two different things. */}
          {index > 0 && <div className={styles.separator} />}

          <section id={section.id} className={styles.section}>
            <header className={styles.head}>
              {section.eyebrow && (
                <p className={styles.eyebrow}>
                  <span className={styles.marker} aria-hidden="true" />
                  {section.eyebrow}
                </p>
              )}
              <h2 className={styles.heading}>{section.heading}</h2>
            </header>

            {section.blocks.length === 0 ? (
              <p className={styles.pending} data-placeholder="">
                This section is still being written.
              </p>
            ) : (
              section.blocks.map((block, i) => <Block key={i} block={block} />)
            )}
          </section>
        </Fragment>
      ))}
    </div>
  );
}

/**
 * One block.
 *
 * Keyed on index by the caller, which is the right key here for the reason it
 * usually isn't: blocks have no identity beyond their position, that position
 * is fixed at build time, and the list never reorders.
 */
function Block({ block }: { block: StudyBlock }) {
  switch (block.kind) {
    case "prose":
      return (
        <div className={styles.prose}>
          {block.body.map((paragraph, i) => (
            <p key={i} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
      );

    /* Figma 529:11824 — 240px of lead, a 48px gutter, and the rest. The lead
       is the section reduced to a sentence; the column beside it is the
       argument for that sentence, and any figure belongs in the column rather
       than across both, because it is evidence for the argument. */
    case "aside":
      return (
        <div className={styles.aside}>
          <p className={styles.lead}>{block.lead}</p>
          <div className={styles.asideBody}>
            {block.body.map((paragraph, i) => (
              <p key={i} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}

            {block.figure && (
              <figure className={styles.inlineFigure}>
                <div className={styles.shot}>
                  <Image
                    src={block.figure.src}
                    alt={block.figure.alt}
                    width={block.figure.width}
                    height={block.figure.height}
                    className={styles.shotImage}
                    loading="lazy"
                    sizes="(max-width: 900px) 100vw, 832px"
                  />

                  {/* Figma 529:12089/12091 — the two ticket titles this study
                      is about, laid over the ones the board happened to be
                      showing. Positioned as fractions of the frame so they
                      travel with it. */}
                  {block.figure.overlays?.map((o) => (
                    <span
                      key={o.text}
                      className={styles.overlay}
                      style={{
                        left: `${o.left * 100}%`,
                        top: `${o.top * 100}%`,
                        width: `${o.width * 100}%`,
                        height: `${o.height * 100}%`,
                      }}
                    >
                      {o.text}
                    </span>
                  ))}
                </div>
                <FigureLabel caption={block.figure.caption} />
              </figure>
            )}
          </div>
        </div>
      );

    /* Figma 548:12177 — a turn in the argument. Set in the UI face and one
       step down in weight from a section heading, so it reads as a beat
       inside the section rather than as the start of a new one. */
    case "note":
      return (
        <div className={styles.note}>
          <p className={styles.noteEyebrow}>{block.eyebrow}</p>
          <h3 className={styles.noteHeading}>{block.heading}</h3>
          <div className={styles.noteBody}>
            {block.body.map((paragraph, i) => (
              <p key={i} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      );

    /* Figma 548:12210 — the tinted panel the section arrives at. */
    case "insight":
      return (
        <aside className={`${styles.insight} squircle`}>
          <p className={styles.insightEyebrow}>
            <span
              className="inkIcon"
              style={{
                ["--icon" as string]: "url(/icons/lamp-charge.svg)",
                width: 24,
                height: 24,
              }}
              aria-hidden="true"
            />
            {block.eyebrow}
          </p>
          <h3 className={styles.insightHeading}>{block.heading}</h3>
          {block.body.map((paragraph, i) => (
            <p key={i} className={styles.insightBody}>
              {paragraph}
            </p>
          ))}

          {/* Figma 553:12231 — the inspector, half out of the panel's bottom
              right corner. Decorative, and clipped by the panel's own radius. */}
          <Image
            src="/media/inspector.png"
            alt=""
            aria-hidden="true"
            width={154}
            height={254}
            className={styles.insightFigure}
            loading="lazy"
            sizes="154px"
          />
        </aside>
      );

    case "exhibit":
      return <StudyExhibit view={block.view} caption={block.caption} />;

    case "figure":
      return (
        <figure className={styles.figure}>
          <Image
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            className={styles.image}
            // Every figure is below the fold on both surfaces — the modal
            // opens at the title and the route starts at the hero.
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 960px"
          />
          {block.caption && (
            <figcaption className={styles.caption}>{block.caption}</figcaption>
          )}
        </figure>
      );

    case "live":
      return <StudyLiveBlock view={block.view} />;
  }
}
