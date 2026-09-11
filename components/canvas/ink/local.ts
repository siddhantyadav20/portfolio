/* ===========================================================================
   Where the pointer is, in an element's own coordinates.

   `clientX - rect.left` is only right for an element nobody has rotated. On
   the board every card sits in a slot tilted 1–3°, inside a world that pans
   and zooms, and `getBoundingClientRect()` of a rotated square is a bigger,
   axis-aligned box around it — 331 wide for the 320 drawing canvas at 2°.
   Mapping through that box put the ink well away from the pen towards the
   corners, and further when zoomed in: the "drawing starts 20–30px from the
   pointer" bug.

   So this undoes the real thing: the element's rotation and scale — its own
   and every ancestor's `transform`, `rotate` and `scale` — as one 2×2 matrix,
   inverted about the element's centre. The centre is the one point the
   bounding box does get right: an affine map sends a rectangle's centre to
   the centre of its image, and the image is symmetric about it, so the box
   around it is centred there too. Translations never need reading at all.
   =========================================================================== */

export type Pt = { x: number; y: number };

/** x' = a·x + c·y, y' = b·x + d·y — DOMMatrix's a to d. */
export type Linear = readonly [a: number, b: number, c: number, d: number];

/** Everything needed to map a client point into an element's own box. */
export type Frame = { m: Linear; centre: Pt; w: number; h: number };

const IDENTITY: Linear = [1, 0, 0, 1];

/** m · n — n applied first. */
export function multiply(m: Linear, n: Linear): Linear {
  const [a1, b1, c1, d1] = m;
  const [a2, b2, c2, d2] = n;
  return [a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2];
}

const UNIT: Record<string, number> = {
  deg: Math.PI / 180,
  rad: 1,
  grad: Math.PI / 200,
  turn: Math.PI * 2,
};

/**
 * A computed `rotate`, in radians, about the screen's axis — "2deg",
 * "-0.5turn", or "0 0 1 2deg". A rotation about x or y is a 3D tilt this
 * site never uses; it reads as none rather than as a wrong angle.
 */
export function angleOf(rotate: string | undefined): number {
  if (!rotate || rotate === "none") return 0;
  const parts = rotate.trim().split(/\s+/);
  const angle = /^(-?[\d.]+(?:e-?\d+)?)(deg|rad|grad|turn)$/.exec(parts[parts.length - 1]);
  if (!angle) return 0;
  if (parts.length === 2 && parts[0] !== "z") return 0;
  if (parts.length === 4 && (Number(parts[0]) !== 0 || Number(parts[1]) !== 0)) return 0;
  return Number(angle[1]) * UNIT[angle[2]];
}

/**
 * One element's own rotation and scale. CSS applies the individual
 * properties before `transform` — translate, rotate, scale, then transform —
 * so the linear part is R · S · T.
 */
export function linearOf(style: { transform?: string; rotate?: string; scale?: string }): Linear {
  let m = IDENTITY;

  const r = angleOf(style.rotate);
  if (r) m = multiply(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r)]);

  if (style.scale && style.scale !== "none") {
    const [sx, sy = sx] = style.scale.trim().split(/\s+/).map(Number);
    if (Number.isFinite(sx) && Number.isFinite(sy)) m = multiply(m, [sx, 0, 0, sy]);
  }

  if (style.transform && style.transform !== "none" && typeof DOMMatrixReadOnly !== "undefined") {
    const t = new DOMMatrixReadOnly(style.transform);
    m = multiply(m, [t.a, t.b, t.c, t.d]);
  }

  return m;
}

/** Read once per pointer event, not per coalesced point — the chain is the
 *  same for every point in the batch. */
export function frameOf(el: HTMLElement): Frame {
  let m = IDENTITY;
  for (let n: Element | null = el; n; n = n.parentElement) {
    m = multiply(linearOf(getComputedStyle(n)), m);
  }
  const r = el.getBoundingClientRect();
  return {
    m,
    centre: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    /* The layout box, not the bounding box — the untransformed size is the
       space the drawing lives in. */
    w: el.offsetWidth || r.width,
    h: el.offsetHeight || r.height,
  };
}

/** A client point, in the element's own untransformed CSS pixels. */
export function toLocal(f: Frame, x: number, y: number): Pt {
  const [a, b, c, d] = f.m;
  const det = a * d - b * c || 1;
  const dx = x - f.centre.x;
  const dy = y - f.centre.y;
  return {
    x: (d * dx - c * dy) / det + f.w / 2,
    y: (a * dy - b * dx) / det + f.h / 2,
  };
}
