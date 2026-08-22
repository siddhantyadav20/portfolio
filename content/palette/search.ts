/* ===========================================================================
   Ranking the rows.

   Separated from the index that builds them because the two change for
   completely different reasons: the index changes when the site's content
   does, and this changes when the *ordering* is wrong. Keeping them in one
   file meant every tweak to a keyword sat in the same diff as every tweak to
   a weight.
   =========================================================================== */

import { didYouMean, matchFields, tokenize } from "@/lib/match";
import { FEATURED, PALETTE_INDEX, VOCABULARY } from "./index";
import type {
  PaletteContext,
  PaletteEntry,
  PaletteGroup,
  PaletteHit,
} from "./types";


/**
 * What each kind of thing is worth, before match quality.
 *
 * These are the same shape of number as `LIBRARY_WEIGHT` in content/remarks,
 * and they earn their place the same way: they encode a priority that is the
 * feature rather than a tuning knob that happened to look nice.
 *
 * A recruiter typing one word wants a number, then the work behind it, then a
 * way to get in touch. Evidence sits above work because a headline figure
 * answers the question and a section heading only says where the answer is
 * written down. The board and the records are the personality of the
 * site and they are genuinely last — they should be findable and they should
 * never be the first answer to a one-word query. Set every value here to the
 * same number and the palette still works and stops making that point, which
 * is the test of whether the constants are the right ones.
 */
const GROUP_WEIGHT: Record<PaletteGroup, number> = {
  // Never scored: "recent" is a display group the empty state assigns, not a
  // kind of thing anything in the index is. Present so the record is total.
  recent: 0,
  evidence: 9,
  work: 8,
  start: 7,
  do: 6,
  career: 5,
  board: 3,
  listen: 1,
};

/**
 * How the three signals rank against each other.
 *
 * They are strictly tiered rather than blended, and the order is the design:
 *
 *   1. Can the reader SEE why this matched?  A hit in the label or the line
 *      under it is a different kind of answer from one that matched a hidden
 *      synonym, and no amount of match quality is allowed to overturn that.
 *   2. Is it about WHERE YOU ALREADY ARE?  Standing inside the Design System
 *      study and searching "theming" means that study's section, not a line
 *      about theming somewhere else. Context is a stronger signal than what
 *      kind of thing something is, and weaker than whether you can see why it
 *      matched — so it sits between them.
 *   3. WHAT KIND of thing is it?  `GROUP_WEIGHT` above.
 *   4. HOW WELL did it match?  Position in the string, last.
 *
 * Position is last on purpose, and the first version of this file had it
 * first. Multiplying quality up made *where the word fell in the string* the
 * dominant signal, and on labels that are real sentences that is close to
 * meaningless: searching "tokens" put the section "Tokens made of other
 * tokens" above "281 Reusable Tokens" purely because one began with the word,
 * and "design" surfaced the receipt line "Design Receipt" above the case study
 * called "Scaling a Design System across 12 products". A short noun that
 * happens to start with your query is not a better answer than a title that
 * contains it.
 *
 * The multipliers are spacers, not weights: each is larger than the largest
 * value the tier below it can reach, so a lower tier can never carry a higher
 * one. That is why they are round numbers and why nothing here needs tuning.
 */
const VISIBLE_FIRST = 10_000;
const CONTEXT_FIRST = 1_000;
const GROUP_FIRST = 100;
/** Quality is capped below `GROUP_FIRST` so a many-token match cannot overflow
 *  into the group tier and start reordering kinds of thing. */
const QUALITY_CAP = 99;

/** The label matters most, then the line under it, then the hidden synonyms. */
const LABEL_WEIGHT = 3;
const HINT_WEIGHT = 2;
const KEYWORD_WEIGHT = 1;

/** Label and hint are both on screen; keywords are not. See `Field.tier`. */
const SEEN = 0;
const UNSEEN = 1;

/**
 * The palette entries matching `query`, best first.
 *
 * Nothing typed returns the empty state rather than the whole index: this
 * screen's job before you touch it is to answer the question you arrived with,
 * not to list two hundred rows you now have to read.
 */
export function searchPalette(
  query: string,
  context: PaletteContext = {},
): PaletteHit[] {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return emptyState([]);
  }

  const scored: { hit: PaletteHit; score: number; at: number }[] = [];

  for (const [at, entry] of PALETTE_INDEX.entries()) {
    const match = matchFields(
      [
        { text: entry.label, weight: LABEL_WEIGHT, marked: true, tier: SEEN },
        ...(entry.hint
          ? [{ text: entry.hint, weight: HINT_WEIGHT, tier: SEEN }]
          : []),
        ...(entry.keywords
          ? [{ text: entry.keywords, weight: KEYWORD_WEIGHT, tier: UNSEEN }]
          : []),
      ],
      tokens,
    );
    if (!match) continue;

    scored.push({
      hit: {
        entry,
        marks: match.marks,
        viaKeywords: match.tier === UNSEEN,
        group: entry.group,
      },
      score:
        (match.tier === SEEN ? VISIBLE_FIRST : 0) +
        (context.study && entry.study === context.study ? CONTEXT_FIRST : 0) +
        GROUP_WEIGHT[entry.group] * GROUP_FIRST +
        Math.min(match.quality, QUALITY_CAP),
      at,
    });
  }

  // Index order is the last tiebreak rather than the label, so equal-scoring
  // rows come out in the order this file assembles them — which is the order
  // `GROUPS` declares, and therefore stable across builds.
  scored.sort((a, b) => b.score - a.score || a.at - b.at);
  return scored.map((s) => s.hit);
}

/**
 * The screen before anything is typed.
 *
 * Two halves. What this visitor was last looking at, then the four questions —
 * in that order, because somebody with a history has already been offered the
 * questions and came back for something specific.
 *
 * Rows already in the recent list are dropped from the second half rather than
 * printed twice under different headings, which is what "Recent" lists usually
 * get wrong.
 */
export function emptyState(recent: readonly PaletteEntry[]): PaletteHit[] {
  const seen = new Set(recent.map((e) => e.id));

  return [
    ...recent.map((entry) => ({
      entry,
      marks: [],
      viaKeywords: false,
      group: "recent" as const,
    })),
    ...FEATURED.filter((entry) => !seen.has(entry.id)).map((entry) => ({
      entry,
      marks: [],
      viaKeywords: false,
      group: entry.group,
    })),
  ];
}

/**
 * A word close to something in the index, when nothing matched at all.
 *
 * The empty result is the one screen where a palette can be actively unhelpful
 * — a blank box says "there is nothing here" when the truth is usually "that
 * is not what it is called".
 */
export function nearestWord(query: string): string | undefined {
  const tokens = tokenize(query);
  if (tokens.length === 0) return undefined;

  for (const token of tokens) {
    const near = didYouMean(token, VOCABULARY);
    if (near && near !== token) return near;
  }
  return undefined;
}
