/* ===========================================================================
   Flight geometry and motion for the DES -> ENG card.

   Two ideas do all the work here.

   1. A *track* is a densely sampled polyline in card-space pixels, carrying an
      arc length, an unwrapped heading and a curvature at every sample. The
      outbound track is read straight off the real `<path>` element with
      getPointAtLength, so the plane is on the dotted route by construction —
      not on a re-typed approximation of it.

   2. Speed is a function of *where on the track the plane is*, not of elapsed
      time. Each leg declares an envelope (the takeoff punch, the landing
      flare) which is then multiplied by a curvature term, so the plane sheds
      speed in a tight turn the way an aircraft has to and picks it back up on
      the straight. Integrating that gives the timing for free — including
      through the hairpin the Figma route makes at its midpoint, which no
      hand-authored cubic-bezier would have handled gracefully.

   Everything is in card-space px / degrees / seconds. Nothing here touches the
   DOM except `readTrack`, which needs the one path element to measure.
   =========================================================================== */

export type Pt = { x: number; y: number };

/** One sample along a track. */
export type Sample = {
  x: number;
  y: number;
  /** Arc length from the track's start, px. */
  s: number;
  /** Tangent heading in degrees, unwrapped — it accumulates through a full
   *  turn rather than snapping at ±180, so the plane never spins the wrong
   *  way out of a bank. */
  h: number;
  /** |curvature|, 1/px. */
  k: number;
};

export type Track = { nodes: Sample[]; len: number };

const RAD = Math.PI / 180;

export const dir = (deg: number): Pt => ({
  x: Math.cos(deg * RAD),
  y: Math.sin(deg * RAD),
});

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

/* --- Track construction --------------------------------------------------- */

/** Arc length (px) either side of a sample used to read its tangent. Small
 *  enough to stay faithful through the hairpin, wide enough not to be reading
 *  sampling noise. */
const TANGENT_WINDOW = 2.4;

/** Curvature needs a wider window than the tangent does — differentiating a
 *  polyline twice over 2px is all quantisation. */
const CURVE_WINDOW = 5;

/** Turn a list of points into a track: arc length, unwrapped heading, curvature. */
export function track(pts: Pt[]): Track {
  const n = pts.length;
  const nodes: Sample[] = new Array(n);

  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    nodes[i] = { x: pts[i].x, y: pts[i].y, s, h: 0, k: 0 };
  }

  const span = (i: number, w: number) => {
    let a = i;
    let b = i;
    while (a > 0 && nodes[i].s - nodes[a].s < w) a--;
    while (b < n - 1 && nodes[b].s - nodes[i].s < w) b++;
    return [a, b] as const;
  };

  let prev = 0;
  for (let i = 0; i < n; i++) {
    const [a, b] = span(i, TANGENT_WINDOW);
    let h =
      Math.atan2(nodes[b].y - nodes[a].y, nodes[b].x - nodes[a].x) / RAD;
    if (i > 0) {
      // Unwrap against the previous sample so a track that turns through west
      // keeps counting instead of flipping sign.
      while (h - prev > 180) h -= 360;
      while (h - prev < -180) h += 360;
    }
    nodes[i].h = h;
    prev = h;
  }

  for (let i = 0; i < n; i++) {
    const [a, b] = span(i, CURVE_WINDOW);
    const ds = nodes[b].s - nodes[a].s;
    nodes[i].k = ds > 0 ? Math.abs((nodes[b].h - nodes[a].h) * RAD) / ds : 0;
  }

  // Curvature drives speed directly, so any roughness in it lands in the
  // motion as stutter. Two box passes over the same window is enough to make
  // it continuous without blunting the hairpin.
  for (let pass = 0; pass < 2; pass++) {
    const k = nodes.map((v) => v.k);
    for (let i = 0; i < n; i++) {
      const [a, b] = span(i, CURVE_WINDOW);
      let sum = 0;
      for (let j = a; j <= b; j++) sum += k[j];
      nodes[i].k = sum / (b - a + 1);
    }
  }

  return { nodes, len: nodes[n - 1].s };
}

/** Interpolate a track at arc length `s`. */
export function at(t: Track, s: number): Sample {
  const nd = t.nodes;
  if (s <= 0) return nd[0];
  if (s >= t.len) return nd[nd.length - 1];

  let lo = 0;
  let hi = nd.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (nd[m].s <= s) lo = m;
    else hi = m;
  }
  const a = nd[lo];
  const b = nd[hi];
  const f = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    s,
    h: a.h + (b.h - a.h) * f,
    k: a.k + (b.k - a.k) * f,
  };
}

/** Nearest sample to a point, by arc length. */
export function nearest(t: Track, p: Pt): number {
  let best = 0;
  let bestD = Infinity;
  for (const n of t.nodes) {
    const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n.s;
    }
  }
  return best;
}

/**
 * The stretch of `t` between two arc lengths, translated by (dx, dy).
 *
 * Headings and curvature come along untouched rather than being re-derived,
 * so a sub-track is exactly as accurate as its parent.
 */
export function sub(t: Track, from: number, to: number, dx: number, dy: number): Track {
  const inner = t.nodes
    .filter((n) => n.s > from && n.s < to)
    .map((n) => ({ ...n, x: n.x + dx, y: n.y + dy, s: n.s - from }));

  const head = at(t, from);
  const tail = at(t, to);
  const nodes: Sample[] = [
    { ...head, x: head.x + dx, y: head.y + dy, s: 0 },
    ...inner,
    { ...tail, x: tail.x + dx, y: tail.y + dy, s: to - from },
  ];
  return { nodes, len: to - from };
}

/**
 * Read the dotted route off the live `<path>`, in card-space pixels.
 *
 * `m` maps the path's own user units to the card: the SVG's viewBox mapping
 * composed with the CSS matrix Figma exported. Sampling the real element is
 * the whole point — the route is non-uniformly scaled *and* vertically
 * flipped, and any hand-transcribed copy of it would drift.
 */
export function readTrack(path: SVGPathElement, m: DOMMatrix, step = 0.3): Track {
  const total = path.getTotalLength();
  const pts: Pt[] = [];
  for (let l = 0; l <= total; l += step) {
    const q = path.getPointAtLength(l);
    pts.push({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f });
  }
  const q = path.getPointAtLength(total);
  pts.push({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f });
  return track(pts);
}

/* --- Splines -------------------------------------------------------------- */

/**
 * Centripetal Catmull-Rom through `way`, sampled at ~`step` px.
 *
 * The first and last entries are phantoms: they set the end tangents and are
 * not visited. Centripetal rather than uniform because the waypoints are
 * deliberately unevenly spaced — long cruise, short flare — and uniform
 * Catmull-Rom loops on itself when spacing changes that much.
 */
export function spline(way: Pt[], step = 0.4): Pt[] {
  const out: Pt[] = [];
  const knot = (a: Pt, b: Pt) => Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)), 1e-3);

  for (let i = 1; i < way.length - 2; i++) {
    const p0 = way[i - 1];
    const p1 = way[i];
    const p2 = way[i + 1];
    const p3 = way[i + 2];

    // Knot spacing, square-root of chord length: the "centripetal" part.
    const t1 = knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const d = t2 - t1;

    const m1 = (a: number, b: number, c: number) =>
      ((b - a) / t1 - (c - a) / t2 + (c - b) / d) * d;
    const m2 = (a: number, b: number, c: number) =>
      ((b - a) / d - (c - a) / (t3 - t1) + (c - b) / (t3 - t2)) * d;

    const m1x = m1(p0.x, p1.x, p2.x);
    const m1y = m1(p0.y, p1.y, p2.y);
    const m2x = m2(p1.x, p2.x, p3.x);
    const m2y = m2(p1.y, p2.y, p3.y);

    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let j = i === 1 ? 0 : 1; j <= steps; j++) {
      const u = j / steps;
      const u2 = u * u;
      const u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;
      out.push({
        x: h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x,
        y: h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y,
      });
    }
  }
  return out;
}

/* --- The route home ------------------------------------------------------- */

/* The return is deliberately not the outbound reversed. The plane banks away
   to the right, sweeps west through the card's empty lower band, then climbs
   the narrow corridor between "Design" and the Designer slot and flares into
   it — one continuous clockwise circuit.

   The circuit is also the only shape that gets the plane back into the slot
   *pointing the way the resting plane points*. Anything that arrives flying
   west has to pivot on the spot at the end, which no aircraft does and no
   amount of easing hides.

   These are plane-centre positions in card space. The badge is 32px across, so
   each one is placed to keep it clear of the two text blocks (DES/Design ends
   at x=62.5, ENG/Engineer starts at x=174) and inside the 116px card. */
const HOME_TAIL: Pt[] = [
  /* the cruise: a long, shallow descent west across the empty band */
  { x: 124, y: 98 },
  { x: 98, y: 98.5 },
  { x: 86, y: 95 },
  /* the climb and the flare, up the corridor between "Design" and the slot.
     Everything from here is always flown, however early the pointer left — it
     is what lines the plane up. x=80 is as far left as the corridor goes: the
     badge's left edge lands at 64, a pixel and a half clear of the label. */
  { x: 80, y: 86 },
  { x: 80, y: 74 },
  { x: 80.5, y: 62 },
  { x: 83, y: 53 },
  { x: 86.5, y: 48 },
];
const HOME_CLIMB = 3;

/** Radius of the turn away from the route. Small enough that the badge clears
 *  "ENG" on the way past, large enough not to read as a pirouette. */
const PEEL_R = 16;

/**
 * Build the way home from wherever the plane currently is.
 *
 * The head is a real turning circle rooted at the live position and heading,
 * so leaving the card mid-flight peels the plane off onto a shortened version
 * of the same circuit rather than teleporting it to the Engineer end first.
 */
export function homeWaypoints(from: Pt, heading: number, home: Pt): Pt[] {
  // A turning circle abeam the right wing, flown until the plane is heading
  // west — *not* through a fixed 180deg. Leaving mid-hairpin can catch the
  // plane pointing anywhere from north-east to due south, and a fixed sweep
  // would roll it out on a heading the circuit then has to undo, putting a
  // kink where the two meet. Rolling out on the cruise's own heading means
  // there is nothing to undo.
  const sweep = (((180 - heading) % 360) + 360) % 360;
  const c = dir(heading + 90);
  const cx = from.x + PEEL_R * c.x;
  const cy = from.y + PEEL_R * c.y;
  const steps = Math.max(2, Math.round(sweep / 45));
  const peel: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const p = dir(heading + (sweep * i) / steps + 90);
    peel.push({ x: cx - PEEL_R * p.x, y: cy - PEEL_R * p.y });
  }

  // Join the circuit at the first waypoint that is genuinely ahead — west of
  // where the turn rolled out, and not below it. Without the second test an
  // early departure, which rolls out already low, would dive back down to the
  // cruise it has no reason to fly and climb out of it again.
  const tip = peel[peel.length - 1];
  let start = HOME_TAIL.findIndex((p) => p.x < tip.x - 8 && p.y < tip.y + 6);
  if (start < 0) start = HOME_CLIMB;
  start = Math.min(start, HOME_TAIL.length - 3);

  // Phantoms first and last: they set the departure tangent to the plane's
  // current heading and the arrival tangent to the resting one, and are not
  // themselves visited.
  const lead = dir(heading);
  return [
    { x: from.x - lead.x * 10, y: from.y - lead.y * 10 },
    from,
    ...peel,
    ...HOME_TAIL.slice(start),
    home,
    { x: home.x + 18, y: home.y - 4 },
  ];
}

/* --- Speed ---------------------------------------------------------------- */

/* Turns are rate-limited, not merely damped.
 *
 * Angular rate is speed times curvature, so holding `v · κ` at a ceiling means
 * capping speed at `KNEE / κ` — below the knee (bends gentler than ~28px
 * radius) nothing is taken away, above it the plane gives up exactly as much
 * speed as the turn demands and banks at one steady rate however tight the
 * corner gets. That is what stops the route's ~7px hairpin from whipping the
 * plane round, and it is also what makes the whole thing read as flying: the
 * timing falls out of the geometry instead of being drawn on top of it.
 *
 * The floor keeps the very tightest curvature from stalling altogether — and
 * it is deliberately low. The hairpin is the one place on the route where the
 * plane should visibly have to work, and letting it come almost to walking
 * pace through the turn is what buys the straight before it its speed. */
const CURVE_KNEE = 0.04;
const CURVE_FLOOR = 0.2;

/** Softening on the law above the knee. A true 1/κ holds the bank rate exactly
 *  constant but punishes the hairpin so hard the plane looks parked in it;
 *  0.82 keeps most of the discipline and gives the tightest corner its pace
 *  back. */
const CURVE_TAPER = 0.82;

const curveFactor = (k: number) =>
  k <= CURVE_KNEE
    ? 1
    : Math.max(CURVE_FLOOR, (CURVE_KNEE / k) ** CURVE_TAPER);

/* --- The profile -----------------------------------------------------------
   One shape for both legs, because both legs are the same event: a takeoff, a
   cruise, and a landing. The outbound flies the dotted route and the return
   flies the circuit below it, but neither is a different kind of journey and
   giving them different temperaments — which is what an earlier version did —
   made the return read as the plane being put away rather than as it flying
   home.

   `warm` is the exception, and it is about where the leg *starts* rather than
   what kind of leg it is. A plane leaving a slot begins at a standstill and has
   a takeoff to fly; a plane peeled off mid-route is already at speed and in the
   air, and making it perform a second takeoff from cruise is a lurch. At warm=1
   the whole climb-out is replaced by cruise and only the landing is left.
   -------------------------------------------------------------------------- */

/** Speed at the very start of the roll, as a fraction of cruise. */
const ROLL = 0.22;
/** Peak of the climb-out. The plane spends this on the first straight, which is
 *  the stretch the design gives it before the hairpin. */
const BOOST = 1.68;
/** Where the roll ends, and where the overspeed has bled back to cruise. */
const BOOST_IN = 0.11;
const BOOST_OUT = 0.42;

/** Where the approach begins, and how much of cruise the flare takes off. */
const FLARE_AT = 0.74;
const FLARE = 0.84;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Speed along the leg, before curvature has its say. */
export function envelope(u: number, warm: number) {
  const climb =
    u < BOOST_IN
      ? ROLL + (BOOST - ROLL) * easeOut(u / BOOST_IN)
      : u < BOOST_OUT
        ? BOOST - (BOOST - 1) * smooth((u - BOOST_IN) / (BOOST_OUT - BOOST_IN))
        : 1;
  const flare =
    u > FLARE_AT ? 1 - FLARE * smooth((u - FLARE_AT) / (1 - FLARE_AT)) : 1;
  return mix(climb, 1, warm) * flare;
}

/* --- Altitude --------------------------------------------------------------
   Not a real coordinate — there is no third axis on a 260x116 card — but the
   one number that lets the rest of the card behave as though there were. The
   badge grows a little and casts a longer shadow as it climbs, and both go
   away as it comes down, so a takeoff and a landing are legible as such from a
   plan view where pitch is invisible.

   It reaches zero slightly *before* the end of the leg: the last stretch is a
   rollout, with the plane on the ground and still slowing. That gap is where
   the dust lives. */

const CLIMB_TO = 0.26;
const DESCEND_FROM = 0.72;
const TOUCHDOWN = 0.96;

export function altitude(u: number, warm: number) {
  const up = u < CLIMB_TO ? smooth(u / CLIMB_TO) : 1;
  const down =
    u > DESCEND_FROM
      ? 1 - smooth(clamp((u - DESCEND_FROM) / (TOUCHDOWN - DESCEND_FROM), 0, 1))
      : 1;
  return mix(up, 1, warm) * down;
}

/* --- Turbulence ------------------------------------------------------------
   The hairpin is where the route asks the most of the plane, and until now the
   only sign of that was the plane going slower. Curvature drives a small
   lateral shove and a matching roll, so the tightest part of the turn is also
   the part where the aircraft is visibly being pushed around — and the
   straights, having no curvature, are glass smooth.

   Gated by altitude as well, so nothing shakes while it is on the ground. */

/** Curvature at which the buffeting is at full strength. */
const TURB_KNEE = 0.055;
/** How far it is pushed off its track, px, and how far it rolls, degrees. */
const TURB_PX = 1.7;
const TURB_DEG = 5;

/** Two incommensurate sines: continuous, cheap, and it does not visibly loop. */
const buffet = (t: number, phase: number) =>
  Math.sin(t * 11.3 + phase) * 0.62 + Math.sin(t * 6.7 + phase * 1.7 + 1.9) * 0.38;

/* --- Attitude -------------------------------------------------------------
   The nose chases the tangent rather than being welded to it.

   Welding it is what the design implies — Figma's 77.39deg is the route's own
   tangent plus 90 — and it is right everywhere except the hairpin the route
   makes at its midpoint, where 130deg of turn is packed into 27px and a rigid
   tangent whips the plane round. A critically damped follower under a rate cap
   banks through that turn instead: the nose leans into it, lags a little at
   the apex and catches up on the way out, which is what an aircraft does and
   is what the eye expects. Everywhere else the lag is a fraction of a degree
   and the plane is on the tangent exactly.
   -------------------------------------------------------------------------- */

/** Settling time (ms) of the nose onto the tangent. */
const NOSE_SETTLE = 150;
/** Ceiling on how fast the plane may rotate, deg/s. */
const NOSE_RATE = 400;

const NOSE_OMEGA = 5.83 / (NOSE_SETTLE / 1000);

export type Flight = {
  track: Track;
  /** Progress along the track, 0..1. */
  u: number;
  /** Seconds the whole leg should take. */
  dur: number;
  /** ∫ du / speed(u) — the constant that makes `dur` come out right. */
  norm: number;
  /** Constant added to the tangent so the leg finishes on exactly the angle
   *  its resting state uses. */
  trim: number;
  /** How much of the takeoff to skip — see the profile block above. */
  warm: number;
  /** Live nose angle and its rate, in degrees. */
  rot: number;
  rotVel: number;
  /** Seconds since the leg began, for the buffeting. */
  clock: number;
  /** Route arc length under u=0, or -1 when this leg is off the route. */
  routeBase: number;
};

const speed = (u: number, k: number, warm: number) =>
  envelope(u, warm) * curveFactor(k);

export function makeFlight(
  t: Track,
  dur: number,
  trim: number,
  rot: number,
  routeBase: number,
  warm = 0,
): Flight {
  const N = 192;
  let norm = 0;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    norm += 1 / speed(u, at(t, u * t.len).k, warm);
  }
  norm /= N;
  return {
    track: t,
    u: 0,
    dur,
    norm,
    trim,
    warm,
    rot,
    rotVel: 0,
    clock: 0,
    routeBase,
  };
}

export type Frame = {
  x: number;
  y: number;
  /** Where the nose points, degrees. */
  rot: number;
  /** Where the plane is actually going, degrees. Continuing a peel-off from
   *  this rather than from the nose is what keeps the join smooth. */
  heading: number;
  /** 0 on the ground, 1 at cruise. Drives the shadow, the badge's size, and
   *  when the wheels are considered to have touched. */
  alt: number;
  /** Demanded speed, cruise = 1. The exhaust and the engine note read this. */
  throttle: number;
  routeS: number;
  /** The leg has been flown to its end. */
  done: boolean;
  /** …and the nose has caught up with it. */
  settled: boolean;
};

/** Exact discrete step of a critically damped system — stable at any dt, and
 *  incapable of overshoot, so the nose never wobbles into place. */
function chase(f: Flight, target: number, dt: number) {
  const exp = Math.exp(-NOSE_OMEGA * dt);
  const delta = f.rot - target;
  const tmp = (f.rotVel + NOSE_OMEGA * delta) * dt;
  const next = target + (delta + tmp) * exp;
  const cap = NOSE_RATE * dt;
  const move = clamp(next - f.rot, -cap, cap);
  f.rot += move;
  f.rotVel = (f.rotVel - tmp * NOSE_OMEGA) * exp;
}

function report(f: Flight, q: Sample): Frame {
  const alt = altitude(f.u, f.warm);

  // The buffeting: perpendicular to the track, so it reads as the aircraft
  // being pushed off its line rather than as it speeding up and slowing down.
  const gust = clamp(q.k / TURB_KNEE, 0, 1) * alt;
  const push = gust * buffet(f.clock, 0);
  const n = dir(q.h + 90);

  const err = Math.abs(q.h + 90 + f.trim - f.rot);
  return {
    x: q.x + n.x * TURB_PX * push,
    y: q.y + n.y * TURB_PX * push,
    rot: f.rot + TURB_DEG * gust * buffet(f.clock, 2.4),
    heading: q.h,
    alt,
    throttle: envelope(f.u, f.warm),
    routeS: f.routeBase < 0 ? -1 : f.routeBase + q.s,
    done: f.u >= 1,
    settled: f.u >= 1 && err < 0.12,
  };
}

/** Advance a flight by `dt` seconds and report where the plane now is. */
export function advance(f: Flight, dt: number): Frame {
  f.clock += dt;
  const p = at(f.track, f.u * f.track.len);
  f.u = Math.min(1, f.u + (speed(f.u, p.k, f.warm) * f.norm * dt) / f.dur);

  const q = at(f.track, f.u * f.track.len);
  chase(f, q.h + 90 + f.trim, dt);
  return report(f, q);
}

/** Where a flight currently sits, without advancing it. */
export function frameOf(f: Flight): Frame {
  return report(f, at(f.track, f.u * f.track.len));
}

/** Pick the 360°-branch of `target` nearest to `ref`, so a corrective
 *  rotation is never taken the long way round. */
export function nearestAngle(target: number, ref: number) {
  return target + Math.round((ref - target) / 360) * 360;
}

export { clamp, smooth };
