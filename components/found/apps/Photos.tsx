"use client";

import { useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import { all } from "@/lib/found/engine";
import AppBar, { Chevron } from "./AppBar";
import PhotoFrame, { PhotoViewer } from "./PhotoFrame";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Photos.module.css";

export default function Photos({ state }: AppProps) {
  const [album, setAlbum] = useState<"recents" | "deleted">("recents");
  const [viewing, setViewing] = useState<string | null>(null);
  const list = ep.photos.filter((p) => p.album === album && all(state, p.requires));
  const deleted = ep.photos.filter((p) => p.album === "deleted").length;

  return (
    <section className={app.view}>
      {album === "recents" ? (
        <AppBar />
      ) : (
        <AppBar title="Recently Deleted" onBack={() => setAlbum("recents")} backLabel="Library" />
      )}
      <div className={app.body}>
        {album === "recents" && <h2 className={app.big}>Library</h2>}
        {album === "deleted" && (
          <p className={styles.kept}>Photos and videos show the days remaining before they&apos;re gone for good.</p>
        )}
        <div className={styles.grid}>
          {list.map((p) => (
            <button
              type="button"
              key={p.id}
              className={styles.thumb}
              onClick={() => setViewing(p.id)}
              aria-label={`${p.place}, ${p.takenAt}`}
            >
              <PhotoFrame id={p.id} cast={state.cast} size="thumb" />
              {album === "deleted" && <span className={styles.days}>23 days</span>}
            </button>
          ))}
        </div>
        {album === "recents" && (
          <>
            <p className={styles.count}>{list.length} Photos</p>
            <p className={app.groupLabel}>Albums</p>
            <ul className={app.group}>
              <li>
                <button type="button" className={app.row} onClick={() => setAlbum("deleted")}>
                  <span className={app.rowMain}>
                    <span className={app.rowTitle}>Recently Deleted</span>
                  </span>
                  <span className={app.rowMeta}>{deleted}</span>
                  <Chevron />
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
      {viewing && <PhotoViewer id={viewing} cast={state.cast} onClose={() => setViewing(null)} />}
    </section>
  );
}
