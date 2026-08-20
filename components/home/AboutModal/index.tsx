"use client";

import ThemeToggle from "@/components/home/ThemeToggle";
import ModalSurface, { MODAL_VT } from "@/components/primitives/ModalSurface";
import { about } from "@/content/site";
import styles from "./AboutModal.module.css";

/** The name the card's portrait and this one trade, so one becomes the other. */
export const PORTRAIT_MORPH = "about-portrait";

type Props = {
  open: boolean;
  /** Playing the exit animation — only ever true on the no-morph path. */
  closing?: boolean;
  onClose: () => void;
};

/**
 * The About reader.
 *
 * Built to the case study's proportions, on the same shell and the same
 * choreography, with one deliberate difference: the hero here is a circle
 * rather than a plate. That is what the card hands over — the 32px portrait
 * scaling into a 360px one — and both ends being the same shape is what makes
 * the morph a pure scale with nothing to squash.
 *
 * The three tool pills that were orbiting the card a moment ago land in a row
 * beneath the portrait, so the interaction resolves into something rather than
 * simply stopping.
 */
export default function AboutModal({ open, closing = false, onClose }: Props) {
  const { story, tools } = about;

  return (
    <ModalSurface
      open={open}
      closing={closing}
      onClose={onClose}
      label="About Siddhant"
      selectionTint="green"
      actions={<ThemeToggle />}
    >
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.intro}>
            <div
              className={styles.titleBlock}
              data-stage="title"
              style={MODAL_VT.title}
            >
              <h1 className={styles.title}>{story.title}</h1>
              <p className={styles.subtitle}>{story.subtitle}</p>
            </div>

            <div className={styles.hero} data-stage="hero">
              <div
                className={styles.portrait}
                style={{ viewTransitionName: PORTRAIT_MORPH }}
              >
                <img src="/media/portrait.png" alt="Siddhant Yadav" />
              </div>

              <ul className={styles.tools}>
                {tools.map((tool) => (
                  <li key={tool.name} className={`${styles.tool} liquid`}>
                    <img src={tool.icon} alt="" width={28} height={28} />
                    <span className="srOnly">{tool.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.body} data-stage="body" style={MODAL_VT.body}>
              {story.body.map((para) => (
                <p key={para.slice(0, 32)}>{para}</p>
              ))}
            </div>
          </div>

          <div className={styles.separator} data-stage="rule" />

          <dl className={styles.meta} data-stage="meta" style={MODAL_VT.meta}>
            {story.meta.map((item) => (
              <div key={item.label} className={styles.metaItem}>
                <dt className={styles.metaLabel}>{item.label}</dt>
                <dd className={styles.metaValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </ModalSurface>
  );
}
