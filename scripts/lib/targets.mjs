/**
 * What each cue should measure like, and why.
 *
 * THIS FILE IS THE DESIGN, WRITTEN AS NUMBERS.
 *
 * Choosing a recording is a judgement made by ear, and the person making it
 * here cannot hear. That is not a reason to choose at random: most of what
 * separates a usable take from an unusable one is not taste at all, it is
 * whether the recording is OF the right thing at the right scale, and that is
 * measurable. A "page turn" that is four seconds long is a page turn recorded
 * with the room; a "punch" whose energy sits at 6kHz is a slap on a table.
 *
 * So each cue below carries the acoustic shape its reference implies. A
 * candidate is scored on how far outside these windows it falls, and the
 * ranking narrows twenty search results to two or three worth listening to.
 * The final call is still made by ear in /dev/sounds — this decides what is
 * worth putting in front of ears at all.
 *
 * THE WINDOWS, AND WHAT EACH ONE CATCHES
 *
 *   ms      duration. Interface cues are short. This is the single most
 *           effective filter: sound libraries record events with their rooms,
 *           and the room is the part that makes a cue read as a performance.
 *   hz      spectral centroid — where the energy sits. This is the one that
 *           encodes the actual complaint. The synthesised photo slide measured
 *           12.1kHz and the coin 13.1kHz: two different objects at the same
 *           brightness. Every window here is set from what the OBJECT is, and
 *           they are deliberately spread apart from each other.
 *   crest   peak over RMS, in dB. High is a transient, low is a texture. It is
 *           what separates a gunshot from a hiss regardless of brightness, and
 *           it is how a sustained scrape is told from a one-shot.
 *   rise    onset to peak, in ms. Only constrained where it identifies the
 *           object: a gunshot with a 20ms rise is not a gunshot.
 */

/**
 * How many takes a cue keeps, and how long a loop may be.
 *
 * ROUND-ROBIN COUNT IS SET BY HOW FAST THE CUE REPEATS, not by how important
 * it is. A keystroke, a photograph and a page turn can all fire three times in
 * a second, and hearing one waveform three times in a second is the single
 * loudest tell of a sampled interface. Everything else fires once and can
 * afford two, which still breaks the pattern on a double-click.
 *
 * A loop needs only ONE take — the wrap crossfade makes it endless, and a
 * second take is pure weight. The cap matters more: these are the only long
 * files on the board, and at three seconds each they would otherwise be most
 * of what the page downloads.
 */
export const KEEP = { "photo-slip": 3, "book-page": 3, "key-press": 3 };
export const KEEP_DEFAULT = 2;
export const LOOP_SECONDS = { "scratch-rub": 2.5, "pencil-draw": 2.5, "jet-pass": 3, "scratch-body": 0.6 };

export const TARGETS = {
  /* CALIBRATED AGAINST REAL RECORDINGS, NOT DERIVED FROM THE SYNTHESIS.
     ------------------------------------------------------------------
     The first version of this file was written from the same reasoning the
     synthesised cues were built on — a muzzle blast is weighted low, a punch
     is dull, so the windows were set low. Measuring eighty-eight real library
     recordings said otherwise: actual foley of small objects lives between
     about 1.4 and 5kHz almost without exception, and a window at 250-1100Hz
     rejected every real punch there is.

     That does NOT overturn the diagnosis; it sharpens it. The synthesised
     photo slide measured 12.1kHz and the coin 13.1kHz. Real card slides
     measure 2.3-3.3kHz. The old cues were not slightly bright, they were TWO
     OCTAVES above where the objects they depict actually sit, and that gap is
     the whole complaint.

     One number is worth recording on its own: the best-scoring page turn
     measures 2858Hz, and `Book/leaf.ts` states that a sheet of paper buckling
     rings around 2.6kHz. The theory the synthesis was built on was right. It
     could not deliver it, because white noise through a biquad at 2.6kHz is
     still a hiss — which is the argument for recordings in one line. */

  /* --- Scratch card ------------------------------------------------------
     A texture, not an event. Crest is the real test here and it is what
     rejects the crackle the synthesised version fell into: a run of discrete
     bright transients measures high, a continuous scrape measures low. */
  "scratch-rub": { loop: true, words: ["scratch","scrape","coin","foil","lottery","rub","sandpaper","sand","paper","friction","eraser"], not: ["bpm","bar","dj","vinyl","record","turntable","beat","music","swing"], ms: [1500, 12000], hz: [2200, 5200], crest: [6, 16] },
  "scratch-body": { words: ["card","cardboard","bend","flex"], ms: [80, 600], hz: [600, 2200], crest: [10, 22] },
  "scratch-peel": { words: ["peel","foil","sticker","tear"], ms: [150, 1200], hz: [2000, 6000], crest: [8, 20] },

  /* --- Photographs -------------------------------------------------------
     Set just above the book. A print is stiffer and glossier than a page, so
     it belongs slightly brighter — the same relationship `PhotoStack/slip.ts`
     already argues for at 3.4kHz against the book's 2.6kHz, which the
     recordings independently agree with. The important part is the CEILING:
     the cue this replaces sat at 4.2kHz with no low-mid at all, and anything
     above about 4kHz here is a tss rather than an object. */
  "photo-slip": { words: ["card","slide","deal","paper","pickup","photo"], ms: [50, 400], hz: [1800, 3800], crest: [8, 20] },
  "photo-settle": { words: ["card","paper","stack","deck","tap"], ms: [60, 600], hz: [1200, 3200], crest: [10, 22] },

  /* --- Book --------------------------------------------------------------
     Centred on paper's 2.6kHz formant. The riffle is allowed longer but not
     much: 520ms was already a long time to hold someone after a click. */
  "book-page": { words: ["page","turn","book","paper"], ms: [80, 560], hz: [2000, 3800], crest: [9, 22] },
  "book-riffle-open": { words: ["page","flip","riffle","book","flutter"], ms: [250, 1100], hz: [1800, 3600], crest: [7, 24] },
  "book-riffle-close": { words: ["book","close","closing","shut"], ms: [100, 900], hz: [1800, 3600], crest: [7, 22] },
  "book-boards": { words: ["book","drop","close","thud"], ms: [80, 600], hz: [1400, 3000], crest: [10, 24] },

  /* --- Impacts -----------------------------------------------------------
     THE FOOTBALL AND THE PUNCH ARE SEPARATED BY DECAY, NOT BY BRIGHTNESS.

     The design note in `Sticker/sounds.ts` is right that these two must not be
     confusable — they are the only impacts on the board — but it reaches for
     brightness to do it, and the recordings show brightness cannot: real
     punches measure 2.4-3.4kHz and real football strikes 1.4-2.9kHz, which
     overlap almost completely.

     What actually separates them is what that note itself says elsewhere: a
     ball RINGS and rebounds, flesh ABSORBS. That is decay, and t20 measures it
     directly. So the punch is capped short and the kick floored long, and the
     two cues become distinguishable on the one axis that genuinely differs.

     The rifle's rise stays the load-bearing number, relaxed from 3ms to 9ms
     for a reason that only shows up in real files: these are mp3 previews, and
     mp3 pre-echo smears a transient backwards in time, so a genuine gunshot
     cannot measure under about 5ms here however sharp it was at the source. */
  "sticker-rifle": { words: ["rifle","gun","gunshot","shot","ak","assault"], ms: [200, 2000], hz: [2500, 4200], crest: [14, 30], rise: [0, 9] },
  "sticker-rocket": { words: ["rocket","launch","missile","thrust","engine","boost"], not: ["voice","countdown","radio","lock"], ms: [800, 5000], hz: [900, 3200], crest: [4, 16], t20: [600, 6000] },
  "sticker-kick": { words: ["soccer","football","ball","kick","fotball"], ms: [80, 800], hz: [1300, 3200], crest: [12, 28], t20: [120, 900] },
  "sticker-punch": { words: ["punch","hit","boxing","fist","impact","face"], ms: [80, 500], hz: [1800, 3600], crest: [12, 28], t20: [0, 220] },

  /* --- Keys and metal ----------------------------------------------------
     The brightest cues on the board, and legitimately so — a keycap and a
     stylus are small, hard and high. This is also the top of the range: with
     the keys at 4-5kHz and the book at 2.6, the board spans about two octaves,
     which is the spread that stops it sounding like one instrument. */
  "key-press": { words: ["key","keyboard","typewriter","keycap","type"], ms: [20, 220], hz: [3000, 7000], crest: [10, 28] },
  "key-enter": { words: ["enter","return","spacebar","key","keyboard"], ms: [25, 260], hz: [2500, 5500], crest: [10, 26] },
  "printer-run": { words: ["printer","receipt","print","thermal","matrix"], ms: [200, 2500], hz: [1500, 4500], crest: [6, 20] },
  "pencil-draw": { loop: true, words: ["pencil","writing","write","graphite","draw"], ms: [1000, 12000], hz: [2000, 5500], crest: [6, 20] },
  "needle-drop": { words: ["needle","vinyl","stylus","record","turntable"], not: ["rewind","scratch"], ms: [60, 1200], hz: [1200, 3200], crest: [8, 22] },
  "needle-lift": { words: ["needle","vinyl","stylus","record","turntable","lift","stop"], ms: [60, 1200], hz: [1200, 3600], crest: [8, 22] },

  /* --- Homepage ----------------------------------------------------------- */
  /* A LOOP, NOT A FLYBY, and that is a design decision rather than a search
     tweak. `DesignEngineerCard/jet.ts` exposes `drive(throttle, alt)` — the
     sound is continuously controlled by the card's state, not fired at a
     moment. A recorded pass-by is a fixed event and cannot take direction, so
     it would be a downgrade however good the recording.
     What replaces it is an engine loop under `sustain()`, with throttle
     driving rate and tone. That is how a vehicle is done in a game engine, and
     it keeps every bit of the parametric control the synthesis has. */
  "jet-pass": { loop: true, words: ["jet","engine","aircraft","turbine","plane"], ms: [1500, 12000], hz: [600, 2600], crest: [3, 14] },
};

/**
 * How far outside its windows a candidate falls. Zero is inside all of them.
 *
 * Distance is measured in the units of the window itself — a duration twice
 * the allowed maximum scores the same as a centroid at twice its maximum — so
 * the dimensions stay comparable without needing weights nobody could defend.
 * Log distance for frequency, because pitch is heard logarithmically and a
 * candidate 500Hz above a 1kHz ceiling is far further out than one 500Hz above
 * a 6kHz ceiling.
 */
export function score(target, m, title = "") {
  let penalty = 0;
  const linear = (v, [lo, hi]) => (v < lo ? (lo - v) / lo : v > hi ? (v - hi) / hi : 0);
  const log = (v, [lo, hi]) =>
    v < lo ? Math.log2(lo / Math.max(1, v)) : v > hi ? Math.log2(v / hi) : 0;

  penalty += linear(m.ms, target.ms) * 1.0;
  penalty += log(m.hz, target.hz) * 1.2;
  penalty += linear(m.crest, target.crest) * 0.8;
  if (target.rise) penalty += linear(m.riseMs, target.rise) * 1.5;
  /* Decay, where it is the thing that identifies the object rather than
     incidental — the football against the punch, above. */
  if (target.t20) penalty += linear(m.t20, target.t20) * 1.0;

  /* SEMANTIC FIT, because acoustics alone cannot finish this job.
     A snowball hitting a window and a football being struck measure almost
     identically — same duration, same brightness, same crest — and the
     measurement ranked the snowball first. Nothing in the signal distinguishes
     them; the only evidence available is that one file is called "Soccer Kick"
     and the other is not.
     A penalty rather than a bonus, so a file that is acoustically perfect and
     named for the right object stays at zero and everything else is pushed
     down from it. */
  /* Word boundaries, not substrings. "FX_SNOWBALL_HITS_WINDOW" contains
     "ball" and scored as a football on the first attempt, which is the same
     class of false positive that once made eight of nine "dead" icons in this
     repo look unused. Underscores and digits count as boundaries because
     library files are named `SFX_Soccer_Kick_02`. */
  const words = title.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (target.words && !target.words.some((w) => words.includes(w))) penalty += 0.6;
  /* Disqualifiers. "Scratch" in a sound library overwhelmingly means
     turntablism, and a two-bar 90BPM DJ loop passes both the acoustic windows
     and the word check for `scratch-rub` while being the one thing that cue
     must not be. Cheaper to name the collisions than to keep tightening the
     windows around them. */
  if (target.not && target.not.some((w) => words.includes(w))) penalty += 2;
  return penalty;
}
