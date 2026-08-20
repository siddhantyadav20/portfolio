"use client";

import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import CaseStudyModal from "@/components/home/CaseStudyModal";
import { useStudyModal } from "@/components/work/useStudyModal";
import { search } from "@/content/site";
import { search as study } from "@/content/work/search";
import styles from "./SearchExperience.module.css";

/**
 * The Figma "Default" state exactly. The input and category control are real,
 * focusable elements so the card is already keyboard-usable, but nothing is
 * wired to a dataset yet — the functional search (typing, loading, results) is
 * a later phase, and the results state isn't designed yet.
 *
 * The title link used to point at `/work/search`, which did not exist. It now
 * resolves, and a plain left click morphs into the study rather than
 * navigating.
 */
export default function SearchExperience() {
  const { open, closing, close, onLinkClick, prefetch } = useStudyModal(study);

  return (
    <>
    <CardShell radius={48} className={styles.card}>
      {/* The card holds a real input, so it can't itself be a link — the
          heading carries the case-study destination instead. */}
      <div className={styles.heading}>
        <h2 className={styles.title}>
          <a
            href={search.href}
            className={styles.titleLink}
            onMouseEnter={prefetch}
            onClick={onLinkClick}
          >
            {search.title}
          </a>
        </h2>
        <p className={styles.subtitle}>{search.subtitle}</p>
      </div>

      {/* `squircle` like every other rounded box on the site — this one was
          the only surface still drawing a plain rounded rect. */}
      <div className={`${styles.search} squircle`}>
        <div className={styles.inputRow}>
          <label htmlFor="remark-search" className="srOnly">
            Search inspection remarks
          </label>
          <span className={styles.searchIcon} aria-hidden="true">
            <span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/search.svg)", width: 19, height: 20 }} />
          </span>
          <input
            id="remark-search"
            type="search"
            className={styles.input}
            placeholder={search.placeholder}
            autoComplete="off"
          />
          <button type="button" className={styles.send} disabled>
            <span className="srOnly">Search</span>
            <img src="/icons/send.svg" alt="" width={11} height={9} />
          </button>
        </div>

        <button type="button" className={styles.category} disabled>
          {search.category}
          <span className="inkIcon" style={{ ["--icon" as string]: "url(/icons/chevron.svg)", width: 8, height: 4 }} />
        </button>
      </div>

      <GlassChip className={styles.chip}>
        <div className={styles.compare}>
          <span className={styles.before}>{search.before}</span>
          <span className={styles.after}>{search.after}</span>
        </div>
        <span className={styles.delta}>{search.delta}</span>
      </GlassChip>
    </CardShell>

    <CaseStudyModal
      open={open}
      closing={closing}
      onClose={close}
      study={study}
    />
    </>
  );
}
