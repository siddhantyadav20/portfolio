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
 * is the honest failure — see `SLOTS`.
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
          <div key={image.src} className={styles.mat} style={SLOTS[i]}>
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

/** Fractions of the 832x474 frame — Figma 703:12472, 703:12466 and 703:12469,
 *  in that order, which is back to front. */
const SLOTS: readonly React.CSSProperties[] = [
  { left: pc(34, 832), top: pc(14, 474), width: pc(407, 832), height: pc(207, 474) },
  { left: 0, top: pc(181, 474), width: pc(569, 832), height: pc(293, 474) },
  { left: pc(305, 832), top: pc(53, 474), width: pc(527, 832), height: pc(271, 474) },
];

function pc(value: number, of: number): string {
  return `${(value / of) * 100}%`;
}
