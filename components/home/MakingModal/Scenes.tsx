"use client";

import LogoMark from "@/components/brand/LogoMark";
import { attempts, receipt, tokens, turn } from "@/content/making";
import styles from "./MakingModal.module.css";

/* ===========================================================================
   The four drawings.

   Every one of these is DOM and CSS. Not a video, not a screen recording, not
   a PNG of an editor — there are no screenshots of VS Code in this piece and
   that is a decision rather than a shortage. A screenshot of a terminal is
   ~400KB, goes soft the moment it is scaled, ignores the theme, and dates
   itself to whichever font and colour scheme was set the afternoon it was
   taken. These weigh a few hundred bytes each, stay sharp at any size, follow
   the theme like everything else on the page, and can be read by a screen
   reader.

   They are also honest in a way a screenshot would not be. A still of an agent
   session proves nothing — it is trivially faked, and a portfolio that leans
   on one is asking to be taken at its word. A drawing does not pretend to be
   evidence. The evidence is the repository, which scene four points at.

   PLAY IS AN ATTRIBUTE, NOT A STATE. Each scene animates when `data-play` is
   set on it, which the modal does from an IntersectionObserver. Keeping it in
   the DOM rather than in React means a scene entering the viewport costs no
   render — and it is the only reason these can be inspected at all: a
   headless or backgrounded tab never advances an observer, so the attribute
   can be set by hand to step through a sequence that would otherwise never
   start. That cost an afternoon once.
   =========================================================================== */

/**
 * Scene one — the file.
 *
 * A measurement, twice: what Figma reports on the left, what globals.css
 * declares on the right, and a rule drawing itself between them. The claim is
 * that these two columns are the same numbers, so the drawing is two columns
 * and the act of connecting them.
 */
export function TokensScene() {
  return (
    <div className={styles.tokens}>
      {tokens.map((token, i) => (
        <div
          key={token.name}
          className={styles.tokenRow}
          // The stagger is the reading order — one measurement at a time, not
          // a table arriving.
          style={{ ["--i" as string]: i }}
        >
          <span className={styles.tokenValue}>
            {token.swatch && (
              <span
                className={styles.tokenSwatch}
                style={{ backgroundColor: token.swatch }}
                aria-hidden="true"
              />
            )}
            {token.value}
          </span>
          <span className={styles.tokenRule} aria-hidden="true" />
          <code className={styles.tokenName}>{token.name}</code>
        </div>
      ))}
    </div>
  );
}

/**
 * Scene two — the loop.
 *
 * A terminal that types the prompt and then streams what the agent did with
 * it. The typing is `steps()` over a width, which is the one way to type text
 * without a frame loop: the characters are all present from the start and the
 * box uncovers them a glyph at a time, so a screen reader gets the whole line
 * immediately and the eye gets it letter by letter.
 *
 * `ch` units make that exact rather than approximate, and they are exact only
 * in a monospaced face — which is why this block hard-codes one instead of
 * taking `--font-ui`. A proportional font would leave the caret drifting off
 * the end of every line.
 */
export function TerminalScene() {
  return (
    <div className={styles.term}>
      <div className={styles.termBar} aria-hidden="true">
        <span className={styles.termDot} />
        <span className={styles.termDot} />
        <span className={styles.termDot} />
        <span className={styles.termTitle}>claude</span>
      </div>

      <div className={styles.termBody}>
        <p className={styles.termPrompt}>
          <span className={styles.termCaretGlyph} aria-hidden="true">
            ❯
          </span>
          <span
            className={styles.termTyped}
            style={{ ["--ch" as string]: turn.prompt.length }}
          >
            {turn.prompt}
          </span>
        </p>

        {turn.steps.map((step, i) => (
          <p
            key={step.arg}
            className={styles.termStep}
            style={{ ["--i" as string]: i }}
          >
            <span className={styles.termBullet} aria-hidden="true" />
            <span className={styles.termTool}>{step.tool}</span>
            <span className={styles.termArg}>{step.arg}</span>
          </p>
        ))}

        <p
          className={styles.termDone}
          style={{ ["--i" as string]: turn.steps.length }}
        >
          <span className={styles.termTick} aria-hidden="true">
            ✓
          </span>
          {turn.done}
        </p>
      </div>
    </div>
  );
}

/**
 * Scene three — the standard.
 *
 * Four tiles are struck out in sequence and the fifth resolves into the mark,
 * drawn rather than filled. It is the only scene with a beat of silence in it:
 * the rejections come quickly and the survivor is given twice as long, because
 * the point of the drawing is the ratio between those two.
 *
 * The fifth tile renders `LogoMark` — the same component the Introduction and
 * the arrival sequence render — with its paths stroked and dashed rather than
 * filled, so what plays here is a short quotation of the real boot sequence
 * rather than a picture of one.
 */
export function AttemptsScene() {
  return (
    <ol className={styles.attempts}>
      {attempts.map((attempt, i) => {
        const kept = attempt.verdict === "yes";
        return (
          <li
            key={attempt.label}
            className={styles.attempt}
            data-kept={kept ? "" : undefined}
            style={{ ["--i" as string]: i }}
          >
            <span className={styles.attemptFrame} aria-hidden="true">
              {kept ? (
                <LogoMark className={styles.attemptMark} />
              ) : (
                <span className={styles.attemptStrike} />
              )}
            </span>
            <span className={styles.attemptLabel}>{attempt.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Scene four — the receipt.
 *
 * The numbers count up, in CSS. A registered `<integer>` custom property can
 * be transitioned, `counter-reset` can read one, and `content: counter(n)` can
 * print it — which is a whole odometer with no JavaScript and no re-render
 * per frame. See `@property --n` in the stylesheet.
 *
 * The real value is also in the DOM, visually hidden, because the counter is
 * generated content: `content` is not reliably announced, and a screen reader
 * should hear "sixty-four commits" rather than nothing at all.
 */
export function ReceiptScene() {
  return (
    <dl className={styles.receipt}>
      {receipt.map((item, i) => {
        // "52k" counts to 52 and keeps its suffix; the rest are plain.
        const digits = parseInt(item.value, 10);
        const suffix = item.value.slice(String(digits).length);
        return (
          <div
            key={item.label}
            className={styles.receiptItem}
            style={{ ["--i" as string]: i }}
          >
            <dd className={styles.receiptValue}>
              <span
                className={styles.receiptCount}
                style={{ ["--to" as string]: digits }}
                aria-hidden="true"
              />
              {suffix && (
                <span className={styles.receiptSuffix} aria-hidden="true">
                  {suffix}
                </span>
              )}
              <span className="srOnly">{item.value}</span>
            </dd>
            <dt className={styles.receiptLabel}>{item.label}</dt>
          </div>
        );
      })}
    </dl>
  );
}
