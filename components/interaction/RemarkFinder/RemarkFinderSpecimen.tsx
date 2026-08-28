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
        The old flow, then the one that replaced it — both reading the same
        rows. Type in the field, or press the mic: the matcher is real and the
        ranking puts the remarks you have written before at the top. Arrow down
        and press return, or click a row, and it goes into the report, with what
        reaching it down the tree would have cost. The three dots under the
        field replay the old way.{" "}
        <span className={styles.disclosure}>
          Running on {REMARKS.length} demo remarks across {TAXONOMY.length}{" "}
          categories, standing in for the{" "}
          {LIBRARY_TOTAL.toLocaleString("en-US")} of the real library. The
          dictation is staged; the query it produces is not.
        </span>
      </figcaption>
    </figure>
  );
}
