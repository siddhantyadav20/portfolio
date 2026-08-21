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

`typecheck`, `lint` and `build` all run on push — see
`.github/workflows/ci.yml`.

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

- **`references/` is ~110MB and tracked.** It is outside `public/` so it never
  reaches a browser, but it is cloned on every CI run.
- **Canela is still the trial licence** (`app/fonts.ts`). Swap in the licensed
  files — and re-run the WOFF2 conversion documented there — before launch.
- **The `≤1000px` layout is a holding pattern**, and says so in
  `app/page.module.css`. The grid reflows; the cards themselves are still
  transcribed from a 1440 frame at fixed sizes.
