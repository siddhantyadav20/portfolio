import { widgets, WORLD_H, WORLD_W, type Widget } from "@/content/canvas";
import Book from "../widgets/Book";
import Disc from "../widgets/Disc";
import DrawingCanvas from "../widgets/DrawingCanvas";
// The homepage's card, unchanged — same component, same flood, same chime.
import LinkedInCard from "@/components/home/LinkedInCard";
import PhotoStack from "../widgets/PhotoStack";
import ProfileCard from "../widgets/ProfileCard";
import Receipt from "../widgets/Receipt";
import ScratchCard from "../widgets/ScratchCard";
import Sticker from "../widgets/Sticker";
import Terminal from "../widgets/Terminal";
import Still from "./Still";
import styles from "./CanvasWorld.module.css";

/**
 * The board's contents, at world coordinates.
 *
 * This component is the reason the card can morph into the canvas
 * convincingly: it is rendered in *both* places — inside the Canvas card at
 * a small scale, and inside CanvasSurface at the camera's scale — so
 * clicking the card doesn't crossfade one picture into another, it
 * interpolates the same world from card-rect to viewport-rect.
 *
 * Two constraints hold for everything below:
 *
 *   1. It is a server component and stays one. No hooks, no state — the
 *      Canvas card is server-rendered and must not drag a client bundle
 *      along for a picture. Widget behaviour lands as client islands *inside*
 *      these frames.
 *
 *   2. No `backdrop-filter`, ever. `.liquid` is the house reflex and it must
 *      not come near a widget: twenty-five backdrop-filtered nodes inside a
 *      transformed layer take a pan from 120fps to single digits. Glass belongs
 *      on the fixed chrome, which is never transformed.
 */
export default function CanvasWorld({
  className,
  preview = false,
  style,
  ref,
}: {
  className?: string;
  /** Merged over the world's own box. The Canvas card uses it to set the
   *  resting transform declaratively, so the preview is positioned in the
   *  server's HTML rather than only once a rAF loop has run. */
  style?: React.CSSProperties;
  /** Render every widget as a still picture rather than a live component.
   *  The Canvas card uses this — see Still. */
  preview?: boolean;
  /** The canvas writes the camera transform straight onto this element, once
   *  per frame, outside React. A normal prop in React 19 — no forwardRef. */
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={[styles.world, className].filter(Boolean).join(" ")}
      style={{ width: WORLD_W, height: WORLD_H, ...style }}
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          className={styles.slot}
          style={{
            left: w.x,
            top: w.y,
            width: w.w,
            height: w.h,
            // `rotate` rather than a transform, so a widget's own transform —
            // a hover lift, a click spring — can't wipe out its resting angle.
            rotate: w.rotate ? `${w.rotate}deg` : undefined,
          }}
        >
          {preview ? <Still widget={w} /> : <Render widget={w} />}
        </div>
      ))}
    </div>
  );
}

function Render({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case "disc":
      return (
        <Disc
          id={widget.id}
          title={widget.title}
          artist={widget.artist}
          cover={widget.cover}
          src={widget.src}
        />
      );
    case "book":
      return <Book book={widget} />;
    case "sticker":
      return (
        <Sticker
          label={widget.label}
          art={widget.art}
          effect={widget.effect}
        />
      );
    case "profile":
      return <ProfileCard />;
    case "linkedin":
      return <LinkedInCard />;
    case "terminal":
      return <Terminal />;

    case "receipt":
      return <Receipt />;

    case "scratch":
      return <ScratchCard />;

    case "draw":
      return <DrawingCanvas />;
    case "photos":
      return <PhotoStack />;
  }
}
