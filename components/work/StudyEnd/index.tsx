import { STUDIES, type CaseStudy } from "@/content/work";
import Comments from "./Comments";
import NextStudies from "./NextStudies";
import styles from "./StudyEnd.module.css";

type Props = { study: CaseStudy };

/**
 * The end of a case study — Figma 798:876.
 *
 * Two columns, top-aligned: the other studies on the left at a fixed 386, the
 * thread on the right taking whatever is left, 128 apart.
 *
 * This replaces `StudyOutro`, which was written before the file had an ending
 * and invented one: a "was this worth your time?" pair of reaction buttons, a
 * list of the other studies, and a contact send-off. The reactions become the
 * single like the design asks for, the list becomes the carousel, and the
 * send-off is gone — it is not in this frame, and the footer already carries a
 * way to get in touch on every page the site has.
 *
 * THE BACKEND IS STILL THE OLD ONE. `lib/engagement.ts` counts two reactions
 * and stores a comment as a name and a body; the design has one reaction and
 * shows a date and a role beside each comment. So a like is an up-vote, the
 * role is written by the renderer rather than stored, and nothing counts
 * anything it did not already count. That is deliberate for this pass — the
 * layout is the thing being changed, and the store is worth deciding on its
 * own terms rather than being bent to fit a column.
 */
export default function StudyEnd({ study }: Props) {
  /* The Design System study leads wherever it is offered. It is the one whose
     card is a running instrument rather than a picture, so it is the best
     argument for opening another study — and the carousel's first slide is
     the only one most people will see. */
  const others = STUDIES.filter((s) => s.slug !== study.slug).sort(
    (a, b) => rank(a.slug) - rank(b.slug),
  );

  return (
    /* The rule that used to open this block is now the top edge of the band
       it sits on — full width, drawn by `StudyReader`. */
    <section id="comments" className={styles.end} aria-labelledby="end-heading">
      <h2 id="end-heading" className="srOnly">
        After this study
      </h2>

      {/* Cards first, on the left — the file swapped the two columns. DOM
          order follows the visual order rather than being flipped back with
          `order`, so what a screen reader hears is what the page shows. */}
      <div className={styles.columns}>
        {others.length > 0 && <NextStudies studies={others} />}
        <Comments slug={study.slug} title={study.title} />
      </div>
    </section>
  );
}

/** Lower sorts first. Only the lead is decided here; the rest keep the
 *  registry's own order. */
function rank(slug: string): number {
  return slug === "design-system" ? 0 : 1;
}
