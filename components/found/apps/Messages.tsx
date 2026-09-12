"use client";

import { useEffect, useMemo, useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import { all, threadMessages } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import AppBar from "./AppBar";
import Thread from "./Thread";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Messages.module.css";

/** Threads with something new rise to the top, newest first; the rest keep the script's order. */
function lastTouched(flags: readonly string[], threadId: string): number {
  let at = -1;
  flags.forEach((f, i) => {
    if (!f.startsWith("fired:")) return;
    if (ep.events.find((e) => `fired:${e.id}` === f)?.thread === threadId) at = i;
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
    if (open) onRead(open);
  }, [open, count, onRead]);

  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>Messages</h2>
        <ul className={styles.list}>
          {threads.map(({ thread, messages }) => {
            const last = messages.at(-1);
            const preview = thread.moved
              ? "This conversation was moved."
              : last?.text
                ? say(last.text, state.cast)
                : last?.photo
                  ? "Photo"
                  : "";
            const when = !last ? "" : last.at === "now" ? "now" : last.at.split(" ")[0];
            return (
              <li key={thread.id}>
                <button type="button" className={styles.thread} onClick={() => setOpen(thread.id)}>
                  <span className={styles.unread} data-on={unread.has(thread.id) || undefined} />
                  <span className={styles.avatar} data-group={thread.group || undefined}>
                    {thread.contact.startsWith("+") ? "?" : thread.contact[0]}
                  </span>
                  <span className={styles.main}>
                    <span className={styles.top}>
                      <span className={styles.name}>{thread.contact}</span>
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
          contact={current.thread.contact}
          messages={current.messages}
          cast={state.cast}
          moved={current.thread.moved}
          group={current.thread.group}
          onBack={() => setOpen(null)}
          backLabel="Messages"
        />
      )}
    </section>
  );
}
