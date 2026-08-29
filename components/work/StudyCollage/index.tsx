import Image from "next/image";
import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyMedia } from "@/content/work";
import styles from "./StudyCollage.module.css";

type Props = {
  images: readonly StudyMedia[];
  caption: StudyCaption;
};

/**
 * Figma 703:12474 — three analytics captures overlapping inside one 832x474
 * frame, and the label under them.
 *
 * The positions are the design's and they are not a grid, so they are written
 * here rather than authored in `content/work`: an editor choosing which three
 * screenshots to show should not also have to place them. Three is the number
 * the layout knows; a fourth would fall back to sitting under the third, which
 * is the honest failure — see the slot rules in the stylesheet.
 *
 * Everything is a percentage of the frame's own box, and the box carries the
 * design's aspect ratio, so the arrangement survives the reader being narrower
 * than 1440 instead of drifting apart at the seams.
 */
export default function StudyCollage({ images, caption }: Props) {
  return (
    <figure className={styles.block}>
      <div className={styles.frame}>
        {images.map((image, i) => (
          <div key={image.src} className={styles.mat} data-slot={i}>
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className={styles.shot}
              loading="lazy"
              sizes="(max-width: 900px) 70vw, 570px"
            />
          </div>
        ))}
      </div>

      <FigureLabel caption={caption} />
    </figure>
  );
}

/* Where each capture sits is in the stylesheet now, keyed by `data-slot`.

   It was three inline style objects, which is the one place CSS cannot reach:
   the phone frame stacks these three differently — same overlap, different
   rectangle — and an inline `left` cannot be answered by a media query without
   `!important` on every property. See StudyCollage.module.css. */
