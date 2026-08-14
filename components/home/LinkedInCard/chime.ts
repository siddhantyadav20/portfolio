/* ===========================================================================
   The connect cue, synthesised.

   No audio file, for the same reason the jet doesn't have one: a 40KB mp3 for
   a third of a second of sound is a poor trade when the sound is four
   oscillators, and a file cannot be retuned by editing two numbers.

   What it is trying to be: the noise a professional network makes when a
   connection lands. Not a game chime and not a notification blip — a soft
   struck bell, two notes, D5 up to A5. A rising perfect fifth is the interval
   almost every "accepted / connected / done" cue in the genre settles on,
   because it reads as an answer rather than an alert. Each note is a
   fundamental with two quiet inharmonic partials over it and a fast
   exponential decay, so it has a wooden attack and a glassy tail.

   Quiet on purpose — see PEAK. It sits under a hover, and a hover the visitor
   did not ask to be loud.

   Nothing here forces audio on anyone. The context is built on the first hover
   and immediately asked to resume; browsers refuse that until the page has had
   a real user gesture, and if it is refused the card simply stays silent and
   tries again next time. Reduced-motion callers never construct it.
   =========================================================================== */

export type Chime = {
  /** Struck once per arrival at the CTA. */
  connect(): void;
  dispose(): void;
};

/** Master ceiling. The loudest this ever gets. */
const PEAK = 0.085;

/** The two notes, Hz: D5 then A5. */
const LOW = 587.33;
const HIGH = 880;

/** How far behind the first note the second one lands, seconds. Short enough
 *  that the pair reads as one gesture rather than two events. */
const GAP = 0.115;

/**
 * Partials, as [ratio of the fundamental, share of the level]. The 3.01 and
 * 5.04 are deliberately off the harmonic series — that detuning is the
 * difference between a bell and an organ.
 */
const PARTIALS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [2.0, 0.3],
  [3.01, 0.11],
  [5.04, 0.04],
];

/** Two hovers closer together than this are one hover. Without it, a pointer
 *  crossing the pill's edge a few times machine-guns the bell. */
const RETRIGGER_MS = 420;

/** Silence held this long, and the context is suspended. */
const SLEEP_MS = 2200;

export function createChime(): Chime | null {
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();

  const master = ctx.createGain();
  master.gain.value = PEAK;

  // Takes the top off the upper partials. Without it the 5.04 is a spike and
  // the whole thing reads as a phone alert rather than something struck.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 5200;
  tone.Q.value = 0.4;

  master.connect(tone).connect(ctx.destination);

  let lastAt = -Infinity;
  let sleepTimer = 0;
  let disposed = false;

  /** One struck note: every partial gets its own envelope, and the higher ones
   *  decay faster, which is what a real bar or bell does. */
  function strike(freq: number, at: number, level: number, decay: number) {
    for (const [ratio, share] of PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;

      const env = ctx.createGain();
      const life = decay / (1 + (ratio - 1) * 0.55);
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(level * share, at + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, at + life);

      osc.connect(env).connect(master);
      osc.start(at);
      osc.stop(at + life + 0.05);
    }
  }

  return {
    connect() {
      if (disposed) return;

      const now = Date.now();
      if (now - lastAt < RETRIGGER_MS) return;
      lastAt = now;

      window.clearTimeout(sleepTimer);
      // Rejected before the page has had a user gesture, which is fine:
      // nothing is audible and nothing throws.
      if (ctx.state !== "running") ctx.resume().catch(() => {});

      const t = ctx.currentTime + 0.01;
      strike(LOW, t, 1, 0.85);
      strike(HIGH, t + GAP, 0.8, 1.3);

      // Suspended once it has rung out: an idle context is a wakelock on the
      // audio hardware for as long as the page is open.
      sleepTimer = window.setTimeout(() => {
        if (!disposed && ctx.state === "running") ctx.suspend().catch(() => {});
      }, SLEEP_MS);
    },

    dispose() {
      disposed = true;
      window.clearTimeout(sleepTimer);
      ctx.close().catch(() => {});
    },
  };
}
