import Image from "next/image";
import ProfileCard from "@/components/canvas/widgets/ProfileCard";
import {
  linkedInCard,
  photoCategories,
  PREVIEW_SCALE,
  receipt,
  scratch,
  terminal,
  type Widget,
} from "@/content/canvas";
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

   ---------------------------------------------------------------------------
   What these used to be, and why they are not that any more.

   Seven of the ten kinds had no artwork file to point at — the profile, the
   photos, the receipt, the terminal — so they were drawn as blank plates with
   two or three grey rounded bars on them. That is precisely the visual
   vocabulary of a loading skeleton, and at a sixth scale, on a card that
   otherwise shows real records and real book covers, it read as one: the
   preview looked like a board that had not finished loading.

   So every one of them now paints its widget's actual content. The profile
   renders the real `ProfileCard`, which costs nothing here because it is a
   server component; the rest are static stills built from the same copy in
   `content/canvas.ts` that the live widgets read, in the same materials. None
   of it is legible at 0.13 — that is not the point. Real text greys out like
   text, and a receipt with prices down its right edge reads as a receipt.
   =========================================================================== */

export default function Still({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case "disc":
      return <Art src={widget.cover} radius={48} box={widget.w} />;
    case "book":
      return <Art src={widget.cover} radius={4} box={widget.w} />;
    case "sticker":
      return <Art src={widget.art} contain box={widget.w} />;
    case "photos":
      return <PhotosStill />;
    case "profile":
      /* The real thing. It has no hooks and no client directive, so the card
         gets the actual card rather than an impression of it. */
      return <ProfileCard />;
    case "linkedin":
      return <LinkedInStill />;
    case "receipt":
      return <ReceiptStill />;
    case "terminal":
      return <TerminalStill />;
    case "scratch":
      return <ScratchStill />;
    case "draw":
      return <DrawStill />;
  }
}

function Art({
  src,
  radius = 0,
  contain,
  box,
}: {
  src: string;
  radius?: number;
  contain?: boolean;
  /** The widget's width in *world* px. See `sizes` below. */
  box: number;
}) {
  /* What the browser is actually asked to paint.
     ---------------------------------------------------------------------
     The slot is laid out at world size — a record is a 320px box — and the
     whole board is then scaled to 0.13 by a transform on an ancestor. A
     transform does not change layout, so left to itself the browser sizes
     these images for a 320px box and, at 2x, fetches something 640px wide.
     That is how a 611KB book cover ended up on the homepage to fill roughly
     forty pixels.

     `sizes` is the only way to tell it otherwise, and it is exact rather
     than a guess: the same constant that drives the transform. */
  const painted = Math.max(1, Math.round(box * PREVIEW_SCALE));

  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      fill
      sizes={`${painted}px`}
      /* Eager, deliberately. These sit inside a 0.13-scale transform, and the
         browser's lazy heuristic measures the *rendered* box — at that scale
         it defers them more or less forever, so the card painted as a set of
         empty plates. They are fifteen small files, the card is the first
         thing this page has to say about the canvas, and the canvas gets
         them from cache afterwards.

         Low priority alongside it, which is not a contradiction: `eager` says
         fetch this now, `fetchPriority` says what to fetch it *instead of*.
         Without the second half these sixteen went into the document head as
         preloads at default priority — sixteen forty-pixel decorations
         competing with the hero for the same connections, on a page whose LCP
         is one of the things they were competing with. */
      loading="eager"
      fetchPriority="low"
      className={`${styles.art} ${contain ? styles.contain : ""}`}
      style={{ borderRadius: radius }}
    />
  );
}

/**
 * The photo carousel, showing the photograph it opens on.
 *
 * The live widget's chevrons and category bar only appear on hover, so the
 * resting state is exactly this: one photo, the scrim, and the label.
 */
function PhotosStill() {
  const category = photoCategories[0];
  const photo = category?.photos[0];

  return (
    <span className={`${styles.photos} squircle`} aria-hidden="true">
      {photo && (
        <Image
          src={photo.src}
          alt=""
          fill
          sizes={`${Math.round(320 * PREVIEW_SCALE)}px`}
          loading="eager"
          fetchPriority="low"
          className={styles.art}
        />
      )}
      <span className={styles.photoScrim} />
      <span className={styles.photoLabel}>
        {category?.name} 1/{category?.photos.length}
      </span>
    </span>
  );
}

/** The LinkedIn card at rest: the blue tile is the only colour on it. */
function LinkedInStill() {
  return (
    <span className={`${styles.linkedin} squircle`} aria-hidden="true">
      <span className={styles.liHead}>
        <span className={styles.liWho}>
          <span className={styles.liName}>{linkedInCard.name}</span>
          <span className={styles.liRole}>{linkedInCard.role}</span>
        </span>
        <span className={styles.liTile} />
      </span>
      <span className={styles.liBlurb}>{linkedInCard.blurb}</span>
      <span className={styles.liCta}>{linkedInCard.cta}</span>
    </span>
  );
}

/** The receipt: a title, the priced lines, and a total. */
function ReceiptStill() {
  return (
    <span className={styles.receipt} aria-hidden="true">
      <span className={styles.rcTitle}>{receipt.title}</span>
      <span className={styles.rcSub}>{receipt.subtitle}</span>
      <span className={styles.rcRule} />
      <span className={styles.rcRows}>
        {receipt.items.map((item) => (
          <span key={item.label} className={styles.rcRow}>
            <span>{item.label}</span>
            <span>{item.price.toFixed(2)}</span>
          </span>
        ))}
      </span>
      <span className={styles.rcRule} />
      <span className={styles.rcRows}>
        {receipt.stats.map((s) => (
          <span key={s.label} className={styles.rcRow}>
            <span>{s.label}</span>
            <span>{s.value}</span>
          </span>
        ))}
      </span>
      <span className={styles.rcRule} />
      <span className={`${styles.rcRow} ${styles.rcTotal}`}>
        <span>Total</span>
        <span>{receipt.total}</span>
      </span>
      <span className={styles.rcStamp}>{receipt.stamp.join(" ")}</span>
    </span>
  );
}

/** The terminal, mid-boot — the banner and the lines under it. */
function TerminalStill() {
  return (
    <span className={styles.terminal} aria-hidden="true">
      <span className={styles.tmBar}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.tmBody}>
        {terminal.banner.map((line, i) => (
          <span key={i} className={styles.tmBanner}>
            {line}
          </span>
        ))}
        {terminal.boot.map((line) => (
          <span key={line} className={styles.tmDim}>
            {line}
          </span>
        ))}
        <span className={styles.tmOk}>{terminal.bootOk}</span>
        <span className={styles.tmDim}>{terminal.tagline}</span>
        <span className={styles.tmPrompt}>
          {terminal.user}@{terminal.host} ~ %<i />
        </span>
      </span>
    </span>
  );
}

/** The scratch card, unscratched: brushed foil and its prompt. */
function ScratchStill() {
  return (
    <span className={`${styles.scratch} squircle`} aria-hidden="true">
      <span className={styles.scFoil} />
      <span className={styles.scPrompt}>{scratch.prompt}</span>
    </span>
  );
}

/**
 * The drawing surface, exactly as the live one rests: dotted stock with
 * nothing on it and the copy button in the corner. The toolbar and the "drag
 * to draw" hint are hover states there, so they are not here.
 *
 * This is the one still with nothing to say, and that is the honest answer —
 * an empty sheet is what the widget is until someone draws on it. What it must
 * not be is the two grey bars it used to carry, which is a loading skeleton
 * rather than a blank page.
 */
function DrawStill() {
  return (
    <span className={`${styles.draw} squircle`} aria-hidden="true">
      <span className={styles.drawCopy} />
    </span>
  );
}
