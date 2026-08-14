import { widgets, WORLD_H, WORLD_W, type Widget } from "@/content/workspace";
import BookCover from "../widgets/BookCover";
import CaseStudyCard from "../widgets/CaseStudyCard";
import Disc from "../widgets/Disc";
import Frame from "../widgets/Frame";
import LinkedInCard from "../widgets/LinkedInCard";
import ProfileCard from "../widgets/ProfileCard";
import Sticker from "../widgets/Sticker";
import styles from "./CanvasWorld.module.css";

/**
 * The board's contents, at world coordinates.
 *
 * This component is the reason the card can morph into the canvas
 * convincingly: it is rendered in *both* places — inside the Workspace card at
 * a small scale, and inside WorkspaceCanvas at the camera's scale — so
 * clicking the card doesn't crossfade one picture into another, it
 * interpolates the same world from card-rect to viewport-rect.
 *
 * Two constraints hold for everything below:
 *
 *   1. It is a server component and stays one. No hooks, no state — the
 *      Workspace card is server-rendered and must not drag a client bundle
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
  ref,
}: {
  className?: string;
  /** The canvas writes the camera transform straight onto this element, once
   *  per frame, outside React. A normal prop in React 19 — no forwardRef. */
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      className={[styles.world, className].filter(Boolean).join(" ")}
      style={{ width: WORLD_W, height: WORLD_H }}
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
          <Render widget={w} />
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
          title={widget.title}
          artist={widget.artist}
          cover={widget.cover}
        />
      );
    case "book":
      return (
        <BookCover
          title={widget.title}
          author={widget.author}
          cover={widget.cover}
        />
      );
    case "sticker":
      return <Sticker label={widget.label} art={widget.art} />;
    case "profile":
      return <ProfileCard />;
    case "linkedin":
      return <LinkedInCard />;
    case "caseStudy":
      return <CaseStudyCard />;

    /* Still being ported from references/canvas — see Frame. */
    case "terminal":
      return <Frame label="Terminal" tone="dark" />;
    case "receipt":
      return <Frame label="Design receipt" tone="paper" />;
    case "scratch":
      return <Frame label="Scratch to play" tone="dark" />;
    case "draw":
      return <Frame label="Drawing canvas" tone="dark" />;
    case "photos":
      return <Frame label="Photos" />;
  }
}
