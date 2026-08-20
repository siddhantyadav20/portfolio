"use client";

import { useRef } from "react";
import ThemingInstrument, {
  PRESETS,
  REST_MODE,
  REST_NAME,
} from "./index";
import styles from "./ThemingSpecimen.module.css";

type Props = {
  /** No frame, no legend, no caption — just the running shell, filling
   *  whatever box it is given. What the study's hero wants. */
  bare?: boolean;
  className?: string;
};

/**
 * The instrument as a block someone can read: a framed shell, the six stops
 * underneath it, and a line saying what to do.
 *
 * The homepage card lays its own legend out by hand because that legend is
 * card furniture, positioned against a fixed 386x578. Everywhere the
 * instrument appears in prose it wants this instead — a figure with a caption,
 * sized by the column it is in.
 */
export default function ThemingSpecimen({ bare = false, className }: Props) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);

  if (bare) {
    return (
      <span className={[styles.bare, className].filter(Boolean).join(" ")}>
        <ThemingInstrument cue />
      </span>
    );
  }

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(" ")}>
      <div className={`${styles.frame} squircle`}>
        <ThemingInstrument
          cue
          readouts={{ label: labelRef, dots: dotsRef, mode: modeRef }}
        />
      </div>

      <figcaption className={styles.caption}>
        <span className={styles.dots} ref={dotsRef}>
          {PRESETS.map((preset) => (
            <span
              key={preset.name}
              className={styles.dot}
              style={{ background: preset.hex }}
              data-on={preset.name === REST_NAME ? "" : undefined}
            />
          ))}
        </span>
        <span className={styles.name} ref={labelRef}>
          {REST_NAME}
        </span>
        <span className={styles.mode} ref={modeRef}>
          {REST_MODE}
        </span>
        <span className={styles.hint}>
          Move across to change the primary, down to cross the light and dark
          modes. Nothing here is a component variant — it is one variable and
          one table swap.
        </span>
      </figcaption>
    </figure>
  );
}
