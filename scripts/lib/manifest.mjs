/**
 * Rewriting the generated half of `lib/sfx-manifest.ts`.
 *
 * Split out of the build script and kept pure — source string in, source
 * string out — because it is the one step there that can silently produce a
 * file which still compiles and is wrong. Losing a cue's takes because a regex
 * missed would leave that cue quietly falling back to synthesis forever, which
 * looks exactly like "the sample has not been chosen yet". It is under test in
 * tests/sfx.test.ts.
 */

export const START = "/* @generated:start";
export const END = "/* @generated:end */";

/** The takes a cue already has, read back out of the current source. Used for
 *  cues a single-cue run did not touch, which must survive it unchanged. */
export function takesIn(source, cue) {
  const found = source.match(new RegExp(`"${cue}":\\s*\\{\\s*takes:\\s*(\\[[^\\]]*\\])`));
  return found ? found[1] : "[]";
}

/**
 * @param source  the current contents of lib/sfx-manifest.ts
 * @param config  samples.config.mjs, with `built` filled in by the build
 * @param only    cue names this run rebuilt; empty means all of them
 */
export function renderManifest(source, config, only = []) {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start === -1 || end === -1) {
    throw new Error("lib/sfx-manifest.ts has lost its @generated markers.");
  }

  const body = Object.entries(config)
    .map(([cue, spec]) => {
      const takes =
        only.length > 0 && !only.includes(cue)
          ? takesIn(source, cue)
          : `[${(spec.built ?? []).map((f) => `"${f}"`).join(", ")}]`;
      const loop = spec.loop ? ", sustained: true" : "";
      return `  "${cue}": { takes: ${takes}, gain: ${spec.gain ?? 1}${loop} },`;
    })
    .join("\n");

  const generated =
    `${START} — scripts/build-samples.mjs rewrites everything below. */\n` +
    `export const SFX: Record<SfxCue, SfxEntry> = {\n${body}\n};\n`;

  return source.slice(0, start) + generated + source.slice(end);
}
