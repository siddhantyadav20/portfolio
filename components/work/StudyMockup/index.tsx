import Image from "next/image";
import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyMedia } from "@/content/work";
import styles from "./StudyMockup.module.css";

type Props = {
  image: StudyMedia | null;
  /** Which slot to reserve — see the note on the `mockup` item in
   *  `content/work/types.ts`. Defaults to the phone Figma drew. */
  shape?: "phone" | "screen";
  caption: StudyCaption;
};

/**
 * Figma 757:12844 — one device screen alone in a framed panel.
 *
 * The same plate `StudyExhibit` draws, with nothing beside the screen: the
 * launch section shows what shipped, and there is no diagram to argue with.
 * `image` is `null` until the screen is exported, and the slot is then marked
 * rather than filled — Figma draws it empty too.
 *
 * `shape` widened this past the one frame in the file. The phone is what
 * Figma drew and stays the default; a desktop product screen asks for
 * `"screen"` and gets the panel's full width instead of a 236px column, which
 * is the difference between showing a CRM and showing a picture of a CRM
 * squeezed into a handset.
 */
export default function StudyMockup({
  image,
  shape = "phone",
  caption,
}: Props) {
  /* NO IMAGE, NO FIGURE.
     This used to draw the empty slot below and label it, on the argument that
     Figma draws it empty too. That argument belongs to a file in progress, not
     to a page a hiring manager reads: three studies carrying fourteen dashed
     rectangles read as a broken site rather than as an honest one, and the
     prose around them never depends on the picture. The slot is still here for
     the moment an export lands — it just doesn't ship empty. */
  if (!image) return null;

  return (
    <figure className={styles.block}>
      <div className={`${styles.panel} squircle`} data-shape={shape}>
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className={`${styles.screen} squircle`}
            loading="lazy"
            sizes={
              shape === "screen" ? "(width < 700px) 100vw, 832px" : "236px"
            }
          />
        ) : (
          <div className={`${styles.slot} squircle`} data-placeholder="">
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
