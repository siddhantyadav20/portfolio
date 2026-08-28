import Image from "next/image";
import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyMedia } from "@/content/work";
import styles from "./StudyMockup.module.css";

type Props = {
  image: StudyMedia | null;
  caption: StudyCaption;
};

/**
 * Figma 757:12844 — one device screen alone in a framed panel.
 *
 * The same plate `StudyExhibit` draws, with nothing beside the screen: the
 * launch section shows what shipped, and there is no diagram to argue with.
 * `image` is `null` until the screen is exported, and the slot is then marked
 * rather than filled — Figma draws it empty too.
 */
export default function StudyMockup({ image, caption }: Props) {
  return (
    <figure className={styles.block}>
      <div className={`${styles.panel} squircle`}>
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className={styles.screen}
            loading="lazy"
            sizes="236px"
          />
        ) : (
          <div className={styles.slot} data-placeholder="">
            <span className="srOnly">
              The screen that shipped, not yet exported
            </span>
          </div>
        )}
      </div>

      <FigureLabel caption={caption} />
    </figure>
  );
}
