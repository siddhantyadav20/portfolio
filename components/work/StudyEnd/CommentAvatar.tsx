import styles from "./StudyEnd.module.css";

type Props = {
  /** The comment's id. The same comment always gets the same face. */
  seed: string;
  className?: string;
};

/**
 * The face beside a comment — eight of them, drawn rather than exported.
 *
 * Figma puts the same stock illustration on all four comments in the mock,
 * which is a placeholder rather than four people. Eight is enough that a
 * thread does not look like one person talking to themselves, and few enough
 * that they read as a set.
 *
 * SVG rather than eight PNGs, for the reasons the mark in `content/logo.ts`
 * gives: they are sharp at any size, they weigh nothing next to eight files in
 * the image budget, and the ring around them can take the page's own ink so
 * they sit on a light card and a dark one without a second set.
 *
 * ABSTRACT ON PURPOSE. Every comment here is anonymous — nobody gives a name
 * and nothing stores one — so eight photographs, or eight faces with features,
 * would be inventing eight people who do not exist. These are silhouettes:
 * clearly eight different somebodies, claiming nothing about any of them.
 *
 * PICKED BY HASH, NOT BY POSITION. The obvious reading of "cycle through
 * eight" is the index in the list, and it is wrong here: comments arrive
 * newest-first, so a new one at the top shifts every comment below it down a
 * place and every face in the thread changes. Hashing the id means a comment
 * keeps its face for as long as it exists, and eight still repeat.
 */
export default function CommentAvatar({ seed, className }: Props) {
  const face = FACES[hash(seed) % FACES.length]!;

  return (
    <svg
      className={`${styles.avatar} ${className ?? ""}`}
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill={face.ground} />

      {/* Everything below is clipped to the disc, so the shoulders can run off
          the bottom edge rather than being drawn to meet it.

          Keyed on the seed, not on the face: two comments can draw the same
          face, and two `clipPath`s sharing an id is invalid markup — the
          second is ignored, which happens to be harmless here only because
          they are identical. */}
      <clipPath id={`av-${seed}`}>
        <circle cx="24" cy="24" r="24" />
      </clipPath>

      <g clipPath={`url(#av-${seed})`}>
        {/* Behind the head, so a wide shape reads as hair around it. */}
        {face.hair === "curls" && <circle cx="24" cy="19" r="12.5" fill={face.hair2} />}

        {/* Wide and high enough to meet the head — at 15.5 by 13.5 its top
            edge sat six pixels below the chin, and every avatar read as a head
            floating over an unrelated blob. */}
        <ellipse cx="24" cy="47" rx="19" ry="18" fill={face.garment} />
        <circle cx="24" cy="20" r="9" fill={face.skin} />

        {face.hair === "short" && <path d={CAP} fill={face.hair2} />}

        {face.hair === "bun" && (
          <>
            <path d={CAP} fill={face.hair2} />
            <circle cx="24" cy="8.5" r="3.6" fill={face.hair2} />
          </>
        )}

        {face.hair === "cap" && (
          <>
            <path d={CAP} fill={face.hair2} />
            <rect x="12.5" y="18.5" width="23" height="2.6" rx="1.3" fill={face.hair2} />
          </>
        )}

        {face.hair === "long" && (
          <>
            <path d={CAP} fill={face.hair2} />
            <rect x="13.5" y="18" width="4" height="14" rx="2" fill={face.hair2} />
            <rect x="30.5" y="18" width="4" height="14" rx="2" fill={face.hair2} />
          </>
        )}

        {face.hair === "braids" && (
          <>
            <path d={CAP} fill={face.hair2} />
            <circle cx="14.5" cy="24" r="3.2" fill={face.hair2} />
            <circle cx="33.5" cy="24" r="3.2" fill={face.hair2} />
          </>
        )}

        {face.hair === "side" && (
          <>
            <path d={CAP} fill={face.hair2} />
            <rect x="29.5" y="17" width="5" height="9" rx="2.5" fill={face.hair2} />
          </>
        )}

        {/* `bald` draws nothing — the head is the shape. */}
      </g>
    </svg>
  );
}

/** The top half of the head circle: hair sitting on it rather than around it. */
const CAP = "M15 20a9 9 0 0 1 18 0z";

type Face = {
  id: string;
  ground: string;
  garment: string;
  skin: string;
  hair2: string;
  hair: "short" | "bun" | "curls" | "cap" | "long" | "braids" | "side" | "bald";
};

/**
 * Eight, and they are a set rather than eight independent choices: one muted
 * ground each, a garment a step darker than it, and four skin tones and four
 * hair colours shared between them. Picked to stay legible at 45px on both the
 * light page and the dark one, which rules out anything very pale on the
 * ground or very dark on the garment.
 */
const FACES: readonly Face[] = [
  { id: "a", ground: "#cfe3ea", garment: "#2f6f86", skin: "#e8b98f", hair2: "#3a2b22", hair: "short" },
  { id: "b", ground: "#f3ddc0", garment: "#b5793a", skin: "#f0cfae", hair2: "#5a3b23", hair: "bun" },
  { id: "c", ground: "#e2d7f0", garment: "#6a4f9c", skin: "#8d5a3c", hair2: "#241a16", hair: "curls" },
  { id: "d", ground: "#cfe0f5", garment: "#3a6ba8", skin: "#d9a273", hair2: "#2b3a4a", hair: "cap" },
  { id: "e", ground: "#d5eadb", garment: "#3f7d55", skin: "#f0cfae", hair2: "#7a4a1f", hair: "long" },
  { id: "f", ground: "#f4d9dc", garment: "#a84c5a", skin: "#7a4a2e", hair2: "#1f1713", hair: "bald" },
  { id: "g", ground: "#dcdcf0", garment: "#4a4a8c", skin: "#c98f63", hair2: "#33261d", hair: "side" },
  { id: "h", ground: "#efe3cf", garment: "#8a6b3a", skin: "#a76a44", hair2: "#2a1d16", hair: "braids" },
];

/**
 * A small, stable, non-cryptographic hash — FNV-1a.
 *
 * It only has to spread ids across eight buckets and give the same answer on
 * the server and in the browser, which rules out anything involving `Math.
 * random` and does not call for anything involving `crypto`.
 */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}
