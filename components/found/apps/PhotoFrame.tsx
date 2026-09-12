"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { story as ep } from "@/content/found/story";
import type { Cast } from "@/content/found/types";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import { drag } from "../FoundPhone/drag";
import styles from "./PhotoFrame.module.css";

/** A stable tone per photo, so placeholders are tellable apart in a grid. */
function hueOf(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * One of the phone's photographs. Until the real photograph exists (`src`),
 * the frame is a dark exposure with the description written on it — the plan
 * doesn't ship without the real ones.
 */
export default function PhotoFrame({ id, cast, size }: { id: string; cast: Cast; size: "thumb" | "bubble" | "full" }) {
  const photo = ep.photos.find((p) => p.id === id);
  if (!photo) return null;
  const alt = say(photo.alt, cast);
  return (
    <span className={styles.frame} data-size={size} style={{ "--hue": hueOf(id) } as CSSProperties}>
      {photo.src ? (
        <Image src={photo.src} alt={alt} fill sizes={size === "thumb" ? "140px" : "400px"} className={styles.image} />
      ) : (
        <span className={styles.pending}>{alt}</span>
      )}
      {photo.overlay && <span className={styles.overlay}>{photo.overlay}</span>}
    </span>
  );
}

/** Full screen, with the info sheet a real phone keeps behind ⓘ. Pull the photo down to put it away. */
export function PhotoViewer({
  id,
  cast,
  onClose,
  onRecover,
}: {
  id: string;
  cast: Cast;
  onClose: () => void;
  /** Offered in Recently Deleted. Putting a photo back is something the phone remembers doing. */
  onRecover?: () => void;
}) {
  const photo = ep.photos.find((p) => p.id === id);
  const [info, setInfo] = useState(false);
  const [reading, setReading] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    play.see(photo?.evidence);
  }, [photo]);

  // The photo follows the finger down and shrinks a little while the black
  // behind it thins; past a point, or on a flick, it goes.
  const pullDown = (e: React.PointerEvent) => {
    const bg = shell.current;
    const img = frame.current;
    if (!bg || !img) return;
    drag(e, {
      engage: (dx, dy) => dy > 0 && dy > Math.abs(dx),
      move: (dx, dy) => {
        const d = Math.max(0, dy);
        img.style.transition = "none";
        img.style.transform = `translate(${dx * 0.4}px, ${d}px) scale(${1 - Math.min(d / 900, 0.3)})`;
        bg.style.transition = "none";
        bg.style.backgroundColor = `rgba(0, 0, 0, ${1 - Math.min(d / 360, 0.75)})`;
      },
      end: ({ dy, vy }) => {
        if (dy > 110 || vy > 0.55) {
          onClose();
          return;
        }
        img.style.transition = "transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1)";
        img.style.transform = "";
        bg.style.transition = "background-color 0.3s";
        bg.style.backgroundColor = "";
      },
    });
  };

  if (!photo) return null;
  return (
    <div ref={shell} className={styles.viewer} data-no-swipe>
      <div className={styles.viewerBar}>
        <button type="button" className={styles.viewerDone} onClick={onClose}>
          Done
        </button>
        <span className={styles.viewerWhen}>
          <strong>{photo.place}</strong>
          <span>{photo.takenAt}</span>
        </span>
        <span />
      </div>
      <div ref={frame} className={styles.viewerImage} onPointerDown={pullDown}>
        <PhotoFrame id={id} cast={cast} size="full" />
        {/* Live Text: the phone read something in the picture. Lifted and
            outlined the way the OS does it, so it reads as found, not added. */}
        {reading && photo.liveText && <span className={styles.recognised}>{photo.liveText}</span>}
      </div>
      {info && (
        <dl className={styles.info}>
          <div>
            <dt>Taken</dt>
            <dd>{photo.takenAt}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{photo.place}</dd>
          </div>
          {photo.note && (
            <div>
              <dt>Note</dt>
              <dd className={styles.infoNote}>{photo.note}</dd>
            </div>
          )}
        </dl>
      )}
      <div className={styles.tools}>
        {onRecover && (
          <button type="button" className={styles.textButton} onClick={onRecover}>
            Recover
          </button>
        )}
        {photo.liveText && (
          <button
            type="button"
            className={styles.textButton}
            data-on={reading || undefined}
            onClick={() => setReading((v) => !v)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13M7 8h6M7 11h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Live Text
          </button>
        )}
        <button
          type="button"
          className={styles.infoButton}
          data-on={info || undefined}
          onClick={() => setInfo((v) => !v)}
          aria-label="Info"
        >
          i
        </button>
      </div>
    </div>
  );
}
