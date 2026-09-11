"use client";

import { useLayoutEffect, useRef } from "react";
import type { Brief } from "@/content/canvas";
import { LEAF_MS, faceKeyframes, leafKeyframes, type Pose } from "@/lib/briefFlight";
import styles from "./ScratchCard.module.css";

/* ===========================================================================
   The torn half of the ticket, in the air.

   Portalled into the canvas surface — above the board and the Studio's veil —
   and flown in screen pixels from where the ticket is drawn to the Studio's
   tape. It leaves at the camera's zoom (`s0`) and lands at 1:1. A zero-size
   pivot carries the path; the two faces sit centred on it (see
   `faceKeyframes` for why they scale together). Transform and opacity only.
   =========================================================================== */

export type Flight = {
  /** The canvas surface — the leaf's parent while it flies. */
  readonly container: HTMLElement;
  readonly from: Pose;
  readonly to: Pose;
  /** The camera's zoom at take-off. */
  readonly s0: number;
  /** Ticket face: the card's width, and its height down to the perforation. */
  readonly leafW: number;
  readonly leafH: number;
  /** Tape face: the real tape's measured, untransformed box. */
  readonly tapeW: number;
  readonly tapeH: number;
};

export default function Leaf({
  flight,
  brief,
  eyebrow,
  serial,
  meta,
  tokens,
  onDone,
}: {
  flight: Flight;
  brief: Brief;
  eyebrow: string;
  serial: string;
  /** The tape's meta line, word for word — it becomes the real one. */
  meta: string;
  /** The card's theme colours, which a portal leaves behind. */
  tokens: React.CSSProperties;
  onDone: () => void;
}) {
  const pivot = useRef<HTMLDivElement>(null);
  const ticket = useRef<HTMLDivElement>(null);
  const tape = useRef<HTMLDivElement>(null);
  const ticketText = useRef<HTMLDivElement>(null);
  const tapeText = useRef<HTMLDivElement>(null);

  // Before paint, so the first frame is already the leaf over the card.
  useLayoutEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };

    const timing = { duration: LEAF_MS, fill: "forwards" as const };
    const faces = faceKeyframes(flight.tapeW / flight.leafW);
    const flying = pivot.current?.animate(
      leafKeyframes(flight.from, flight.to, flight.s0, 1),
      timing,
    );
    // The sheets and their words on separate clocks — see `faceKeyframes`.
    const parts = [
      ticket.current?.animate(faces.ticket, timing),
      tape.current?.animate(faces.tape, timing),
      ticketText.current?.animate(faces.ticketText, timing),
      tapeText.current?.animate(faces.tapeText, timing),
    ];
    flying?.finished.then(finish, () => {});

    /* A frame-starved tab never finishes an animation — the MCP browsers run
       hidden, and so does any background tab. The brief lands regardless;
       without this the tape would stay hidden for good. */
    const fallback = window.setTimeout(finish, LEAF_MS + 300);

    return () => {
      window.clearTimeout(fallback);
      flying?.cancel();
      for (const p of parts) p?.cancel();
    };
  }, [flight, onDone]);

  return (
    <div ref={pivot} className={styles.pivot} aria-hidden="true">
      <div
        ref={ticket}
        className={styles.faceTicket}
        style={{
          ...tokens,
          width: flight.leafW,
          height: flight.leafH,
          left: -flight.leafW / 2,
          top: -flight.leafH / 2,
        }}
      >
        <div ref={ticketText}>
          <div className={styles.head}>
            <span>{eyebrow}</span>
            <span className={styles.serial}>№{serial}</span>
          </div>
          <p className={styles.brief}>{brief.brief}</p>
        </div>
      </div>

      <div
        ref={tape}
        className={`briefTape briefTapeLarge ${styles.faceTape}`}
        style={{
          width: flight.tapeW,
          height: flight.tapeH,
          left: -flight.tapeW / 2,
          top: -flight.tapeH / 2,
        }}
      >
        <div ref={tapeText}>
          <p className="briefTapeText">{brief.brief}</p>
          <p className="briefTapeMeta">{meta}</p>
        </div>
      </div>
    </div>
  );
}
