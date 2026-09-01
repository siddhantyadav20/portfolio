"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import SiteFooter from "@/components/home/SiteFooter";
import ThemeToggle from "@/components/home/ThemeToggle";
import ModalSurface, { MODAL_VT } from "@/components/primitives/ModalSurface";
import { about, type Rich } from "@/content/site";
import Greeting from "./Greeting";
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
 * The About reader — Figma 826:1340 (desktop) and 887:7656 (mobile).
 *
 * A PERSONAL PAGE, AND DELIBERATELY NOT A CASE STUDY. The previous version of
 * this reader made that point by inventing its own furniture — a colophon of
 * derived facts, a career column, a section per idea. The redesign makes it a
 * different way, and a simpler one: it looks like a CV that somebody enjoyed
 * writing. A greeting in the coral the live dot uses, a pronunciation joke, a
 * photograph, four things I am good at, and then the two lists everybody
 * actually scrolls for.
 *
 * WHAT CHANGED, AND WHAT SURVIVED.
 *
 *   THE SHAPE IS THE FILE'S. A 240px label against an 832px column, which is
 *   the same measure the case-study reader's asides use — so Experience and
 *   Super Powers read as the same kind of block without either borrowing the
 *   other's component. Desktop puts the year in its own column; mobile moves it
 *   to the right of the employer, which is Figma 887:8631 and not a
 *   simplification I made on the way down.
 *
 *   THE HEAD CHART SURVIVED, AND MOVED. It used to be a section with a heading
 *   over it. It is now what the photograph turns into — hover on a pointer,
 *   press on a touch screen. That is a better home for it than a section: the
 *   joke is that you are looking inside somebody's head, and it lands when the
 *   head you are looking at is the one in the photo above it. See `dissect`.
 *
 *   THE COLOPHON, THE PATH AND THE ELSEWHERE LIST ARE GONE. The first two are
 *   the Experience block now, said once instead of twice, and the third is the
 *   footer — which this reader now carries, because the file gives it one.
 *
 * `data-stage` is the modal shell's entrance choreography and the names are
 * fixed there — title, hero, body, rule, meta — so the blocks below borrow
 * whichever beat matches where they sit rather than inventing new ones.
 */
export default function AboutModal({ open, closing = false, onClose }: Props) {
  const {
    greetings,
    name,
    puns,
    lede,
    portrait,
    dissect,
    dayJob,
    outOfOffice,
    superPowers,
    reel,
    experience,
    education,
  } = about;

  /**
   * Whether the head chart is showing.
   *
   * Pointer devices get this from `:hover` in the stylesheet and never touch
   * this state — a hover that has to round-trip through React is a hover that
   * lags. It exists for the press, which is the only way in on a touch screen,
   * and for the pointer visitor who wants to stop holding still and read the
   * thing.
   */
  const [dissected, setDissected] = useState(false);

  /* Closing puts the photograph back, so reopening never lands on a head that
     is already in pieces. Done on the way out rather than in an effect watching
     `open`: the close is an event, and reacting to the prop it sets would be a
     second render every time the modal is dismissed. */
  function close() {
    setDissected(false);
    onClose();
  }

  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={close}
      label="About Siddhant"
      selectionTint="green"
      actions={<ThemeToggle />}
    >
      <article className={styles.page}>
        {/* --- The opening ------------------------------------------------- */}
        <section className={styles.intro}>
          <div className={styles.introText}>
            <header
              className={styles.header}
              data-stage="title"
              style={MODAL_VT.title}
            >
              <Greeting items={greetings} />
              <h1 className={styles.name}>{name}</h1>
              <p className={styles.puns}>
                {puns.map((pun, i) => (
                  <span className={styles.pun} key={pun}>
                    {i > 0 && <span className={styles.dot} aria-hidden="true" />}
                    {pun}
                  </span>
                ))}
              </p>
            </header>

            <p className={styles.lede} data-stage="body" style={MODAL_VT.body}>
              {lede}
            </p>

            <div className={styles.columns} data-stage="meta">
              <Column title={dayJob.title} body={dayJob.body} />
              <Column title={outOfOffice.title} body={outOfOffice.body} />
            </div>
          </div>

          {/* The photograph, and what is under it. */}
          <Dissect
            portrait={portrait}
            copy={dissect}
            open={dissected}
            onToggle={() => setDissected((d) => !d)}
          />
        </section>

        <hr className={styles.rule} />

        {/* --- Super powers ------------------------------------------------ */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{superPowers.title}</h2>
          <div className={styles.powers}>
            {superPowers.items.map((item) => (
              <div className={styles.power} key={item.title}>
                <h3 className={styles.powerTitle}>{item.title}</h3>
                <p className={styles.powerBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- The strip ---------------------------------------------------
            Full-bleed, and the one element here that breaks the reader's
            column. It scrolls rather than auto-playing: eight of the nine
            plates are still empty, and a marquee of empty plates advertises
            the gap instead of the photographs. */}
        <section
          className={styles.reel}
          aria-label={reel.label}
          tabIndex={0}
          role="group"
        >
          <ul className={styles.plates}>
            {reel.plates.map((plate, i) => (
              <li
                className={styles.plate}
                key={i}
                data-placeholder={plate.src ? undefined : ""}
                style={{
                  width: `${plate.w}px`,
                  height: `${plate.h}px`,
                  marginTop: `${plate.y}px`,
                }}
              >
                {plate.src && (
                  <Image
                    src={plate.src}
                    alt=""
                    width={plate.w}
                    height={plate.h}
                    sizes={`${plate.w}px`}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* --- Experience --------------------------------------------------- */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{experience.title}</h2>
          <ol className={styles.entries}>
            {experience.entries.map((entry) => (
              /* Flat rather than nested, and that is what lets the year sit in
                 its own column on the desktop frame and on the end of the
                 employer's line on the mobile one without being written twice.
                 Both arrangements are `grid-template-areas` over these four. */
              <li className={styles.entry} key={entry.org}>
                <p className={styles.years}>{entry.years}</p>
                <h3 className={styles.org}>{entry.org}</h3>
                <p className={styles.role}>{entry.role}</p>
                <div className={styles.entryProse}>
                  {entry.body.map((para, i) => (
                    <p key={i}>
                      <Runs body={para} />
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <hr className={styles.rule} />

        {/* --- Education ---------------------------------------------------- */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{education.title}</h2>
          <ol className={styles.entries}>
            {education.entries.map((entry) => (
              <li className={styles.entry} key={entry.org}>
                <p className={styles.years}>{entry.years}</p>
                <h3 className={styles.org}>{entry.org}</h3>
                <p className={styles.role}>{entry.role}</p>
                {entry.note && <p className={styles.entryNote}>{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>

      </article>

      {/* Outside the reader's column on purpose. The footer is the width of the
          page rather than of the words — Figma draws it at 1312 in a 1440 frame
          where the column is 1120 — and it now sits in the same frame as the
          homepage's and the case study's. See `.footerFrame`. */}
      <div className={styles.footerFrame}>
        <SiteFooter />
      </div>
    </ModalSurface>
  );
}

/**
 * The photograph, and the head chart under it.
 *
 * A button rather than a div with a hover, and that is the accessibility of it
 * rather than a preference: on a touch screen there is no hover to have, so the
 * only way in is a press — and a press target that is not a control is one a
 * keyboard and a screen reader cannot reach. `aria-pressed` says which way it
 * is, and the label changes with it, so the affordance is legible without
 * seeing the photograph at all.
 *
 * The hover half never reaches React. `:hover` in the stylesheet reveals the
 * chart on a fine pointer, and this state only latches it — so a pointer that
 * is merely passing over costs one paint and no render, and a pointer that
 * pressed keeps the chart when it leaves.
 */
function Dissect({
  portrait,
  copy,
  open,
  onToggle,
}: {
  portrait: (typeof about)["portrait"];
  copy: (typeof about)["dissect"];
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  /* A latched chart should let go when attention does. Escape is the gesture
     everybody already has for "put that back", and it is bound to the element
     rather than the document so it never competes with the modal's own. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      onToggle();
    }
  }

  return (
    <div className={styles.portraitCell} data-stage="hero">
      <button
        type="button"
        ref={ref}
        className={styles.portrait}
        style={{ viewTransitionName: PORTRAIT_MORPH }}
        data-open={open ? "" : undefined}
        aria-pressed={open}
        onClick={onToggle}
        onKeyDown={onKeyDown}
      >
        <Image
          className={styles.portraitImg}
          src={portrait.src}
          alt={portrait.alt}
          width={portrait.width}
          height={portrait.height}
          sizes="(width < 700px) 100vw, 402px"
          priority={false}
        />

        {/* The dissection. `aria-hidden` because the chart's own callouts are
            already a list a screen reader reads, and this copy of it is inside
            a button whose label says what it does. */}
        <span className={styles.chart} aria-hidden="true">
          <HeadChart inset />
        </span>

        <span className={styles.hint}>{open ? copy.close : copy.hint}</span>
        <span className="srOnly">
          {open ? copy.close : copy.hint} — what’s in the head
        </span>
      </button>
    </div>
  );
}

/** One of the two short columns under the lede. */
function Column({ title, body }: { title: string; body: Rich }) {
  return (
    <div className={styles.column}>
      <h2 className={styles.columnTitle}>{title}</h2>
      <p className={styles.columnBody}>
        <Runs body={body} />
      </p>
    </div>
  );
}

/** A paragraph, with the emphasised runs set in full ink. See `Rich`. */
function Runs({ body }: { body: Rich }) {
  return (
    <>
      {body.map((run, i) =>
        typeof run === "string" ? (
          <span key={i}>{run}</span>
        ) : (
          <strong className={styles.strong} key={i}>
            {run.strong}
          </strong>
        ),
      )}
    </>
  );
}
