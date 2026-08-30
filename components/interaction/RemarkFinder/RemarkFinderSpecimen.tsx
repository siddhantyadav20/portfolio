"use client";

import RemarkFinder from "./index";
import { LIBRARY_TOTAL, REMARKS, TAXONOMY } from "@/content/remarks";
import styles from "./RemarkFinderSpecimen.module.css";

type Props = {
  /** No frame, no caption — just the running instrument, filling whatever box
   *  it is given. What the study's hero wants. */
  bare?: boolean;
  className?: string;
};

/**
 * The finder as a block someone can read: the running thing, and a line saying
 * what it is and what it is not.
 *
 * The homepage card lays out no caption at all, because there the surrounding
 * copy — a struck-through "Navigation first" over "Search first" — is the
 * caption. Everywhere the instrument appears in prose it wants this instead,
 * sized by the column it is in, with the sample disclosed in as many words.
 *
 * That disclosure is not boilerplate. `104,122` is Siddhant's real number and
 * the corpus underneath this is sixty-one remarks written for the site, and a
 * figure that let a reader conflate the two would be the one dishonest thing on
 * a page arguing for honest work.
 */
export default function RemarkFinderSpecimen({ bare = false, className }: Props) {
  if (bare) {
    return (
      <span className={[styles.bare, className].filter(Boolean).join(" ")}>
        <RemarkFinder cue="view" />
      </span>
    );
  }

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")}>
      <div className={`${styles.frame} squircle`}>
        <RemarkFinder cue="view" />
      </div>

      <figcaption className={styles.caption}>
        The screen that replaced the drill-down. Type in the field: the matcher
        is real, and the ranking puts the remarks you have written before above
        the ones the library merely has — the two counts on every row are why
        that is possible at all. Press return, or pick a suggestion, and the
        findings come back with the branch each was filed under, which is the
        evidence for the whole thing: a set spread across that many branches is
        not something a walk down the tree could have produced. Edit one and add
        it, the way the report actually gets written.{" "}
        <span className={styles.disclosure}>
          Running on {REMARKS.length} demo remarks across {TAXONOMY.length}{" "}
          categories, standing in for the{" "}
          {LIBRARY_TOTAL.toLocaleString("en-US")} of the real library. Only the
          pause on the loader is staged; the query underneath it is not.
        </span>
      </figcaption>
    </figure>
  );
}
