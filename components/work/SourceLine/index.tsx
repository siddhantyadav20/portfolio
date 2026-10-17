import Image from "next/image";
import type { StudySource } from "@/content/work";
import styles from "./SourceLine.module.css";

type Props = {
  source: StudySource;
  className?: string;
};

/**
 * Figma 1617:9417 and 1637:10187 — where a number or a quote came from: the
 * channel's 24px mark, its name in the channel's own colour, and, when there
 * is one, a 4px dot and the channel again at 60%.
 *
 * The colour is the brand's, not the study's accent — "Survey" in Google
 * Forms purple beside "1-1 Interview" in Zoom blue is the point of the line:
 * a reader sees at a glance that the evidence is from more than one place.
 */
export default function SourceLine({ source, className }: Props) {
  return (
    <span
      className={`${styles.line} ${className ?? ""}`}
      data-tone={source.tone}
    >
      <Image
        src={source.logo}
        alt=""
        width={24}
        height={24}
        className={styles.logo}
        data-tone={source.tone}
        loading="lazy"
        sizes="24px"
      />
      <span className={styles.name}>{source.name}</span>
      {source.channel && (
        <>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.channel}>{source.channel}</span>
        </>
      )}
    </span>
  );
}
