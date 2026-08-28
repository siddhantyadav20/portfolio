"use client";

import ThemeToggle from "@/components/home/ThemeToggle";
import ModalSurface, { MODAL_VT } from "@/components/primitives/ModalSurface";
import {
  about,
  intro,
  linkedin,
  timeline,
  type TimelineEntry,
} from "@/content/site";
import { externalLinkProps } from "@/lib/externalLink";
import CopyEmail from "./CopyEmail";
import HeadChart from "./HeadChart";
import styles from "./AboutModal.module.css";

/** The name the card's portrait and this one trade, so one becomes the other. */
export const PORTRAIT_MORPH = "about-portrait";

type Props = {
  open: boolean;
  /** Playing the exit animation — only ever true on the no-morph path. */
  closing?: boolean;
  onClose: () => void;
};

/**
 * The About reader.
 *
 * A PERSONAL PAGE, AND DELIBERATELY NOT A CASE STUDY. It used to be the case
 * study reader with different words in it: the same 1120 column, the same 40px
 * title over a 24px subtitle, the same centred stack, the same dashed rule
 * between blocks. That is the right chassis for an argument about a piece of
 * work and the wrong one for a person — it made "who I am" look like an
 * exhibit, and it read as the fourth case study rather than as the one page on
 * the site written in the first person.
 *
 * So this one keeps the shell, the morph and the theme, and changes everything
 * else:
 *
 *   THE OPENING IS A STATEMENT, NOT A TITLE. The largest type on the site,
 *   set against the portrait rather than above it. The sentence is
 *   `intro.tagline` verbatim — the same line the homepage leads with, because
 *   a personal page that opens with a second, weaker version of its own best
 *   sentence reads as two people talking.
 *
 *   PROSE GETS A MEASURE. The old body ran 24px across the full 960, which is
 *   about ninety characters a line — roughly twice what anybody reads
 *   comfortably. The story column is capped at 34em and nothing else is.
 *
 *   THE FACTS ARE FACTS. A colophon of four, derived rather than restated:
 *   the current role and the one before it come out of `timeline.entries`, the
 *   years out of `dayOne`, the tools out of `about.tools`. Nothing in it can
 *   drift out of step with the homepage, because none of it is a second copy.
 *
 *   THE CAREER IS A LIST. The homepage scrubs the same entries along a
 *   draggable ruler, which is a good toy and a bad way to read eight things in
 *   order. Here they are a column.
 *
 * `data-stage` is the modal shell's entrance choreography and the names are
 * fixed there — title, hero, body, rule, meta — so the sections below borrow
 * whichever beat matches where they sit rather than inventing new ones.
 */
export default function AboutModal({ open, closing = false, onClose }: Props) {
  const { story, facts, path, elsewhere, tools } = about;
  /* Widened to the declared type on the way in. `entries` is written
     `as const satisfies readonly TimelineEntry[]`, which keeps every literal —
     so the optional `kind` simply does not exist on the entries that omit it,
     and reading it off the union is a type error rather than `undefined`. */
  const entries: readonly TimelineEntry[] = timeline.entries;

  /* Newest first — a career reads backwards from where somebody is now, which
     is also the order anybody skims it in. */
  const career = [...entries].reverse();

  /* Posts only. "Currently" has to resolve to a job, and the three most recent
     entries are things shipped while holding one — see `kind` on
     `TimelineEntry`. Without the filter this said "Currently: Task Completion
     Flow, WIN, current focus", which is a project wearing a job's label. */
  const roles = career.filter((entry) => entry.kind !== "work");
  const now = roles[0];

  /* Employers before the current one, newest first and each named once.
     `at >= 0` is the filter and it is not arbitrary: day one in `timeline` is
     the start of the design career, so a negative `at` is university. Without
     it "Before that" read "Mistry.Store, LikeMinds, B.Sc Computer Science",
     which files a degree as a place of work. */
  const before = [
    ...new Set(
      roles
        .filter((entry) => entry.at >= 0 && entry.context !== now?.context)
        .map((entry) => entry.context),
    ),
  ];

  /* The same boundary from the other side — what came before day one. It gets
     its own line rather than being dropped: a computer science degree is the
     reason half of this portfolio is built rather than mocked up. */
  const studied = career.find((entry) => entry.at < 0)?.context ?? null;

  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={onClose}
      label="About Siddhant"
      selectionTint="green"
      actions={<ThemeToggle />}
    >
      <article className={styles.page}>
        {/* --- The opening ------------------------------------------------ */}
        <header className={styles.open}>
          <div
            className={styles.openWords}
            data-stage="title"
            style={MODAL_VT.title}
          >
            <p className={styles.kicker}>
              <span>{story.kicker}</span>
              <span className={styles.kickerRule} aria-hidden="true" />
              <span>{linkedin.name}</span>
            </p>

            <h1 className={styles.statement}>{intro.tagline}</h1>
            <p className={styles.afterStatement}>{story.afterStatement}</p>
          </div>

          <div className={styles.openPortrait} data-stage="hero">
            <div
              className={styles.portrait}
              style={{ viewTransitionName: PORTRAIT_MORPH }}
            >
              <img src="/media/portrait.png" alt="Siddhant Yadav" />
            </div>

            {/* Where the card's orbit ends up. Same three marks, at rest. */}
            <ul className={styles.tools}>
              {tools.map((tool) => (
                <li key={tool.name} className={`${styles.tool} liquid`}>
                  <img src={tool.icon} alt="" width={24} height={24} />
                  <span className="srOnly">{tool.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {/* --- The colophon ------------------------------------------------ */}
        <dl className={styles.facts} data-stage="meta" style={MODAL_VT.meta}>
          <Fact label={facts.basedLabel} value={facts.based} />
          <Fact
            label={facts.currentlyLabel}
            value={now && `${now.title}, ${now.context}`}
          />
          <Fact
            label={facts.beforeLabel}
            value={before.length > 0 ? before.join(", ") : null}
          />
          <Fact label={facts.studiedLabel} value={studied} />
          <Fact
            label={facts.sinceLabel}
            // Floor of the fractional year, the same rule the homepage
            // timeline reads its dates by — not a literal that goes stale.
            value={String(Math.floor(timeline.dayOne))}
          />
        </dl>

        {/* --- The long version -------------------------------------------- */}
        <section className={styles.story} data-stage="body" style={MODAL_VT.body}>
          {story.body ? (
            story.body.map((para) => <p key={para.slice(0, 32)}>{para}</p>)
          ) : (
            /* Said plainly rather than filled with lorem. `data-placeholder`
               is the site's own marking for something unfinished, so this is
               visibly a gap in development and honest in production. */
            <p className={styles.pending} data-placeholder="">
              {story.bodyPending}
            </p>
          )}
        </section>

        {/* --- The path ---------------------------------------------------- */}
        <section className={styles.section}>
          <SectionHead title={path.title} note={path.note} />

          <ol className={styles.path}>
            {career.map((entry) => (
              <li
                key={`${entry.at}-${entry.title}`}
                className={styles.stop}
                /* A post, or something shipped while holding one. The list
                   draws the two differently rather than flattening a career
                   into one undifferentiated column of bold lines. */
                data-kind={entry.kind ?? "role"}
              >
                <span className={styles.year}>
                  {Math.floor(timeline.dayOne + entry.at)}
                </span>
                <span className={styles.stopBody}>
                  <span className={styles.stopTitle}>{entry.title}</span>
                  <span className={styles.stopContext}>{entry.context}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* --- What's in the head ------------------------------------------ */}
        <section className={styles.section}>
          <HeadChart />
        </section>

        {/* --- Elsewhere ---------------------------------------------------- */}
        <section className={styles.section}>
          <SectionHead title={elsewhere.title} note={elsewhere.note} />

          <ul className={styles.links}>
            <li>
              <CopyEmail />
            </li>
            <Link href={linkedin.href} label="LinkedIn" value="Let’s connect" />
            <Link
              href={elsewhere.instagram}
              label="Instagram"
              value={elsewhere.instagramHandle}
            />
            <Link
              href={intro.resumeHref}
              label="Résumé"
              value="PDF, one page"
            />
          </ul>
        </section>
      </article>
    </ModalSurface>
  );
}

/** One line of the colophon. A `null` value is a marked gap, not a blank. */
function Fact({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue} data-placeholder={value ? undefined : ""}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <header className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionNote}>{note}</p>
    </header>
  );
}

/**
 * One destination. Anything that leaves the site opens in a new tab — the
 * shared rule, not a `target` written out here. An undecided destination
 * renders as an inert marked row rather than as a dead link.
 */
function Link({
  href,
  label,
  value,
}: {
  href: string | null;
  label: string;
  value: string;
}) {
  return (
    <li>
      <a
        className={styles.link}
        href={href ?? undefined}
        {...externalLinkProps(href)}
        data-placeholder={href ? undefined : ""}
        aria-disabled={href ? undefined : true}
      >
        <span className={styles.linkLabel}>{label}</span>
        <span className={styles.linkValue}>{value}</span>
        <span className={styles.linkArrow} aria-hidden="true">
          ↗
        </span>
      </a>
    </li>
  );
}
