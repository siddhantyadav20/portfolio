import type { Cast, Gender } from "@/content/found/types";

/* ===========================================================================
   One script, either cast.

   The missing person is dealt as a girl or a boy per playthrough, and nobody
   is asked which. Every line that names them carries tokens instead, so the
   script is written once and both versions are tested (tests/found.test.ts
   renders every string for every name in the pool).
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

/** Every token `say` understands, lower-case. Capitalised forms work too. */
export const TOKENS: readonly string[] = ["name", ...Object.keys(WORDS.girl)];

const TOKEN = /\{([A-Za-z']+)\}/g;

/**
 * A script line for this cast. `{They}` capitalises; an unknown token is left
 * standing so the test that looks for leftover braces can name it.
 */
export function say(text: string, cast: Cast): string {
  return text.replace(TOKEN, (whole, raw: string) => {
    const key = raw.toLowerCase();
    const word = key === "name" ? cast.name : WORDS[cast.gender][key];
    if (word === undefined) return whole;
    return raw[0] === raw[0].toUpperCase() && key !== "name"
      ? word[0].toUpperCase() + word.slice(1)
      : word;
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
