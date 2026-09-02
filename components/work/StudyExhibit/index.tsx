import FigureLabel from "@/components/work/FigureLabel";
import GovernanceLoop from "@/components/work/GovernanceLoop";
import SplitFlow from "@/components/work/SplitFlow";
import type { StudyCaption, StudyExhibit as ExhibitName } from "@/content/work";
import styles from "./StudyExhibit.module.css";

type Props = {
  view: ExhibitName;
  caption: StudyCaption;
  className?: string;
};

/**
 * Figma 529:11981 — a drawn exhibit in its own framed panel, with the figure
 * label under it.
 *
 * The same indirection `StudyLiveBlock` uses, and for the same reason:
 * `content/work` is imported by a server route and has to stay serialisable,
 * so a section asks for an exhibit by name and this is where the name becomes
 * a component. Unlike a specimen, an exhibit ships no JavaScript — it is
 * something to read, not something to operate.
 */
export default function StudyExhibit({ view, caption, className }: Props) {
  return (
    <figure className={`${styles.block} ${className ?? ""}`}>
      <div className={`${styles.panel} squircle`}>{PANELS[view]}</div>
      <FigureLabel caption={caption} />
    </figure>
  );
}

/**
 * The existing camera, as it was: the recording on the left and the workflow
 * it produced on the right, side by side because the point of the section is
 * that they are two halves of one job.
 *
 * The recording itself has not been cut yet — the slot is drawn empty in Figma
 * too — so it renders as a marked placeholder rather than as a plausible
 * still. See `[data-placeholder]` in globals.css.
 */
const PANELS: Record<ExhibitName, React.ReactNode> = {
  "inspection-split-flow": (
    <>
      {/* The card first, which is both the phone frame's order (Figma
          863:4889 puts the flow above the recording) and the more useful
          reading order — the diagram is the argument and the recording is the
          evidence for it. The wide layout puts the recording back on the left
          with `order`, which costs nothing here: the slot is a placeholder
          `div` with no focusable content, so paint order and tab order cannot
          disagree about it. */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>
          The existing workflow split one job into two
        </p>
        <SplitFlow />
      </div>

      <div className={styles.slot} data-placeholder="">
        <span className="srOnly">
          A recording of the existing camera flow, not yet captured
        </span>
      </div>
    </>
  ),

  /* The Design System study's governance model. One card and nothing beside
     it — unlike the split flow above, the diagram is the whole exhibit, so it
     gets the panel's full width rather than half of it. */
  "winconnect-governance-loop": (
    <div className={styles.card}>
      <p className={styles.cardTitle}>
        A request becomes a component, or it doesn&rsquo;t
      </p>
      <GovernanceLoop />
    </div>
  ),
};
