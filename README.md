# siddhantyadav.com

Personal portfolio for Siddhant Yadav, Product Designer. A single interactive
homepage rather than a Home/Work/About/Contact site, plus three case-study
routes and a pannable canvas.

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
`scripts/trim-audio.mjs` re-cuts the music previews from the originals in
`references/`, and `scripts/check-budget.mjs` is what `npm run budget` calls.

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
lib/          camera, springs, view transitions, theme, telemetry
public/       fonts excepted, every asset the browser fetches
references/   source material (Figma exports, Framer originals). Not shipped,
              not imported, not type-checked, not linted.
```

## Things that are load-bearing and not obvious

- **`references/` is ~110MB and no longer tracked.** It holds the Figma
  exports, the Framer originals, the raw inspection recording and the
  full-length music. Untracked rather than deleted: it is still on Siddhant's
  disk, still in git history, and `scripts/trim-audio.mjs` reads the original
  recordings from it. A fresh clone will not have it, which nothing in the app
  minds.
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
- **`CONTENT-INTAKE.md` is the list of words the site is waiting on.** Every
  question in it has a built, working place for the answer to land.
