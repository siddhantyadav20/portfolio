import { music } from "@/content/site";
import { readNowPlaying } from "@/lib/nowPlaying";
import Player from "./Player";

/**
 * Figma 1011:10190 (paused) and 1011:10336 (playing).
 *
 * A server component, and a thin one: it fetches and hands over. Everything
 * with a state lives in `Player`.
 *
 * The queue is fetched HERE rather than in the browser, and the split with the
 * thumbs next door is the one architectural decision on this card worth
 * knowing about. What is playing is content — it belongs in the HTML, for the
 * largest paint on the card, for a visitor with no JavaScript, and for anything
 * reading the page rather than running it. Every fetch under here carries
 * `revalidate: 300`, so the page stays static and is re-rendered in the
 * background at most every five minutes.
 *
 * The like counts cannot come this way. `mine` is derived from request
 * headers, and reading those anywhere on the homepage's server path would opt
 * the whole page out of static rendering to draw two small numbers — so those
 * are fetched on mount instead, exactly as `StudyEnd/Comments.tsx` does and
 * for exactly the reason its docblock gives.
 */
export default async function MusicPlayer() {
  const queue = await readNowPlaying();

  return (
    <Player
      queue={queue}
      label={music.label}
      unavailable={music.unavailable}
    />
  );
}
