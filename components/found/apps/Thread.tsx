"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import type { Cast, Message } from "@/content/found/types";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import AppBar from "./AppBar";
import PhotoFrame, { PhotoViewer } from "./PhotoFrame";
import app from "./App.module.css";
import styles from "./Thread.module.css";

const DAYS: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
  now: "Today",
};
const dayOf = (at: string) => DAYS[at.split(" ")[0]] ?? at;
const timeOf = (at: string) => (at === "now" ? "Just now" : (at.split(" ")[1] ?? at));

/**
 * One conversation. Opening it is looking at it: any evidence in its messages
 * goes into the case file, including messages that arrive while it's open.
 */
export default function Thread({
  contact,
  messages,
  cast,
  moved = false,
  group = false,
  composer = true,
  onBack,
  backLabel,
}: {
  contact: string;
  messages: readonly Message[];
  cast: Cast;
  moved?: boolean;
  group?: boolean;
  composer?: boolean;
  onBack: () => void;
  backLabel: string;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    play.seeAll(messages.map((m) => m.evidence));
  }, [messages]);

  // Pinned to the newest message, like every messaging app: on open, and
  // whenever one arrives. Set on the scroller rather than `scrollIntoView`,
  // which would also scroll the fixed room around the phone.
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <section className={app.view}>
      <AppBar title={contact} onBack={onBack} backLabel={backLabel} />
      <div className={app.body} ref={body}>
        {moved && <p className={styles.moved}>This conversation was moved.</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
          const endOfRun =
            !next || next.from !== m.from || next.sender !== m.sender || dayOf(next.at) !== dayOf(m.at);
          const showSender =
            group && m.from === "them" && m.sender && (newDay || prev?.sender !== m.sender || prev?.from !== m.from);
          return (
            <Fragment key={i}>
              {newDay && <p className={styles.day}>{dayOf(m.at)}</p>}
              <div className={styles.row} data-from={m.from} data-new={m.at === "now" || undefined}>
                {showSender && <span className={styles.sender}>{m.sender}</span>}
                {m.text && <p className={styles.bubble}>{say(m.text, cast)}</p>}
                {m.photo && (
                  <button type="button" className={styles.photo} onClick={() => setViewing(m.photo ?? null)}>
                    <PhotoFrame id={m.photo} cast={cast} size="bubble" />
                  </button>
                )}
                {endOfRun && <span className={styles.time}>{timeOf(m.at)}</span>}
              </div>
            </Fragment>
          );
        })}
      </div>
      {composer && <p className={styles.composer}>Low Power Mode is on. Messages can&apos;t be sent.</p>}
      {viewing && <PhotoViewer id={viewing} cast={cast} onClose={() => setViewing(null)} />}
    </section>
  );
}
