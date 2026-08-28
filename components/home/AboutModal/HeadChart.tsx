import { about } from "@/content/site";
import { chart, HEAD_BOX, HEAD_PATH } from "./headGeometry";
import styles from "./HeadChart.module.css";

/** One id, because there is one of these on the page. */
const CLIP = "about-head-clip";

/**
 * What's in the head — a pie chart wearing a silhouette.
 *
 * The construction is one trick: the chart is an ordinary full circle of
 * wedges, and the head is a clip path over it. Nothing is drawn to fit the
 * outline, so nothing has to be redrawn when a share changes — the fan sweeps
 * further and the skull crops it, exactly as it would crop a different fan.
 *
 * The dominant interest is not a wedge. It is the head's base fill, in `--ink`,
 * and the fan is painted on top of it — so the largest share reads as *the
 * shape itself* rather than as the biggest coloured region, which is the idea
 * the reference is built on and the reason it is funny. It also means there is
 * no seam down the middle of the face where two fills meet at an angle, which
 * an outlined slice of the same colour would have left.
 *
 * No `"use client"`. It draws once and never moves, so it costs the modal
 * nothing but markup; the entrance is CSS, keyed off `[data-stage]` the way
 * every other block in this reader is.
 */
export default function HeadChart() {
  const { interests } = about;
  const { wedges, head } = chart(interests.items);

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <h2 className={styles.title}>{interests.title}</h2>
        <p className={styles.note}>{interests.note}</p>
      </figcaption>

      <div className={styles.stage}>
        <svg
          className={styles.head}
          /* Cropped to the head, not to the whole frame — the empty half of
             the frame belongs to the callouts. `.head` in the stylesheet puts
             this crop back exactly where the geometry placed it. */
          viewBox={`${HEAD_BOX.x} ${HEAD_BOX.y} ${HEAD_BOX.w} ${HEAD_BOX.h}`}
          /* The figure is decorative twice over: the caption above says what it
             is, and the callouts under it are real text a screen reader reads
             in order. A description here would be the same list a third time. */
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <clipPath id={CLIP}>
              <path d={HEAD_PATH} />
            </clipPath>
          </defs>

          {/* The dominant share, and the silhouette, and the ground the fan is
              painted on — one fill doing all three. */}
          <path d={HEAD_PATH} fill={head.fill} />

          <g clipPath={`url(#${CLIP})`}>
            {wedges.map((wedge) => (
              <path key={wedge.name} d={wedge.path} fill={wedge.fill} />
            ))}
          </g>
        </svg>

        {/* Ordered as the eye reads them — down the fan, then the dominant one.
            The list is the accessible version of the chart, so its order is
            content rather than layout, and it is not the order the shares are
            written in. */}
        <ul className={styles.callouts}>
          {[...wedges, head].map((wedge) => (
            <li
              key={wedge.name}
              className={styles.callout}
              data-side={wedge.label.side}
              style={{
                left: `${wedge.label.x}%`,
                top: `${wedge.label.y}%`,
                ["--swatch" as string]: wedge.fill,
              }}
            >
              <span className={styles.swatch} aria-hidden="true" />
              <span className={styles.share}>{wedge.share}%</span>
              <span className={styles.name}>{wedge.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
