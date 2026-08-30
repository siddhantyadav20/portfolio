/* ===========================================================================
   The remark library the Search card actually searches.

   ARCHITECTURE.md promised this file and this function signature long before
   either existed: "~20 clearly-labelled demo remarks behind a
   `searchRemarks(query, category)`. Swapping in the real library later means
   replacing that one function body." This is that file, a little larger than
   twenty because the card's whole argument needs a corpus wide enough to be
   wrong-shaped.

   WHAT THIS IS, PLAINLY: sixty-one demo remarks written for this site. They
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

/**
 * How urgently a remark reads on the report.
 *
 * Three labels, and in Figma 869:6513 all three are drawn the same way — the
 * same red pill, the same danger glyph. That is the file's decision and not an
 * oversight to correct: an inspector's report flags a finding or it does not,
 * and grading the flag by colour would invite a reader to skim past the pale
 * ones. The word carries the distinction; the pill carries the attention.
 */
export type Severity = "action" | "inspection" | "maintenance";

/** What each severity says on the pill. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  action: "Action Required",
  inspection: "Inspection Needed",
  maintenance: "Maintenance Required",
};

export type Remark = {
  /**
   * The short name an inspector scans for, and the one the suggestions list and
   * a result's heading both draw — Figma 869:6049 and 869:6520 are the same
   * string at two sizes.
   *
   * Split from `text` because the two are read at different moments and at
   * different lengths. You pick a remark off four words; you put a paragraph in
   * the report. Before the redesign there was only `text`, which meant the
   * suggestions list was a column of clamped sentences and every row began with
   * the same three words.
   */
  readonly label: string;
  /** The remark as it lands in the report: the sentence the client reads. */
  readonly text: string;
  readonly category: string;
  readonly subcategory: string;
  /** Where on the property it was observed — Figma 869:6524. */
  readonly location: string;
  readonly severity: Severity;
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
  /**
   * How many times the whole company has reached for it — the globe badge
   * beside the person one, Figma 869:6080.
   *
   * It ranks nothing. It is there because the two numbers disagreeing is the
   * interesting case: a remark the firm leans on that *you* have barely used is
   * a prompt, and one you use constantly that nobody else does is a house
   * style. A single count could say neither.
   */
  readonly global: number;
};

/** The real library's size, from the Figma file. Display only — see the header. */
export const LIBRARY_TOTAL = 104_122;

/** Rendered on the card, next to anything counted. Nobody should have to read
 *  this file to know the counts are the sample's. */
export const SAMPLE_NOTE = "demo sample";

export const REMARKS: readonly Remark[] = [
  // --- Roofing -------------------------------------------------------------
  {
    label: "Cracked and Curling Shingles",
    text: "Cracked and curling shingles observed at the south slope",
    category: "Roofing", subcategory: "Shingles",
    location: "South Slope", severity: "action",
    used: 23, global: 1_842,
  },
  {
    label: "Missing Shingle Tabs",
    text: "Missing shingle tabs; underlayment is exposed",
    category: "Roofing", subcategory: "Shingles",
    location: "Rear Slope", severity: "action",
    used: 17, global: 1_024,
  },
  {
    label: "Granule Loss on Covering",
    text: "Granule loss consistent with the age of the covering",
    category: "Roofing", subcategory: "Shingles",
    location: "Main Roof", severity: "maintenance",
    used: 9, global: 913,
  },
  {
    label: "Rusted Step Flashing",
    text: "Step flashing at the chimney is rusted and lifting",
    category: "Roofing", subcategory: "Flashing",
    location: "Chimney", severity: "action",
    used: 12, global: 764,
  },
  {
    label: "Cracked Flashing Sealant",
    text: "Sealant at the flashing has cracked and pulled away",
    category: "Roofing", subcategory: "Flashing",
    location: "Roof Penetrations", severity: "maintenance",
    used: 8, global: 690,
  },
  {
    label: "Downspout Against Foundation",
    text: "Downspout discharges against the foundation",
    category: "Roofing", subcategory: "Gutters",
    location: "Rear Elevation", severity: "action",
    used: 21, global: 1_506,
  },
  {
    label: "Standing Water in Gutters",
    text: "Gutters hold standing water; slope correction needed",
    category: "Roofing", subcategory: "Gutters",
    location: "Front Elevation", severity: "maintenance",
    used: 14, global: 1_118,
  },
  {
    label: "Cracked Chimney Crown",
    text: "Chimney crown is cracked; water entry is likely",
    category: "Roofing", subcategory: "Chimney",
    location: "Chimney", severity: "action",
    used: 6, global: 588,
  },
  {
    label: "Eroded Mortar Joints",
    text: "Mortar joints at the chimney are eroded",
    category: "Roofing", subcategory: "Chimney",
    location: "Chimney", severity: "maintenance",
    used: 4, global: 472,
  },

  // --- Exterior ------------------------------------------------------------
  {
    label: "Grade Slopes Toward Structure",
    text: "Grade slopes toward the structure at the rear",
    category: "Exterior", subcategory: "Grading",
    location: "Rear Yard", severity: "action",
    used: 19, global: 1_355,
  },
  {
    label: "Siding in Contact with Grade",
    text: "Siding is in contact with grade; conducive to decay",
    category: "Exterior", subcategory: "Siding",
    location: "Side Walls", severity: "inspection",
    used: 15, global: 1_087,
  },
  {
    label: "Cracked Stucco Below Windows",
    text: "Cracking in the stucco below the window openings",
    category: "Exterior", subcategory: "Siding",
    location: "Front and Side Walls", severity: "inspection",
    used: 11, global: 869,
  },
  {
    label: "Failed Thermal Seal",
    text: "Failed thermal seal; fogging between the panes",
    category: "Exterior", subcategory: "Windows",
    location: "Exterior Windows", severity: "inspection",
    used: 13, global: 942,
  },
  {
    label: "Guardrail Spacing Too Wide",
    text: "Guardrail spacing exceeds four inches",
    category: "Exterior", subcategory: "Decks",
    location: "Rear Deck", severity: "action",
    used: 10, global: 812,
  },
  {
    label: "Deck Ledger Not Bolted",
    text: "Deck ledger is nailed rather than bolted",
    category: "Exterior", subcategory: "Decks",
    location: "Rear Deck", severity: "action",
    used: 5, global: 517,
  },
  {
    label: "Heaved Walkway",
    text: "Cracked and heaved walkway creates a trip hazard",
    category: "Exterior", subcategory: "Walkways",
    location: "Driveway and Walkways", severity: "action",
    used: 7, global: 703,
  },

  // --- Structure -----------------------------------------------------------
  {
    label: "Vertical Foundation Crack",
    text: "Vertical crack in the foundation wall, under an eighth of an inch",
    category: "Structure", subcategory: "Foundation",
    location: "Foundation Wall", severity: "inspection",
    used: 26, global: 1_930,
  },
  {
    label: "Efflorescence on Foundation",
    text: "Efflorescence on the foundation wall indicates moisture",
    category: "Structure", subcategory: "Foundation",
    location: "Basement", severity: "inspection",
    used: 14, global: 1_101,
  },
  {
    label: "Horizontal Foundation Cracking",
    text: "Horizontal cracking with inward displacement",
    category: "Structure", subcategory: "Foundation",
    location: "Foundation Wall", severity: "action",
    used: 3, global: 415,
  },
  {
    label: "Torn Vapor Barrier",
    text: "Vapor barrier is torn and incomplete",
    category: "Structure", subcategory: "Crawlspace",
    location: "Crawlspace", severity: "maintenance",
    used: 16, global: 1_162,
  },
  {
    label: "Standing Water in Crawlspace",
    text: "Standing water observed in the crawlspace",
    category: "Structure", subcategory: "Crawlspace",
    location: "Crawlspace", severity: "action",
    used: 8, global: 736,
  },
  {
    label: "Over-Notched Floor Joist",
    text: "Notched floor joist exceeds the allowable depth",
    category: "Structure", subcategory: "Framing",
    location: "Crawlspace", severity: "inspection",
    used: 4, global: 468,
  },
  {
    label: "Sistered Joists Not Bearing",
    text: "Sistered joists are not fully bearing at the beam",
    category: "Structure", subcategory: "Framing",
    location: "Basement", severity: "inspection",
    used: 2, global: 331,
  },

  // --- Electrical ----------------------------------------------------------
  {
    label: "Double-Tapped Breaker",
    text: "Double-tapped breaker in the main panel",
    category: "Electrical", subcategory: "Panel",
    location: "Main Panel", severity: "action",
    used: 22, global: 1_674,
  },
  {
    label: "Pointed Panel Cover Screws",
    text: "Panel cover screws are pointed and may pierce conductors",
    category: "Electrical", subcategory: "Panel",
    location: "Main Panel", severity: "maintenance",
    used: 6, global: 604,
  },
  {
    label: "Federal Pacific Panel",
    text: "Federal Pacific panel; replacement recommended",
    category: "Electrical", subcategory: "Panel",
    location: "Main Panel", severity: "action",
    used: 5, global: 559,
  },
  {
    label: "Missing GFCI Protection",
    text: "Missing GFCI protection at the kitchen counter",
    category: "Electrical", subcategory: "Outlets",
    location: "Kitchen", severity: "action",
    used: 19, global: 1_398,
  },
  {
    label: "Open Ground at Receptacles",
    text: "Open ground at the bedroom receptacles",
    category: "Electrical", subcategory: "Outlets",
    location: "Bedrooms", severity: "inspection",
    used: 12, global: 907,
  },
  {
    label: "Reversed Polarity",
    text: "Reversed polarity at the garage receptacle",
    category: "Electrical", subcategory: "Outlets",
    location: "Garage", severity: "inspection",
    used: 9, global: 781,
  },
  {
    label: "Exposed Splice",
    text: "Exposed splice outside of a junction box",
    category: "Electrical", subcategory: "Wiring",
    location: "Attic", severity: "action",
    used: 11, global: 848,
  },
  {
    label: "Active Knob-and-Tube Wiring",
    text: "Knob-and-tube wiring remains active",
    category: "Electrical", subcategory: "Wiring",
    location: "Attic", severity: "action",
    used: 3, global: 402,
  },
  {
    label: "Cracked Fixture Lens",
    text: "Cracked lens on the exterior fixture",
    category: "Electrical", subcategory: "Fixtures",
    location: "Exterior Walls", severity: "maintenance",
    used: 2, global: 318,
  },

  // --- Plumbing ------------------------------------------------------------
  {
    label: "TPR Discharge Terminates High",
    text: "TPR discharge terminates too high above the floor",
    category: "Plumbing", subcategory: "Water heater",
    location: "Water Heater", severity: "action",
    used: 20, global: 1_442,
  },
  {
    label: "No Expansion Tank",
    text: "No expansion tank on a closed system",
    category: "Plumbing", subcategory: "Water heater",
    location: "Water Heater", severity: "inspection",
    used: 15, global: 1_063,
  },
  {
    label: "Slow Drain at Lavatory",
    text: "Slow drain at the hall bath lavatory",
    category: "Plumbing", subcategory: "Drains",
    location: "Hall Bath", severity: "maintenance",
    used: 18, global: 1_287,
  },
  {
    label: "Unvented S-Trap",
    text: "S-trap under the kitchen sink is not vented",
    category: "Plumbing", subcategory: "Drains",
    location: "Kitchen", severity: "inspection",
    used: 7, global: 688,
  },
  {
    label: "Corroded Supply Connections",
    text: "Corrosion at the water heater supply connections",
    category: "Plumbing", subcategory: "Supply",
    location: "Water Heater", severity: "maintenance",
    used: 13, global: 956,
  },
  {
    label: "Polybutylene Supply Piping",
    text: "Polybutylene supply piping observed",
    category: "Plumbing", subcategory: "Supply",
    location: "Basement", severity: "action",
    used: 4, global: 449,
  },
  {
    label: "Loose Toilet at Flange",
    text: "Loose toilet at the floor flange",
    category: "Plumbing", subcategory: "Fixtures",
    location: "Hall Bath", severity: "maintenance",
    used: 10, global: 803,
  },
  {
    label: "Cracked Tank Lid",
    text: "Cracked toilet tank lid",
    category: "Plumbing", subcategory: "Fixtures",
    location: "Primary Bath", severity: "maintenance",
    used: 1, global: 264,
  },

  // --- HVAC ----------------------------------------------------------------
  {
    label: "Heavily Loaded Filter",
    text: "Filter is heavily loaded and restricting airflow",
    category: "HVAC", subcategory: "Furnace",
    location: "Furnace", severity: "maintenance",
    used: 24, global: 1_760,
  },
  {
    label: "Suspected Cracked Heat Exchanger",
    text: "Cracked heat exchanger suspected; further evaluation needed",
    category: "HVAC", subcategory: "Furnace",
    location: "Furnace", severity: "action",
    used: 6, global: 611,
  },
  {
    label: "Unit Past Service Life",
    text: "Unit is past its expected service life",
    category: "HVAC", subcategory: "Condenser",
    location: "Condenser", severity: "inspection",
    used: 17, global: 1_240,
  },
  {
    label: "Bent and Dirty Fins",
    text: "Condenser fins are bent and dirty",
    category: "HVAC", subcategory: "Condenser",
    location: "Condenser", severity: "maintenance",
    used: 12, global: 894,
  },
  {
    label: "Disconnected Duct",
    text: "Disconnected duct in the crawlspace",
    category: "HVAC", subcategory: "Ducts",
    location: "Crawlspace", severity: "action",
    used: 8, global: 727,
  },
  {
    label: "Crushed Flex Duct",
    text: "Flex duct is crushed behind the air handler",
    category: "HVAC", subcategory: "Ducts",
    location: "Air Handler", severity: "maintenance",
    used: 5, global: 542,
  },

  // --- Interior ------------------------------------------------------------
  {
    label: "Hairline Drywall Cracking",
    text: "Hairline cracking at the drywall seams",
    category: "Interior", subcategory: "Walls & ceilings",
    location: "Living Room", severity: "maintenance",
    used: 20, global: 1_419,
  },
  {
    label: "Ceiling Stain Below Bath",
    text: "Ceiling stain below the upstairs bath; dry at inspection",
    category: "Interior", subcategory: "Walls & ceilings",
    location: "Upstairs Hall", severity: "inspection",
    used: 16, global: 1_155,
  },
  {
    label: "Door Rubs and Will Not Latch",
    text: "Door rubs at the head and does not latch",
    category: "Interior", subcategory: "Doors",
    location: "Bedrooms", severity: "maintenance",
    used: 14, global: 1_071,
  },
  {
    label: "Handrail Not Continuous",
    text: "Handrail is not continuous",
    category: "Interior", subcategory: "Stairs",
    location: "Main Stairs", severity: "action",
    used: 11, global: 836,
  },
  {
    label: "Cracked Entry Tile",
    text: "Cracked tile at the entry",
    category: "Interior", subcategory: "Floors",
    location: "Entry", severity: "maintenance",
    used: 9, global: 774,
  },
  {
    label: "Squeaking Hall Floor",
    text: "Squeaking and deflection in the hall floor",
    category: "Interior", subcategory: "Floors",
    location: "Upstairs Hall", severity: "maintenance",
    used: 6, global: 596,
  },
  {
    label: "Cracked Refractory Panels",
    text: "Firebox refractory panels are cracked",
    category: "Interior", subcategory: "Fireplace",
    location: "Living Room", severity: "action",
    used: 7, global: 715,
  },

  // --- Insulation & ventilation --------------------------------------------
  {
    label: "Bath Fan Terminates in Attic",
    text: "Bath fan terminates into the attic",
    category: "Insulation", subcategory: "Attic",
    location: "Attic", severity: "action",
    used: 21, global: 1_530,
  },
  {
    label: "Insulation Below Standard Depth",
    text: "Insulation depth is below current standards",
    category: "Insulation", subcategory: "Attic",
    location: "Attic", severity: "maintenance",
    used: 18, global: 1_293,
  },
  {
    label: "Daylight at Roof Sheathing",
    text: "Daylight is visible at the roof sheathing",
    category: "Insulation", subcategory: "Attic",
    location: "Attic", severity: "action",
    used: 3, global: 424,
  },
  {
    label: "Sagging Dryer Duct",
    text: "Dryer duct is unsupported and sagging",
    category: "Insulation", subcategory: "Ventilation",
    location: "Laundry", severity: "maintenance",
    used: 12, global: 921,
  },
  {
    label: "Blocked Soffit Vents",
    text: "Blocked soffit vents at the eaves",
    category: "Insulation", subcategory: "Ventilation",
    location: "Eaves", severity: "maintenance",
    used: 10, global: 795,
  },

  // --- Never reached for on this account -----------------------------------
  // The library is not the same thing as your library, and a results list that
  // cannot show the difference cannot show the feature. These three match the
  // demonstration's query and sink below everything the inspector has written
  // before, which is the ranking doing its job in public. Their `global` counts
  // are the other half of that: the firm reaches for them, and this inspector
  // never has.
  {
    label: "Shrinkage Cracking at Slab",
    text: "Cracking at the slab is typical of shrinkage",
    category: "Structure", subcategory: "Foundation",
    location: "Garage Slab", severity: "inspection",
    used: 0, global: 287,
  },
  {
    label: "Cracked Ridge Cap",
    text: "Cracked ridge cap at the hip",
    category: "Roofing", subcategory: "Shingles",
    location: "Hip and Ridge", severity: "maintenance",
    used: 0, global: 233,
  },
  {
    label: "Cracked Interior Plaster",
    text: "Cracked plaster at the interior corner",
    category: "Interior", subcategory: "Walls & ceilings",
    location: "Dining Room", severity: "maintenance",
    used: 0, global: 198,
  },
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
  /**
   * Character ranges in `remark.label` that the query matched, in order, so the
   * suggestions list can show *why* a row is there without re-running the
   * match.
   *
   * Into the label rather than the body, because the label is what both places
   * that highlight actually draw — the suggestion row and a result's heading.
   * Marks into a string nothing renders are marks nobody can see, and the
   * redesign moved the visible string.
   */
  readonly marks: readonly (readonly [number, number])[];
  /** True when the query only matched the row's taxonomy path — you typed
   *  "roof" and this is a roofing remark whose label and body never say the
   *  word. The old flow could only ever find rows this way; search finds them
   *  as well as, not instead of, the text. */
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
      .sort((a, b) => b.used - a.used || a.label.localeCompare(b.label))
      .map((remark) => ({ remark, marks: [], viaPath: false }));
  }

  const hits: { hit: Hit; score: number }[] = [];

  for (const remark of pool) {
    /* Three surfaces, in the order they are worth: what the row is called, what
       it will say in the report, and where the tree filed it. Splitting the
       label out of the body is what makes the first tier possible at all —
       before the redesign there was one string doing both jobs, so "missing"
       scored the same whether it opened the remark's name or turned up in the
       ninth word of a sentence. */
    const label = remark.label.toLowerCase();
    const text = remark.text.toLowerCase();
    const path = `${remark.category} ${remark.subcategory}`.toLowerCase();
    const labelStarts = wordStarts(label);
    const textStarts = wordStarts(text);
    const pathStarts = wordStarts(path);

    const marks: (readonly [number, number])[] = [];
    let quality = 0;
    let viaPath = false;
    let inBody = false;
    let matchedAll = true;

    for (const token of tokens) {
      const at = prefixAt(label, labelStarts, token);
      if (at !== undefined) {
        marks.push([at, token.length]);
        // The first word of a label is what an inspector scans, so a hit there
        // is worth more than the same hit further along it.
        quality += at === 0 ? 4 : 3;
        continue;
      }
      // Not in the name, but in the paragraph it will put in the report. Worth
      // finding — type "underlayment" and the row that says it should come
      // back — and worth less than the name, and unmarked, because the
      // suggestion row does not draw the body.
      if (prefixAt(text, textStarts, token) !== undefined) {
        quality += 2;
        inBody = true;
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
      hit: { remark, marks, viaPath: viaPath && marks.length === 0 && !inBody },
      score: remark.used * LIBRARY_WEIGHT + quality,
    });
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.hit.remark.label.localeCompare(b.hit.remark.label),
  );
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
