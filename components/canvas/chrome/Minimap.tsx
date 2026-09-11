"use client";

import { useRef } from "react";
import {
  CLUSTERS,
  clusterBounds,
  widgets,
  WORLD_H,
  WORLD_W,
  type Cluster,
} from "@/content/canvas";
import type { CameraState } from "@/lib/camera";
import styles from "./Minimap.module.css";

/* ===========================================================================
   The minimap.

   Ported from references/canvas/Minimap.tsx — the projection maths is its own,
   and it is the fifteen lines that matter. What went is the polling: the
   original hunted for a window global on a 120ms interval, forty times, because
   in Framer it had no other way to reach the camera. Here the camera hands it
   state directly.

   Orientation, not decoration. It answers "where am I and how much is there",
   which on a board this empty is the difference between exploring and being
   lost. Clicking flies you there.
   =========================================================================== */

const SIZE = 132;

export default function Minimap({
  camera,
  viewport,
  active,
  onJump,
}: {
  camera: CameraState;
  viewport: { w: number; h: number };
  /** The neighbourhood the camera is in — the same one the dock lights. */
  active: Cluster | null;
  onJump: (worldX: number, worldY: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const ratio = WORLD_W / WORLD_H;
  const mapW = ratio >= 1 ? SIZE : SIZE * ratio;
  const mapH = ratio >= 1 ? SIZE / ratio : SIZE;

  /* The visible region, in world coordinates, projected onto the map. */
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const vx = -camera.x / camera.scale;
  const vy = -camera.y / camera.scale;
  const boxL = clamp01(vx / WORLD_W);
  const boxT = clamp01(vy / WORLD_H);
  const boxW = clamp01(viewport.w / camera.scale / WORLD_W);
  const boxH = clamp01(viewport.h / camera.scale / WORLD_H);

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.map} squircle`}
      style={{ width: mapW, height: mapH }}
      aria-label="Canvas overview — press to move there"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onJump(
          ((e.clientX - r.left) / r.width) * WORLD_W,
          ((e.clientY - r.top) / r.height) * WORLD_H,
        );
      }}
    >
      {/* The five neighbourhoods, as faint regions under the dots, so the map
          and the dock describe the same places. The one you are in is
          stronger. Padded a little, as the board's own names sit just
          outside each place. */}
      {CLUSTERS.map((c) => {
        const b = clusterBounds(c);
        const pad = 60;
        return (
          <span
            key={c}
            className={styles.district}
            data-on={active === c ? "" : undefined}
            style={{
              left: `${((b.x - b.w / 2 - pad) / WORLD_W) * 100}%`,
              top: `${((b.y - b.h / 2 - pad) / WORLD_H) * 100}%`,
              width: `${((b.w + pad * 2) / WORLD_W) * 100}%`,
              height: `${((b.h + pad * 2) / WORLD_H) * 100}%`,
            }}
          />
        );
      })}

      {/* Every widget as a dot, so the map shows where things *are* rather
          than just where you are. Static — the board does not move. */}
      {widgets.map((w) => (
        <span
          key={w.id}
          className={styles.pip}
          style={{
            left: `${((w.x + w.w / 2) / WORLD_W) * 100}%`,
            top: `${((w.y + w.h / 2) / WORLD_H) * 100}%`,
          }}
        />
      ))}

      <span
        className={styles.viewport}
        style={{
          left: `${boxL * 100}%`,
          top: `${boxT * 100}%`,
          width: `${boxW * 100}%`,
          height: `${boxH * 100}%`,
        }}
      />
    </button>
  );
}
