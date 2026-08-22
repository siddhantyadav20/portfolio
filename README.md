# siddhantyadav.com

Personal portfolio for Siddhant Yadav, Product Designer. A single interactive
homepage rather than a Home/Work/About/Contact site, plus three case-study
routes and a pannable canvas.

Two things run across all of it: **⌘K** searches the site's own words — every
heading, outcome number, timeline stop and widget on the board — and a **first
arrival draws the homepage** before handing over to it.

See `PROJECT.md` for the brief and the rules the build is held to.
`ARCHITECTURE.md` is a historical Phase-0 proposal — it describes decisions
that were reconsidered, and is not a description of the code as it stands.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Nothing needs configuring to run locally — every environment value has a
working fallback. Copy `.env.example` to `.env.local` when you need the real
ones.

## Scripts

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, over the pure logic only |
| `npm run budget` | Size ceilings; run after a build |

All five checks run on push — see `.github/workflows/ci.yml`.

There are two one-off scripts as well, neither wired into CI:
`scripts/trim-audio.mjs` re-cuts the music previews from the full-length
originals, and `scripts/check-budget.mjs` is what `npm run budget` calls. The
originals used to live in `references/`, which is no longer on disk — that
script now falls back to what is already in `public/`, so it runs, but it
cannot re-cut a longer preview until the folder is restored from Siddhant's
backup.

## Environment

Documented in `.env.example`. Two notes worth having up front:

- **`NEXT_PUBLIC_SITE_URL`** must be set to the deployment's own origin. A
  build with `CI=true` and this unset now fails rather than silently emitting
  production canonicals, `og:url`s and sitemap entries from a preview.
- **`RESEND_API_KEY`** is what makes a waitlist submission actually leave the
  server. Without it the entry is logged in development and dropped in
  production.

## Layout

```
app/          routes, metadata, fonts, error boundaries
components/   home/ · canvas/ · work/ · interaction/ · primitives/
content/      all copy and board geometry, as typed TS — no CMS
lib/          camera, springs, view transitions, theme, telemetry,
              the search matcher, the palette bus, the arrival sequence
public/       fonts excepted, every asset the browser fetches
```

## Things that are load-bearing and not obvious

- **`references/` is gone, and was ~110MB.** The Figma exports, the Framer
  originals, the raw inspection recording and the full-length music. It was
  untracked and gitignored long before it was deleted, so it never shipped and
  a clone never carried it — the pre-launch clean-out removed the working copy
  too. Siddhant keeps the originals in his own backup, and the `.gitignore`
  rule stays so that restoring the folder cannot re-track 110MB by accident.
  It is still in git *history*; taking it out of there is a rewrite and is not
  something to do casually.
- **The tracks in `public/audio/` are 25-second previews**, cut losslessly at
  MPEG frame boundaries from those originals. Shipping eight complete
  commercial recordings was 35MB and a licensing posture nobody would defend.
  Re-cut them, or move where a preview opens, with `scripts/trim-audio.mjs`.
- **The desktop composition is one uniform scale of the 1440 frame.** From
  1001px up, `--u` in `app/page.module.css` is one design pixel expressed as a
  fraction of the viewport, and every geometric value on the page — tracks,
  gutters, page padding, card boxes, the type inside them — is a multiple of
  it. 1440 renders exactly as drawn; 1920 is the same page at 1.333x. Below
  1001 `--u` falls back to its registered `1px`, so the phone layout is
  untouched and every `calc(N * var(--u))` resolves to `Npx`.
- **`inspection-hand.png` is the ceiling on how far that can scale.** It is a
  692px source painted at 587 at the design width — 0.85x, so sharp — but 1.13x
  at 1920 and **1.51x at 2560**. It is the only asset that runs out. Re-export
  it around 1400px wide and the scale is clean to about 2900. Every other image
  is still inside its native size at 2560.
- **Canela is still the trial licence** (`app/fonts.ts`). Swap in the licensed
  files — and re-run the WOFF2 conversion documented there — before launch.
- **The `≤1000px` layout is a holding pattern**, and says so in
  `app/page.module.css`. The grid reflows; the cards themselves are still
  transcribed from a 1440 frame at fixed sizes. Figma has no phone frames, so
  this is undesigned rather than untranscribed.
- **`CONTENT-INTAKE.md` is the list of words the site is waiting on** — and it
  is deliberately not in this repository. Every question in it has a built,
  working place for the answer to land, but it also records which numbers on
  the CV and the site contradict each other, and this repository is public. It
  lives on Siddhant's disk and is gitignored. A clone will not have it and does
  not need it.

- **The arrival sequence runs once per browser, so you will see it once.** On a
  first visit to `/`, `BOOT_SCRIPT` in `lib/boot.ts` sets `data-booting` on
  `<html>` before first paint, and `components/boot/BootSequence` measures the
  real cards and draws them. Afterwards a `localStorage` key suppresses it
  forever. If you are wondering why it never appears again: clear
  `sy-seen-v1`, or bump `BOOT_KEY` to replay it for everyone. It does not run
  under `prefers-reduced-motion`, off the homepage, or without JavaScript.

- **`content/palette` states no facts of its own.** Every row the ⌘K panel can
  find is derived at module scope from `content/site.ts`, `content/work/*` or
  `content/canvas.ts`, and a test in `tests/palette.test.ts` holds it there.
  The panel puts figures from opposite ends of the site next to each other; one
  that kept its own copy of them would become the third place the site
  disagrees with itself.
