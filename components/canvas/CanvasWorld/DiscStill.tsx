"use client";

import { useSyncExternalStore } from "react";
import { discArt, noDiscArtServerSide, subscribeDiscArt } from "@/lib/discArt";
import styles from "./Still.module.css";

/**
 * A record at homepage scale: the printed plate, and the sleeve over it once
 * the sleeves have arrived.
 *
 * It used to be the plate alone, on the grounds that a sleeve would mean a
 * network call for a 42px square nobody can read. But at 0.13 the plate is a
 * blank grey tile, six of them in a row is exactly the loading skeleton the
 * rest of Still.tsx was written to get rid of, and the orbit layout put that
 * row along the top edge of the card — the first thing the preview says.
 *
 * So the card fetches the sleeves when it scrolls near the viewport (see
 * CanvasCard) through the same store the live board reads, and this paints
 * them over the plate. Nothing waits on it: the server HTML is the plate, as
 * before, and the sleeve fades in when it lands. The fetch is the one the
 * canvas would make on open anyway, so opening it afterwards finds them warm.
 */

/** 42px painted, at 2x — mzstatic serves any size off the same path by the
 *  last segment (lib/itunes.ts, `upgradeArt`). 100px is about 5KB. */
const PREVIEW_PX = 100;

const small = (cover: string) =>
  cover.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${PREVIEW_PX}x${PREVIEW_PX}bb.jpg`);

export default function DiscStill({ id }: { id: string }) {
  const art = useSyncExternalStore(subscribeDiscArt, discArt, noDiscArtServerSide)[id];

  return (
    <span className={`${styles.disc} squircle`} aria-hidden="true">
      {art && (
        // Straight off Apple's CDN at the size it is painted: a 100px JPEG has
        // nothing left for the image optimiser to do.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.discArt}
          src={small(art.cover)}
          alt=""
          width={PREVIEW_PX}
          height={PREVIEW_PX}
          decoding="async"
          fetchPriority="low"
        />
      )}
    </span>
  );
}
