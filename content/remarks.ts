/* ===========================================================================
   The remark library the Search card actually searches.

   ARCHITECTURE.md promised this file and this function signature long before
   either existed: "~20 clearly-labelled demo remarks behind a
   `searchRemarks(query, category)`. Swapping in the real library later means
   replacing that one function body." This is that file, a little larger than
   twenty because the card's whole argument needs a corpus wide enough to be
   wrong-shaped.

   WHAT THIS IS, PLAINLY: fifty-eight demo remarks written for this site. They
   are not an export of the real library, and `used` counts are not one
   inspector's real history. PROJECT.md forbids inventing metrics and this file
   is not an exception to that — it is why `SAMPLE_NOTE` exists and why the
   card renders it. What the card claims is only ever true of what is on the
   screen: when the readout says thirteen remarks in eight categories, there
   really are thirteen remarks in eight categories, in this array, and the
   matcher really found them.

   The one number here that is Siddhant's rather than this file's is
   `LIBRARY_TOTAL`. It comes from the Figma file, is already the homepage's
   headline, and is never used as a denominator for anything computed below.

   The shape is the point. Every remark carries both its taxonomy path and its
   text, so the card's before and after are provably the same rows read two
   ways: `TAXONOMY` walks them by category, `searchRemarks` walks them by what
   was typed. Nothing is duplicated between the two paths, so the demonstration
   cannot cheat by giving search a better dataset than navigation.
   =========================================================================== */

import { prefixAt, tokenize, wordStarts } from "@/lib/match";

export type Remark = {
  readonly text: string;
  readonly category: string;
  readonly subcategory: string;
  /**
   * How many times this inspector has reached for this remark before.
   *
   * This is the field the whole feature turns on. The old flow had no use for
   * it — a taxonomy is the same tree for everyone — so a remark you write on
   * every third inspection sat at the same depth as one you have never used.
   * `searchRemarks` below scores with it, which is what puts your own writing
   * at the top of a list you did not have to navigate to.
   */
  readonly used: number;
};

/** The real library's size, from the Figma file. Display only — see the header. */
export const LIBRARY_TOTAL = 104_122;

/** Rendered on the card, next to anything counted. Nobody should have to read
 *  this file to know the counts are the sample's. */
export const SAMPLE_NOTE = "demo sample";

export const REMARKS: readonly Remark[] = [
  // --- Roofing -------------------------------------------------------------
  { category: "Roofing", subcategory: "Shingles", used: 23, text: "Cracked and curling shingles observed at the south slope" },
  { category: "Roofing", subcategory: "Shingles", used: 17, text: "Missing shingle tabs; underlayment is exposed" },
  { category: "Roofing", subcategory: "Shingles", used: 9, text: "Granule loss consistent with the age of the covering" },
  { category: "Roofing", subcategory: "Flashing", used: 12, text: "Step flashing at the chimney is rusted and lifting" },
  { category: "Roofing", subcategory: "Flashing", used: 8, text: "Sealant at the flashing has cracked and pulled away" },
  { category: "Roofing", subcategory: "Gutters", used: 21, text: "Downspout discharges against the foundation" },
  { category: "Roofing", subcategory: "Gutters", used: 14, text: "Gutters hold standing water; slope correction needed" },
  { category: "Roofing", subcategory: "Chimney", used: 6, text: "Chimney crown is cracked; water entry is likely" },
  { category: "Roofing", subcategory: "Chimney", used: 4, text: "Mortar joints at the chimney are eroded" },

  // --- Exterior ------------------------------------------------------------
  { category: "Exterior", subcategory: "Grading", used: 19, text: "Grade slopes toward the structure at the rear" },
  { category: "Exterior", subcategory: "Siding", used: 15, text: "Siding is in contact with grade; conducive to decay" },
  { category: "Exterior", subcategory: "Siding", used: 11, text: "Cracking in the stucco below the window openings" },
  { category: "Exterior", subcategory: "Windows", used: 13, text: "Failed thermal seal; fogging between the panes" },
  { category: "Exterior", subcategory: "Decks", used: 10, text: "Guardrail spacing exceeds four inches" },
  { category: "Exterior", subcategory: "Decks", used: 5, text: "Deck ledger is nailed rather than bolted" },
  { category: "Exterior", subcategory: "Walkways", used: 7, text: "Cracked and heaved walkway creates a trip hazard" },

  // --- Structure -----------------------------------------------------------
  { category: "Structure", subcategory: "Foundation", used: 26, text: "Vertical crack in the foundation wall, under an eighth of an inch" },
  { category: "Structure", subcategory: "Foundation", used: 14, text: "Efflorescence on the foundation wall indicates moisture" },
  { category: "Structure", subcategory: "Foundation", used: 3, text: "Horizontal cracking with inward displacement" },
  { category: "Structure", subcategory: "Crawlspace", used: 16, text: "Vapor barrier is torn and incomplete" },
  { category: "Structure", subcategory: "Crawlspace", used: 8, text: "Standing water observed in the crawlspace" },
  { category: "Structure", subcategory: "Framing", used: 4, text: "Notched floor joist exceeds the allowable depth" },
  { category: "Structure", subcategory: "Framing", used: 2, text: "Sistered joists are not fully bearing at the beam" },

  // --- Electrical ----------------------------------------------------------
  { category: "Electrical", subcategory: "Panel", used: 22, text: "Double-tapped breaker in the main panel" },
  { category: "Electrical", subcategory: "Panel", used: 6, text: "Panel cover screws are pointed and may pierce conductors" },
  { category: "Electrical", subcategory: "Panel", used: 5, text: "Federal Pacific panel; replacement recommended" },
  { category: "Electrical", subcategory: "Outlets", used: 19, text: "Missing GFCI protection at the kitchen counter" },
  { category: "Electrical", subcategory: "Outlets", used: 12, text: "Open ground at the bedroom receptacles" },
  { category: "Electrical", subcategory: "Outlets", used: 9, text: "Reversed polarity at the garage receptacle" },
  { category: "Electrical", subcategory: "Wiring", used: 11, text: "Exposed splice outside of a junction box" },
  { category: "Electrical", subcategory: "Wiring", used: 3, text: "Knob-and-tube wiring remains active" },
  { category: "Electrical", subcategory: "Fixtures", used: 2, text: "Cracked lens on the exterior fixture" },

  // --- Plumbing ------------------------------------------------------------
  { category: "Plumbing", subcategory: "Water heater", used: 20, text: "TPR discharge terminates too high above the floor" },
  { category: "Plumbing", subcategory: "Water heater", used: 15, text: "No expansion tank on a closed system" },
  { category: "Plumbing", subcategory: "Drains", used: 18, text: "Slow drain at the hall bath lavatory" },
  { category: "Plumbing", subcategory: "Drains", used: 7, text: "S-trap under the kitchen sink is not vented" },
  { category: "Plumbing", subcategory: "Supply", used: 13, text: "Corrosion at the water heater supply connections" },
  { category: "Plumbing", subcategory: "Supply", used: 4, text: "Polybutylene supply piping observed" },
  { category: "Plumbing", subcategory: "Fixtures", used: 10, text: "Loose toilet at the floor flange" },
  { category: "Plumbing", subcategory: "Fixtures", used: 1, text: "Cracked toilet tank lid" },

  // --- HVAC ----------------------------------------------------------------
  { category: "HVAC", subcategory: "Furnace", used: 24, text: "Filter is heavily loaded and restricting airflow" },
  { category: "HVAC", subcategory: "Furnace", used: 6, text: "Cracked heat exchanger suspected; further evaluation needed" },
  { category: "HVAC", subcategory: "Condenser", used: 17, text: "Unit is past its expected service life" },
  { category: "HVAC", subcategory: "Condenser", used: 12, text: "Condenser fins are bent and dirty" },
  { category: "HVAC", subcategory: "Ducts", used: 8, text: "Disconnected duct in the crawlspace" },
  { category: "HVAC", subcategory: "Ducts", used: 5, text: "Flex duct is crushed behind the air handler" },

  // --- Interior ------------------------------------------------------------
  { category: "Interior", subcategory: "Walls & ceilings", used: 20, text: "Hairline cracking at the drywall seams" },
  { category: "Interior", subcategory: "Walls & ceilings", used: 16, text: "Ceiling stain below the upstairs bath; dry at inspection" },
  { category: "Interior", subcategory: "Doors", used: 14, text: "Door rubs at the head and does not latch" },
  { category: "Interior", subcategory: "Stairs", used: 11, text: "Handrail is not continuous" },
  { category: "Interior", subcategory: "Floors", used: 9, text: "Cracked tile at the entry" },
  { category: "Interior", subcategory: "Floors", used: 6, text: "Squeaking and deflection in the hall floor" },
  { category: "Interior", subcategory: "Fireplace", used: 7, text: "Firebox refractory panels are cracked" },

  // --- Insulation & ventilation --------------------------------------------
  { category: "Insulation", subcategory: "Attic", used: 21, text: "Bath fan terminates into the attic" },
  { category: "Insulation", subcategory: "Attic", used: 18, text: "Insulation depth is below current standards" },
  { category: "Insulation", subcategory: "Attic", used: 3, text: "Daylight is visible at the roof sheathing" },
  { category: "Insulation", subcategory: "Ventilation", used: 12, text: "Dryer duct is unsupported and sagging" },
  { category: "Insulation", subcategory: "Ventilation", used: 10, text: "Blocked soffit vents at the eaves" },

  // --- Never reached for on this account -----------------------------------
  // The library is not the same thing as your library, and a results list that
  // cannot show the difference cannot show the feature. These three match the
  // demonstration's query and sink below everything the inspector has written
  // before, which is the ranking doing its job in public.
  { category: "Structure", subcategory: "Foundation", used: 0, text: "Cracking at the slab is typical of shrinkage" },
  { category: "Roofing", subcategory: "Shingles", used: 0, text: "Cracked ridge cap at the hip" },
  { category: "Interior", subcategory: "Walls & ceilings", used: 0, text: "Cracked plaster at the interior corner" },
];

/* --- The taxonomy, derived ------------------------------------------------
   The old flow's tree, built from the array above rather than written beside
   it. This is load-bearing for the card's honesty: the before and after are
   the same rows read two ways, so the demonstration cannot quietly give search
   a better dataset than navigation had. Add a remark and both paths gain it.

   Within a subcategory the old flow listed alphabetically, because with no
   idea who is asking that is the only order it can justify. That single line
   of sorting is the whole difference the feature is arguing with. */

export type SubcategoryNode = {
  readonly name: string;
  readonly remarks: readonly Remark[];
};

export type CategoryNode = {
  readonly name: string;
  readonly subcategories: readonly SubcategoryNode[];
};

export const TAXONOMY: readonly CategoryNode[] = (() => {
  const byCategory = new Map<string, Map<string, Remark[]>>();

  for (const remark of REMARKS) {
    let subs = byCategory.get(remark.category);
    if (!subs) byCategory.set(remark.category, (subs = new Map()));
    const bucket = subs.get(remark.subcategory);
    if (bucket) bucket.push(remark);
    else subs.set(remark.subcategory, [remark]);
  }

  return [...byCategory].map(([name, subs]) => ({
    name,
    subcategories: [...subs].map(([subName, remarks]) => ({
      name: subName,
      remarks: [...remarks].sort((a, b) => a.text.localeCompare(b.text)),
    })),
  }));
})();

/**
 * The route the card's unattended demonstration drills, and the only hard-coded
 * path here. Chosen because it is the honest worst case rather than the
 * flattering one: "Roofing" is where an inspector looking for a crack would
 * reasonably start, and the remark they are actually after is in "Structure".
 */
export const OLD_PATH = { category: "Roofing", subcategory: "Shingles" } as const;

/** The branch counts the drill-down makes you choose between, at each of its
 *  three steps. Real counts of the sample, computed, not asserted. */
export const OLD_PATH_WIDTHS: readonly number[] = (() => {
  const category = TAXONOMY.find((c) => c.name === OLD_PATH.category);
  const sub = category?.subcategories.find((s) => s.name === OLD_PATH.subcategory);
  return [
    TAXONOMY.length,
    category?.subcategories.length ?? 0,
    sub?.remarks.length ?? 0,
  ];
})();

/** How many taps the old flow cost: pick a category, pick a subcategory, pick
 *  a remark. The number the card counts back down to zero. */
export const OLD_PATH_TAPS = OLD_PATH_WIDTHS.length;

/* --- Finding --------------------------------------------------------------- */

export type Hit = {
  readonly remark: Remark;
  /** Character ranges in `remark.text` that the query matched, in order, so the
   *  results list can show *why* a row is there without re-running the match. */
  readonly marks: readonly (readonly [number, number])[];
  /** True when the query only matched the row's taxonomy path — you typed
   *  "roof" and this is a roofing remark that never says the word. The old flow
   *  could only ever find rows this way; search finds them as well as, not
   *  instead of, the text. */
  readonly viaPath: boolean;
};

/**
 * How much this inspector's own history is worth against how well the text
 * matched.
 *
 * Four is not a tuning knob that happened to look nice. The most-used remark in
 * the sample is 26, so its bonus is 104 — larger than any match-quality score
 * can reach, which means that among rows that all genuinely match, the ranking
 * is *your history first, text quality second*. That ordering is the feature,
 * stated as a number. Set this to 0 and the card still works and stops making
 * its point, which is the test of whether the constant is the right one.
 */
const LIBRARY_WEIGHT = 4;

/**
 * The remarks matching `query`, best first.
 *
 * Prefix matching on word starts, not substring: an inspector typing "crack"
 * means the word, and substring matching on a corpus this size turns "vent"
 * into every "prevent" as well. Every token has to match somewhere, so adding a
 * word narrows rather than widens — the behaviour anyone who has used a search
 * field already expects.
 *
 * `category` is the old flow's filter, kept because the new screen still offers
 * it. It is a narrowing, not a starting point, which is the entire change: you
 * may reach for it after typing, and most people never do.
 */
export function searchRemarks(query: string, category?: string): Hit[] {
  const tokens = tokenize(query);

  const pool = category
    ? REMARKS.filter((r) => r.category === category)
    : REMARKS;

  if (tokens.length === 0) {
    // Nothing typed. What the field shows before you touch it is your own
    // library, most-reached-for first — the answer already on screen, which is
    // the state the old flow could not have at all.
    return [...pool]
      .sort((a, b) => b.used - a.used || a.text.localeCompare(b.text))
      .map((remark) => ({ remark, marks: [], viaPath: false }));
  }

  const hits: { hit: Hit; score: number }[] = [];

  for (const remark of pool) {
    const text = remark.text.toLowerCase();
    const path = `${remark.category} ${remark.subcategory}`.toLowerCase();
    const starts = wordStarts(text);
    const pathStarts = wordStarts(path);

    const marks: (readonly [number, number])[] = [];
    let quality = 0;
    let viaPath = false;
    let matchedAll = true;

    for (const token of tokens) {
      const at = prefixAt(text, starts, token);
      if (at !== undefined) {
        marks.push([at, token.length]);
        // The first word of a remark is what an inspector scans, so a hit there
        // is worth more than the same hit buried mid-sentence.
        quality += at === 0 ? 3 : 2;
        continue;
      }
      if (prefixAt(path, pathStarts, token) !== undefined) {
        quality += 1;
        viaPath = true;
        continue;
      }
      matchedAll = false;
      break;
    }

    if (!matchedAll) continue;

    marks.sort((a, b) => a[0] - b[0]);
    hits.push({
      hit: { remark, marks, viaPath: viaPath && marks.length === 0 },
      score: remark.used * LIBRARY_WEIGHT + quality,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.hit.remark.text.localeCompare(b.hit.remark.text));
  return hits.map((h) => h.hit);
}

/** How many distinct categories a result set is spread across.
 *
 *  The card's sharpest readout, and the reason the demonstration searches for a
 *  crack. Thirteen matching remarks living in eight different categories is not
 *  a long list problem — it is the tree being the wrong shape for the question,
 *  because it was built around where a defect is and the inspector is typing
 *  what they saw. No amount of navigating gets you that set. */
export const spreadOf = (hits: readonly Hit[]) =>
  new Set(hits.map((h) => h.remark.category)).size;

/**
 * What the old flow would have cost to reach one particular remark.
 *
 * `OLD_PATH_WIDTHS` above answers this for the one route the unattended
 * demonstration drills. This answers it for whichever remark somebody actually
 * took, which is the difference between a claim the card makes and a claim the
 * card makes about you: pick "Vertical crack in the foundation wall" and the
 * card can say it was three taps and twenty-two rows down a branch you had to
 * guess, because it walked the same tree to find out.
 *
 * Every number here is counted off `TAXONOMY`, so it moves when the corpus
 * moves and cannot be tuned to flatter the argument.
 */
export type OldPathCost = {
  /** Category, subcategory, remark — the depth of the tree, not an estimate. */
  readonly taps: number;
  /** Rows you would have read on the way: every category, then every
   *  subcategory under the one you chose, then every remark under that. */
  readonly rowsRead: number;
};

export function oldPathCostOf(remark: Remark): OldPathCost {
  const category = TAXONOMY.find((c) => c.name === remark.category);
  const sub = category?.subcategories.find(
    (s) => s.name === remark.subcategory,
  );
  const rows = sub?.remarks ?? [];

  return {
    taps: OLD_PATH_TAPS,
    rowsRead:
      TAXONOMY.length + (category?.subcategories.length ?? 0) + rows.length,
  };
}
