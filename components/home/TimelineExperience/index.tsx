import { timeline } from "@/content/site";
import styles from "./TimelineExperience.module.css";

/**
 * Figma node 1:69. In Figma the whole card is rotated -90deg; here it is simply
 * built upright, which is the same picture with none of the transform.
 *
 * The ruler is generated rather than transcribed — Figma has ~40 identical tick
 * layers, and PROJECT.md explicitly prefers generating repeated decorative
 * geometry. Scrubbing between years is Phase 6; the per-year content shape is
 * already in place so only the active index needs to become state.
 */

/** Vertical distance between two milestone ticks, from Figma. */
const STEP = 61.5;
/** Small filler ticks drawn between each pair of milestones. */
const FILLERS = 5;

export default function TimelineExperience() {
  const { milestones, activeYear, entries } = timeline;
  const entry = entries[activeYear];

  return (
    <div className={styles.card} data-prox-card="">
      <div className={styles.scale} aria-hidden="true">
        {milestones.map((year, i) => (
          <div
            key={year}
            className={styles.group}
            style={{ top: `${i * STEP}px` }}
            data-dim={year < 0 ? "" : undefined}
          >
            <span className={styles.milestone} />
            <span className={styles.number}>{year}</span>

            {i < milestones.length - 1 && (
              <>
                {Array.from({ length: FILLERS }, (_, f) => (
                  <span
                    key={`a${f}`}
                    className={styles.filler}
                    style={{ top: `${8 + f * 4}px` }}
                  />
                ))}
                <span className={styles.middle} />
                {Array.from({ length: FILLERS }, (_, f) => (
                  <span
                    key={`b${f}`}
                    className={styles.filler}
                    style={{ top: `${38.5 + f * 4}px` }}
                  />
                ))}
              </>
            )}
          </div>
        ))}

        <img
          src="/icons/dragger.svg"
          alt=""
          className={styles.dragger}
          style={{ top: `${(milestones.length - 1) * STEP - 6}px` }}
        />
      </div>

      {entry ? (
        <div className={styles.content}>
          <p className={styles.years}>
            {entry.years}
            <span className={styles.unit}>{entry.unit}</span>
          </p>
          <p className={styles.date}>{entry.date}</p>
          <hr className={styles.separator} />
          <p className={styles.company}>{entry.company}</p>
          <p className={styles.role}>{entry.role}</p>
        </div>
      ) : (
        <div className={styles.content} data-placeholder="">
          <p className={styles.company}>No entry for this year yet</p>
        </div>
      )}
    </div>
  );
}
