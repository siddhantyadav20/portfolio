"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CardShell from "@/components/primitives/CardShell";
import CtaPill from "@/components/primitives/CtaPill";
import { EXIT_MS } from "@/components/primitives/ModalSurface";
import { MAKING_MORPH } from "@/components/home/MakingModal/morph";
import { attempts, making, tokens, turn } from "@/content/making";
import { MAKING_OPEN } from "@/lib/making";
import { canMorph, morph } from "@/lib/viewTransition";
import styles from "./MakingCard.module.css";

/**
 * The reader, on demand.
 *
 * Four drawings, a `LogoMark` and their stylesheet, none of which can render
 * until somebody presses the button — and all of which were in the homepage's
 * first load while this was a static import. The same reasoning, and the same
 * shape, as `CaseStudyModal/lazy.ts` and `CanvasCard`: a plain dynamic
 * `import()` rather than `next/dynamic`, because the morph needs the module
 * *resolved* before `startViewTransition` runs and awaiting a promise is the
 * only way to be sure of that. A Suspense fallback would be what got
 * snapshotted.
 *
 * `import type` is erased at compile time, so naming the component for the
 * type checker does not put it back in the bundle. `MAKING_MORPH` is imported
 * from its own module for the same reason — a value import from `./index`
 * would have dragged the whole reader back in behind it, which is exactly the
 * trap `ModalSurface` records about `EXIT_MS`.
 */
type Reader = typeof import("@/components/home/MakingModal").default;
const loadReader = async (): Promise<Reader> =>
  (await import("@/components/home/MakingModal")).default;

/* ===========================================================================
   The colophon card.

   THE ONLY FULL-WIDTH CARD ON THE PAGE, and the placement is the argument.
   Every other card is a way into the work — a study, the board, the timeline,
   the music. This one is about the page they are all sitting on, so it cannot
   be a peer of theirs in a column; it sits under all of them, immediately
   above the footer, where a colophon goes in a book. `page.module.css` gives
   it a row of its own rather than squeezing it into the bento, because the
   bento's three columns are drawn against a 1440 Figma frame and there was no
   cell free that would not have pushed something measured off its mark.

   WHAT IT SHOWS AT REST is a strip of the same drawings the reader opens into
   — a terminal mid-turn, four tokens, five attempts — at a third of the size
   and playing on a loop. Not a screenshot of the modal and not a teaser image:
   the same DOM, so the card cannot fall out of step with what it opens.

   The strip is `aria-hidden` and the card is a single link. There is nothing
   in the drawing that the heading and the line beside it do not already say,
   and a screen reader walking a decorative terminal transcript is a worse
   experience than one that skips it.
   =========================================================================== */

/**
 * The card's own animation is capped.
 *
 * The homepage already runs a proximity field, a canvas preview drifting under
 * the pointer and a music player. A fourth thing looping forever at the bottom
 * of the page is the point at which "playful in small, intentional moments"
 * becomes "overloaded with animation", which PROJECT.md rules out by name. So
 * the strip plays once when it is scrolled to and then holds — the loop is in
 * the reader, where you went deliberately.
 */
export default function MakingCard() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [Reader, setReader] = useState<Reader | null>(null);

  const openModal = useCallback(async () => {
    // Resolved before anything moves — see `loadReader`. Hovering the button
    // has normally done this already; awaiting is the guarantee.
    const Loaded = await loadReader();
    const update = () => {
      setReader(() => Loaded);
      setOpen(true);
    };
    if (!canMorph()) {
      update();
      return;
    }
    morph(update);
  }, []);

  /** Hovering the button. Mounting it closed costs nothing — `ModalSurface`
   *  returns null until `open` — and the click then has nothing to wait for. */
  const warmReader = useCallback(() => {
    void loadReader().then((Component) => setReader(() => Component));
  }, []);

  /* The strip plays once, when you reach it.

     The header above says the card's animation is capped and this is what
     enforces it: `data-play` goes on when the card is first scrolled to and is
     never taken off, so the strip cannot become a fourth thing looping forever
     at the bottom of a page that already has three. Straight to the DOM rather
     than into state, and disconnected the moment it fires — see the same
     pattern in `MakingModal`, which explains why an attribute beats a render
     here. */
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-play", "");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-play", "");
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* The footer's link, which is a page-length away from this card and shares
     no provider with it — see `lib/making`. Bound here rather than in a
     provider because this card is the only thing that can answer it. */
  useEffect(() => {
    const onAsk = () => void openModal();
    window.addEventListener(MAKING_OPEN, onAsk);
    return () => window.removeEventListener(MAKING_OPEN, onAsk);
  }, [openModal]);

  const close = useCallback(() => {
    if (canMorph()) {
      morph(() => setOpen(false));
      return;
    }
    // No morph to play, so the modal animates itself out — otherwise closing
    // is an instant pop. Same shape as `useStudyModal`.
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, EXIT_MS);
  }, []);

  return (
    <>
      <CardShell
        radius={32}
        surface="translucent"
        className={styles.card}
        data-card="making"
        // Released the moment the modal owns it: two live elements sharing a
        // view-transition name abort the transition. Same rule as CanvasCard.
        style={open ? undefined : { viewTransitionName: MAKING_MORPH }}
      >
        <div className={styles.text}>
          <p className={styles.eyebrow}>{making.eyebrow}</p>
          <h2 className={styles.title}>{making.title}</h2>
          <p className={styles.lede}>{making.lede}</p>

          <CtaPill
            as="button"
            type="button"
            className={styles.cta}
            onClick={() => void openModal()}
            onPointerEnter={warmReader}
            onFocus={warmReader}
          >
            {making.cta}
          </CtaPill>
        </div>

        {/* Decorative by construction — see the header. */}
        <div ref={stripRef} className={styles.strip} aria-hidden="true">
          <Sliver kind="tokens" />
          <Sliver kind="terminal" />
          <Sliver kind="attempts" />
        </div>
      </CardShell>

      {Reader && <Reader open={open} closing={closing} onClose={close} />}
    </>
  );
}

/**
 * A third-size quotation of one scene.
 *
 * Deliberately not the scene components themselves. Those are 300px drawings
 * built to be read one at a time; three of them scaled down would be three
 * illegible drawings rather than one legible strip, and `transform: scale` on
 * a terminal turns 12px type into 4px type.
 *
 * WITH THE REAL WORDS IN THEM, and that is the whole difference between this
 * and the version before it. The first build drew grey bars where the text
 * goes — a faithful silhouette of each scene, and three loading skeletons to
 * look at. A skeleton says "something will be here"; the card has to say "here
 * is what is in there". Nine-pixel mono is small but it is not noise: you can
 * see that one column is CSS custom properties and the other is file names,
 * which is exactly as much as a preview should tell you.
 *
 * The strings come from `content/making.ts` — the same ones the reader shows —
 * so the card cannot drift from what it opens.
 */
function Sliver({ kind }: { kind: "tokens" | "terminal" | "attempts" }) {
  if (kind === "tokens") {
    return (
      <span className={styles.sliver}>
        {tokens.slice(0, 3).map((token, i) => (
          <span
            key={token.name}
            className={styles.sliverRow}
            style={{ ["--i" as string]: i }}
          >
            <span className={styles.sliverChip}>
              {token.swatch && (
                <span
                  className={styles.sliverSwatch}
                  style={{ backgroundColor: token.swatch }}
                />
              )}
              {token.value}
            </span>
            <span className={styles.sliverRule} />
            <span className={styles.sliverToken}>{token.name}</span>
          </span>
        ))}
      </span>
    );
  }

  if (kind === "terminal") {
    return (
      <span className={`${styles.sliver} ${styles.sliverTerm}`}>
        <span className={styles.sliverBar}>
          <span className={styles.sliverDot} />
          <span className={styles.sliverDot} />
          <span className={styles.sliverDot} />
        </span>
        {turn.steps.slice(0, 3).map((step, i) => (
          <span
            key={step.arg}
            className={styles.sliverLine}
            style={{ ["--i" as string]: i }}
          >
            <span className={styles.sliverBullet} />
            <span className={styles.sliverText}>
              <b>{step.tool}</b>{" "}
              {/* Basename only. A 230px sliver cannot hold
                  `components/palette/CommandPalette/index.tsx`, and the half of
                  it that would fit is the half that says nothing. */}
              {step.arg.split("/").pop()}
            </span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={`${styles.sliver} ${styles.sliverAttempts}`}>
      {attempts.map((attempt) => (
        <span
          key={attempt.label}
          className={styles.sliverTile}
          data-kept={attempt.verdict === "yes" ? "" : undefined}
        />
      ))}
    </span>
  );
}
