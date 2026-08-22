/* ===========================================================================
   The house matcher.

   Extracted from `searchRemarks` in content/remarks.ts, which had all of this
   and now calls it. The extraction happened because a second surface wanted
   the same behaviour: the command palette searches this site's own words the
   way the Search card searches an inspector's remark library, and that is not
   a coincidence to be re-implemented — it is the case study's argument applied
   to the portfolio that contains it. Two copies of a matcher are two matchers,
   and they drift.

   What the rule is, and why it is not substring matching:

     Prefix-on-word-starts. An inspector typing "crack" means the word, and a
     recruiter typing "token" means the word. Substring matching turns "vent"
     into every "prevent" and "lash" into every "flashing" — on a corpus of any
     size that is not a longer list, it is a wrong one.

   Every token has to match somewhere, so adding a word narrows rather than
   widens. That is what anyone who has used a search field already expects, and
   getting it backwards is the common bug.
   =========================================================================== */

/**
 * A highlight range: where a match started, and how long it ran.
 *
 * Callers render from these rather than re-running the match against the
 * string they are painting, so an off-by-one here surfaces as a highlight over
 * the wrong letters rather than as a silent scoring difference.
 */
export type Mark = readonly [start: number, length: number];

/**
 * Word starts in a string: the index of every character that begins a word.
 *
 * Alphanumeric runs only. Punctuation and whitespace both break a word, which
 * is what makes "104,122" reachable by typing "122" and "design-system"
 * reachable by typing "system".
 */
export function wordStarts(text: string): number[] {
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/[a-z0-9]/.test(text[i]) && (i === 0 || !/[a-z0-9]/.test(text[i - 1]))) {
      starts.push(i);
    }
  }
  return starts;
}

/**
 * Split a query into the words that have to match.
 *
 * Splitting on non-alphanumerics rather than whitespace means "design-system"
 * and "design system" are the same query, and a trailing space while someone
 * is still typing does not produce an empty token that can never match.
 */
export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
}

/** What a successful match knows about itself. */
export type TokenMatch = {
  /** Sorted by position, so a renderer can walk them in one pass. */
  readonly marks: Mark[];
  /**
   * The worst tier any token had to fall back to.
   *
   * The worst rather than the average, because a query is only as good as its
   * weakest link: "design kubernetes" where the second word only appears in
   * hidden keywords is a weaker answer than "design" alone, and averaging
   * would hide that.
   */
  readonly tier: number;
  /**
   * How well it matched, before any caller-specific weighting.
   *
   * Deliberately small and coarse. It breaks ties between rows that all
   * genuinely match; it is not trying to be a relevance model. Both callers
   * add something much larger on top — the card adds an inspector's own usage
   * history, the palette adds what kind of thing was found — and in both cases
   * that ordering is the feature and this is the tiebreak.
   */
  readonly quality: number;
};

/**
 * Where `token` prefixes a word in `text`, or `undefined`.
 *
 * `text` and `token` are both expected lowercase — the caller lowercases once
 * per row rather than once per token, which matters on the palette's index
 * where one query walks a few hundred strings.
 *
 * `starts` is passed in rather than computed because callers that test several
 * tokens against the same string should only walk it once.
 */
export function prefixAt(
  text: string,
  starts: readonly number[],
  token: string,
): number | undefined {
  return starts.find((i) => text.startsWith(token, i));
}

/** A hit at the very start of a string, versus one buried inside it. */
const AT_START = 3;
const MID_STRING = 2;

/**
 * One string a token is allowed to match, and what matching it is worth.
 *
 * Rows are usually made of more than one string, and they are not worth the
 * same. A palette entry has a label you can see and keywords you cannot: both
 * should match, but a hit in the label is the row *being* the answer and a hit
 * in the keywords is only the row being related to it. `weight` is how much
 * less the quiet fields count.
 *
 * `marked` says whether hits here produce highlight ranges. Only the visible
 * string should — marks are offsets, and an offset into a hidden string points
 * at nothing the reader can see.
 *
 * `tier` is coarser and outranks everything: it is how a caller says "a hit
 * here is a categorically worse answer than a hit there", regardless of how
 * well it matched. A row the reader can see the match in is a different kind
 * of result from one that matched a hidden synonym, and no amount of match
 * quality should let the second overtake the first.
 */
export type Field = {
  readonly text: string;
  /** Multiplies this field's contribution to quality. */
  readonly weight: number;
  /** Whether hits here are returned as `marks`. */
  readonly marked?: boolean;
  /** 0 is best. Defaults to 0. */
  readonly tier?: number;
};

/**
 * Match every token across several fields.
 *
 * Per token, fields are tried in order and the first hit wins — so a query
 * that lands half in a title and half in the keywords still matches, which is
 * the common case the single-field version gets wrong. `searchRemarks` has
 * done this against text-then-path since before this file existed; this is the
 * same rule with the fields named by the caller.
 *
 * Returns `null` the moment a token misses everywhere, rather than a zero
 * score: "matched nothing" and "matched everything badly" are different
 * answers and callers filter on the difference.
 */
export function matchFields(
  fields: readonly Field[],
  tokens: readonly string[],
): TokenMatch | null {
  // Lowercased once per row, not once per token — one query walks the whole
  // index, so this is the loop that has to stay cheap.
  const prepared = fields.map((f) => {
    const text = f.text.toLowerCase();
    return { ...f, text, starts: wordStarts(text) };
  });

  const marks: Mark[] = [];
  let quality = 0;
  let tier = 0;

  for (const raw of tokens) {
    // Lowercased here rather than trusted from the caller. `tokenize` already
    // does it, so this is a no-op on the intended path — but `prefixAt` is a
    // case-sensitive `startsWith` underneath, and a caller who assembled
    // tokens by hand would otherwise get a silent `null` for a query that
    // plainly matches. A wrong answer that looks like "no results" is the
    // worst failure this function has.
    const token = raw.toLowerCase();
    let hit = false;

    for (const field of prepared) {
      const at = prefixAt(field.text, field.starts, token);
      if (at === undefined) continue;
      quality += (at === 0 ? AT_START : MID_STRING) * field.weight;
      if (field.marked) marks.push([at, token.length]);
      tier = Math.max(tier, field.tier ?? 0);
      hit = true;
      break;
    }

    if (!hit) return null;
  }

  marks.sort((a, b) => a[0] - b[0]);
  return { marks, quality, tier };
}

/**
 * Match every token against one string.
 *
 * The single-field case of `matchFields`, which is most of them.
 *
 * The first word of a remark is what an inspector scans, and the first word of
 * a heading is what a reader scans, so a hit there outscores the same hit
 * further in.
 */
export function matchAll(
  text: string,
  tokens: readonly string[],
): TokenMatch | null {
  return matchFields([{ text, weight: 1, marked: true }], tokens);
}

/**
 * Edit distance, for "did you mean".
 *
 * Lifted from the canvas terminal, which had the only copy and used it for the
 * same job — answering a typo with the command that was probably meant instead
 * of an error. Same reasoning as the rest of this file: one implementation.
 *
 * Two rolling rows rather than a full matrix. The inputs here are single words
 * against a command list, so this is not about speed; it is that the row form
 * is shorter and has one fewer index to get wrong.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }

  return prev[b.length];
}

/**
 * The closest of `candidates` to `word`, if anything is close enough.
 *
 * The threshold scales with the word's length: two edits is a plausible typo
 * in "inspection" and a different word entirely in "css". Below four
 * characters nothing is suggested at all, because at that length almost
 * everything is two edits from everything else and the suggestion is noise
 * dressed as help.
 */
export function didYouMean(
  word: string,
  candidates: readonly string[],
): string | undefined {
  if (word.length < 4) return undefined;

  const limit = word.length <= 5 ? 1 : 2;
  let best: string | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const d = levenshtein(word.toLowerCase(), candidate.toLowerCase());
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }

  return bestDistance <= limit ? best : undefined;
}
