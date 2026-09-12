import type { Cast, Gender } from "@/content/found/types";

/* ===========================================================================
   One script, either cast — and the player's own numbers.

   The missing person is dealt as a girl or a boy per playthrough, and nobody
   is asked which. Every line that names them carries tokens instead, so the
   script is written once and both versions are tested (tests/found.test.ts
   renders every string for every name in the pool).

   A line can also quote the player back at themselves — `{firstPickup}`,
   `{minutes}`, `{mapsTime}`, `{pinnedAt}` — from their own session
   (engine.sessionVars). Those are what make Episode 2's report theirs.
   =========================================================================== */

const WORDS: Readonly<Record<Gender, Readonly<Record<string, string>>>> = {
  girl: {
    they: "she",
    them: "her",
    their: "her",
    theirs: "hers",
    "they're": "she's",
    child: "daughter",
    kid: "girl",
  },
  boy: {
    they: "he",
    them: "him",
    their: "his",
    theirs: "his",
    "they're": "he's",
    child: "son",
    kid: "boy",
  },
};

/** Every cast token `say` understands, lower-case. Capitalised forms work too. */
export const TOKENS: readonly string[] = ["name", ...Object.keys(WORDS.girl)];

/** The session numbers a line may quote. */
export const VARS = ["firstPickup", "pickups", "minutes", "mapsTime", "pinnedAt"] as const;

const TOKEN = /\{([A-Za-z']+)\}/g;

/**
 * A script line for this cast and this player. `{They}` capitalises; an
 * unknown token is left standing so the test that looks for leftover braces
 * can name it.
 */
export function say(text: string, cast: Cast, vars: Readonly<Record<string, string>> = {}): string {
  return text.replace(TOKEN, (whole, raw: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, raw)) return vars[raw];
    const key = raw.toLowerCase();
    const word = key === "name" ? cast.name : WORDS[cast.gender][key];
    if (word === undefined) return whole;
    return raw[0] === raw[0].toUpperCase() && key !== "name" ? word[0].toUpperCase() + word.slice(1) : word;
  });
}

/** Deal a cast: a coin for the gender, then a name from that pool. */
export function pickCast(
  names: Readonly<Record<Gender, readonly string[]>>,
  random: () => number = Math.random,
): Cast {
  const gender: Gender = random() < 0.5 ? "girl" : "boy";
  const pool = names[gender];
  return { gender, name: pool[Math.floor(random() * pool.length) % pool.length] };
}
