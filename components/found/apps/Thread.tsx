"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { story as ep } from "@/content/found/story";
import type { Message } from "@/content/found/types";
import { actionAvailable, has, openReply, replyOptions, sessionVars, type CaseState } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import AppBar from "./AppBar";
import GuardianCard from "./GuardianCard";
import PhotoFrame, { PhotoViewer } from "./PhotoFrame";
import Switch from "./Switch";
import app from "./App.module.css";
import styles from "./Thread.module.css";

/* The story's present is Monday in both episodes: the morning the phone
   arrived and the evening it came back on. So Monday is always "Today". */
const DAYS: Record<string, string> = {
  Mon: "Today",
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
 *
 * The bottom of the thread is what the phone lets the player do there: in
 * Episode 1, nothing (Low Power Mode); in Episode 2, a short list of things
 * to send when there's something to answer. Whatever they pick is sent from
 * {name}'s phone, and it shows up in the thread like anything else sent.
 *
 * The name at the top opens the person's details, as it does on a phone,
 * and that's where Send Read Receipts lives: the one switch that decides
 * whether Mum is told her messages are being read.
 */
export default function Thread({
  threadId,
  contact,
  messages,
  state,
  moved = false,
  group = false,
  nameable = false,
  composer,
  onBack,
  backLabel,
}: {
  threadId: string;
  contact: string;
  messages: readonly Message[];
  state: CaseState;
  moved?: boolean;
  group?: boolean;
  nameable?: boolean;
  composer: "low-power" | "replies" | "none";
  onBack: () => void;
  backLabel: string;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [details, setDetails] = useState(false);
  const [name, setName] = useState(state.names[threadId] ?? "");
  const vars = sessionVars(ep, state);
  const t = (x: string) => say(x, state.cast, vars);
  const reply = composer === "replies" ? openReply(ep, state, threadId) : undefined;
  const options = reply ? replyOptions(state, reply) : [];
  const receipts = !has(state, "did:receipts-off");
  const canReceipts = actionAvailable(ep, state, "receipts-off");
  // Group chats and the vault's copy of K.'s chat have no one person to open.
  const hasDetails = !group && composer !== "none";

  useEffect(() => {
    play.seeAll(messages.map((m) => m.evidence));
  }, [messages]);

  // Pinned to the newest message, like every messaging app: on open, and
  // whenever one arrives. Set on the scroller rather than `scrollIntoView`,
  // which would also scroll the fixed room around the phone.
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, options.length]);

  const title = state.names[threadId] ?? contact;

  return (
    <section className={app.view}>
      <AppBar
        title={title}
        onTitle={hasDetails ? () => setDetails(true) : undefined}
        onBack={onBack}
        backLabel={backLabel}
        end={
          nameable ? (
            <button type="button" className={styles.nameButton} onClick={() => setNaming((v) => !v)}>
              {naming ? "Cancel" : state.names[threadId] ? "Rename" : "Add name"}
            </button>
          ) : undefined
        }
      />
      {naming && (
        <form
          className={styles.naming}
          onSubmit={(e) => {
            e.preventDefault();
            play.nameContact(threadId, name);
            setNaming(false);
          }}
        >
          <input
            className={styles.nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={contact}
            maxLength={24}
            autoFocus
          />
          <button type="submit" className={styles.nameSave}>
            Save
          </button>
        </form>
      )}
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
          const scrubbed = m.text === "This message was deleted.";
          return (
            <Fragment key={i}>
              {newDay && <p className={styles.day}>{dayOf(m.at)}</p>}
              <div className={styles.row} data-from={m.from} data-new={m.at === "now" || undefined}>
                {showSender && <span className={styles.sender}>{m.sender}</span>}
                {m.text && (
                  <p className={styles.bubble} data-scrubbed={scrubbed || undefined}>
                    {t(m.text)}
                  </p>
                )}
                {m.card === "guardian" && (
                  <div className={styles.card}>
                    <GuardianCard state={state} />
                  </div>
                )}
                {m.photo && (
                  <button type="button" className={styles.photo} onClick={() => setViewing(m.photo ?? null)}>
                    <PhotoFrame id={m.photo} cast={state.cast} size="bubble" />
                  </button>
                )}
                {endOfRun && <span className={styles.time}>{timeOf(m.at)}</span>}
              </div>
            </Fragment>
          );
        })}
      </div>

      {composer === "low-power" && <p className={styles.composer}>Low Power Mode is on. Messages can&apos;t be sent.</p>}
      {reply && options.length > 0 && (
        <div className={styles.replies} role="group" aria-label="Reply">
          {options.map((o) => (
            <button
              type="button"
              key={o.id}
              className={styles.replyOption}
              data-silent={o.text === null || undefined}
              onClick={() => play.choose(reply.id, o.id)}
            >
              {o.text === null ? "Don’t reply" : t(o.text)}
            </button>
          ))}
        </div>
      )}
      {details && (
        <div className={styles.contactSheet} role="dialog" aria-label={title} data-no-swipe>
          <div className={styles.contactBar}>
            <button type="button" className={styles.contactDone} onClick={() => setDetails(false)}>
              Done
            </button>
          </div>
          <span className={styles.contactAvatar} aria-hidden="true">
            {contact.startsWith("+") && !state.names[threadId] ? "?" : title[0]}
          </span>
          <p className={styles.contactName}>{title}</p>
          {title !== contact && <p className={styles.contactSub}>{contact}</p>}
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Send Read Receipts</span>
              </span>
              <Switch
                on={receipts}
                disabled={!receipts || !canReceipts}
                onChange={() => play.perform("receipts-off")}
                label="Send Read Receipts"
              />
            </li>
          </ul>
          <p className={app.note}>When this is on, people are told when you&apos;ve read their messages.</p>
        </div>
      )}
      {viewing && <PhotoViewer id={viewing} cast={state.cast} onClose={() => setViewing(null)} />}
    </section>
  );
}
