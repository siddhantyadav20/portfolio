"use client";

import { useState } from "react";

import { story as ep } from "@/content/found/story";
import type { Photo } from "@/content/found/types";
import { all, has } from "@/lib/found/engine";
import * as play from "../FoundPhone/actions";
import AppBar, { Chevron } from "./AppBar";
import PhotoFrame, { PhotoViewer } from "./PhotoFrame";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Photos.module.css";

export default function Photos({ state }: AppProps) {
  const [album, setAlbum] = useState<"recents" | "deleted">("recents");
  const [viewing, setViewing] = useState<string | null>(null);
  const recovered = has(state, "did:recover-van");
  // A recovered photo moves back to the Library, dated when it was put back.
  const where = (p: Photo) => (p.album === "deleted" && p.recoverable && recovered ? "recents" : p.album);
  const list = ep.photos.filter((p) => where(p) === album && all(state, p.requires));
  const deleted = ep.photos.filter((p) => where(p) === "deleted").length;
  const shown = ep.photos.find((p) => p.id === viewing);
  const canRecover = album === "deleted" && shown?.recoverable && !recovered;
  // The album's own "Recover All", where a phone puts it, so nobody has to
  // open the photo to learn it can come back.
  const canRecoverAll = album === "deleted" && !recovered && ep.photos.some((p) => p.album === "deleted" && p.recoverable);

  const recover = () => {
    play.perform("recover-van");
    setViewing(null);
    setAlbum("recents");
  };

  return (
    <section className={app.view}>
      {album === "recents" ? (
        <AppBar />
      ) : (
        <AppBar
          title="Recently Deleted"
          onBack={() => setAlbum("recents")}
          backLabel="Library"
          end={
            canRecoverAll ? (
              <button type="button" className={styles.recoverAll} onClick={recover}>
                Recover All
              </button>
            ) : undefined
          }
        />
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
      {viewing && (
        <PhotoViewer
          id={viewing}
          cast={state.cast}
          onClose={() => setViewing(null)}
          onRecover={canRecover ? recover : undefined}
        />
      )}
    </section>
  );
}
