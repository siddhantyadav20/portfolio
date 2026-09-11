/* ===========================================================================
   The brief's flight, from the scratch card to the paper.

   "Sketch it" tears the ticket along its perforation and the top half flies
   to the drawing canvas, landing as the tape. One object making the trip,
   rather than a string handed between two widgets — which is what the first
   version was: the ticket stayed put and a separate strip of tape appeared
   with the same words on it.

   It flies in screen space now, from the ticket on the board up to the
   Studio's tape over it: `worldPose` finds the ticket in board pixels, the
   camera's transform maps that to the screen, and the flight starts at the
   camera's zoom (`s0`) and lands at 1:1.

   Pure, so tests/briefFlight.test.ts can hold the geometry to account without
   a browser.
   =========================================================================== */

/** The tape's own tilt on the paper, degrees. Applied inline by the drawing
 *  canvas and aimed at by the leaf, so there is one number, not two that
 *  have to agree. */
export const TAPE_TILT = -1.2;

/** The whole flight, ms. Just over the camera's 700ms settle, so the leaf
 *  lands on a board that has stopped moving rather than one still arriving. */
export const LEAF_MS = 860;

/** The peel: the leaf lifts off the stub before it starts to travel. */
export const PEEL = 0.16;

/** Centre and rotation in board pixels. */
export type Pose = { readonly cx: number; readonly cy: number; readonly rot: number };

/** A slot on the board — `content/canvas.ts` widgets satisfy this. */
export type Box = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rotate?: number;
};

/** A rect in a slot's own, unrotated coordinates, with an optional tilt. */
export type Local = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rot?: number;
};

/**
 * Where a rect inside a slot actually is on the board.
 *
 * Slots turn with CSS `rotate` about their own centre, so the rect's centre
 * is rotated about the slot's centre by the slot's angle. Screen y runs down,
 * which is what makes a positive angle clockwise with this matrix.
 */
export function worldPose(slot: Box, r: Local): Pose {
  const deg = slot.rotate ?? 0;
  const a = (deg * Math.PI) / 180;
  const dx = r.x + r.w / 2 - slot.w / 2;
  const dy = r.y + r.h / 2 - slot.h / 2;
  return {
    cx: slot.x + slot.w / 2 + dx * Math.cos(a) - dy * Math.sin(a),
    cy: slot.y + slot.h / 2 + dx * Math.sin(a) + dy * Math.cos(a),
    rot: deg + (r.rot ?? 0),
  };
}

const at = (p: Pose, scale: number) =>
  `translate(${p.cx}px, ${p.cy}px) rotate(${p.rot}deg) scale(${scale})`;

/**
 * The leaf's path: peel, lift, travel, land.
 *
 * It rises off the stub and tips a few degrees — a thing being torn, not a
 * thing sliding — then travels on an arc rather than a straight line, which
 * is what reads as carried rather than dragged. The arc's height grows with
 * the distance and is capped, so a short hop stays a hop.
 */
export function leafKeyframes(from: Pose, to: Pose, s0 = 1, s1 = 1): Keyframe[] {
  const dist = Math.hypot(to.cx - from.cx, to.cy - from.cy);
  const arc = Math.min(90, dist * 0.2);
  const m = 0.55;
  const mid: Pose = {
    cx: from.cx + (to.cx - from.cx) * m,
    cy: from.cy + (to.cy - from.cy) * m - arc,
    rot: from.rot + (to.rot - from.rot) * m - 2,
  };
  const midScale = s0 + (s1 - s0) * m;
  return [
    { offset: 0, transform: at(from, s0), easing: "cubic-bezier(0.3, 0, 0.5, 1)" },
    {
      offset: PEEL,
      transform: at({ cx: from.cx, cy: from.cy - 10, rot: from.rot + 3 }, s0 * 1.04),
      easing: "cubic-bezier(0.45, 0, 0.55, 1)",
    },
    { offset: m, transform: at(mid, midScale * 1.05), easing: "cubic-bezier(0.2, 0, 0, 1)" },
    { offset: 1, transform: at(to, s1) },
  ];
}

/** When the two sheets swap material, as fractions of the flight. */
export const SHEET_SWAP = [0.45, 0.62] as const;

/** The ticket's words are gone by here; the tape's arrive after the swap. */
export const TICKET_TEXT_GONE = 0.4;
export const TAPE_TEXT_IN = 0.84;

/**
 * The two faces of the leaf, changing in the air.
 *
 * It leaves as the top of a ticket and arrives as tape: different width,
 * different type, different material. Both faces sit on the same centre and
 * scale together so their widths agree at every instant — the ticket face
 * shrinks by `k` (tape width / ticket width) while the tape face grows from
 * 1/k.
 *
 * THE WORDS GO BEFORE THE PAPER. The first version crossfaded each face
 * whole, and mid-flight both texts were on screen at once — a 27px serif and
 * a 15px one, out of register, which read as a double exposure rather than
 * as one thing changing. Now the ticket's words fade first, the two sheets
 * swap while the leaf is a blank piece of paper moving fast, and the tape's
 * words arrive only once the tape is there to carry them. The two texts are
 * never visible together; tests/briefFlight.test.ts holds that.
 */
export function faceKeyframes(k: number): {
  ticket: Keyframe[];
  tape: Keyframe[];
  ticketText: Keyframe[];
  tapeText: Keyframe[];
} {
  const [swapFrom, swapTo] = SHEET_SWAP;
  return {
    ticket: [
      { offset: 0, transform: "scale(1)", opacity: 1 },
      { offset: PEEL, transform: "scale(1)" },
      { offset: swapFrom, opacity: 1 },
      { offset: swapTo, opacity: 0 },
      { offset: 1, transform: `scale(${k})`, opacity: 0 },
    ],
    tape: [
      { offset: 0, transform: `scale(${1 / k})`, opacity: 0 },
      { offset: PEEL, transform: `scale(${1 / k})` },
      { offset: swapFrom, opacity: 0 },
      { offset: swapTo, opacity: 1 },
      { offset: 1, transform: "scale(1)", opacity: 1 },
    ],
    ticketText: [
      { offset: 0, opacity: 1 },
      { offset: PEEL + 0.04, opacity: 1 },
      { offset: TICKET_TEXT_GONE, opacity: 0 },
      { offset: 1, opacity: 0 },
    ],
    tapeText: [
      { offset: 0, opacity: 0 },
      { offset: swapTo, opacity: 0 },
      { offset: TAPE_TEXT_IN, opacity: 1 },
      { offset: 1, opacity: 1 },
    ],
  };
}
