"use client";

import { useState } from "react";

import { story as ep } from "@/content/found/story";
import { has } from "@/lib/found/engine";
import PhotoFrame, { PhotoViewer } from "./PhotoFrame";
import type { AppProps } from "./types";
import styles from "./More.module.css";

/**
 * {name}'s trespass camera: it saves to the cloud and keeps nothing on the
 * phone, so a guard who checks it finds nothing. That's why Kiran found
 * nothing either. The twelve are up there; the phone needs Wi-Fi to fetch
 * them, and sharing needs the owner's face.
 */
export default function NightCam({ state }: AppProps) {
  const online = has(state, "did:wifi-on");
  const ep2 = has(state, "ep:2");
  const first = ep.photos.find((p) => p.id === ep.nightcam.firstFrame);
  const [viewing, setViewing] = useState(false);
  const rest = ep.nightcam.items - 1;

  return (
    <section className={styles.nightcam}>
      <header className={styles.ncBar}>
        <span className={styles.ncTitle}>NightCam</span>
        <span className={styles.ncCloud}>Cloud only</span>
      </header>

      {!online || !first ? (
        <div className={styles.ncWaiting}>
          <p className={styles.ncCount}>11 photos and 1 video</p>
          <p className={styles.ncLine}>In your cloud. Nothing is saved on this phone.</p>
          <p className={styles.ncState}>
            {ep2 ? "Waiting for Wi-Fi. Turn it on in Settings." : "Waiting for Wi-Fi. Low Power Mode is on."}
          </p>
        </div>
      ) : (
        <div className={styles.ncBody}>
          <p className={styles.ncState}>Downloading 1 of {ep.nightcam.items}</p>
          <div className={styles.ncGrid}>
            <button type="button" className={styles.ncTile} onClick={() => setViewing(true)} aria-label={`${first.place}, ${first.takenAt}`}>
              <PhotoFrame id={first.id} cast={state.cast} size="thumb" />
            </button>
            {Array.from({ length: rest }, (_, i) => (
              <span key={i} className={styles.ncPending} aria-hidden="true">
                <span className={styles.ncSpin} />
              </span>
            ))}
          </div>
          <p className={styles.ncLine}>Sharing from NightCam needs {state.cast.name}&apos;s face.</p>
        </div>
      )}

      {viewing && first && <PhotoViewer id={first.id} cast={state.cast} onClose={() => setViewing(false)} />}
    </section>
  );
}
