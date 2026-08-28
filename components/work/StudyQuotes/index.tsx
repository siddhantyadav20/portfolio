import Image from "next/image";
import type { StudyQuote, StudyQuoteGroup } from "@/content/work";
import styles from "./StudyQuotes.module.css";

type Props = {
  groups: readonly StudyQuoteGroup[];
};

/**
 * Figma 757:12760, 760:12949 and 760:12975 — what testing found, and the
 * quotes that are the evidence for each finding.
 *
 * The finding is written above the quotes rather than under them, which is the
 * design's call and the right one: a reader skimming three panels wants the
 * three sentences, and the quotes are there for the reader who does not
 * believe them.
 *
 * Figma draws two quote cards in every panel and fills both with the same
 * words, which is one card duplicated rather than two interviews saying the
 * same thing. So the pair is the layout and the quotes are the content: a
 * panel renders however many it has, and an odd one out leaves the marked
 * empty slot beside it rather than stretching to fill the row.
 */
export default function StudyQuotes({ groups }: Props) {
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.heading} className={`${styles.group} squircle`}>
          <header className={styles.finding}>
            <h4 className={styles.heading}>{group.heading}</h4>
            <p className={styles.body}>{group.body}</p>
          </header>

          <div className={styles.row}>
            {group.quotes.map((quote) => (
              <Quote key={quote.text} quote={quote} />
            ))}

            {/* The other half of the design's pair, when there is only one
                quote to put in it. Marked rather than hidden: the panel is
                built to hold two and the second one is missing, which is a
                different thing from a panel that holds one. */}
            {group.quotes.length % 2 === 1 && (
              <div className={`${styles.quote} ${styles.empty}`} data-placeholder="">
                <span className="srOnly">A second quote, not yet transcribed</span>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Figma 760:12894 — a quote card: the mark, the words, and where they came
 *  from. */
function Quote({ quote }: { quote: StudyQuote }) {
  return (
    <figure className={styles.quote}>
      <blockquote className={styles.words}>
        {/* Drawn rather than typed into the sentence: it is a 20px bold mark
            on its own line above the quote, and a curly quote inside the text
            would be read out by a screen reader as part of it. */}
        <span className={styles.mark} aria-hidden="true">
          &ldquo;
        </span>
        <p className={styles.text}>{quote.text}</p>
      </blockquote>

      <figcaption className={styles.attribution}>
        {quote.avatar ? (
          <Image
            src={quote.avatar.src}
            alt=""
            width={quote.avatar.width}
            height={quote.avatar.height}
            className={styles.avatar}
            loading="lazy"
            sizes="32px"
          />
        ) : (
          <span className={styles.avatar} data-placeholder="" aria-hidden="true" />
        )}

        <span className={styles.source}>{quote.source}</span>
        <span className={styles.separator} aria-hidden="true" />
        <span className={styles.source}>{quote.channel}</span>
      </figcaption>
    </figure>
  );
}
