/* ===========================================================================
   Bite.

   What is left of a larger toolkit. There were four synthesis methods here —
   modal bodies, comb cavities, FM — added on the theory that the cues sounded
   alike because they shared one method. They did sound alike, but the method
   was not the reason: the whole board was foley of small objects, and small
   objects all sound like each other in forty milliseconds. Changing the
   physics under them changed nothing anyone could hear.

   What actually separated them was giving each one a real, specific reference
   — a football, a rifle, a page, an iOS key — and building to that rather than
   to a material. The three unused methods are deleted rather than kept "in
   case", because a synthesis library nothing calls is a comment that lies.

   `shaped` earns its place: distortion is the one effect none of the cues can
   produce for themselves, and it is what makes the rifle and the punch land
   instead of pop.
   =========================================================================== */

import { noiseBuffer } from "@/lib/sound";

/* ===========================================================================
   shaped — bite
   =========================================================================== */

/* Typed as the DOM's own parameter type rather than a bare `Float32Array`:
   under `lib.dom` the latter is `Float32Array<ArrayBufferLike>`, which is wider
   than the `Float32Array<ArrayBuffer>` `curve` accepts. */
let curve: WaveShaperNode["curve"] = null;

/** A soft-clip curve, made once. `tanh`-ish: gentle in the middle, hard at the
 *  edges, so quiet parts pass through and loud parts distort. */
function shaper(): NonNullable<WaveShaperNode["curve"]> {
  if (curve) return curve;
  const n = 1024;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * 3.2);
  }
  curve = c;
  return c;
}

/**
 * A noise burst with odd harmonics folded into it.
 *
 * The difference between a bang and a crack. Distortion on noise does not add
 * pitch — noise has none to distort — but it does compress the peaks and lift
 * the density, and the ear reads that as force.
 */
export function shaped(
  ctx: AudioContext,
  out: AudioNode,
  at: number,
  opts: {
    seconds: number;
    hz: number | readonly [number, number];
    level?: number;
    type?: BiquadFilterType;
    q?: number;
    drive?: number;
  },
) {
  const level = opts.level ?? 1;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);

  const pre = ctx.createGain();
  pre.gain.value = opts.drive ?? 4;

  const dist = ctx.createWaveShaper();
  dist.curve = shaper();
  dist.oversample = "2x";

  const filter = ctx.createBiquadFilter();
  filter.type = opts.type ?? "bandpass";
  if (opts.q !== undefined) filter.Q.value = opts.q;
  if (typeof opts.hz === "number") {
    filter.frequency.value = opts.hz;
  } else {
    filter.frequency.setValueAtTime(opts.hz[0], at);
    filter.frequency.exponentialRampToValueAtTime(opts.hz[1], at + opts.seconds);
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(level, at + 0.0015);
  env.gain.exponentialRampToValueAtTime(0.0001, at + opts.seconds);

  src.connect(pre).connect(dist).connect(filter).connect(env).connect(out);
  src.start(at, Math.random() * 1.5);
  src.stop(at + opts.seconds + 0.02);
}
