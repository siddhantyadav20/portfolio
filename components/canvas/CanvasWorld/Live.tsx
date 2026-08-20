import LinkedInCard from "@/components/home/LinkedInCard";
import { Board, Slot, widgets, type Widget } from "./Board";
import Book from "../widgets/Book";
import Disc from "../widgets/Disc";
import DrawingCanvas from "../widgets/DrawingCanvas";
import PhotoStack from "../widgets/PhotoStack";
import ProfileCard from "../widgets/ProfileCard";
import Receipt from "../widgets/Receipt";
import ScratchCard from "../widgets/ScratchCard";
import Sticker from "../widgets/Sticker";
import Terminal from "../widgets/Terminal";

/**
 * The board, live.
 *
 * Only the canvas imports this. Everything expensive on the board — the
 * terminal, the drawing canvas, the scratch card, six records subscribed to
 * the audio store — arrives with this module and nothing else, so the
 * homepage never pays for it. The card renders `CanvasWorld` instead, which
 * is the same geometry filled with stills.
 *
 * Two constraints hold for everything below:
 *
 *   1. It is a server component and stays one. Widget behaviour lands as
 *      client islands *inside* these frames.
 *
 *   2. No `backdrop-filter`, ever. `.liquid` is the house reflex and it must
 *      not come near a widget: twenty-five backdrop-filtered nodes inside a
 *      transformed layer take a pan from 120fps to single digits. Glass belongs
 *      on the fixed chrome, which is never transformed.
 */
export default function CanvasWorldLive({
  className,
  style,
  ref,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** The canvas writes the camera transform straight onto this element, once
   *  per frame, outside React. A normal prop in React 19 — no forwardRef. */
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <Board className={className} style={style} ref={ref}>
      {widgets.map((w, i) => (
        <Slot key={w.id} widget={w} index={i} preview={false}>
          <Render widget={w} />
        </Slot>
      ))}
    </Board>
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
