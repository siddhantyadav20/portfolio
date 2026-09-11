"use client";

import { useEffect, useState } from "react";
import { PALETTE_INDEX, type PaletteEntry } from "@/content/palette";
import { readAsk } from "../askStream";
import { Glyph, glyphFor } from "./Glyph";
import styles from "./CommandPalette.module.css";

/* ===========================================================================
   "Ask me instead" — an answer, streamed, for the question search could not.

   Laid out like every other answer in the palette, in the homepage's voice:
   the question as the headline in the display face under an accent eyebrow,
   the answer arriving a few words at a time behind a caret, then the pages it
   drew on as chips you can open. It says what it is, underneath: an AI
   answer, drawn only from this site.
   =========================================================================== */

type Status = "asking" | "streaming" | "done" | "offline" | "throttled" | "failed";

/** Set once the route says there is no key, so the palette stops offering
 *  the row for the rest of the visit rather than failing on every miss. */
let offline = false;
export function askOffline() {
  return offline;
}

const BY_ID = new Map(PALETTE_INDEX.map((e) => [e.id, e]));

const SAID: Record<Exclude<Status, "asking" | "streaming" | "done">, string> = {
  offline: "Answers aren’t switched on right now. Try a shorter search — the list has most of it.",
  throttled: "That’s a lot of questions at once. Give it a minute and ask again.",
  failed: "That didn’t come through. Try asking again?",
};

export function AskPanel({
  question,
  onPick,
}: {
  question: string;
  onPick: (entry: PaletteEntry) => void;
}) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<Status>("asking");

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          if (res.status === 503) offline = true;
          setStatus(res.status === 503 ? "offline" : res.status === 429 ? "throttled" : "failed");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setRaw(text);
          setStatus("streaming");
        }
        setStatus("done");
      } catch {
        // Aborted because the visitor backed out: nothing to say.
        if (!ctrl.signal.aborted) setStatus("failed");
      }
    })();
    return () => ctrl.abort();
  }, [question]);

  const read = readAsk(raw);
  const failed = status === "failed" || read.failed;
  const sources = read.sources
    .map((id) => BY_ID.get(id))
    .filter((e): e is PaletteEntry => Boolean(e));

  return (
    <div className={styles.ask}>
      <p className={styles.askEyebrow}>You asked</p>
      <h2 className={styles.askQuestion}>{question}</h2>

      <div className={styles.askBody} aria-live="polite" aria-busy={status === "asking" || status === "streaming"}>
        {status === "asking" && (
          <p className={styles.askThinking}>
            Thinking<span aria-hidden="true" />
          </p>
        )}

        {read.text && (
          <p className={styles.askAnswer}>
            {read.text}
            {status === "streaming" && <span className={styles.askCaret} aria-hidden="true" />}
          </p>
        )}

        {read.refused && !read.text && (
          <p className={styles.askStatus}>That’s not one I can answer here — ask me about my work.</p>
        )}
        {failed && <p className={styles.askStatus}>{SAID.failed}</p>}
        {(status === "offline" || status === "throttled") && (
          <p className={styles.askStatus}>{SAID[status]}</p>
        )}
      </div>

      {status === "done" && sources.length > 0 && (
        <div className={styles.askSources}>
          <p className={styles.askSourcesLabel}>From the site</p>
          <div className={styles.askChips}>
            {sources.map((entry) => (
              <button key={entry.id} type="button" className={styles.askChip} onClick={() => onPick(entry)}>
                <Glyph name={glyphFor(entry)} />
                <span>{entry.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(status === "streaming" || status === "done") && (
        <p className={styles.askNote}>An AI answer, drawn only from what’s on this site.</p>
      )}
    </div>
  );
}
