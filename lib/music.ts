/* ===========================================================================
   What the music card is made of, shared by the server that assembles it and
   the client that plays it.

   Types and pure functions only — no `server-only`, no Redis, no fetch. The
   client imports `trackKey` to name a reaction it is sending and the server
   imports the same function to name the set it stores it in, so the two can
   never disagree about what a track is called. That is the same arrangement
   `lib/engagement.ts` has with the comment box, and for the same reason: the
   button is not a boundary, this file is the rule both sides read.
   =========================================================================== */

/**
 * One playable thing.
 *
 * `preview` is not nullable, and that is a deliberate narrowing rather than an
 * optimistic type: a track whose 30-second preview could not be resolved is
 * dropped from the queue upstream (see `buildQueue`), because the card is a
 * player and a row you cannot play is a dead button. Everything downstream is
 * therefore spared a "what if there is no audio" branch.
 */
export type Track = {
  /** Stable across renders, restarts and Redis. See `trackKey`. */
  readonly key: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string | null;
  /** mzstatic artwork, already upgraded past the 100px thumbnail. */
  readonly cover: string;
  /** The 30-second AAC. */
  readonly preview: string;
  /**
   * The *whole* track's length, in milliseconds — five and a half minutes,
   * not thirty seconds. It never goes next to the progress rail; the rail
   * measures the preview. This is for the spoken line, which is the one place
   * the real record can be described without lying about what is playing.
   */
  readonly lengthMs: number | null;
  /** The track on Apple Music. Also what makes using the preview legitimate:
   *  Apple's terms want a preview sitting next to a way to buy the thing. */
  readonly href: string | null;
  /** Pulled off the sleeve and clamped for the light card. Null when the
   *  artwork could not be read, in which case the card keeps site orange. */
  readonly accent: string | null;
  /** The same colour clamped for the dark card. */
  readonly accentDark: string | null;
};

/**
 * Where the queue came from, and it is on the wire because the card renders
 * differently for one of the three.
 *
 *   live     Last.fm answered and the tracks resolved.
 *   cached   it did not, and this is the last queue that did — still true,
 *            just older than it looks.
 *   fallback nothing resolved. The card says so rather than inventing a song.
 */
export type QueueSource = "live" | "cached" | "fallback";

export type Queue = {
  readonly tracks: readonly Track[];
  readonly source: QueueSource;
};

/** How many of the recent scrobbles survive into the card. */
export const QUEUE_MAX = 6;

/** How many scrobbles to ask Last.fm for. More than `QUEUE_MAX` because
 *  repeats collapse and unresolvable tracks drop, and a queue of one is a
 *  worse card than a slightly larger request. */
export const RECENT_ASK = 15;

/** Every preview Apple serves is this long. Not read from the file: the rail
 *  has to have a length before the first byte of audio arrives. */
export const PREVIEW_SECONDS = 30;

/* --- Reactions -------------------------------------------------------------- */

export type ReactionKind = "up" | "down";

export type Reaction = {
  readonly up: number;
  readonly down: number;
  /** What the person asking pressed, if anything. Never stored on the track —
   *  it is true for one visitor and false for the next, which is the same
   *  split `lib/engagement.ts` draws between `StudyComment` and `Thread-
   *  Comment`. */
  readonly mine: ReactionKind | null;
};

export type Reactions = {
  /** False when there is no Redis. Both thumbs then render disabled with an
   *  em dash rather than a zero — a zero is a measurement, and this is the
   *  absence of one. */
  readonly configured: boolean;
  readonly of: Readonly<Record<string, Reaction>>;
};

export const EMPTY_REACTION: Reaction = { up: 0, down: 0, mine: null };
export const EMPTY_REACTIONS: Reactions = { configured: false, of: {} };

/* --- Naming a track --------------------------------------------------------- */

/**
 * Parentheticals that describe a *release* rather than a song.
 *
 * Last.fm scrobbles whatever the player told it, so the same recording arrives
 * as "Ode to the Mets", "Ode to the Mets (Remastered 2020)" and "Ode to the
 * Mets - 2020 Remaster" depending on which pressing was queued. Left alone
 * those are three tracks with three like counts. Stripped, they are one.
 *
 * A feature credit goes too, and that one is worth stating out loud because it
 * is arguably information: it is dropped because it is the field most likely
 * to be spelled differently by two players ("feat.", "ft.", "featuring", or
 * hoisted into the artist) while naming exactly the same audio.
 */
const NOISE =
  /\s*[([]\s*(feat\.?|ft\.?|featuring|with)\b[^)\]]*[)\]]|\s*[([][^)\]]*\b(remaster(ed)?|remix|mono|stereo|deluxe|edit|version|mix|live|bonus|anniversary|edition)\b[^)\]]*[)\]]/gi;

/** The same thing again for the dash form, which brackets never catch. */
const TRAILING =
  /\s+-\s+.*\b(remaster(ed)?|version|mix|edit|mono|stereo|deluxe|anniversary|edition)\b.*$/i;

/** Redis keys are colon-delimited and this becomes a segment of one. */
const UNSAFE = /[^a-z0-9]+/g;

/** Long enough to stay readable in `redis-cli KEYS`, short enough that a
 *  pathological title cannot bloat a key. */
const KEY_MAX = 64;

function fold(raw: string): string {
  return (
    raw
      /* Decompose, then drop the combining marks: "Beyoncé" and "Beyoncé"
         are the same six letters typed two ways, and only one of them
         survives a naive lowercase. */
      .normalize("NFKD")
      /* Written as a Unicode property rather than a literal range: a regex
         holding raw combining marks renders as mojibake in a diff, in a review
         and in most editors, which `lib/engagement.ts` already argues is
         exactly the wrong property for a line that decides what a key is. */
      .replace(/\p{M}+/gu, "")
      /* The curly apostrophe is the single most common source of a split key
         here — "Can't Stop" from one scrobbler, "Can’t Stop" from another. */
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .toLowerCase()
      .replace(NOISE, "")
      .replace(TRAILING, "")
      .replace(UNSAFE, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/**
 * The name a track answers to everywhere: React keys, Redis sets, the
 * reactions request.
 *
 * Two separators, because one would be ambiguous — with a single dash,
 * ("the-strokes", "ode") and ("the", "strokes-ode") produce the same string,
 * and while that particular collision is unlikely, a key format that *can*
 * collide is one that will eventually merge two songs' like counts and give
 * nobody a way to notice.
 */
export function trackKey(artist: string, title: string): string {
  const a = fold(artist).slice(0, KEY_MAX);
  const t = fold(title).slice(0, KEY_MAX);
  return `${a}--${t}`;
}

/** `0:00`, `3:41`. Negative and non-finite input reads as zero rather than
 *  throwing: this runs inside a requestAnimationFrame loop, and a clock that
 *  crashes the frame is worse than a clock that briefly says 0:00. */
export function timeLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
