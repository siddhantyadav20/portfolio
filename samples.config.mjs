/**
 * Which recording becomes which cue, and where to cut it.
 *
 * THE ONLY FILE TO EDIT WHEN CHOOSING SOUNDS. `scripts/build-samples.mjs`
 * reads this, cuts and encodes what it names out of `samples-src/`, and
 * rewrites the generated half of `lib/sfx-manifest.ts`. Nothing else needs
 * touching to change what the site sounds like.
 *
 * A cue with no takes is not an error — it is the normal state before a sound
 * has been chosen, and every caller answers an empty cue by playing the
 * synthesised version it already has. So this file fills in one cue at a time
 * and the site is coherent at every step.
 *
 * FIELDS
 *
 *   src        path under `samples-src/`, any format ffmpeg reads.
 *   start      seconds into the source. Most library files are a session with
 *              several takes in it; this is which one.
 *   duration   seconds to keep. SHORTER THAN FEELS RIGHT. These are interface
 *              cues, not sound effects: the tail of a recording is where it
 *              stops being an interaction and starts being a performance.
 *   gain       per-cue trim, applied at playback on top of the caller's level.
 *              Set this from the bench and the measured table, not by guessing.
 *   loop       the take is a sustaining texture, wrapped to loop seamlessly.
 *
 * ON HOW MANY TAKES. Two or more per cue wherever the cue can fire twice in a
 * row — pages, photographs, keystrokes. Hearing the same waveform twice is the
 * single loudest tell of a sampled interface, and it is the one way recordings
 * could end up sounding worse than the synthesis they replace.
 */

export default {
  /* --- Scratch card ------------------------------------------------------
     One continuous foil scrape, long enough to loop without the ear finding
     the lap. `scratch-body` is the cardstock under the foil — the low-mid flex
     the synthesised version had none of, and the reason it read as fizz. */

  /* --- Photographs -------------------------------------------------------
     Three slides minimum: this fires once per photograph and a stack is
     stepped through quickly. `photo-settle` is the stack squaring up, which is
     what makes a category change read as the whole block moving rather than as
     one slide played longer. */

  /* --- Book --------------------------------------------------------------
     `book-page` is the hover — the one cue on this widget that already works,
     so the recording has to match what it does rather than improve on it.
     The riffles are their own takes; a thumb release is not a page turn
     repeated forty-two times, which is what the scheduler assumed. */

  /* --- Stickers ----------------------------------------------------------
     Library sound-alikes, not game rips. Each is one designed one-shot; the
     five-layer synthesised gunshot is exactly where building it up failed. */

  /* --- The rest of the board ---------------------------------------------
     Four key takes at least. A keyboard where every key is identical is the
     giveaway, and this cue fires faster than any other on the site. */

  /* --- Homepage ----------------------------------------------------------
     The only homepage cue that is a picture of an object. The chime, the copy
     confirm, the theme click and the celebration are abstractions and stay
     synthesised. */
  "scratch-rub": { gain: 1, loop: true, takes: [
      { src: "scratch-rub/127979.mp3", start: 0.000, duration: 1.015 },
      { src: "scratch-rub/156006.mp3", start: 0.019, duration: 2.500 },
  ] },
  "scratch-body": { gain: 1, takes: [
      { src: "scratch-body/364932.mp3", start: 1.694, duration: 0.600 },
      { src: "scratch-body/215475.mp3", start: 0.799, duration: 0.596 },
  ] },
  "scratch-peel": { gain: 1, takes: [
      { src: "scratch-peel/422727.mp3", start: 0.549, duration: 0.496 },
      { src: "scratch-peel/245199.mp3", start: 0.029, duration: 1.200 },
  ] },
  "photo-slip": { gain: 1, takes: [
      { src: "photo-slip/817550.mp3", start: 0.000, duration: 0.150 },
      { src: "photo-slip/817578.mp3", start: 0.034, duration: 0.346 },
      { src: "photo-slip/571577.mp3", start: 0.089, duration: 0.356 },
  ] },
  "photo-settle": { gain: 1, takes: [
      { src: "photo-settle/416416.mp3", start: 0.014, duration: 0.471 },
      { src: "photo-settle/459247.mp3", start: 0.299, duration: 0.506 },
  ] },
  "book-page": { gain: 1, takes: [
      { src: "book-page/397548.mp3", start: 0.034, duration: 0.466 },
      { src: "book-page/397549.mp3", start: 0.000, duration: 0.560 },
      { src: "book-page/346835.mp3", start: 0.000, duration: 0.520 },
  ] },
  "book-riffle-open": { gain: 1, takes: [
      { src: "book-riffle-open/573067.mp3", start: 0.039, duration: 0.701 },
      { src: "book-riffle-open/429403.mp3", start: 0.284, duration: 1.100 },
  ] },
  "book-riffle-close": { gain: 1, takes: [
      { src: "book-riffle-close/123819.mp3", start: 0.029, duration: 0.316 },
      { src: "book-riffle-close/195795.mp3", start: 1.449, duration: 0.121 },
  ] },
  "book-boards": { gain: 1, takes: [
      { src: "book-boards/484906.mp3", start: 0.259, duration: 0.366 },
      { src: "book-boards/267481.mp3", start: 0.000, duration: 0.500 },
  ] },
  "sticker-rifle": { gain: 1, takes: [
      { src: "sticker-rifle/238916.mp3", start: 0.000, duration: 2.000 },
      { src: "sticker-rifle/433858.mp3", start: 0.000, duration: 0.830 },
  ] },
  "sticker-rocket": { gain: 1, takes: [
      { src: "sticker-rocket/146770.mp3", start: 0.000, duration: 4.750 },
      { src: "sticker-rocket/521377.mp3", start: 0.000, duration: 1.405 },
  ] },
  "sticker-kick": { gain: 1, takes: [
      { src: "sticker-kick/261267.mp3", start: 0.014, duration: 0.761 },
      { src: "sticker-kick/117111.mp3", start: 0.000, duration: 0.615 },
  ] },
  "sticker-punch": { gain: 1, takes: [
      { src: "sticker-punch/244513.mp3", start: 0.009, duration: 0.266 },
      { src: "sticker-punch/348242.mp3", start: 0.000, duration: 0.210 },
  ] },
  "key-press": { gain: 1, takes: [
      { src: "key-press/160678.mp3", start: 0.000, duration: 0.115 },
      { src: "key-press/380138.mp3", start: 0.000, duration: 0.220 },
      { src: "key-press/194799.mp3", start: 0.000, duration: 0.220 },
  ] },
  "key-enter": { gain: 1, takes: [
      { src: "key-enter/180997.mp3", start: 0.009, duration: 0.156 },
      { src: "key-enter/442649.mp3", start: 0.764, duration: 0.251 },
  ] },
  "printer-run": { gain: 1, takes: [
      { src: "printer-run/16942.mp3", start: 0.000, duration: 0.895 },
      { src: "printer-run/202531.mp3", start: 0.000, duration: 2.320 },
  ] },
  "pencil-draw": { gain: 1, loop: true, takes: [
      { src: "pencil-draw/154710.mp3", start: 0.000, duration: 2.500 },
      { src: "pencil-draw/277312.mp3", start: 0.000, duration: 1.070 },
  ] },
  "needle-drop": { gain: 1, takes: [
      { src: "needle-drop/74385.mp3", start: 0.000, duration: 0.800 },
      { src: "needle-drop/337736.mp3", start: 0.059, duration: 1.200 },
  ] },
  "needle-lift": { gain: 1, takes: [
      { src: "needle-lift/647583.mp3", start: 0.059, duration: 0.496 },
      { src: "needle-lift/326418.mp3", start: 0.000, duration: 0.820 },
  ] },
  "jet-pass": { gain: 1, loop: true, takes: [
      { src: "jet-pass/162417.mp3", start: 0.000, duration: 3.000 },
      { src: "jet-pass/270271.mp3", start: 0.000, duration: 3.000 },
  ] },
  /* --- Found --------------------------------------------------------------
     A phone vibrating on wood, one pulse per take; lib/found/buzz.ts plays two
     of them 450ms apart, the way a text lands. Pulses measured off the 50ms
     envelope (scripts/build-found-audio.mjs prints it). */
  "found-buzz": { gain: 1, takes: [
      { src: "found-buzz/708216.mp3", start: 0.080, duration: 0.400 },
      { src: "found-buzz/708216.mp3", start: 1.280, duration: 0.400 },
  ] },
};
