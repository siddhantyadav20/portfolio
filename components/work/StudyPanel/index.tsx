import Image from "next/image";
import type { ReactNode } from "react";
import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyMedia } from "@/content/work";
import styles from "./StudyPanel.module.css";

type Props = {
  /** The line above the panel, already rendered — it carries emphasis runs,
   *  and those are drawn by the section renderer. */
  intro?: ReactNode;
  media: Omit<StudyMedia, "caption">;
  radius: 16 | 24;
  aspect?: string;
  badge?: { readonly label: string; readonly logo: string };
  caption: StudyCaption;
};

/**
 * Figma 1617:9399 and 1617:9437 — a picture on a frosted panel, 32 in, with
 * its label under the panel's right edge.
 *
 * Two things in the file use it: a product screenshot (ISN's report writer)
 * and a field still (the GoPro frame). The panel is the same; the picture's
 * corner is 16 on the screenshot and 24 on the photograph, and only the
 * photograph says where it came from, in a frosted pill over its corner.
 *
 * The annotations on the GoPro still ("gloves on", "no signal in basement")
 * are part of the exported frame rather than drawn here — the file has them
 * flattened into the image, not as layers.
 */
export default function StudyPanel({
  intro,
  media,
  radius,
  aspect,
  badge,
  caption,
}: Props) {
  return (
    <figure className={styles.block} data-reveal="">
      {intro && <p className={styles.intro}>{intro}</p>}

      <div className={`${styles.panel} squircle`}>
        <div
          className={`${styles.frame} squircle`}
          data-radius={radius}
          style={aspect ? { aspectRatio: aspect } : undefined}
        >
          <Image
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            className={styles.image}
            loading="lazy"
            sizes="(width < 700px) 100vw, 1056px"
          />

          {badge && (
            <span className={styles.badge}>
              {badge.label}
              <Image
                src={badge.logo}
                alt=""
                width={40}
                height={40}
                className={styles.badgeLogo}
                loading="lazy"
                sizes="40px"
              />
            </span>
          )}
        </div>
      </div>

      <FigureLabel caption={caption} />
    </figure>
  );
}
