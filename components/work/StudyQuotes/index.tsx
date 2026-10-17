import Image from "next/image";
import SourceLine from "@/components/work/SourceLine";
import type { StudyQuote, StudyQuoteGroup } from "@/content/work";
import styles from "./StudyQuotes.module.css";

type Props = {
  groups: readonly StudyQuoteGroup[];
  /** Figma 1637:10177 — see the `quotes` item in content/work/types.ts. */
  look?: "sky";
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
export default function StudyQuotes({ groups, look }: Props) {
  return (
    <div className={styles.groups} data-look={look}>
      {groups.map((group) => (
        <section
          key={group.heading}
          className={`${styles.group} squircle`}
          /* Only the sky look arrives; the other studies' panels are left
             exactly as they were. */
          data-reveal={look ? "" : undefined}
        >
          <header className={styles.finding}>
            <h4 className={styles.heading}>{group.heading}</h4>
            <p className={styles.body}>{group.body}</p>
          </header>

          <div className={styles.row}>
            {group.quotes.map((quote, i) => (
              <Quote key={quote.text} quote={quote} index={i} />
            ))}

            {/* The other half of the design's pair used to be drawn here as
                an empty card whenever there was an odd number of quotes. A
                reader cannot tell "the second quote is missing" from "this
                panel is broken", and every quote group in the studies is odd,
                so the page carried a column of dashed boxes down its right
                edge. One quote now sits in a panel built for one. */}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Figma 760:12894 — a quote card: the mark, the words, and where they came
 *  from. */
function Quote({ quote, index }: { quote: StudyQuote; index: number }) {
  return (
    <figure className={styles.quote} style={{ ["--i" as string]: index }}>
      <blockquote className={styles.words}>
        {/* Drawn rather than typed into the sentence: it is a 20px bold mark
            on its own line above the quote, and a curly quote inside the text
            would be read out by a screen reader as part of it. */}
        {quote.mark !== false && (
          <span className={styles.mark} aria-hidden="true">
            &ldquo;
          </span>
        )}
        <p className={styles.text}>{quote.text}</p>
      </blockquote>

      {/* The source's own mark and colour, when the quote carries one —
          Figma 1637:10187. */}
      {quote.logo && quote.tone ? (
        <figcaption className={styles.attribution}>
          <SourceLine
            source={{
              name: quote.source,
              channel: quote.channel,
              logo: quote.logo,
              tone: quote.tone,
            }}
          />
        </figcaption>
      ) : (
        <figcaption className={styles.attribution}>
          {/* No portrait, no circle. An empty ring in front of a real
              attribution line reads as a photo that failed to load. */}
          {quote.avatar && (
            <Image
              src={quote.avatar.src}
              alt=""
              width={quote.avatar.width}
              height={quote.avatar.height}
              className={styles.avatar}
              loading="lazy"
              sizes="32px"
            />
          )}

          <span className={styles.source}>{quote.source}</span>
          <span className={styles.separator} aria-hidden="true" />
          <span className={styles.source}>{quote.channel}</span>
        </figcaption>
      )}
    </figure>
  );
}
