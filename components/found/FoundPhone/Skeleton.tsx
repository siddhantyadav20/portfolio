import styles from "./Skeleton.module.css";

/**
 * The phone, before it is anybody's.
 *
 * Found is drawn on the client — what is on screen depends on a game saved in
 * this browser, the envelope for a first visit or the phone exactly where it
 * was left — so the server sends nothing to show, and until hydration the
 * page was the dark surface and nothing else. This is what it sends instead:
 * the device's own outline and the shape of its lock screen, in the site's
 * skeleton (see lib/scene.ts), with the same ring of light running over it.
 *
 * A phone rather than an envelope even for a first visit: the phone is the
 * thing in the post, the envelope is only what it came in.
 *
 * Bones are `scene-bone`, the scene's own, so they open and catch the light
 * exactly as the homepage's do; `--g` staggers the light down the screen.
 */
const BONES: {
  k: "t" | "m" | "c";
  x: number;
  y: number;
  w: number;
  h: number;
  r: string;
}[] = [
  // Status bar: the clock, the signal and the cell.
  { k: "t", x: 8, y: 2.6, w: 11, h: 1.6, r: "99px" },
  { k: "t", x: 74, y: 2.6, w: 18, h: 1.6, r: "99px" },
  // The lock screen's date and its big clock.
  { k: "t", x: 34, y: 12, w: 32, h: 1.8, r: "99px" },
  { k: "t", x: 22, y: 15.6, w: 56, h: 7.4, r: "18px" },
  // Two notifications, the second shorter.
  { k: "c", x: 5, y: 42, w: 90, h: 8.6, r: "20px" },
  { k: "t", x: 10, y: 44.4, w: 34, h: 1.4, r: "99px" },
  { k: "t", x: 10, y: 47, w: 62, h: 1.2, r: "99px" },
  { k: "c", x: 5, y: 52, w: 90, h: 6.6, r: "20px" },
  { k: "t", x: 10, y: 54.4, w: 46, h: 1.2, r: "99px" },
  // The torch, the camera, and the bar to swipe up on.
  { k: "m", x: 9, y: 85, w: 13, h: 6, r: "50%" },
  { k: "m", x: 78, y: 85, w: 13, h: 6, r: "50%" },
  { k: "t", x: 33, y: 96, w: 34, h: 0.7, r: "99px" },
];

export default function Skeleton() {
  return (
    <div className={styles.device} aria-hidden="true">
      <div className={styles.screen}>
        {BONES.map((b, i) => (
          <i
            key={i}
            className={`scene-bone is-${b.k}`}
            style={
              {
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.w}%`,
                height: `${b.h}%`,
                borderRadius: b.r,
                "--i": i,
                "--g": `${Math.round(b.y * 9)}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
