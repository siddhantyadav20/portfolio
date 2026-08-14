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

/**
 * The GIF's own loop, ms — 35 frames, read straight out of the file's graphic
 * control blocks rather than guessed at.
 *
 * It matters because the loop does not begin where the animation does. Frame 0
 * is the confetti already out and starting to disperse; the check only starts
 * drawing about 560ms in. So the artwork is mounted when the disc sets off and
 * revealed when it lands — by which point playback has reached the bare disc,
 * which is exactly what the flying disc has just become. It then draws its own
 * check, bursts, and is frozen after one full loop on the frame the burst
 * peaks at, which is the frame Figma's Success state shows.
 */
const LOOP = 2800;

/** How long the finished state is held before the card offers itself again. */
const HOLD = 5000;

/** Long enough for the thanks to go, the mint to drain back into the disc, and
 *  the form to be standing underneath it when it does. */
const EXIT = 640;

const calm = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function StoreWaitlist() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [value, setValue] = useState("");
  const [trouble, setTrouble] = useState<Trouble>(null);
  const [frozen, setFrozen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const joinRef = useRef<HTMLButtonElement>(null);
  const gifRef = useRef<HTMLImageElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);

  /** Where the disc starts its flight, relative to where it lands. */
  const [flight, setFlight] = useState({ x: 0, y: 0 });

  const ready = readContact(value) !== null;
  const open = phase === "input" || phase === "sending";
  const busy = phase === "sending";
  const won = phase === "success" || phase === "closing";

  function expand() {
    setPhase("input");

    // 2.1MB, and the celebration cannot wait on a download. Asking for it the
    // moment the pill opens buys the whole time the visitor spends typing.
    new Image().src = store.success.art;

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
      setPhase("success");
    });
  }

  /**
   * Stop the GIF on the frame it has reached, by painting that frame onto a
   * canvas and swapping to it.
   *
   * The alternative was a second exported still, and this is better than one:
   * a canvas capture is the displayed frame by construction, so it cannot drift
   * out of sync with the asset the way a hand-picked PNG would, and it costs no
   * extra bytes over the wire. Left to loop, the burst would simply replay
   * every 2.8s for as long as the card sat there.
   */
  function freeze() {
    const gif = gifRef.current;
    const still = stillRef.current;
    if (!gif || !still || !gif.naturalWidth) return;

    still.width = gif.naturalWidth;
    still.height = gif.naturalHeight;
    still.getContext("2d")?.drawImage(gif, 0, 0);
    setFrozen(true);
  }

  /* --- The finished state's own clock ------------------------------------ */

  useEffect(() => {
    if (phase !== "success") return;

    // A GIF plays whatever the visitor has asked for, which is the one thing
    // globals.css cannot switch off for us — it can collapse a duration, not a
    // decoded frame. Freezing on arrival gives that visitor the composition
    // without the loop, and frame 0 of this export is the finished picture.
    const stop = window.setTimeout(freeze, calm() ? 0 : LOOP);
    const close = window.setTimeout(() => {
      setValue("");
      setPhase("closing");
    }, HOLD);

    return () => {
      window.clearTimeout(stop);
      window.clearTimeout(close);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;

    const done = window.setTimeout(() => {
      setPhase("idle");
      setFrozen(false);
    }, EXIT);

    return () => window.clearTimeout(done);
  }, [phase]);

  return (
    <CardShell
      radius={32}
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
          className={`${styles.cta} squircle`}
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
            aria-label={store.placeholder}
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
        <p className={styles.hint} role="alert">
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

            {/* Opaque, and the same mint as the card, so it needs no fade of
                its own to hide the disc underneath — it simply covers it.

                A plain `img`, not `next/image`: the optimiser would re-encode
                the GIF, and `freeze` needs the raw element to read the current
                frame off. It is requested by `expand` and rendered only here,
                so nothing about the page load goes through it. */}
            <img
              ref={gifRef}
              className={styles.gif}
              src={store.success.art}
              alt=""
              width={store.success.artWidth}
              height={store.success.artHeight}
              data-frozen={frozen ? "" : undefined}
              /* Backstop for the reduced-motion freeze above: the timer fires
                 on the same tick the element mounts, which is a tick too early
                 if the bytes have not arrived. */
              onLoad={() => {
                if (calm()) freeze();
              }}
            />
            <canvas
              ref={stillRef}
              className={styles.still}
              data-frozen={frozen ? "" : undefined}
            />
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
