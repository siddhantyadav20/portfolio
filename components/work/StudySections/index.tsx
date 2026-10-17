import Image from "next/image";
import { Fragment } from "react";
import DashedFrame from "@/components/primitives/DashedFrame";
import FigureLabel from "@/components/work/FigureLabel";
import StudyCarousel from "@/components/work/StudyCarousel";
import StudyCollage from "@/components/work/StudyCollage";
import StudyExhibit from "@/components/work/StudyExhibit";
import StudyLiveBlock from "@/components/work/StudyLiveBlock";
import StudyMockup from "@/components/work/StudyMockup";
import StickyBar from "@/components/work/StickyBar";
import StudyConstraints from "@/components/work/StudyConstraints";
import StudyPanel from "@/components/work/StudyPanel";
import StudyQuotes from "@/components/work/StudyQuotes";
import StudyScreens from "@/components/work/StudyScreens";
import StudyStats from "@/components/work/StudyStats";
import StudyTable from "@/components/work/StudyTable";
import StudyTimeline from "@/components/work/StudyTimeline";
import type {
  AsideItem,
  StudyBlock,
  StudySection,
  StudyText,
} from "@/content/work";
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
          {index > 0 && <div className={`dashRule ${styles.separator}`} />}

          <section
            id={section.id}
            className={styles.section}
            data-rhythm={section.rhythm}
            data-measure={section.measure}
          >
            <header className={styles.head}>
              {section.eyebrow && (
                <p className={styles.eyebrow}>
                  <span className={styles.marker} aria-hidden="true" />
                  {section.eyebrow}
                </p>
              )}
              {/* Figma 1617:9970 — an icon, the heading and a muted note on
                  one row, 16 apart. A plain heading is the same row with one
                  thing in it. */}
              <div className={styles.headingRow}>
                {section.icon && (
                  <span
                    className={`inkIcon ${styles.headingIcon}`}
                    style={{ ["--icon" as string]: `url(${section.icon})` }}
                    aria-hidden="true"
                  />
                )}
                <h2 className={styles.heading}>{section.heading}</h2>
                {section.headingNote && (
                  <p className={styles.headingNote}>{section.headingNote}</p>
                )}
              </div>
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
       argument for that sentence, and every artefact belongs in the column
       rather than across both, because it is evidence for the argument. */
    case "aside":
      return (
        <div className={styles.aside}>
          <p className={styles.lead}>{block.lead}</p>
          <div className={styles.asideBody} data-spacing={block.spacing}>
            {block.body.map((item, i) => (
              <Item key={i} item={item} />
            ))}
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

    /* Figma 548:12210 — the tinted panel the section arrives at.

       The inspector illustration that used to hang out of the bottom right
       corner is gone from the file, and with it from here. It was artwork
       from one study rendered by a component three of them share, and the
       panel it was decorating now has to hold two lines of argument across
       its full width rather than around a photograph. */
    case "insight":
      return (
        <aside className={styles.insight}>
          {/* The dashed outline, drawn rather than bordered — Figma's dashes
              are 6 on and 4 off, and a CSS `dashed` border cannot say that.
              See `DashedFrame`. */}
          <DashedFrame radius={24} dash="6 4" />

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

          <div className={styles.insightContent}>
            <h3 className={styles.insightHeading}>{block.heading}</h3>
            {/* No gap between the paragraphs: Figma sets both lines in one
                text node, so they read as one thought broken over two lines
                rather than as two paragraphs. */}
            <div className={styles.insightBody}>
              {block.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </aside>
      );

    case "exhibit":
      /* `styles.exhibit` carries no properties of its own — it exists so the
         section can see, in CSS, that an exhibit follows an aside and close
         the 120px gap to 64. Figma 761:13188 groups the two into one frame,
         which is the same statement made with a frame instead of a rule. */
      return (
        <StudyExhibit
          view={block.view}
          caption={block.caption}
          className={styles.exhibit}
        />
      );

    case "figure":
      return (
        <figure className={styles.figure}>
          <Image
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            className={`${styles.image} squircle`}
            // Every figure is below the fold on both surfaces — the modal
            // opens at the title and the route starts at the hero.
            loading="lazy"
            sizes="(width < 700px) 100vw, 960px"
          />
          {block.caption && (
            <figcaption className={styles.caption}>{block.caption}</figcaption>
          )}
        </figure>
      );

    case "live":
      return <StudyLiveBlock view={block.view} />;

    case "panel":
      return (
        <StudyPanel
          intro={block.intro && <Rich text={block.intro} />}
          media={block.media}
          radius={block.radius}
          aspect={block.aspect}
          badge={block.badge}
          caption={block.caption}
        />
      );

    case "stats":
      return <StudyStats heading={block.heading} cards={block.cards} />;

    case "constraints":
      return <StudyConstraints items={block.items} last={block.last} />;

    /* Figma 1637:10162 — the problem the section has to solve, centred, in
       amber, under a ringed danger mark. The dashed edge is a plain CSS
       `dashed` border here rather than a `DashedFrame`: the file draws this
       one with the default dash, not the insight's 6-on-4-off. */
    case "challenge":
      return (
        <aside className={styles.challenge} data-reveal="">
          <div className={styles.challengeHead}>
            <span className={styles.challengeRing} aria-hidden="true">
              <span
                className="inkIcon"
                style={{
                  ["--icon" as string]: "url(/icons/danger-bold.svg)",
                  width: 24,
                  height: 24,
                }}
              />
            </span>
            <p className={styles.challengeEyebrow}>{block.eyebrow}</p>
          </div>
          <div className={styles.challengeContent}>
            <h3 className={styles.challengeHeading}>{block.heading}</h3>
            <p className={styles.challengeBody}>{block.body}</p>
          </div>
        </aside>
      );

    case "timeline":
      return (
        <StudyTimeline
          timeline={block.timeline}
          caption={block.caption}
          className={styles.timeline}
        />
      );

    /* Figma 1617:9574 — the versions under a dashed rule, the one this
       section is about in the accent and standing on its bar. A strip of
       labels rather than tabs: the file has one version written, and a tab
       that switches to nothing is worse than a label that names what is
       coming. It pins to the top for the rest of the section — see
       StickyBar. */
    case "versions":
      return (
        <StickyBar className={styles.versionsPin}>
          <ol className={styles.versions} data-reveal="">
            {block.items.map((item, i) => (
              <li
                key={item.label}
                className={styles.version}
                aria-current={i === block.active ? "step" : undefined}
                style={{ ["--i" as string]: i }}
              >
                <span className={styles.versionText}>
                  <span className={styles.versionKicker}>{item.kicker}</span>
                  <span className={styles.versionLabel}>{item.label}</span>
                </span>
                <span className={styles.versionBar} aria-hidden="true" />
              </li>
            ))}
          </ol>
        </StickyBar>
      );

    case "screens":
      return (
        <StudyScreens
          pills={block.pills}
          active={block.active}
          phones={block.phones}
          caption={block.caption}
        />
      );
  }
}

/** A paragraph rather than an artefact. `Array.isArray` alone does not narrow
 *  a readonly array out of a union, so the guard is spelled out. */
function isText(item: AsideItem): item is StudyText {
  return typeof item === "string" || Array.isArray(item);
}

/**
 * A `StudyText` — runs of muted prose with the odd phrase set in ink.
 *
 * `strong` rather than a styled span, because it is emphasis and a screen
 * reader should be allowed to say so; the stylesheet takes the bold back down
 * to the file's medium.
 */
function Rich({ text }: { text: StudyText }) {
  if (typeof text === "string") return text;
  return text.map((run, i) =>
    typeof run === "string" ? (
      <Fragment key={i}>{run}</Fragment>
    ) : (
      <strong key={i} className={styles.strong}>
        {run.strong}
      </strong>
    ),
  );
}

/**
 * One thing in an aside's column — Figma 529:11515 and the three frames like
 * it.
 *
 * A bare string is a paragraph. Everything else is an artefact, and every
 * artefact carries its own indexed label, which is why none of them are
 * rendered by this file: the table, the collage, the carousel and the mockup
 * are each a figure with a caption and their own behaviour at narrow widths.
 */
function Item({ item }: { item: AsideItem }) {
  if (isText(item)) {
    return (
      <p className={styles.paragraph}>
        <Rich text={item} />
      </p>
    );
  }

  switch (item.kind) {
    case "figure":
      return (
        <figure className={styles.inlineFigure}>
          <div className={styles.shot}>
            <Image
              src={item.media.src}
              alt={item.media.alt}
              width={item.media.width}
              height={item.media.height}
              className={styles.shotImage}
              loading="lazy"
              sizes="(width < 700px) 100vw, 832px"
            />

          </div>
          <FigureLabel caption={item.caption} />
        </figure>
      );

    case "collage":
      return <StudyCollage images={item.images} caption={item.caption} />;

    case "table":
      return (
        <StudyTable
          columns={item.columns}
          rows={item.rows}
          caption={item.caption}
        />
      );

    case "carousel":
      return <StudyCarousel slides={item.slides} caption={item.caption} />;

    case "mockup":
      return (
        <StudyMockup
          image={item.image}
          shape={item.shape}
          caption={item.caption}
        />
      );

    case "quotes":
      return <StudyQuotes groups={item.groups} look={item.look} />;
  }
}
