import FigureLabel from "@/components/work/FigureLabel";
import StudyLiveBlock from "@/components/work/StudyLiveBlock";
import type { StudyHero as Hero } from "@/content/work";
import PrototypeHero from "./PrototypeHero";
import styles from "./StudyHero.module.css";

type Props = {
  hero: NonNullable<Hero>;
};

/**
 * Figma 529:11961 — the 1120x700 frame at the top of the reader, and the
 * figure label under it.
 *
 * Three kinds of artwork sit in the same frame. A `prototype` is the plate and
 * the running device; an `image` is a still; a `live` hero is the specimen the
 * study's own card runs, at full size. Only the first of the three ships any
 * JavaScript.
 *
 * The frame carries the study's `view-transition-name`, which is what the
 * homepage card morphs into. It is set inline rather than in the module
 * because CSS Modules scopes `view-transition-name` exactly as it scopes a
 * class name, and the `::view-transition-*` rules in globals.css would then
 * never match it.
 */
export default function StudyHero({ hero }: Props) {
  return (
    <figure className={styles.block}>
      <div
        className={`${styles.frame} squircle`}
        data-stage="hero"
        style={{ viewTransitionName: hero.morphName }}
      >
        {hero.kind === "prototype" && (
          <PrototypeHero plate={hero.plate} plateAlt={hero.plateAlt} />
        )}

        {hero.kind === "image" && (
          /* eslint-disable-next-line @next/next/no-img-element --
             same reason as the plate: this is the hero of a view transition
             and wants to be one element with one source. */
          <img
            src={hero.src}
            alt={hero.alt}
            width={hero.width}
            height={hero.height}
            className={styles.plate}
          />
        )}

        {/* The far end of the Design System card's morph. The card is a 346px
            window onto the same running shell, so this does not cross-fade a
            thumbnail into a photograph — the drawing grows, and is still live
            when it arrives. */}
        {hero.kind === "live" && <StudyLiveBlock view={hero.view} bare />}
      </div>

      {hero.caption && <FigureLabel caption={hero.caption} />}
    </figure>
  );
}
