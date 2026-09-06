import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { END, renderManifest, START as START_MARKER, takesIn } from "../scripts/lib/manifest.mjs";
import { CUES, SFX, type SfxCue } from "@/lib/sfx-manifest";
import config from "../samples.config.mjs";

/**
 * The recorded half of the sound system.
 *
 * Almost all of this guards ONE failure, and it is a silent one: a cue whose
 * takes are lost or misnamed does not throw, log, or look wrong. It falls back
 * to the synthesised version — which is exactly what a cue that has not been
 * given a recording yet does, and exactly what the whole system is designed to
 * do gracefully. So "the sample stopped working" and "the sample was never
 * chosen" are indistinguishable at runtime, and the only place they can be
 * told apart is here.
 */

const ROOT = join(__dirname, "..");

describe("the manifest and the config agree", () => {
  it("names the same cues, in both directions", () => {
    // Two lists that must not drift: adding a cue to one and forgetting the
    // other is the ordinary mistake, and it produces a cue that can never be
    // built or one that is built and never played.
    expect(Object.keys(config).sort()).toEqual([...CUES].sort());
  });

  it("gives every cue a gain", () => {
    for (const cue of CUES) {
      expect(SFX[cue].gain, cue).toBeTypeOf("number");
      expect(SFX[cue].gain, cue).toBeGreaterThan(0);
    }
  });

  it("marks the sustaining cues as sustaining in both files", () => {
    // A loop played as a one-shot stops after two seconds mid-scratch; a
    // one-shot played as a loop never stops at all. Neither is subtle, and
    // both come from these two flags disagreeing.
    for (const cue of CUES) {
      const inConfig = Boolean((config as Record<string, { loop?: boolean }>)[cue].loop);
      expect(Boolean(SFX[cue].sustained), cue).toBe(inConfig);
    }
  });
});

describe("every take that is named exists", () => {
  it("has a file in public/sfx for each entry", () => {
    // The manifest is generated, so a name in it that has no file means a
    // build ran against a source that has since moved. Silent at runtime.
    for (const cue of CUES) {
      for (const take of SFX[cue].takes) {
        expect(existsSync(join(ROOT, "public", "sfx", take)), `${cue} → ${take}`).toBe(true);
      }
    }
  });

  it("does not leave orphans in public/sfx", () => {
    const dir = join(ROOT, "public", "sfx");
    if (!existsSync(dir)) return;
    const named = new Set(CUES.flatMap((cue) => SFX[cue].takes));
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".m4a"))) {
      expect(named.has(file), `public/sfx/${file} is not in the manifest`).toBe(true);
    }
  });
});

describe("renderManifest", () => {
  /* A fixture rather than the live manifest. The first version of these tests
     read lib/sfx-manifest.ts and patched a known empty entry into it, which
     worked exactly until the first real build filled that entry in — the
     patch became a no-op and the test failed on a change that was correct.
     A generated file is not a fixture: it is an output, and asserting against
     it couples the test to whatever was built last. */
  const source = [
    "/* header */",
    START_MARKER,
    "export const SFX: Record<SfxCue, SfxEntry> = {",
    '  "photo-slip": { takes: ["photo-slip-1.m4a", "photo-slip-2.m4a"], gain: 0.8 },',
    '  "book-page": { takes: [], gain: 1 },',
    '  "scratch-rub": { takes: [], gain: 1, sustained: true },',
    "};",
    END,
    "/* footer */",
  ].join("\n");

  it("keeps the markers and everything outside them in place", () => {
    const out = renderManifest(source, { "book-page": { gain: 1, built: ["book-page-1.m4a"] } }, []);
    expect(out).toContain(START_MARKER);
    expect(out).toContain(END);
    expect(out.startsWith("/* header */")).toBe(true);
    expect(out.endsWith("/* footer */")).toBe(true);
    expect(out).toContain('"book-page": { takes: ["book-page-1.m4a"], gain: 1 },');
  });

  it("leaves untouched cues alone on a single-cue run", () => {
    // The whole reason this function is pure and tested. Rebuilding one cue
    // must not blank the other nineteen — and because a blanked cue merely
    // falls back to synthesis, nothing would report it.
    const out = renderManifest(
      source,
      {
        "photo-slip": { gain: 0.8, built: [] },
        "book-page": { gain: 1, built: ["book-page-1.m4a"] },
      },
      ["book-page"],
    );
    expect(out).toContain('"photo-slip": { takes: ["photo-slip-1.m4a", "photo-slip-2.m4a"]');
    expect(out).toContain('"book-page": { takes: ["book-page-1.m4a"]');
  });

  it("carries the sustained flag through", () => {
    const out = renderManifest(source, { "scratch-rub": { gain: 1, loop: true, built: [] } }, []);
    expect(out).toContain("sustained: true");
  });

  it("refuses a file that has lost its markers", () => {
    expect(() => renderManifest("export const SFX = {};", {}, [])).toThrow(/markers/);
  });

  it("reads existing takes back out", () => {
    expect(takesIn('  "book-page": { takes: ["a.m4a", "b.m4a"], gain: 1 },', "book-page")).toBe(
      '["a.m4a", "b.m4a"]',
    );
    expect(takesIn('  "book-page": { takes: [], gain: 1 },', "book-page")).toBe("[]");
    expect(takesIn("nothing here", "book-page")).toBe("[]");
  });
});

describe("the line between recorded and synthesised", () => {
  it("has no cue for the abstractions", () => {
    /* The design rule, asserted so it cannot erode: a cue is a recording only
       if it is a picture of a real object. Nothing in the world makes the
       noise of a chime, a copy confirmation, a theme switch, a celebration or
       the room's swell on entry — those are synthesised and must stay that
       way, because a recording would make them worse rather than better. */
    const abstractions = ["chime", "confirm", "theme", "switched", "celebrate", "won", "room", "reveal"];
    for (const cue of CUES as SfxCue[]) {
      for (const word of abstractions) {
        expect(cue.includes(word), `${cue} looks like an abstraction`).toBe(false);
      }
    }
  });
});
