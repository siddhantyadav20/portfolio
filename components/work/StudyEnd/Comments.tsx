"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BODY_MAX,
  COMMENT_PAGE,
  EMPTY_ENGAGEMENT,
  readComment,
  type CommentError,
  type Engagement,
  type ThreadComment,
} from "@/lib/engagement";
import { commentOnStudy, likeStudy, likeStudyComment } from "./actions";
import CommentAvatar from "./CommentAvatar";
import styles from "./StudyEnd.module.css";

type Props = { slug: string; title: string };


/**
 * Figma 798:752 — the like, the count, Share, and the thread.
 *
 * Everything here loads after the page does, on purpose. `/work/<slug>` is a
 * prerendered static page and staying that way is worth more than having a
 * like count in the initial HTML — a count is stale the moment it is rendered,
 * and turning three static pages dynamic to ship one is a bad trade. So the
 * block server-renders as its own skeleton and fills in from
 * `/api/studies/<slug>/engagement` a moment later.
 *
 * The optimistic update on a like is not decoration either: the button is the
 * only feedback that the press registered, and waiting a round trip to move a
 * number by one reads as a broken control. The server's answer replaces the
 * guess when it lands, so a rejected press corrects itself rather than lying.
 *
 * The thread arrives a page at a time. `total` is the size of the whole
 * thread and comes from the store; the comments in hand are however many have
 * been fetched, and "Load More" asks for the next page rather than revealing
 * more of one big response. Those two numbers were the same thing in the first
 * pass at this, which made the count in the stats row shrink to whatever
 * happened to be loaded.
 */
export default function Comments({ slug, title }: Props) {
  const [data, setData] = useState<Engagement>(EMPTY_ENGAGEMENT);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /* The id of the comment this visitor just wrote. It marks exactly one row,
     for one animation, and is cleared afterwards — a highlight that stayed
     would be a permanent claim about which comment is interesting. */
  const [justPosted, setJustPosted] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/studies/${slug}/engagement`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as Engagement);
      } catch {
        // Offline, or the store is unreachable. `configured: false` is already
        // the state, and it renders as "unavailable" rather than as zeroes.
      } finally {
        // Not in the `try`: an aborted fetch must not flip this, or a fast
        // unmount/remount leaves the block claiming it has loaded.
        if (!abort.signal.aborted) setLoaded(true);
      }
    })();

    return () => abort.abort();
  }, [slug]);

  const like = useCallback(async () => {
    if (!data.configured || pending) return;
    setPending(true);

    // The optimistic guess, using exactly the rule the server follows:
    // pressing what you already pressed takes it back.
    setData((d) => ({
      ...d,
      liked: !d.liked,
      likes: d.likes + (d.liked ? -1 : 1),
    }));

    const result = await likeStudy(slug);
    if (result.ok) {
      setData((d) => ({ ...d, likes: result.likes, liked: result.liked }));
    } else {
      // Put it back. A guess that turned out to be wrong is worse than no
      // guess if it is allowed to stand.
      const res = await fetch(`/api/studies/${slug}/engagement`);
      if (res.ok) setData((await res.json()) as Engagement);
    }
    setPending(false);
  }, [data.configured, pending, slug]);

  /**
   * Liking one comment.
   *
   * Optimistic for the same reason the study's own like is: the only feedback
   * that a press landed is the button, and a round trip before the number
   * moves reads as a control that did nothing.
   */
  const likeComment = useCallback(
    async (id: string) => {
      if (!data.configured) return;

      const apply = (next: Partial<ThreadComment>) =>
        setData((d) => ({
          ...d,
          comments: d.comments.map((c) => (c.id === id ? { ...c, ...next } : c)),
        }));

      const before = data.comments.find((c) => c.id === id);
      if (!before) return;

      apply({ liked: !before.liked, likes: before.likes + (before.liked ? -1 : 1) });

      const result = await likeStudyComment(slug, id);
      if (result.ok) {
        apply({ likes: result.likes, liked: result.liked });
      } else {
        // Put the guess back rather than let it stand.
        apply({ likes: before.likes, liked: before.liked });
      }
    },
    [data.configured, data.comments, slug],
  );

  /**
   * The next page of the thread.
   *
   * Asks the store rather than revealing more of what is already here: the
   * first response holds one page, so "reveal" would have run out at four
   * however many comments the study actually has.
   *
   * The new page is appended by id rather than concatenated, because a comment
   * posted between two fetches shifts every later one down the list — and the
   * page boundary would then repeat whichever comment it landed on.
   */
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/studies/${slug}/engagement?from=${data.comments.length}&count=${COMMENT_PAGE}`,
      );
      if (res.ok) {
        const next = (await res.json()) as Engagement;
        setData((d) => {
          const seen = new Set(d.comments.map((c) => c.id));
          return {
            ...d,
            likes: next.likes,
            liked: next.liked,
            total: next.total,
            comments: [...d.comments, ...next.comments.filter((c) => !seen.has(c.id))],
          };
        });
      }
    } catch {
      // Nothing to say that the unchanged thread does not already say.
    }

    setLoadingMore(false);
  }, [data.comments.length, loadingMore, slug]);

  const onPosted = useCallback((comment: ThreadComment) => {
    setData((d) => ({
      ...d,
      total: d.total + 1,
      comments: [comment, ...d.comments],
    }));
    setJustPosted(comment.id);
    window.setTimeout(() => setJustPosted(null), 2000);
  }, []);

  const unavailable = loaded && !data.configured;
  const visible = data.comments;

  return (
    <div className={styles.comments}>
      <header className={styles.commentsHead}>
        <h2 className={styles.ask}>
          Leave a like/comment, or have a look at my other projects!
        </h2>

        <div className={styles.stats}>
          <button
            type="button"
            className={styles.stat}
            data-kind="like"
            data-mine={data.liked ? "" : undefined}
            onClick={like}
            disabled={!loaded || !data.configured}
            aria-pressed={data.liked}
          >
            {/* The filled cut once it is yours — Figma 794:510 draws the two
                states as two glyphs rather than one recoloured, the same way
                the theme toggle does. */}
            <span className={styles.likeGlyph}>
              <Glyph icon={data.liked ? "like-filled" : "like"} />
              {/* The ring, drawn only while it is expanding. Keyed on the
                  count so a second press starts a second one rather than
                  re-using an animation that has already played. */}
              {data.liked && <span key={data.likes} className={styles.burst} aria-hidden="true" />}
            </span>

            {/* Keyed on the value: React replaces the element, which is what
                lets the old number leave and the new one arrive instead of the
                text swapping in place. */}
            <span className={styles.statCount}>
              {loaded ? (
                <span key={data.likes} className={styles.roll}>
                  {data.likes}
                </span>
              ) : (
                "—"
              )}
            </span>
            <span className="srOnly">
              {data.liked ? "Remove your like" : "Like this case study"}
            </span>
          </button>

          {/* Not a button. The count is a fact about the thread that is already
              on the page — there is nowhere for it to take you. */}
          <p className={styles.stat} data-kind="count" data-static="">
            <Glyph icon="messages" />
            <span className={styles.statCount}>
              {loaded ? (
                <span key={data.total} className={styles.roll}>
                  {data.total}
                </span>
              ) : (
                "—"
              )}
            </span>
            <span className="srOnly">comments</span>
          </p>

          <Share title={title} />
        </div>
      </header>

      <div className={styles.thread}>
        <CommentForm slug={slug} onPosted={onPosted} disabled={!loaded || unavailable} />

        <div className={styles.list}>
        {unavailable && (
          <p className={styles.offline} data-placeholder="">
            Comments aren&rsquo;t connected yet.
          </p>
        )}

        {/* An empty thread, said once rather than left as blank space under the
            box. Not `data-placeholder`: that marks something unfinished, and a
            study nobody has commented on yet is not unfinished — it is a study
            nobody has commented on yet. The rule above it keeps the rhythm the
            thread would have had, so the block does not change shape the
            moment the first comment lands. */}
        {loaded && data.configured && data.total === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyBody}>
              {/* The faces the thread is waiting for, overlapping and turned
                  down — the stack every app uses to mean "people go here".
                  Drawn from the same eight the comments use, so the empty
                  state is made of the thing that will replace it rather than
                  of a picture of it. */}
              <div className={styles.emptyFaces} aria-hidden="true">
                {EMPTY_SEEDS.map((seed, i) => (
                  <span key={seed} className={styles.emptyFace} style={{ ["--i" as string]: i }}>
                    <CommentAvatar seed={seed} />
                  </span>
                ))}
              </div>

              <p className={styles.emptyLine}>No comments yet</p>
              <p className={styles.emptyHint}>
                Yours would be the first — say what you think.
              </p>
            </div>
          </div>
        )}

        {visible.map((comment, i) => (
          <Fragment key={comment.id}>
            {/* Between two comments and nowhere else — the file draws no rule
                under the comment box or above the first one. */}
            {i > 0 && <div className={`dashRule ${styles.commentRule}`} />}

          <article
            className={styles.comment}
            data-new={comment.id === justPosted ? "" : undefined}
          >
            <header className={styles.commentHead}>
              <CommentAvatar seed={comment.id} />

              <div className={styles.commentWho}>
                <p className={styles.commentLine}>
                  <span className={styles.commentName}>
                    {comment.name || "Anonymous Scroller"}
                  </span>
                  <span className={styles.commentDot} aria-hidden="true" />
                  <time className={styles.commentDate} dateTime={new Date(comment.at).toISOString()}>
                    {longDate(comment.at)}
                  </time>
                </p>
                {/* "Explorer" in the file, for every one of them. It is what
                    the design calls a reader who has got this far rather than
                    something the commenter told us, so it is written here and
                    not stored. */}
                <p className={styles.commentRole}>Explorer</p>
              </div>
            </header>

            {/* Plain text, never markup: the body is rendered as a text node so
                React escapes it, and nothing here turns a URL into a link.
                `white-space: pre-wrap` keeps the author's own line breaks
                without giving them any other control. */}
            <p className={styles.commentBody}>{comment.body}</p>

            <button
              type="button"
              className={styles.commentLike}
              data-mine={comment.liked ? "" : undefined}
              onClick={() => void likeComment(comment.id)}
              disabled={!data.configured}
              aria-pressed={comment.liked}
            >
              <span className={styles.commentLikeGlyph}>
                <Glyph
                  icon={comment.liked ? "like-filled" : "like"}
                  className={styles.commentGlyph}
                />
                {comment.liked && (
                  <span key={comment.likes} className={styles.burst} aria-hidden="true" />
                )}
              </span>

              {/* The count only when there is one. A row of zeroes down a
                  thread is a thread that looks ignored. */}
              {comment.likes > 0 && (
                <span className={styles.commentLikeCount}>
                  <span key={comment.likes} className={styles.roll}>
                    {comment.likes}
                  </span>
                </span>
              )}

              <span className="srOnly">
                {comment.liked ? "Remove your like" : "Like this comment"}
              </span>
            </button>
          </article>
          </Fragment>
        ))}

        {data.comments.length < data.total && (
          <button
            type="button"
            className={styles.more}
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading ..." : "Load More ..."}
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

/** Figma 798:1073 — one line, with the send button inside its right edge. */
function CommentForm({
  slug,
  onPosted,
  disabled,
}: {
  slug: string;
  onPosted: (comment: ThreadComment) => void;
  disabled: boolean;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<CommentError | null>(null);
  /** Seconds, when the failure was the rate limit. */
  const [retryAfter, setRetryAfter] = useState(0);
  const field = useRef<HTMLInputElement>(null);

  const check = useMemo(() => readComment({ name: "", body }), [body]);
  /* Armed: there is something worth sending and nothing already in flight.
     This is what colours the disc — see `.send` in the stylesheet. */
  const ready = !disabled && !sending && check.ok;

  const send = useCallback(async () => {
    if (!ready) return;
    setSending(true);
    setError(null);

    const result = await commentOnStudy(slug, { name: "", body });
    if (result.ok) {
      onPosted(result.comment);
      setBody("");
      field.current?.focus();
    } else {
      setError(result.reason);
      setRetryAfter(result.retryAfter ?? 0);
    }
    setSending(false);
  }, [body, onPosted, ready, slug]);

  return (
    <div className={styles.form}>
      <div className={styles.box}>
        <Glyph icon="messages" className={styles.boxGlyph} />

        {/* An input rather than a textarea: the design is one line 48px tall,
            and Enter has somewhere obvious to go in a single-line field. */}
        <input
          ref={field}
          type="text"
          className={styles.input}
          placeholder="Add a comment"
          value={body}
          maxLength={BODY_MAX}
          disabled={disabled}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
          aria-label="Add a comment"
        />

        <button
          type="button"
          className={styles.send}
          onClick={() => void send()}
          disabled={!ready}
          aria-label="Post comment"
        >
          {sending ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : (
            <Glyph icon="send" className={styles.sendGlyph} />
          )}
        </button>
      </div>

      {/* Only ever shown after a press. The field says what it is for; a rule
          announced before it is broken is noise. */}
      {error && (
        <p className={styles.error} role="status">
          {error === "throttled" ? throttleMessage(retryAfter) : MESSAGES[error]}
        </p>
      )}
    </div>
  );
}

/** Figma 798:890 — Share, in the stats row rather than as a disc. */
function Share({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const url = window.location.href;

    /* The platform sheet where there is one — on a phone this is the control
       people expect, and it can reach the apps a clipboard copy cannot. It
       falls back to the copy this button used to be the only version of. */
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed, or refused. Fall through to the copy.
      }
    }

    const { copyToClipboard } = await import("@/lib/clipboard");
    if (await copyToClipboard(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [title]);

  return (
    <button type="button" className={styles.stat} data-kind="share" onClick={share}>
      <Glyph icon="export" />
      <span className={styles.statCount}>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}

function Glyph({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      className={`inkIcon ${styles.glyph} ${className ?? ""}`}
      style={{ ["--icon" as string]: `url(/icons/${icon}.svg)` }}
      aria-hidden="true"
    />
  );
}

const MESSAGES: Record<CommentError, string> = {
  empty: "Write something first.",
  "too-long": `That is over ${BODY_MAX} characters.`,
  /* Only ever reached without a wait to quote — `throttleMessage` has the
     real one. */
  throttled: "That's a few in a row — give it a minute.",
  unavailable: "Comments aren't connected yet.",
  failed: "That didn't send. Try again?",
};

/**
 * What the rate limit actually did, and for how long.
 *
 * The message this replaces said "One at a time — try again in a moment",
 * which describes neither the rule nor the wait: the rule is a handful per
 * few minutes, and "a moment" can be five of them. Somebody who has just been
 * refused retries immediately, is refused again, and concludes the box is
 * broken — which is precisely what it looked like.
 */
function throttleMessage(seconds: number): string {
  if (seconds <= 0) return MESSAGES.throttled;
  if (seconds < 60) return `That's a few in a row — try again in ${seconds}s.`;

  const minutes = Math.ceil(seconds / 60);
  return `That's a few in a row — try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/** Three of the eight, chosen so the stack is three visibly different faces
 *  rather than three near-neighbours in the palette. */
const EMPTY_SEEDS = ["one", "seven", "four"];

/** "April 20, 2026" — the format Figma writes, rather than "3 days ago".
 *  A date is what a comment on a case study is worth knowing. */
function longDate(at: number): string {
  return new Date(at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
