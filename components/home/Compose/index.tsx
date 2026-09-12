"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { intro } from "@/content/site";
import { LETTER_BODY_MAX, LETTER_SUBJECT_MAX, validateLetter } from "@/lib/letter";
import { escapeFromField, FOCUSABLE, focusQuietly } from "@/lib/modalShell";
import { sendLetter, type LetterResult } from "./send";
import styles from "./Compose.module.css";

type Problem = Extract<LetterResult, { ok: false }>["reason"];
type Leaving = "close" | "sent";

/* How long each exit plays before the popover is unmounted — keep in step
   with the durations in the stylesheet. Reduced motion is a short fade. */
const LEAVE_MS: Record<Leaving, number> = { close: 180, sent: 600 };
const QUIET_MS = 140;

/* Placement. The popover hangs `GAP` off the pill and keeps `EDGE` clear of
   the viewport's sides; `WIDTH` is its width wherever the viewport allows. */
const GAP = 10;
const EDGE = 16;
const WIDTH = 400;
/* The shortest it will squeeze to when neither side of the pill has room: the
   header rows, the footer and about three lines of message. */
const MIN_HEIGHT = 280;

type Props = {
  open: boolean;
  /** The element it hangs off — the Send Email pill. */
  anchorId: string;
  id?: string;
  onClose: () => void;
  /** Called the moment a letter is accepted, with the address it came from. */
  onSent: (from: string) => void;
};

/**
 * The homepage's "Send Email": a Mail-style compose popover, addressed already,
 * hanging off the pill that opened it.
 *
 * Not a modal. It opens beside the pill — below it where the viewport has
 * room, above it where it does not — and the page stays where it is, scrollable
 * and uncovered. It is portalled to <body> and positioned in *page*
 * coordinates, so it scrolls with the pill rather than being re-measured on
 * every frame, and no card's `overflow` or stacking context can clip it.
 *
 * The draft outlives the popover: the component stays mounted while closed,
 * so a click elsewhere or an Escape loses nothing. Sending clears the subject
 * and message but keeps the From line, the visitor's own address.
 *
 * Open and closed belong to the parent; the exit belongs to this. When `open`
 * goes false the popover stays on screen long enough to play its way out.
 */
export default function Compose({ open, anchorId, id, onClose, onSent }: Props) {
  const copy = intro.compose;
  const titleId = useId();

  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sending, setSending] = useState(false);

  /* Presence. `present` is whether the popover is in the DOM; it goes true
     with `open` and false only once the exit has played. Adjusted during
     render rather than in an effect, which is React's own pattern for state
     that follows a prop. */
  const [present, setPresent] = useState(open);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPresent(true);
      setLeaving(null);
    } else if (present) {
      // A send has already named its exit; anything else is a close.
      setLeaving((l) => l ?? "close");
    }
  }

  const popRef = useRef<HTMLFormElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // A send in flight cannot be taken back, so the popover waits for it.
  function close() {
    if (!sending) onClose();
  }

  // The exit, then out of the DOM.
  useEffect(() => {
    if (!leaving) return;
    const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(
      () => {
        setPresent(false);
        setLeaving(null);
        setProblem(null);
        if (leaving === "sent") {
          // Cleared only now, so what flies away still has the letter in it.
          setSubject("");
          setBody("");
        }
      },
      quiet ? QUIET_MS : LEAVE_MS[leaving],
    );
    return () => window.clearTimeout(t);
  }, [leaving]);

  /* Where it goes. Written straight to the element rather than through state:
     it is geometry measured off the DOM, needed before the first paint, and a
     render pass to carry it would buy nothing.

     Below the pill if it fits there, above if it fits there, and otherwise on
     whichever side has more room. Horizontally it lines up with the pill's
     left edge and slides in from the viewport's edge when that would run it
     off. `--ox` is the pill's centre in the popover's own coordinates — the
     point it grows out of. */
  useLayoutEffect(() => {
    if (!present) return;
    const pop = popRef.current;
    if (!pop) return;

    function position() {
      const anchor = document.getElementById(anchorId);
      if (!anchor || !pop) return;

      const a = anchor.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;

      const width = Math.min(WIDTH, vw - EDGE * 2);
      pop.style.width = `${width}px`;
      pop.style.maxHeight = "";
      const h = pop.offsetHeight;

      const below = vh - a.bottom - GAP - EDGE;
      const above = a.top - GAP - EDGE;
      const side = below >= h || below >= above ? "below" : "above";

      /* Where neither side has room for all of it, it fits the side it chose
         rather than running off the screen or over the pill: the message
         field gives up the height (it is the one flexible thing inside), down
         to a floor below which it would stop being a place to write. */
      const room = side === "below" ? below : above;
      if (room < h) pop.style.maxHeight = `${Math.max(room, MIN_HEIGHT)}px`;
      const fitted = pop.offsetHeight;

      const left = Math.min(Math.max(a.left, EDGE), vw - width - EDGE);
      const top =
        side === "below"
          ? a.bottom + GAP + window.scrollY
          : // Never above the top of the document, which nobody can scroll to.
            Math.max(a.top - GAP - fitted + window.scrollY, EDGE);

      pop.style.left = `${left + window.scrollX}px`;
      pop.style.top = `${top}px`;
      pop.style.setProperty("--ox", `${a.left + a.width / 2 - left}px`);
      pop.dataset.side = side;
      pop.setAttribute("data-placed", "");
    }

    position();

    /* Re-placed when the width changes — a rotation, a window dragged — and
       not when only the height does. On a phone the height changes because
       the keyboard came up, and re-placing then would flip the popover to the
       other side of the pill under the visitor's thumb, mid-word. */
    let width = window.innerWidth;
    function onResize() {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      position();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [present, anchorId]);

  // Arrival: the entry transition, the first field, and the page held still.
  useEffect(() => {
    if (!present) return;
    const pop = popRef.current;

    // ProximityField stops carrying the cards while this is open, so the pill
    // the popover hangs off does not drift out from under it.
    document.documentElement.setAttribute("data-modal-open", "");

    // One frame late, so the entry has a painted "before" to transition from.
    const raf = requestAnimationFrame(() => pop?.setAttribute("data-enter", ""));

    /* Straight to the message when the From line is filled in from last time.
       Not on a touch screen: a focus that did not come from the tap itself
       does not raise the iOS keyboard, so it would leave a caret blinking in a
       field that cannot be typed into — and where it does raise one, the
       keyboard arrives over the popover before anybody has read it. There the
       visitor taps the field they want. */
    if (!matchMedia("(pointer: coarse)").matches) {
      focusQuietly(fromRef.current?.value ? bodyRef.current : fromRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      pop?.removeAttribute("data-enter");
      document.documentElement.removeAttribute("data-modal-open");
    };
  }, [present]);

  /* Leaving by keyboard, button or send hands focus back to the pill. A click
     somewhere else on the page leaves focus wherever that click put it. */
  useEffect(() => {
    if (!open) return;
    const pop = popRef.current;
    return () => {
      const at = document.activeElement;
      if (!at || at === document.body || pop?.contains(at)) {
        focusQuietly(document.getElementById(anchorId));
      }
    };
  }, [open, anchorId]);

  /* Escape, a click outside, and Tab kept inside. The pill counts as inside:
     it toggles the popover itself, and a pointerdown here closing it first
     would have its click open it straight back up. */
  useEffect(() => {
    if (!open) return;
    const pop = popRef.current;

    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        // A field with words in it gives up focus first; the draft is kept
        // either way, so the second Escape closes.
        if (escapeFromField()) return;
        e.preventDefault();
        close();
        return;
      }

      if (e.key !== "Tab" || !pop) return;
      const items = Array.from(pop.querySelectorAll<HTMLElement>(FOCUSABLE));
      const head = items[0];
      const tail = items[items.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && at === head) {
        e.preventDefault();
        tail?.focus();
      } else if (!e.shiftKey && at === tail) {
        e.preventDefault();
        head?.focus();
      }
    }

    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (pop?.contains(t) || document.getElementById(anchorId)?.contains(t)) return;
      close();
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  });

  function point(reason: Problem) {
    if (reason === "from") fromRef.current?.focus();
    else if (reason === "body" || reason === "too-long") bodyRef.current?.focus();
  }

  async function send() {
    if (sending || leaving) return;

    const check = validateLetter({ from, subject, body });
    if (!check.ok) {
      setProblem(check.reason);
      point(check.reason);
      return;
    }

    setProblem(null);
    setSending(true);
    let result: LetterResult;
    try {
      result = await sendLetter({ from, subject, body });
    } catch {
      // The network, not the server's answer — the same outcome to a visitor.
      result = { ok: false, reason: "failed" };
    }
    setSending(false);

    if (!result.ok) {
      setProblem(result.reason);
      point(result.reason);
      return;
    }

    setLeaving("sent");
    onSent(check.from);
    onClose();
  }

  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    const mod = e.metaKey || e.ctrlKey;
    // ⌘↩ everywhere, and ⇧⌘D because that is Mail's own.
    if ((mod && e.key === "Enter") || (e.metaKey && e.shiftKey && e.key.toLowerCase() === "d")) {
      e.preventDefault();
      void send();
    }
  }

  /* Return on a one-line field moves down a line, as it does in Mail, rather
     than submitting a letter that has no message in it yet. */
  function advance(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    (e.currentTarget.name === "email" ? subjectRef : bodyRef).current?.focus();
  }

  if (!present || typeof document === "undefined") return null;

  const ready = validateLetter({ from, subject, body }).ok;
  const mailto = `mailto:${intro.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return createPortal(
    <form
      ref={popRef}
      id={id}
      /* `squircle` through `border-radius`, not `--sq-r`: the popover casts a
         real shadow, and the mask fallback would clip it. See "Squircles" in
         globals.css. */
      className={`${styles.popover} squircle`}
      role="dialog"
      aria-labelledby={titleId}
      noValidate
      {...(leaving ? { "data-leave": leaving } : {})}
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <header className={styles.bar}>
        <div className={styles.lights}>
          <button
            type="button"
            className={styles.light}
            data-light="close"
            aria-label={copy.close}
            onClick={close}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3.75 3.75l4.5 4.5M8.25 3.75l-4.5 4.5" />
            </svg>
          </button>
          {/* Minimise and zoom have nothing to do here. They are drawn because
              it is not Mail without them, and kept out of the tab order and
              the accessibility tree. */}
          <span className={styles.light} data-light="min" aria-hidden="true" />
          <span className={styles.light} data-light="zoom" aria-hidden="true" />
        </div>

        {/* Mail titles the window with the subject as it is typed. */}
        <h2 id={titleId} className={styles.title}>
          {subject.trim() || copy.title}
        </h2>
      </header>

      <div className={styles.row}>
        <span className={styles.label}>{copy.to}</span>
        <span className={styles.token}>{intro.email}</span>
      </div>

      <label className={styles.row}>
        <span className={styles.label}>{copy.from}</span>
        <input
          ref={fromRef}
          className={styles.field}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          maxLength={254}
          placeholder={copy.fromPlaceholder}
          value={from}
          readOnly={sending}
          aria-invalid={problem === "from" || undefined}
          onChange={(e) => {
            setFrom(e.target.value);
            if (problem === "from") setProblem(null);
          }}
          onKeyDown={advance}
        />
      </label>

      <label className={styles.row}>
        <span className={styles.label}>{copy.subject}</span>
        <input
          ref={subjectRef}
          className={styles.field}
          type="text"
          name="subject"
          autoComplete="off"
          maxLength={LETTER_SUBJECT_MAX}
          value={subject}
          readOnly={sending}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={advance}
        />
      </label>

      <textarea
        ref={bodyRef}
        className={styles.body}
        name="message"
        aria-label={copy.message}
        placeholder={copy.bodyPlaceholder}
        maxLength={LETTER_BODY_MAX}
        value={body}
        readOnly={sending}
        aria-invalid={problem === "body" || undefined}
        onChange={(e) => {
          setBody(e.target.value);
          if (problem === "body") setProblem(null);
        }}
      />

      <footer className={styles.foot}>
        <p className={styles.problem} role="status" aria-live="polite">
          {problem === "failed" ? (
            <>
              {copy.errors.failed} <a href={mailto}>{copy.fallback}</a>
            </>
          ) : problem ? (
            copy.errors[problem]
          ) : sending ? (
            copy.sending
          ) : null}
        </p>

        {/* Still pressable while dimmed: pressing it says what is missing,
            which a disabled button never could. */}
        <button
          type="submit"
          className={`${styles.send} squircle`}
          title={`${copy.send} (⌘↩)`}
          disabled={sending}
          aria-busy={sending || undefined}
          {...(ready ? { "data-ready": "" } : {})}
        >
          <span
            className={`inkIcon ${styles.sendIcon}`}
            style={{ ["--icon" as string]: "url(/icons/send-2.svg)" }}
            aria-hidden="true"
          />
          {copy.send}
        </button>
      </footer>
    </form>,
    document.body,
  );
}
