/* ===========================================================================
   How this site was made.

   NOT A CASE STUDY, and the shape of this file is the argument for that. A
   case study on this site is `content/work/*`: a hero, sections, quotes,
   outcomes, eight thousand words of reasoning. This is four beats and eleven
   sentences, because the process is worth showing and is not worth reading
   about — PROJECT.md's content philosophy says a study should communicate
   "individual product decisions, evolution and outcomes", and how a portfolio
   got built is none of those. It is a colophon.

   So every scene here is a drawing with one line under it. If a beat cannot be
   made legible as motion, it does not belong in this file; it belongs in a
   commit message, where most of this build's reasoning already lives.

   THE NUMBERS ARE REAL AND THEY ARE A SNAPSHOT. Each carries the command that
   produced it, so any of them can be re-derived rather than argued about. They
   are written out rather than computed at runtime for the obvious reason —
   this module is imported by the homepage, and a client bundle cannot run
   `git rev-list` — and the comment is what keeps them honest.
   =========================================================================== */

/** Where the history the last scene points at actually lives. */
export const REPO = "https://github.com/siddhantyadav20/portfolio";

/** Read on 2026-09-04. Re-run the command in each `from` to refresh. */
export const receipt = [
  {
    value: "24",
    label: "Days",
    from: "first commit 2026-08-11 to 2026-09-04",
  },
  {
    value: "64",
    label: "Commits",
    from: "git rev-list --count HEAD",
  },
  {
    value: "52k",
    label: "Lines",
    from: "git ls-files '*.ts' '*.tsx' '*.css' | xargs wc -l — 33,495 TS + 18,462 CSS",
  },
  {
    value: "5",
    label: "Checks on every push",
    from: ".github/workflows/ci.yml — lint, typecheck, test, build, budget",
  },
] as const;

/**
 * The tokens the first scene reads out of the file.
 *
 * Four real ones, copied from the top of `app/globals.css` — which opens with
 * "Every value here was read out of the Figma file, not eyeballed." That
 * sentence is the whole of scene one, and these are the evidence for it.
 *
 * `swatch` is present only where the value is a colour, because the drawing
 * shows a chip for those and the raw value for the rest.
 */
/* Typed rather than `as const`, and that is not a style choice: the array is
   heterogeneous — two of the four carry a swatch — and `as const` widens it to
   a union in which `swatch` exists on only half the members, so the drawing
   cannot read it without narrowing every row. One optional field says what is
   actually true. */
export type Token = {
  readonly name: string;
  readonly value: string;
  /** Only where the value is a colour; the rest show the raw value. */
  readonly swatch?: string;
};

export const tokens: readonly Token[] = [
  { name: "--ink", value: "#222222", swatch: "#222222" },
  { name: "--accent", value: "#ea580b", swatch: "#ea580b" },
  { name: "--r-xl", value: "32px" },
  { name: "--col-2", value: "540px" },
];

/**
 * What the terminal is doing in scene two.
 *
 * A real turn, shortened: the palette work in commit 8a37b45. The tool names
 * are the ones Claude Code actually prints, and the file paths exist. A fake
 * transcript would have been easier to write and is the exact thing the site's
 * own brief rules out — "should NOT feel like an AI-generated website" is not
 * a warning about using the tools, it is a warning about faking the receipts.
 */
export const turn = {
  prompt: "make the ⌘K the best out there",
  steps: [
    { tool: "Read", arg: "CommandPalette/index.tsx" },
    { tool: "Read", arg: "content/palette/search.ts" },
    { tool: "Write", arg: "CommandPalette/Glyph.tsx" },
    { tool: "Edit", arg: "CommandPalette.module.css" },
  ],
  done: "4 files changed",
} as const;

/**
 * Scene three, and the only one that is about judgement rather than tooling.
 *
 * The boot sequence took five attempts. Four were rejected and the header of
 * `components/boot/BootSequence/index.tsx` still names what for: "No drawn pen
 * cursor, no ruler, no grid, no readout narrating itself, and nothing in a
 * colour that appears nowhere else on the site — four earlier attempts were
 * rejected for exactly those."
 *
 * That paragraph is why this scene is in the piece at all. The interesting
 * part of building with an agent is not that it writes quickly; it is that the
 * standard has to come from somewhere, and four rejections is what a standard
 * looks like from the outside.
 */
export const attempts = [
  { label: "A spinner", verdict: "no" },
  { label: "A grid, drawing itself", verdict: "no" },
  { label: "A readout, narrating", verdict: "no" },
  { label: "A ruler, measuring", verdict: "no" },
  { label: "The mark, drawn with the pen tool", verdict: "yes" },
] as const;

/** One line per beat. This is the whole of the copy. */
export const scenes = [
  {
    id: "read",
    kind: "tokens",
    eyebrow: "The file",
    line: "It began as a Figma frame. Every value on this page was read out of it, not eyeballed.",
  },
  {
    id: "loop",
    kind: "terminal",
    eyebrow: "The loop",
    line: "Then it was a conversation. Fifty-nine of sixty-four commits were written in one.",
  },
  {
    id: "no",
    kind: "attempts",
    eyebrow: "The standard",
    line: "Most of it was saying no. The loading screen took five tries before one was allowed to ship.",
  },
  {
    id: "receipt",
    kind: "receipt",
    eyebrow: "The receipt",
    line: "Everything above is in the history, and the history is public.",
    /* The claim in that sentence is the only one on the page a reader cannot
       check by looking at the page, so it gets a link. A colophon that says
       "it's all in the commits" and then does not say where is asking to be
       taken at its word, which is exactly what the four numbers above it are
       trying not to do. Verified public on 2026-09-04. */
    link: { label: "Read the commits", href: REPO },
  },
] as const;

export const making = {
  eyebrow: "Colophon",
  title: "How this was made",
  /* The card's one line. Deliberately not a summary of the four scenes — it is
     the reason to open them. */
  lede: "A Figma file, a terminal, and four rejected loading screens.",
  cta: "See the process",
  scenes,
  tokens,
  turn,
  attempts,
  receipt,
} as const;

export type MakingScene = (typeof scenes)[number];
