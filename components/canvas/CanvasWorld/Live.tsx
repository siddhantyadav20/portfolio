import LinkedInCard from "@/components/home/LinkedInCard";
import { Board, DistrictLabels, Slot, widgets, type Widget } from "./Board";
import Book from "../widgets/Book";
import Disc from "../widgets/Disc";
import DrawingCanvas from "../widgets/DrawingCanvas";
import FoundCard from "../widgets/FoundCard";
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
 *   1. No hooks and no state in this file. Widget behaviour lands as client
 *      islands *inside* these frames.
 *
 *      This used to read "it is a server component and stays one", which was
 *      not true and had not been for a while: `CanvasSurface` is "use client"
 *      and imports this module directly, so the whole board is already in the
 *      client graph. The rule is still worth keeping — it is what stops the
 *      board itself re-rendering when one record starts playing — but it is a
 *      rule about hooks, not about where the module runs. Anything here that
 *      needs to fetch has to do it the way `lib/discArt.ts` does.
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
      <DistrictLabels />
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
        <Disc id={widget.id} title={widget.title} artist={widget.artist} />
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
    case "found":
      return <FoundCard />;
  }
}
