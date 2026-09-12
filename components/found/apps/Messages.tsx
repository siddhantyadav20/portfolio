"use client";

import { useEffect, useMemo, useState } from "react";

import { story as ep } from "@/content/found/story";
import { all, has, openReply, sessionVars, threadMessages } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import AppBar from "./AppBar";
import Thread from "./Thread";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Messages.module.css";

/** Threads with something new rise to the top, newest first; the rest keep the script's order. */
function lastTouched(flags: readonly string[], threadId: string): number {
  let at = -1;
  flags.forEach((f, i) => {
    if (f === "ep:2" && ep.threads.find((t) => t.id === threadId)?.messages.some((m) => m.requires?.includes("ep:2")))
      at = Math.max(at, i);
    if (!f.startsWith("fired:") && !f.startsWith("said:")) return;
    const e = f.startsWith("fired:") ? ep.events.find((x) => `fired:${x.id}` === f) : ep.replies.find((r) => f.startsWith(`said:${r.id}`));
    if (e?.thread === threadId) at = i;
  });
  return at;
}

export default function Messages({
  state,
  arg,
  unread,
  onRead,
}: AppProps & { unread: ReadonlySet<string>; onRead: (thread: string) => void }) {
  const [open, setOpen] = useState<string | null>(arg ?? null);
  const vars = sessionVars(ep, state);
  const ep2 = has(state, "ep:2");

  const threads = useMemo(
    () =>
      ep.threads
        .filter((t) => all(state, t.requires))
        .map((t) => ({ thread: t, touched: lastTouched(state.flags, t.id), messages: threadMessages(ep, state, t.id) }))
        .sort((a, b) => b.touched - a.touched),
    [state],
  );

  const current = threads.find((t) => t.thread.id === open);
  const count = current?.messages.length ?? 0;

  useEffect(() => {
    if (!open) return;
    onRead(open);
    // Opening a thread is reading it, and the other side can see that.
    play.perform(`open:${open}`);
  }, [open, count, onRead]);

  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>Messages</h2>
        <ul className={styles.list}>
          {threads.map(({ thread, messages }) => {
            const last = messages.at(-1);
            const waiting = ep2 && !!openReply(ep, state, thread.id);
            const preview = thread.moved
              ? "This conversation was moved."
              : last?.text
                ? say(last.text, state.cast, vars)
                : last?.card
                  ? "Image"
                  : last?.photo
                    ? "Photo"
                    : "";
            const when = !last ? "" : last.at === "now" ? "now" : last.at.split(" ")[0];
            return (
              <li key={thread.id}>
                <button type="button" className={styles.thread} onClick={() => setOpen(thread.id)}>
                  <span className={styles.unread} data-on={unread.has(thread.id) || waiting || undefined} />
                  <span className={styles.avatar} data-group={thread.group || undefined}>
                    {thread.contact.startsWith("+") && !state.names[thread.id] ? "?" : (state.names[thread.id] ?? thread.contact)[0]}
                  </span>
                  <span className={styles.main}>
                    <span className={styles.top}>
                      <span className={styles.name}>{state.names[thread.id] ?? thread.contact}</span>
                      <span className={styles.when}>{when}</span>
                    </span>
                    <span className={styles.preview}>{preview}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {current && (
        <Thread
          threadId={current.thread.id}
          contact={current.thread.contact}
          messages={current.messages}
          state={state}
          moved={current.thread.moved}
          group={current.thread.group}
          nameable={current.thread.nameable}
          composer={ep2 ? "replies" : "low-power"}
          onBack={() => setOpen(null)}
          backLabel="Messages"
        />
      )}
    </section>
  );
}
