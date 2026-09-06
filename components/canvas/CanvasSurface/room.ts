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

/**
 * ONCE PER ARRIVAL, NOT ONCE PER PAGE — and that is a change of mind.
 *
 * This used to be a `played` boolean that was set on the first play and never
 * reset, on the reasoning that "leaving and coming back within one page life is
 * the same visit, and hearing the room open twice would say otherwise". That
 * argument is defensible and it is not what it feels like: the canvas is a
 * place you step into, and stepping into it a second time with the door opening
 * in silence reads as the sound being broken rather than as restraint. Reported
 * as exactly that — "it only plays once, and then refreshing it works".
 *
 * A timestamp instead of a flag, which is the same idiom `StoreWaitlist/won.ts`
 * uses for the same reason. It still absorbs everything the boolean existed to
 * absorb — the surface mounting for the route *and* the overlay, and React
 * mounting an effect twice in development — because all of those happen inside
 * a few milliseconds, and none of them is a second arrival.
 */
const RETRIGGER_MS = 1500;

let lastAt = -Infinity;
/** A resume is in flight. See `enterRoom`. */
let opening = false;

/**
 * How long the room waits before it opens.
 *
 * THE SOUND HAS NOT CHANGED; WHEN IT ARRIVES HAS. Until the resume race in
 * `enterRoom` was fixed, this cue almost never played on entry — it fell
 * through to a listener and opened on whatever you clicked *next*, which was
 * always well after the canvas had settled. So it was heard in a still room,
 * and that is what made it read as arriving somewhere.
 *
 * Played at mount it is correct and worse: the 420ms swell runs underneath the
 * card's 680ms morph, competing with the board flying in rather than following
 * it. Held for this long, the rise begins as the morph lands and peaks just
 * after — the room opening *because* you arrived, which is the thing the sound
 * is for.
 *
 * Direct navigation to `/canvas` has no morph to wait for, and a third of a
 * second of silence on a fresh page load is indistinguishable from the page
 * settling. One number covers both.
 */
const SETTLE_MS = 340;

/**
 * Wait for the next real gesture, then try again.
 *
 * Arriving at `/canvas` directly — a shared link, a bookmark, a reload — has
 * had no user gesture at all, and the browser is right to refuse to start an
 * AudioContext there. This is the honest answer to that: the next pan, widget
 * click or keypress is the first moment the room *can* be heard, and it opens
 * then.
 *
 * Deliberately not "give up and mark it played": every later cue on the board
 * would then happen in a room that never opened, which is the one thing this
 * sound exists to prevent.
 *
 * `{ once: true }` on both, and each removes the other, so a page that is
 * clicked *and* typed on cannot open the room twice.
 */
function openOnNextGesture() {
  const open = () => {
    document.removeEventListener("pointerdown", open, true);
    document.removeEventListener("keydown", open, true);
    enterRoom();
  };
  document.addEventListener("pointerdown", open, { capture: true, once: true });
  document.addEventListener("keydown", open, { capture: true, once: true });
}

/**
 * Once per arrival.
 *
 * Guarded by a module flag rather than by the caller: the surface mounts for
 * the route *and* for the overlay, React may mount an effect twice in
 * development, and none of those are a second arrival. It is not reset on the
 * way out — leaving and coming back within one page life is the same visit,
 * and hearing the room open twice would say otherwise.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS DID NOT PLAY MOST OF THE TIME, AND WHAT CHANGED.
 *
 * `wake()` is fire-and-forget by design: it calls `ctx.resume()` and does not
 * await it, because every other cue on the site schedules its sound
 * immediately afterwards and trusts the resume to land well before the
 * scheduled `currentTime` arrives. That works, and `needle`, `chime`, `jet` and
 * `won` all rely on it.
 *
 * This function alone then asked `ctx.state !== "running"` on the very next
 * line — and a freshly created context starts suspended, so that question was
 * being asked *while the resume it depends on was still a pending promise*. It
 * lost that race essentially every time. Clicking the canvas card is a real
 * gesture and would have been honoured, but the check ran several ticks later
 * (an awaited `loadSurface()`, `flushSync` inside `startViewTransition`, then
 * React's effect flush), saw "suspended", and quietly deferred to the
 * next-gesture path below. So the room only opened if you happened to click or
 * type *again* once you were inside it — and if you only looked around with
 * the pointer, it never opened at all, for the rest of the page's life.
 *
 * The fix is to wait for the answer instead of guessing it. `resume()` settles
 * either way: it resolves once the context is running, and rejects when the
 * browser genuinely has no gesture to work with — which is the direct-navigation
 * case the gesture listener was written for, and the only case that should now
 * reach it.
 */
export function enterRoom() {
  if (opening || prefersQuiet()) return;
  if (Date.now() - lastAt < RETRIGGER_MS) return;

  const voice = acquire();
  if (!voice) return;

  voice.wake();

  const { ctx } = voice;

  if (ctx.state === "running") {
    play(voice);
    return;
  }

  /* `opening` holds the door: this is the one path that awaits, and without it
     two mounts in the same tick would both get past the retrigger guard (which
     is only stamped when the sound is actually scheduled) and open the room
     twice. */
  opening = true;
  ctx.resume().then(
    () => {
      opening = false;
      if (ctx.state === "running") play(voice);
      else openOnNextGesture();
    },
    () => {
      opening = false;
      openOnNextGesture();
    },
  );
}

/** The room itself. Only ever reached with a running context. */
function play(voice: NonNullable<ReturnType<typeof acquire>>) {
  const { ctx } = voice;
  lastAt = Date.now();

  /* Re-armed, because the wait below is long enough to matter. `wake()` sets a
     timer to suspend the shared context after a couple of seconds of silence,
     and it was armed when `enterRoom` ran — so a 340ms hold plus a 1.7s swell
     would finish with almost nothing to spare, and a slow resume would have the
     context suspended out from under the tail. This pushes that timer out past
     the whole cue. */
  voice.wake();

  const t = ctx.currentTime + 0.02 + SETTLE_MS / 1000;
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
