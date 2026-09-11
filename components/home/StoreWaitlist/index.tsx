"use client";

import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import CardShell from "@/components/primitives/CardShell";
import { store } from "@/content/site";
import { readContact } from "@/lib/waitlist";
import { joinWaitlist } from "./submit";
import { celebrate } from "./won";
import Success from "./Success";
import styles from "./StoreWaitlist.module.css";

/* ===========================================================================
   Figma "Currently Building" (node 110:8501) — all five states.

     110:8500  Default   540x219, pad 24, gap 20; CTA 138x40 at (24, 155)
     110:8502  Input     CTA 340x40, pl 12 / pr 6; Join dimmed to 40%
     110:8536  Entered   Join live
     302:9989  Sent      Join collapsed to a 28px disc, 14px loader inside
     110:8555  Success   fill #D1FFE2, 146x109 artwork, two centred lines

   Read as one movement rather than five pictures, the file is already telling
   you what to build: one pill that grows, and one small orange disc that keeps
   getting more important — first it is a button, then it is a spinner, and in
   the last frame there is a green disc with a check in it sitting where the
   artwork goes. So that disc is a single element the whole way through. It
   flies from the end of the pill to the middle of the card and turns green,
   the mint floods out from underneath it, and the artwork takes over from it
   the instant it lands.

   That is the difference between a state change and a consequence. Nothing on
   screen is replaced — the thing the visitor pressed is the thing that
   celebrates, and every other part of the card is timed off where it is.

   Reduced motion needs nothing here: globals.css collapses every duration, so
   the card simply arrives at the Success state.
   =========================================================================== */

type Phase = "idle" | "input" | "sending" | "success" | "closing";
type Trouble = keyof typeof store.errors | null;

/** How long the spinner is guaranteed to be on screen, ms.
 *
 *  A local server answers in about 15ms, which lands as a flicker — the
 *  visitor sees something happen and cannot tell what. Holding the Sent state
 *  briefly is not a fake delay; it is the frame that explains the next one. */
const DWELL = 700;

/** Card geometry the CSS and the flight both have to agree on. */
const ART = {
  /**
   * Where the disc lands, measured from the card's top edge.
   *
   * Figma puts the 146x109 artwork at the top of the content box and the card
   * is padded 24, so the artwork runs 24..133 and its centre is 78.5 down. The
   * disc in the GIF is dead centre of its own 800x600 frame, so that centre is
   * the disc — no measuring off a render required.
   */
  centreY: 78.5,
} as const;

/** How long the finished state is held before the card offers itself again. */
const HOLD = 5000;

/** Long enough for the thanks to go, the mint to drain back into the disc, and
 *  the form to be standing underneath it when it does. */
const EXIT = 640;

export default function StoreWaitlist() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [value, setValue] = useState("");
  const [trouble, setTrouble] = useState<Trouble>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const joinRef = useRef<HTMLButtonElement>(null);

  /** Where the disc starts its flight, relative to where it lands. */
  const [flight, setFlight] = useState({ x: 0, y: 0 });

  const ready = readContact(value) !== null;
  const open = phase === "input" || phase === "sending";
  const busy = phase === "sending";
  const won = phase === "success" || phase === "closing";

  function expand() {
    setPhase("input");

    /* The celebration's art used to be preloaded here — 2.1MB of GIF that
       could not wait on a download once the form was submitted. It is a 2.5KB
       Lottie now, split into its own chunk and fetched when the success state
       mounts, so there is nothing worth warming: see Success.tsx, which draws
       a CSS mark on the first paint while that chunk is in flight. */

    // The pill is still 138 wide this frame; focusing now would scroll the
    // input's caret into view against a box that is about to be a different
    // size. One frame later it is measuring the box it will actually be.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  /** Empty and abandoned collapses back to the resting pill. */
  function collapse() {
    if (phase === "input" && value.trim() === "") {
      setPhase("idle");
      setTrouble(null);
    }
  }

  function submit() {
    if (busy || won) return;

    if (!readContact(value)) {
      setTrouble("invalid");
      inputRef.current?.focus();
      return;
    }

    setTrouble(null);
    setPhase("sending");

    startTransition(async () => {
      const [result] = await Promise.all([
        joinWaitlist(value),
        new Promise((r) => setTimeout(r, DWELL)),
      ]);

      if (!result.ok) {
        setPhase("input");
        setTrouble(result.reason === "invalid" ? "invalid" : "failed");
        return;
      }

      // Measured now, not at mount: this is the one moment the disc is the
      // 28px circle it will fly as, and the card may have been resized since.
      setFlight(liftOff(joinRef.current));
      celebrate();
      setPhase("success");
    });
  }

  /* --- The finished state's own clock ------------------------------------ */

  useEffect(() => {
    if (phase !== "success") return;

    const close = window.setTimeout(() => {
      setValue("");
      setPhase("closing");
    }, HOLD);

    return () => window.clearTimeout(close);
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;

    const done = window.setTimeout(() => setPhase("idle"), EXIT);

    return () => window.clearTimeout(done);
  }, [phase]);

  return (
    <CardShell
      radius={40}
      surface="soft"
      data-card="store"
      /* Readable from OUTSIDE this component's stylesheet, which the module
         class is not — `app/page.module.css` owns the orange band that bleeds
         to both screen edges on a phone, and it has to know when the card is
         celebrating so the band can get out of the way. See `.store` there. */
      data-won={won ? "" : undefined}
      className={[styles.card, won ? styles.won : "", phase === "closing" ? styles.closing : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {/* The mint, flooding out from under the disc. Behind everything, so the
          form is still legible for the fraction of a second it overlaps. */}
      {won ? <span className={styles.wash} aria-hidden="true" /> : null}

      <div className={styles.form} inert={won ? true : undefined}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>{store.eyebrow}</p>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>{store.title}</h2>
            <p className={styles.description}>{store.description}</p>
          </div>
        </div>

        <form
          className={styles.cta}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          data-open={open ? "" : undefined}
          data-trouble={trouble ? "" : undefined}
        >
          <span className={styles.mark} aria-hidden="true" />

          {/* Idle carries the label as text and the whole pill as the hit
              target — one 138x40 button rather than a word you have to aim at. */}
          <span className={styles.label} aria-hidden="true">
            {store.cta}
          </span>
          {!open ? (
            <button type="button" className={styles.expand} onClick={expand}>
              <span className="srOnly">{store.cta}</span>
            </button>
          ) : null}

          <input
            ref={inputRef}
            className={styles.field}
            type="text"
            name="contact"
            inputMode="email"
            /* Off, and off in every dialect: Chrome's own dropdown reads
               `autocomplete`, and the password managers each want their own
               opt-out. A one-field waitlist has nothing worth suggesting, and
               a saved-address menu covering the card the moment it opens is
               the single most intrusive thing that can happen here. */
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            enterKeyHint="go"
            spellCheck={false}
            placeholder={store.placeholder}
            id="waitlist-contact"
            /* A real <label>, off-screen, rather than `aria-label` alone: a
               placeholder disappears the moment there is a value, and this
               field has no visible label of its own once expanded. */
            aria-label={store.placeholder}
            /* Ties the field to the error text below, so the reason a
               submission was refused is read as part of the field rather than
               announced once and lost. */
            aria-describedby="waitlist-hint"
            aria-invalid={trouble === "invalid" || undefined}
            value={value}
            tabIndex={open ? undefined : -1}
            disabled={busy}
            onChange={(e) => {
              setValue(e.target.value);
              if (trouble) setTrouble(null);
            }}
            onBlur={collapse}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setValue("");
                setPhase("idle");
                setTrouble(null);
                return;
              }

              // Enter is handled here rather than left to the form's implicit
              // submission, and it has to be: Figma dims Join to 40% until
              // there is something to send, which means `disabled`, and the
              // HTML rule is that a form whose default button is disabled does
              // not submit at all. Left alone, typing something malformed and
              // pressing Enter did nothing whatsoever — no send, and no reason
              // given for not sending.
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />

          <button
            ref={joinRef}
            type="submit"
            className={styles.join}
            data-busy={busy ? "" : undefined}
            disabled={!ready || busy}
            tabIndex={open ? undefined : -1}
          >
            <span className={styles.joinMark} aria-hidden="true" />
            <span className={styles.joinLabel}>{store.join}</span>
            <Spinner />
          </button>
        </form>

        {/* Rides in the 24px of slack the card already has under the pill, so
            an error costs no height and the column below never moves. */}
        <p id="waitlist-hint" className={styles.hint} role="alert">
          {trouble ? store.errors[trouble] : ""}
        </p>
      </div>

      {won ? (
        <div className={styles.win} role="status">
          <div className={styles.art} aria-hidden="true">
            {/* Two nested wrappers so the flight can be an arc: X eases out and
                Y eases in, and a pair of straight lines on different clocks is
                a parabola. One element travelling on one curve arrives in a
                straight line, which reads as a UI element being repositioned
                rather than as something being thrown. */}
            <span
              className={styles.discX}
              style={
                {
                  "--fly-x": `${flight.x}px`,
                  "--fly-y": `${flight.y}px`,
                } as CSSProperties
              }
            >
              <span className={styles.discY}>
                <span className={styles.disc}>
                  <Spinner className={styles.discSpin} />
                </span>
              </span>
            </span>

            {/* The mark. Strokes only and no background of its own — see
                Success.tsx for why that replaced a 2.1MB GIF that carried its
                own mint rectangle the card had to be colour-matched to. */}
            <Success />
          </div>

          <p className={styles.winTitle}>{store.success.title}</p>
          <p className={styles.winSub}>{store.success.subtitle}</p>
        </div>
      ) : null}
    </CardShell>
  );
}

/* --- Pieces ---------------------------------------------------------------- */

/** Figma's Sent state uses the 12-spoke stepped spinner, so this is twelve
 *  spokes and a travelling gap rather than a sweeping arc. */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={[styles.spinner, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={styles.spoke}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
    </span>
  );
}

/* --- Geometry -------------------------------------------------------------- */

/**
 * The disc's start point, expressed as an offset from where it lands.
 *
 * Measured with the offset chain rather than `getBoundingClientRect`, and that
 * is not incidental: the proximity field writes a live `scale()` onto every
 * card, so client rects here are in whatever scale the pointer happens to be
 * holding this card at. `offsetLeft` / `offsetTop` are layout values and ignore
 * transforms entirely, which is exactly what a card-space measurement wants.
 *
 * The landing point is layout, not measurement — see `ART.centreY`. It holds at
 * any card width, so nothing here has to know how wide the card ended up.
 */
function liftOff(join: HTMLElement | null) {
  const card = join?.closest<HTMLElement>(`.${styles.card}`);
  if (!card || !join) return { x: 0, y: 0 };

  let x = 0;
  let y = 0;
  for (
    let el: HTMLElement | null = join;
    el && el !== card;
    el = el.offsetParent as HTMLElement | null
  ) {
    x += el.offsetLeft;
    y += el.offsetTop;
  }

  return {
    x: x + join.offsetWidth / 2 - card.clientWidth / 2,
    y: y + join.offsetHeight / 2 - ART.centreY,
  };
}
