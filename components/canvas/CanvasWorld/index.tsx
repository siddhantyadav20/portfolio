import { Board, Slot, widgets } from "./Board";
import Still from "./Still";

/**
 * The board, as a picture of itself.
 *
 * This is what the Canvas card renders, and it is the reason the card can
 * morph into the canvas convincingly: it is the *same geometry* the canvas
 * lays out — same world box, same slots, same coordinates, same angles — so
 * clicking the card doesn't crossfade one picture into another, it
 * interpolates the same arrangement from card-rect to viewport-rect.
 *
 * What it is not is the same *components*. Mounting the real widgets to paint
 * a 322px card would boot a terminal, start a cat drawing itself, subscribe
 * six records to an audio store and run three canvas contexts — and, because
 * imports are not lazy, would put all of that in the homepage's first load
 * whether or not anyone ever opened the canvas. The live board lives in
 * `Live.tsx`, and only the canvas imports it.
 *
 * Server component, and stays one: the card is server-rendered and must not
 * drag a client bundle along for a picture.
 */
export default function CanvasWorld({
  className,
  style,
  ref,
}: {
  className?: string;
  /** Merged over the world's own box. The Canvas card uses it to set the
   *  resting transform declaratively, so the preview is positioned in the
   *  server's HTML rather than only once a rAF loop has run. */
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <Board className={className} style={style} ref={ref} preview>
      {widgets.map((w, i) => (
        <Slot key={w.id} widget={w} index={i} preview>
          <Still widget={w} />
        </Slot>
      ))}
    </Board>
  );
}
