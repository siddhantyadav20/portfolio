import { notFound } from "next/navigation";

import Bench from "./Bench";

/**
 * Every cue on the site, side by side, synthesised against recorded.
 *
 * WHY THIS PAGE EXISTS
 *
 * The person who tunes this cannot hear it, and the person who can hear it
 * cannot tune it. That is the actual constraint on this work, and it is not
 * going away. `scripts/measure-sfx.mjs` closes half of it — the half about
 * whether two cues are the same, which is a question about numbers. This page
 * closes the other half, which is the question of whether a sound is any good,
 * and that is only ever answered by ear.
 *
 * Three things it has to do that auditioning files in Finder does not:
 *
 *   - Play the cue through its REAL function, at its real level, on the real
 *     bus. A cue that sounds right in isolation and wrong at 0.075 through the
 *     master is the ordinary outcome, not the unusual one.
 *   - A/B against what is there today. "Is this better" is answerable; "is
 *     this good" is not.
 *   - Play the whole board in order, in one go. "Everything sounds the same"
 *     is a statement about relationships, and nobody can hold twenty sounds
 *     auditioned separately over an afternoon in mind well enough to hear it.
 *
 * Development only, like /dev/responsive.
 */
export default function SoundsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Bench />;
}
