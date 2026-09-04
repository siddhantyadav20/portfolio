/* ===========================================================================
   Entering the canvas.

   "A new world being entered." It is the first thing anyone hears on this
   board and it is the reason the rest is allowed to make noise at all: every
   other cue here is an object doing what that object does, and that only reads
   as craft once the visitor has been told they are somewhere those noises
   belong. Without this, the canvas is a page that inexplicably starts clicking.

   Three things, in this order — see the note below each. The one that does the
   work is the rising sweep: everything else on this board falls, and going up
   is most of why this reads as *arriving somewhere* rather than as a place.

   It rides the morph rather than following it — the card is still growing into
   the viewport while this swells, so the sound and the geometry arrive
   together and read as one movement.
   =========================================================================== */

import { acquire, burst, prefersQuiet } from "@/lib/sound";

/** Master ceiling. Louder than it was — this is an arrival now, not a
 *  threshold marker to be almost missed. */
const PEAK = 0.085;

/* --- The room opening -----------------------------------------------------
   "A new world being entered", which is three things happening together and
   in this order:

     1. a LOW swell arriving underneath, the size of the space
     2. a rising sweep OPENING upward through it — the movement, and the part
        that makes this an arrival rather than a place
     3. a high SHIMMER left hanging after both, so the room does not simply
        stop. The tail is what says the space is still there.

   The sweep rises where everything else on this board falls. Nothing else here
   goes up, which is most of why this reads as going somewhere. */

/** The space itself. A fifth apart, detuned so they beat slowly. */
const ROOT = 55;
const FIFTH = 82.5;
const DETUNE = 8;

/** The opening sweep. Wide, and it travels most of the audible range. */
const SWEEP_FROM = 260;
const SWEEP_TO = 4200;
const SWEEP_MS = 900;
const SWEEP_LEVEL = 0.5;

/** The shimmer left hanging. High, quiet, and longer than everything else. */
const SHIMMER_HZ = 2600;
const SHIMMER_MS = 1500;
const SHIMMER_LEVEL = 0.22;

/** In slowly, out slowly. A world does not switch on. */
const RISE = 0.42;
const FALL = 1.25;

let played = false;

/**
 * Once per arrival.
 *
 * Guarded by a module flag rather than by the caller: the surface mounts for
 * the route *and* for the overlay, React may mount an effect twice in
 * development, and none of those are a second arrival. It is not reset on the
 * way out — leaving and coming back within one page life is the same visit,
 * and hearing the room open twice would say otherwise.
 */
export function enterRoom() {
  if (played || prefersQuiet()) return;

  const voice = acquire();
  if (!voice) return;

  voice.wake();

  const { ctx } = voice;

  /* Not yet, and not never.
   *
   * Arriving by clicking the card carries that click's permission through the
   * route change and this plays immediately. Arriving at `/canvas` directly —
   * a shared link, a bookmark, a reload — has had no gesture at all, and the
   * browser refuses to start the context.
   *
   * The first version treated that as a miss and set `played` anyway, on the
   * argument that a room opening late is worse than one that never opened. It
   * is worse than that: every later cue on the board then happens in a room
   * that never opened, which is the one thing this sound exists to prevent.
   *
   * So it waits instead. The next real gesture — a pan, a click on any widget,
   * a key — is the moment the room can be heard, and it opens then. Bound once
   * on `pointerdown` and `keydown`, `{ once: true }` on both, and each removes
   * the other so a page that is clicked *and* typed on cannot open twice. */
  if (ctx.state !== "running") {
    const open = () => {
      document.removeEventListener("pointerdown", open, true);
      document.removeEventListener("keydown", open, true);
      // Re-entered rather than continued: the context has to be resumed by the
      // gesture before any of the scheduling below is worth doing, and `wake`
      // is what does that.
      enterRoom();
    };
    document.addEventListener("pointerdown", open, { capture: true, once: true });
    document.addEventListener("keydown", open, { capture: true, once: true });
    return;
  }

  played = true;

  const t = ctx.currentTime + 0.02;
  const life = RISE + FALL;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(PEAK, t + RISE);
  master.gain.exponentialRampToValueAtTime(0.0001, t + life);
  master.connect(voice.out);

  /* 1. The space. Two sines a fifth apart — the least eventful consonance
        there is, because a space should have no opinion. */
  for (const [hz, detune, level] of [
    [ROOT, -DETUNE, 1],
    [FIFTH, DETUNE, 0.55],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    osc.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = level;
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + life + 0.05);
  }

  /* 2. The opening. Noise through a filter climbing 260 -> 4200, which is the
        only rising gesture on the whole board. */
  burst(ctx, master, {
    at: t,
    seconds: SWEEP_MS / 1000,
    level: SWEEP_LEVEL,
    type: "bandpass",
    hz: [SWEEP_FROM, SWEEP_TO],
    q: 0.8,
    attack: 0.3,
  });

  /* 3. The shimmer, hanging on after the rest. Starts late and outlives the
        swell, so the room is still there when the sound has gone. */
  burst(ctx, master, {
    at: t + 0.3,
    seconds: SHIMMER_MS / 1000,
    level: SHIMMER_LEVEL,
    type: "bandpass",
    hz: [SHIMMER_HZ, SHIMMER_HZ * 1.6],
    q: 1.2,
    attack: 0.5,
  });
}
