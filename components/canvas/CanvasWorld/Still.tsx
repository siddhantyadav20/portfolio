import { type Widget } from "@/content/canvas";
import styles from "./Still.module.css";

/* ===========================================================================
   A widget, as a picture of itself.

   The Canvas card on the homepage renders the whole board at about a sixth
   scale. Mounting the real widgets to do it would boot a terminal, start a cat
   drawing itself, subscribe six records to an audio store and run three canvas
   contexts — inside a 322px card, for a picture. So the card renders these
   instead: no state, no client bundle, no hooks.

   They are deliberately the same *composition* as the live board — same box,
   same artwork, same angle. That is what makes the morph work: the card and
   the canvas show the same arrangement, so the crossfade between them has
   almost nothing to reveal and what you notice is the camera pulling back.
   =========================================================================== */

export default function Still({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case "disc":
      return <Art src={widget.cover} radius={48} />;
    case "book":
      return <Art src={widget.cover} radius={4} />;
    case "sticker":
      return <Art src={widget.art} contain />;
    case "photos":
      return <Plate radius={48} tone="paper" />;
    case "profile":
      return <Plate radius={48} tone="paper" lines={5} />;
    case "linkedin":
      return <Plate radius={32} tone="paper" lines={3} />;
    case "receipt":
      return <Plate radius={0} tone="receipt" />;
    case "terminal":
      return <Plate radius={14} tone="ink" />;
    case "scratch":
      return <Plate radius={48} tone="foil" />;
    case "draw":
      return <Plate radius={48} tone="paper" lines={2} />;
  }
}

function Art({
  src,
  radius = 0,
  contain,
}: {
  src: string;
  radius?: number;
  contain?: boolean;
}) {
  return (
    // Plain <img>: these are decorative, already sized by their slot, and
    // next/image's wrapper would fight the contain/cover switch.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      /* Eager, deliberately. These sit inside a 0.13-scale transform, and the
         browser's lazy heuristic measures the *rendered* box — at that scale
         it defers them more or less forever, so the card painted as a set of
         empty plates. They are fifteen small files, the card is the first
         thing this page has to say about the canvas, and the canvas gets
         them from cache afterwards. */
      className={`${styles.art} ${contain ? styles.contain : ""}`}
      style={{ borderRadius: radius }}
    />
  );
}

/**
 * A card with no artwork of its own.
 *
 * `lines` matters more than it looks: a white plate on a white desk is a hole,
 * and the preview's centre is the profile card. A few ruled lines are enough
 * for it to read as a card with writing on it at a sixth scale, which is all
 * the preview has to say.
 */
function Plate({
  radius,
  tone,
  lines = 0,
}: {
  radius: number;
  tone: "paper" | "ink" | "receipt" | "foil";
  lines?: number;
}) {
  return (
    <span
      className={`${styles.plate} ${styles[tone]} ${radius >= 32 ? "squircle" : ""}`}
      style={{ borderRadius: radius }}
      aria-hidden="true"
    >
      {lines > 0 && (
        <span className={styles.rules}>
          {Array.from({ length: lines }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      )}
    </span>
  );
}
