"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Brief } from "@/content/canvas";
import {
  briefNumber,
  closeStudio,
  noStudioServerSide,
  openStudio,
  readHanded,
  readStudio,
  readTable,
  recordHandIn,
  redeal,
  setStudioPhase,
  subscribeStudio,
  type StudioPhase,
} from "@/lib/brief";
import { TAPE_TILT } from "@/lib/briefFlight";
import { createChime, type Chime } from "@/lib/chime";
import { useMediaQuery } from "@/lib/clientValue";
import { play, warm } from "@/lib/sfx";
import { SKETCH_EXPORT_PX } from "@/lib/sketch";
import { readTheme, serverTheme, subscribeTheme } from "@/lib/theme";
import { SHEET, useInk } from "@/components/canvas/ink/useInk";
import { graphite } from "@/components/canvas/widgets/DrawingCanvas/graphite";
import { FRAME_LABEL, paintFrame, paintFrameCanvas, tapeMeta } from "./frames";
import { sendSketch, type SketchResult } from "./send";
import styles from "./Studio.module.css";

/* ===========================================================================
   The Brief Studio.

   Where a brief is sketched: a drafting desk that rises over the board. A
   canvas MODE, not a second modal — the board goes inert behind it, and
   Escape puts the paper down before it closes the canvas (see
   CanvasSurface).

   ONE JOB PER SCREEN, after Google's Quick, Draw!: the prompt on its own
   with the rules and one button, and only then a quiet drawing screen with
   the prompt and the time in a thin bar. The drawing chrome follows tldraw —
   a calm sheet, a small floating toolbar, one primary action.

     brief    the torn tape lands on the desk; the rules and Start arrive
              under it. The clock starts on that press, and says so.
     draw     the bar (back · the brief and the time · Done), a big cream
              sheet with the thing you are designing outlined faintly, the
              tools under it.
     take     your sheet on the desk, Siddhant's note beside it, and what to
              do next under the note.

   The version before this dimmed the board instead of covering it, so the
   board's close button, theme toggle and dock ghosted through under the
   Studio's own — two of everything — and it labelled its steps like tabs
   nobody could press. Both are why it read as brutal and confusing.

   Per-brief state lives in <Desk>, keyed by brief — a new brief is a fresh
   sheet by construction.
   =========================================================================== */

/** Graphite and three coloured pencils. The paper is the same cream in both
 *  themes, so the inks are too. */
const INKS = ["#2B2824", "#D9483B", "#3A5FCD", "#2F8F5B"] as const;
const INK_NAMES = ["Graphite", "Red", "Blue", "Green"] as const;
const FINE = 8;
const MARKER = 18;

/** The frame under the sketch: graphite, faint. */
const FRAME_INK = "rgba(43, 40, 36, 0.18)";

const PATHS = {
  back: "M14.5 6 8.5 12l6 6",
  eraser:
    "M7 17h11M16.5 6.5 9 14l3.5 3.5L20 10zM9 14 5.5 10.5a1.5 1.5 0 0 1 0-2.1l3-3a1.5 1.5 0 0 1 2.1 0L14 8.5",
  undo: "M9 7 4.5 11.5 9 16M5 11.5h9.5a4.5 4.5 0 0 1 0 9H9",
  redo: "M15 7 19.5 11.5 15 16M19 11.5H9.5a4.5 4.5 0 0 0 0 9H15",
  trash:
    "M4 7h16M9.5 7V5.2c0-.6.5-1.2 1.2-1.2h2.6c.7 0 1.2.6 1.2 1.2V7M6.5 7l.8 12c0 .8.6 1.4 1.4 1.4h6.6c.8 0 1.4-.6 1.4-1.4l.8-12",
};

const SEND_ERRORS: Record<Extract<SketchResult, { ok: false }>["reason"], string> = {
  invalid: "Couldn't read that sketch. Try again?",
  "too-large": "Too much ink to send. Try a lighter sketch?",
  contact: "That isn't an email or a phone number.",
  throttled: "Easy there. Try again in a minute.",
  failed: "It didn't send. Try again?",
};

function Ico({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** 0:42, 1:30 — the time as a clock shows it. */
function clock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The sheet's colour — `--st-paper` in Studio.module.css, which the export
 *  has to match. */
function usePaper() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  return theme === "dark" ? "#ECE4D2" : "#FDFAF3";
}

export default function Studio() {
  const studio = useSyncExternalStore(subscribeStudio, readStudio, noStudioServerSide);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = !!studio?.open;

  // Focus comes into the Studio with it, so the keyboard is where the eyes are.
  useEffect(() => {
    if (open) rootRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    warm("book-page", "photo-settle");
  }, []);

  if (!studio) return null;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={open ? "" : undefined}
      data-canvas-interactive=""
      data-canvas-studio=""
      role="dialog"
      aria-modal="true"
      aria-label="Sketch studio"
      aria-hidden={open ? undefined : true}
      inert={!open}
      tabIndex={-1}
    >
      {/* Not a click-away: a stroke that overshoots the sheet must never
          put the paper down. */}
      <div className={styles.desk} aria-hidden="true" />
      <Desk
        key={studio.brief.id}
        brief={studio.brief}
        phase={studio.phase}
        landed={studio.landed}
        open={open}
      />
    </div>
  );
}

function Desk({
  brief,
  phase,
  landed,
  open,
}: {
  brief: Brief;
  phase: StudioPhase;
  landed: boolean;
  open: boolean;
}) {
  const paper = usePaper();
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [color, setColor] = useState<string>(INKS[0]);
  const [size, setSize] = useState(FINE);
  const [erasing, setErasing] = useState(false);

  // Mounted already landed: dealt in the Studio, not torn off the board.
  const [dealt] = useState(landed);

  const inkRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  /* The clock starts when you press Start — said on the brief, so it is
     never a surprise. It stops at Done. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const running = startedAt !== null;
  const left = running ? Math.max(0, brief.seconds - Math.floor((now - startedAt) / 1000)) : brief.seconds;
  const timeUp = running && left === 0;
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    if (!running || timeUp || !open || phase !== "draw") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running, timeUp, open, phase]);

  // Start is the one thing to do on the brief, so it has the focus.
  useEffect(() => {
    if (open && landed && phase === "brief") startRef.current?.focus({ preventScroll: true });
  }, [open, landed, phase]);

  /* The sheet you handed in: full size for the take and the send. After a
     reload only the stub's thumbnail survives, and that is what shows. */
  const [yours, setYours] = useState<string | null>(() => readHanded()[brief.id] ?? null);
  const [sendOpen, setSendOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const chime = useRef<Chime | null>(null);
  useEffect(() => () => chime.current?.dispose(), []);

  const moveRing = useCallback(
    (e: React.PointerEvent) => {
      const ring = ringRef.current;
      const c = inkRef.current;
      if (!ring || !c) return;
      const r = c.getBoundingClientRect();
      const d = Math.max(6, (size * r.width) / SHEET);
      ring.style.width = `${d}px`;
      ring.style.height = `${d}px`;
      ring.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
    },
    [size],
  );

  const ink = useInk({
    canvasRef: inkRef,
    tool: { color, size, erasing },
    onMove: moveRing,
    sound: graphite,
  });

  // The frame under the paper, repainted at the displayed size.
  useEffect(() => {
    const c = frameRef.current;
    if (!c) return;
    const paint = () => paintFrameCanvas(c, brief.frame, FRAME_INK);
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(c);
    return () => ro.disconnect();
  }, [brief.frame]);

  // ⌘Z / ⇧⌘Z while sketching — not while typing in the send field.
  const { undo, redo } = ink;
  useEffect(() => {
    if (!open || phase !== "draw") return;
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, phase, undo, redo]);

  const under = useCallback(
    (ctx: CanvasRenderingContext2D) => paintFrame(ctx, brief.frame, FRAME_INK),
    [brief.frame],
  );

  function start() {
    if (startedAt === null) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    }
    setStudioPhase("draw");
  }

  function done() {
    setYours(ink.exportSheet(SKETCH_EXPORT_PX, paper, under));
    recordHandIn(brief.id, ink.exportSheet(160, paper, under));
    setUsed(brief.seconds - left);
    play("book-page", { level: 0.5 });
    setStudioPhase("take");
  }

  async function send() {
    if (!yours || sending) return;
    // Built on the gesture that sends — that is what lets a browser play it.
    if (!reduced) chime.current ??= createChime();
    setSending(true);
    setError("");
    let result: SketchResult;
    try {
      result = await sendSketch({ png: yours, briefId: brief.id, contact });
    } catch {
      result = { ok: false, reason: "failed" };
    }
    setSending(false);
    if (result.ok) {
      setSent(true);
      // The connect fifth: the site's sound for a real outcome.
      chime.current?.connect();
    } else {
      setError(SEND_ERRORS[result.reason]);
    }
  }

  function nextBrief() {
    redeal();
    openStudio(readTable());
  }

  const frameLabel = FRAME_LABEL[brief.frame].toLowerCase();

  return (
    <div className={styles.stage} data-step={phase}>
      {/* --- The bar ---------------------------------------------------- */}
      <header className={styles.bar}>
        <button type="button" className={styles.back} onClick={closeStudio} aria-label="Back to the board">
          <Ico d={PATHS.back} size={16} />
          Board
        </button>

        <div className={styles.barMid}>
          {phase !== "brief" && <span className={styles.barBrief}>{brief.brief}</span>}
          {phase === "draw" && (
            <span className={styles.timer} data-up={timeUp ? "" : undefined} role="timer"
              aria-label={timeUp ? "Time's up" : `${left} seconds left`}>
              {timeUp ? "Time's up" : clock(left)}
            </span>
          )}
        </div>

        <div className={styles.barEnd}>
          {phase === "draw" && (
            <button
              type="button"
              className={styles.done}
              data-due={timeUp ? "" : undefined}
              disabled={!ink.canUndo}
              onClick={done}
            >
              Done
            </button>
          )}
        </div>
      </header>

      {/* --- 1. The brief ----------------------------------------------- */}
      {phase === "brief" && (
        <section className={styles.intro} aria-label="The brief" data-waiting={landed ? undefined : ""}>
          <p className={`${styles.kicker} ${styles.after}`}>Brief №{briefNumber(brief)}</p>
          <div
            className={`briefTape briefTapeLarge ${styles.introTape}`}
            data-studio-tape=""
            data-arriving={landed ? undefined : ""}
            data-dealt={dealt ? "" : undefined}
            style={{ rotate: `${TAPE_TILT}deg` }}
          >
            <p className="briefTapeText">{brief.brief}</p>
            <p className="briefTapeMeta">{tapeMeta(brief)}</p>
          </div>
          <p className={`${styles.rules} ${styles.after}`}>
            <strong>{brief.seconds} seconds, on a {frameLabel}.</strong>
            <span>Rough is right. The clock starts when you do.</span>
          </p>
          <div className={`${styles.introActions} ${styles.after}`}>
            <button ref={startRef} type="button" className={styles.primary} onClick={start}>
              Start sketching
            </button>
            <button type="button" className={styles.quiet} onClick={nextBrief}>
              Deal another
            </button>
          </div>
        </section>
      )}

      {/* --- 2. The sheet ------------------------------------------------
          Mounted through the take, hidden, so "Keep sketching" comes back to
          the same strokes. */}
      <div className={styles.drawView} data-hidden={phase === "draw" ? undefined : ""}>
        <p className={styles.phoneBrief}>{brief.brief}</p>
        <div className={styles.paper} data-cursor="none">
          <canvas ref={frameRef} className={styles.layer} aria-hidden="true" />
          <canvas
            ref={inkRef}
            className={`${styles.layer} ${styles.ink}`}
            role="img"
            aria-label={`Drawing paper, over a faint ${frameLabel} outline`}
            {...ink.handlers}
            onPointerEnter={() => {
              if (ringRef.current) ringRef.current.style.opacity = "1";
            }}
            onPointerLeave={() => {
              if (ringRef.current) ringRef.current.style.opacity = "0";
            }}
          />
          <div ref={ringRef} className={styles.ring} style={{ borderColor: erasing ? INKS[0] : color }} />
        </div>

        <div className={styles.tools} role="toolbar" aria-label="Drawing tools">
          {INKS.map((c, i) => (
            <button
              key={c}
              type="button"
              className={styles.tool}
              onClick={() => {
                setColor(c);
                setErasing(false);
              }}
              aria-label={INK_NAMES[i]}
              aria-pressed={c === color && !erasing}
            >
              <span className={styles.chip} style={{ background: c }} />
            </button>
          ))}
          <span className={styles.sep} />
          {/* One nib button, not two: fine or marker, and the dot shows which. */}
          <button
            type="button"
            className={styles.tool}
            onClick={() => {
              setSize((s) => (s === FINE ? MARKER : FINE));
              setErasing(false);
            }}
            aria-label="Marker"
            aria-pressed={size === MARKER}
          >
            <span className={styles.nib} style={{ width: size === MARKER ? 12 : 5, height: size === MARKER ? 12 : 5 }} />
          </button>
          <button
            type="button"
            className={styles.tool}
            onClick={() => setErasing((v) => !v)}
            aria-label="Eraser"
            aria-pressed={erasing}
          >
            <Ico d={PATHS.eraser} />
          </button>
          <span className={styles.sep} />
          <button type="button" className={styles.tool} disabled={!ink.canUndo} onClick={ink.undo} aria-label="Undo">
            <Ico d={PATHS.undo} />
          </button>
          <button type="button" className={styles.tool} disabled={!ink.canRedo} onClick={ink.redo} aria-label="Redo">
            <Ico d={PATHS.redo} />
          </button>
          <button type="button" className={styles.tool} disabled={!ink.canUndo} onClick={ink.clear} aria-label="Clear the sheet">
            <Ico d={PATHS.trash} />
          </button>
        </div>
      </div>

      {/* --- 3. Compare ------------------------------------------------- */}
      {phase === "take" && (
        <section className={styles.take} aria-label="Compare">
          <figure className={styles.yours}>
            {yours ? (
              // A data URL of the visitor's own sheet — nothing for next/image to do.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.sheet} src={yours} alt="Your sketch" />
            ) : (
              <div className={styles.sheet} />
            )}
            <figcaption>
              Yours{used !== null && <>, in {clock(used)}</>}
            </figcaption>
          </figure>

          <div className={styles.side}>
            <div className={styles.note}>
              <p className={styles.kicker}>How I&apos;d do it</p>
              {brief.take.sketch && (
                // A drawing at its own aspect, from /public.
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.mineSketch} src={brief.take.sketch} alt={`Siddhant's sketch for: ${brief.brief}`} />
              )}
              <p className={styles.mineNote}>{brief.take.note}</p>
              <p className={styles.sign}>— Siddhant</p>
              {brief.take.study && (
                <Link className={styles.study} href={brief.take.study.href}>
                  I had this one for real — {brief.take.study.label} <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>

            <div className={styles.actions}>
              {sent ? (
                <p className={styles.sent} role="status">Sent ✓ Thank you — I read every one.</p>
              ) : sendOpen ? (
                <form
                  className={styles.send}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <input
                    className={styles.field}
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="Your email, for a reply"
                    aria-label="Your email, if you'd like a reply (optional)"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <button type="submit" className={styles.primary} disabled={sending || !yours}>
                    {sending ? "Sending…" : "Send"}
                  </button>
                </form>
              ) : (
                <button type="button" className={styles.primary} onClick={() => setSendOpen(true)} disabled={!yours}>
                  Send yours to Siddhant
                </button>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <div className={styles.secondary}>
                <button type="button" className={styles.quiet} onClick={nextBrief}>
                  Next brief <span aria-hidden="true">→</span>
                </button>
                <button type="button" className={styles.quiet} onClick={() => setStudioPhase("draw")}>
                  Keep sketching
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
