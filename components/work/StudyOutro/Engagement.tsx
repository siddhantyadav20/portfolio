"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BODY_MAX,
  EMPTY_ENGAGEMENT,
  NAME_MAX,
  readComment,
  relativeTime,
  type CommentError,
  type Engagement as Data,
  type Reaction,
  type StudyComment,
} from "@/lib/engagement";
import { commentOnStudy, reactToStudy } from "./actions";
import styles from "./StudyOutro.module.css";

type Props = { slug: string };

type State = Data & { mine: Reaction | null };

const LOADING: State = { ...EMPTY_ENGAGEMENT, mine: null };

/**
 * "Was this useful?", and the thread under it.
 *
 * Everything here loads after the page does, on purpose. `/work/<slug>` is a
 * prerendered static page and staying that way is worth more than having a
 * like count in the initial HTML — a count is stale the moment it is rendered,
 * and turning three static pages dynamic to ship one is a bad trade. So the
 * block server-renders as its own skeleton and fills in from
 * `/api/studies/<slug>/engagement` a moment later.
 *
 * The optimistic update on a reaction is not decoration either: the button is
 * the only feedback that the press registered, and waiting a round trip to
 * move a number by one reads as a broken control. The server's answer replaces
 * the guess when it lands, so a rejected press corrects itself rather than
 * lying.
 */
export default function Engagement({ slug }: Props) {
  const [data, setData] = useState<State>(LOADING);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const abort = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/studies/${slug}/engagement`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as State);
      } catch {
        // Offline, or the store is unreachable. `configured: false` is already
        // the state, and it renders as "unavailable" rather than as zeroes.
      } finally {
        // Not in the `try`: an aborted fetch must not flip this, or a
        // fast unmount/remount leaves the block claiming it has loaded.
        if (!abort.signal.aborted) setLoaded(true);
      }
    })();

    return () => abort.abort();
  }, [slug]);

  const react = useCallback(
    async (kind: Reaction) => {
      if (!data.configured || pending) return;
      setPending(true);

      // The optimistic guess, using exactly the rule the server follows:
      // pressing what you already pressed takes it back.
      setData((d) => {
        const taking = d.mine === kind;
        const leaving = d.mine && d.mine !== kind ? d.mine : null;
        return {
          ...d,
          mine: taking ? null : kind,
          up:
            d.up +
            (kind === "up" ? (taking ? -1 : 1) : 0) +
            (leaving === "up" ? -1 : 0),
          down:
            d.down +
            (kind === "down" ? (taking ? -1 : 1) : 0) +
            (leaving === "down" ? -1 : 0),
        };
      });

      const result = await reactToStudy(slug, kind);
      if (result.ok) {
        setData((d) => ({ ...d, up: result.up, down: result.down, mine: result.mine }));
      } else {
        // Put it back. A guess that turned out to be wrong is worse than no
        // guess if it is allowed to stand.
        const res = await fetch(`/api/studies/${slug}/engagement`);
        if (res.ok) setData((await res.json()) as State);
      }
      setPending(false);
    },
    [data.configured, pending, slug],
  );

  const onPosted = useCallback((comment: StudyComment) => {
    setData((d) => ({ ...d, comments: [comment, ...d.comments] }));
  }, []);

  const unavailable = loaded && !data.configured;

  return (
    <div className={styles.engagement}>
      <div className={styles.reactions}>
        {/* Not "your ten minutes". This line is shared by every study, and the
            number was written when only the Inspection redesign had a helpers
            row saying "10 min read". The Design System study says 8, and a page
            that contradicts its own reading time two screens apart reads as
            unproofed. No number here can be right for all of them. */}
        <p className={styles.reactionsAsk}>Was this worth your time?</p>

        <div className={styles.reactionButtons}>
          <ReactionButton
            kind="up"
            label="Yes, this was useful"
            count={data.up}
            mine={data.mine === "up"}
            ready={loaded && data.configured}
            onClick={() => react("up")}
          />
          <ReactionButton
            kind="down"
            label="Not really"
            count={data.down}
            mine={data.mine === "down"}
            ready={loaded && data.configured}
            onClick={() => react("down")}
          />
        </div>

        {unavailable && (
          <p className={styles.offline} data-placeholder="">
            Reactions aren&rsquo;t connected yet.
          </p>
        )}
      </div>

      {!unavailable && (
        <div className={styles.thread}>
          <CommentForm slug={slug} onPosted={onPosted} disabled={!loaded} />

          {data.comments.length > 0 && (
            <ol className={styles.comments}>
              {data.comments.map((comment) => (
                <li key={comment.id} className={styles.comment}>
                  <p className={styles.commentHead}>
                    <span className={styles.commentName}>
                      {comment.name || "Anonymous"}
                    </span>
                    <span className={styles.commentTime}>
                      {relativeTime(comment.at)}
                    </span>
                  </p>
                  {/* Plain text, never markup: the body is rendered as a text
                      node so React escapes it, and nothing here turns a URL
                      into a link. `white-space: pre-wrap` keeps the author's
                      own line breaks without giving them any other control. */}
                  <p className={styles.commentBody}>{comment.body}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function ReactionButton({
  kind,
  label,
  count,
  mine,
  ready,
  onClick,
}: {
  kind: Reaction;
  label: string;
  count: number;
  mine: boolean;
  ready: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.reaction} liquid`}
      data-kind={kind}
      data-mine={mine ? "" : undefined}
      onClick={onClick}
      disabled={!ready}
      aria-pressed={mine}
    >
      <ThumbGlyph down={kind === "down"} />
      <span className={styles.reactionLabel}>{label}</span>
      {/* An em dash until the real number arrives — a zero that turns into a
          seven a moment later reads as the page correcting a mistake. */}
      <span className={styles.reactionCount}>{ready ? count : "—"}</span>
    </button>
  );
}

function CommentForm({
  slug,
  onPosted,
  disabled,
}: {
  slug: string;
  onPosted: (comment: StudyComment) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<CommentError | null>(null);
  const [sending, setSending] = useState(false);
  const [posted, setPosted] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (sending) return;

      // The same rule the server applies, run here so an empty box does not
      // cost a round trip. The server runs it again regardless.
      const checked = readComment({ name, body });
      if (!checked.ok) {
        setError(checked.reason);
        bodyRef.current?.focus();
        return;
      }

      setSending(true);
      setError(null);

      const result = await commentOnStudy(slug, checked.value);
      if (result.ok) {
        onPosted(result.comment);
        setBody("");
        setPosted(true);
        window.setTimeout(() => setPosted(false), 4000);
      } else {
        setError(result.reason);
      }
      setSending(false);
    },
    [body, name, onPosted, sending, slug],
  );

  const remaining = BODY_MAX - body.length;

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.fields}>
        <input
          className={styles.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="Your name (optional)"
          aria-label="Your name, optional"
          disabled={disabled || sending}
        />

        <textarea
          ref={bodyRef}
          className={styles.body}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={3}
          placeholder="Thoughts, questions, or where you’d have gone differently"
          aria-label="Your comment"
          aria-invalid={error ? true : undefined}
          disabled={disabled || sending}
        />
      </div>

      <div className={styles.formFoot}>
        <p className={styles.formNote} role={error ? "alert" : undefined}>
          {error ? MESSAGES[error] : posted ? "Posted — thank you." : NOTE}
        </p>

        <div className={styles.formActions}>
          {/* Only once it is worth knowing about. A counter that starts at 600
              and ticks down from the first keystroke is a limit advertised to
              people who were never going to reach it. */}
          {remaining < 120 && (
            <span className={styles.remaining} data-low={remaining < 20 ? "" : undefined}>
              {remaining}
            </span>
          )}

          <button
            type="submit"
            className={`${styles.post} liquid`}
            disabled={disabled || sending || !body.trim()}
          >
            {sending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

const NOTE = "Public, and shown with whatever name you give. No email, no account.";

const MESSAGES: Record<CommentError, string> = {
  empty: "There is nothing to post yet.",
  "too-long": `That is over ${BODY_MAX} characters.`,
  throttled: "That is a few comments in a short while — try again shortly.",
  unavailable: "Comments aren’t connected yet.",
  failed: "That didn’t send. Try again in a moment.",
};

/** Figma has no icon for this. A thumb, drawn once and flipped for the other. */
function ThumbGlyph({ down }: { down: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={down ? { transform: "rotate(180deg)" } : undefined}
    >
      <path
        d="M6.5 21H4.75A1.75 1.75 0 0 1 3 19.25v-7.5C3 10.78 3.78 10 4.75 10H6.5zM8 10.4l3.6-7.1a1.2 1.2 0 0 1 2.27.54V8.5h4.4a2.1 2.1 0 0 1 2.06 2.52l-1.32 6.6A2.6 2.6 0 0 1 16.36 21H8z"
        fill="currentColor"
      />
    </svg>
  );
}
