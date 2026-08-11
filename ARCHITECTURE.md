# Portfolio — Architecture

**Status:** Proposal (Phase 0). Nothing implemented yet, no packages installed.
**Last updated:** 2026-08-11

---

## 0. What I inspected before writing this

| Source | What I found |
|---|---|
| `PROJECT.md` | **Empty (0 bytes).** Committed empty in `475a7b1`. See Decision D1. |
| Codebase | Untouched `create-next-app` output. Next 16.3.0, React 19.2.8, TS strict, App Router, CSS Modules + `next/font/google` already in use. No extra dependencies. |
| `AGENTS.md` | Warns this Next.js differs from training data. I read `node_modules/next/dist/docs/` for CSS, fonts, and project structure — CSS Modules, `next/font/local`, and the `LayoutProps<"/">` global type are the current conventions. Everything below is written against the bundled docs, not memory. |
| Figma | File `o2PhE81zhdDoozqUQ1vMVX` ("Coolio"). Two pages: **Homepage** (`0:1`) and **Components** (`54:3180`). There is **no** "Interaction Specs" page — as the brief anticipated. |

**Figma reality check vs. the brief:** the brief described pages "Designs / Components / Interaction Specs". The file actually has *Homepage* and *Components*. `get_variable_defs` on the root frame returns `{}` — **there are no Figma variables**, so every token below is derived from raw values in the design, not from a published token set.

---

## 1. What the design actually is

Homepage frame `1:27` — 1440 × 1516, a hand-composed **bento canvas**, not a card grid. Verified node positions:

```
page padding 64  →  content band x=64…1376 (1312 wide)

LEFT COLUMN (394)                RIGHT AREA (886)
├ Inspection   362×560  y116     ├ Row 1 (flex, gap 32, y116)
└ Search       394×569  y708     │  About(100) DesEng(256) Workspace(322) Theme(112)  = 886 ✓
                                 └ Sub-columns (540 | 314, gap 32)
                                    ├ A: Introduction y312 · Store y746 · Personality y997
                                    │     (Personality = Music 254 + 32 + LinkedIn 254 = 540 ✓)
                                    └ B: Design System 314×578 y699

Timeline   279×327  x=1376  → bleeds past the 1440 frame edge (intentional overhang)
Footer     1312×102 y1382
```

The arithmetic closes exactly (`100+32+256+32+322+32+112 = 886`; `540+32+314 = 886`), so this is a real nested grid rather than free-floating boxes. Two elements break it deliberately: **Timeline** (anchored to the right viewport edge, clipped) and **Workspace** (322 wide, straddling the 540/314 sub-column boundary). Those two get explicit placement; everything else is grid flow.

**The Safari toolbar frame (`1:273`) is presentation chrome**, not part of the product — it's the Figma mockup showing the site inside a browser, complete with a `siddhantdesigns.in` URL bar. I will not build it. (Same for the one in the case-study modal.)

### Derived tokens

Pulled from `get_design_context` on `1:208` (Introduction) and `21:2476` (About Me):

| Token | Value | Source |
|---|---|---|
| `--text-primary` | `#222` | Introduction, About Me |
| `--text-secondary` | `rgba(34,34,34,0.7)` | "– Less, but better" |
| `--text-tertiary` | `rgba(34,34,34,0.4)` | About Me "About" label |
| `--surface-card` | `rgba(255,255,255,0.7)` | About Me card fill |
| `--surface-cta` | `linear-gradient(108.36deg, rgba(255,255,255,.6) 4.95%, rgba(217,217,217,.6) 368.67%)` | Copy Email / Go to Store |
| `--radius-card` | `16px` | About Me |
| `--radius-pill` | `100px` | CTAs, photo |
| `--font-display` | Canela Text Trial — Medium/Bold | `Hi, I'm Siddhant` 44px / `Me` 20px |
| `--font-ui` | Outfit — Regular/SemiBold | body 24/14/13/12px |
| line-height | `1.5` everywhere | consistent across all text nodes |
| display tracking | `-0.02em` (−0.88px @ 44px) | Introduction title |

The card surfaces are **translucent white over a warm-grey page background** — a glass aesthetic. That means backdrop layering matters and I cannot flatten card fills to opaque hex.

Accent colours (orange for the timeline / "Currently Building" / waitlist, LinkedIn blue for the connect button and search submit) are visible in the render but I have not yet extracted their exact values — I'll pull those in Phase 1 rather than eyeball them from a PNG.

### Component states that exist in Figma

| Component | Variants designed |
|---|---|
| Search (`80:7697`) | Default · Typing · Typed · Searching |
| Store / Waitlist (`110:8501`) | Default · Input · Entered · Success |
| Inspection card (`80:8020`) | Default · Hover |
| LinkedIn (`80:7629`) | Default · Hover |
| Music Player (`80:7658`) | Default · Playing |
| Theme Toggle (`80:7595`) | Light · Dark |
| CTA (`80:7606`) | Default · Hover |
| Custom Cursors (`110:8477`) | View Project (132×132 frosted disc) · Page (24×24) |
| Logo | Light · Dark |

**Not designed anywhere** — flagged, not invented: About Me hover (the brief's tool-icon animation), Designer↔Engineer plane animation, Workspace hover, Timeline drag states, **search results UI**, and the Search / Design System case-study overlays.

---

## 2. Folder structure

```
app/
  layout.tsx                    # fonts, theme bootstrap, <html>
  page.tsx                      # homepage composition — mostly a server component
  globals.css                   # reset, tokens, base typography
  fonts.ts                      # next/font declarations, one place
  work/[slug]/page.tsx          # case study as a real page (direct link, SEO, no JS needed)
  @overlay/
    default.tsx
    (.)work/[slug]/page.tsx     # same case study, intercepted as an overlay
components/
  primitives/                   # CardShell · Overlay · Button · Field · VisuallyHidden
  home/
    Introduction/               # each: index.tsx + *.module.css
    InspectionExperience/
    SearchExperience/
    DesignSystemExperience/
    AboutMeCard/
    DesignEngineerCard/
    WorkspaceCard/
    TimelineExperience/
    StoreWaitlist/
    MusicPlayer/
    LinkedInCard/
    Footer/
  case-study/
    CaseStudyShell/             # shared chrome only
    InspectionCaseStudy/        # each owns its own internal composition
    SearchCaseStudy/
    DesignSystemCaseStudy/
content/
  types.ts
  site.ts
  case-studies/{inspection,search,design-system}.ts
  timeline.ts
  music.ts
  remarks.ts                    # mock search dataset
lib/
  waitlist.ts                   # submission adapter (interface + no-op impl)
  hooks/                        # usePrefersReducedMotion, useHoverIntent, useDragScrub
public/
  fonts/ media/
```

One folder per experience, each owning its own CSS module. No shared "Card" component that every experience is forced through — only a `CardShell` for the genuinely repeated surface (translucent fill, 16px radius, clip), which experiences opt into.

---

## 3. Component strategy

The homepage is a **server component** that renders mostly-static markup. Each interactive experience is its own `"use client"` island. Nothing else on the page ships JavaScript.

This matters for a portfolio: the first paint — typography, layout, imagery — is server-rendered HTML and CSS. A recruiter on a slow connection sees the finished composition before any interaction code arrives.

I am deliberately **not** creating: a generic `Card`, a generic `Media`, a shared `CaseStudyLayout` with fixed sections, or a component per Figma frame. Figma's layer tree and the React tree are not 1:1.

---

## 4. State strategy

Local `useState` inside each experience. No Redux, no Zustand, no global store — nothing on this page needs shared mutable state.

Exactly two pieces of cross-cutting state, both small:

- **Theme (light/dark)** — React context + `data-theme` on `<html>`, with an inline script in `layout.tsx` to set it before first paint so the page doesn't flash. (Next's `preventing-flash-before-hydration` guide covers this pattern.)
- **Overlay open/closed** — handled by the **router**, not context. See Decision D2.

---

## 5. Content strategy

Typed TypeScript objects in `content/`. Not MDX, not a CMS, not a database.

Case-study *content* is separated from case-study *presentation*: each case study exports a typed data object, and its React component reads that object. Replacing placeholder copy later means editing one `.ts` file, never touching interaction code.

```ts
// content/types.ts
export type Placeholder<T> = { status: "placeholder"; value: T }
export type Ready<T>       = { status: "ready"; value: T }
export type Slot<T> = Placeholder<T> | Ready<T>
```

Every unfinished piece of content is a `Slot` marked `placeholder`. In development these render with a visible dashed outline so nothing half-finished can quietly ship; in production they render the fallback. This makes "what's still missing" a compile-time and visual fact rather than something to remember.

**I have not invented any content.** The metrics on the page (200+ photos, 13 minutes, 20,000+ properties, 104,122 remarks, 281 tokens, 12 products, ~51m saved) come from *your* Figma file and I'm treating them as yours. Everything not in Figma is a marked placeholder.

Search dataset: `content/remarks.ts` holds ~20 clearly-labelled demo remarks behind a `searchRemarks(query, category)` function. Swapping in the real library later means replacing that one function body — the component only knows the function signature.

---

## 6. Dependency strategy

**Current plan: add nothing.** Ship on Next + React only.

Evaluated and rejected for now:

| Candidate | Why not (yet) |
|---|---|
| Tailwind | Figma MCP emits Tailwind, but the brief rules it out and CSS Modules is already the project convention. MCP output is a reference, not code to paste. |
| Motion / Framer | CSS transitions + `@keyframes` cover the plane path (`offset-path`), card hovers, and overlay transitions. Revisit **only** if the Designer↔Engineer plane or overlay choreography can't be expressed in CSS. |
| GSAP / Three / R3F / Lenis | No requirement in the design. |
| State libraries | No shared state. |

The two places a dependency might become genuinely justified: the **workspace canvas** (once its real requirements exist) and the **waitlist backend** (Decision D4). I'll come back and make the case with specifics rather than pre-installing.

Fonts: **Outfit** is open-source and loads via `next/font/google` (self-hosted, no external request). **Canela Text Trial** is the problem — see Decision D3.

---

## 7. Responsive strategy

There are **no responsive frames in Figma** — 1440 is the only composition. So the following is my proposal, not a reading of the design.

| Breakpoint | Layout |
|---|---|
| ≥1280 | Figma composition exactly, as specified in §1. |
| 1024–1279 | Same structure, content band fluid; Timeline overhang reduced. |
| 768–1023 | Right area collapses to one column; row-1 chips (About / DesEng / Workspace / Theme) wrap. Left column and right area become a single flow. |
| <768 | One column, order: Introduction → Inspection → Search → Design System → Workspace → Store → Music/LinkedIn → About → DesEng → Timeline → Footer. |

Grid geometry lives in CSS custom properties so the desktop numbers stay editable in one place instead of being scattered through media queries.

**Touch alternatives** (hover doesn't exist on touch — these are intentional redesigns, not degradations):

- Inspection: video autoplays muted on scroll-into-view via `IntersectionObserver`; no custom cursor.
- Design System / LinkedIn / DesEng: hover state triggers on scroll-into-view, or is simply the resting state.
- Timeline: native touch drag (the same pointer-event handler serves both).
- Workspace: tap to open; the drag affordance moves inside the workspace itself.

---

## 8. Accessibility strategy

Built in from the start, not retrofitted.

- **Every card is a real `<a>` or `<button>`.** Hover is decoration layered on top of a natively focusable, keyboard-activatable element — never the only route to meaning.
- **Custom cursor is purely visual.** The "View Project" disc is `aria-hidden`; the accessible name lives on the link. Keyboard focus produces the equivalent visual state.
- **Overlay**: focus trap, restore focus to the originating card on close, `Escape` closes, background inert, `role="dialog"` + `aria-modal`.
- **`prefers-reduced-motion`**: a single global block disables transitions/animations; the Inspection video shows a poster frame instead of playing; the timeline snaps rather than eases.
- **Search**: real `<label>` (visually hidden), `role="status"` on the results region so screen readers hear result counts, full keyboard operation.
- **Audio never autoplays.** The LinkedIn hover sound is opt-in and respects a mute preference; the music player starts paused.
- **Theme toggle** is a real toggle with `aria-pressed`, and both themes must pass contrast — which is part of why the missing dark palette (D5) matters.

---

## 9. Performance strategy

- Homepage ships **HTML + CSS first**; interactive islands hydrate independently.
- The Inspection prototype video is **not in the initial payload**. `<video preload="none">` with a poster; the source attaches on hover-intent (~80ms delay so a passing mouse doesn't trigger a fetch). Reversal pauses and resets.
- `next/image` for all raster assets, with explicit dimensions to hold layout (the design is full of fixed-size crops, so there's no excuse for CLS).
- The case-study overlay is **route-split** — its code and images load only when opened.
- Hover states are `transform`/`opacity` only, so they stay on the compositor.
- Fonts self-hosted via `next/font` with `display: swap` and explicit fallback metrics to avoid layout shift on the 44px display type.

Target: homepage interactive with well under 100KB of JS.

---

## 10. Phased plan

| Phase | Scope | Gate |
|---|---|---|
| 0 | This document | ← you are here |
| 1 | Tokens, fonts, grid, static homepage (all cards, no interaction) | Blocked by **D3** (fonts) |
| 2 | Inspection hover → video + custom cursor | Placeholder video |
| 3 | Search mini-experience | Blocked by **D6** (results UI) |
| 4 | Design System hover scale | — |
| 5 | About Me + Designer↔Engineer | Undesigned; I propose motion |
| 6 | Timeline drag/scrub | Placeholder year content |
| 7 | Workspace shell + interaction boundary | Deliberately just a shell |
| 8 | Music · LinkedIn · Waitlist | Blocked by **D4** (waitlist backend) |
| 9 | Case-study overlay infrastructure | Blocked by **D2** (routing) |
| 10 | Real case-study content | Blocked by you |
| 11 | Responsive | — |
| 12 | A11y + performance audit | — |
| 13 | Visual QA against Figma | — |

Phases 1–8 are not blocked on case-study writing. Each phase is one commit, or a small series.

**Visual QA loop** (from Phase 1 onward): run the site → screenshot the implementation → screenshot the matching Figma node → diff them → fix the largest measurable delta first → re-check. A section isn't "done" because it renders.

---

## 11. Known risks

1. **`PROJECT.md` is empty.** I'm building from the brief and the design without the product intent behind them. Tone and narrative judgement will be guesswork until it exists.
2. **Canela is a trial font.** Blocks legitimate deployment (D3).
3. **Dark mode is half-designed.** A toggle and a dark logo exist; no dark composition does (D5).
4. **The overlay is 60% empty in Figma.** Only Inspection's opening section is designed; the lower ~1200px is blank, and the Search / Design System overlays don't exist at all.
5. **Search results have no design** (D6) — the one part of the Search experience the brief calls "functional" is the part Figma doesn't cover.
6. **"1 Live Visitor"** in the footer implies live infrastructure (D7).
7. **Workspace is genuinely undefined.** I'm building a boundary, not a canvas — deliberately, per the brief.
8. **Translucent surfaces over a gradient background** are the kind of thing that looks right in Figma and subtly wrong in a browser. Expect real time in Phase 13.

---

## 12. Decisions I need from you

Only the ones that actually change what I build. Everything else I'll decide and tell you about.

---

### D1 — `PROJECT.md` is empty · **blocking-ish**

It was committed as a 0-byte file. The brief names it the source of product intent and philosophy, and I have nothing.

I can proceed on the brief + Figma alone — but voice, narrative, and what each case study is *arguing* will be my guess. **Please paste in the brief**, or confirm you want me to work without it.

---

### D2 — How the case-study overlay works · **recommend: routes**

**My recommendation: Next.js parallel + intercepting routes.**

- Clicking a card opens the overlay at a real URL (`/work/inspection`), homepage preserved behind it, back button and Escape both close it, scroll position kept.
- Sending someone `siddhantdesigns.in/work/inspection` renders it as a full page.
- The overlay code loads only when opened.

**Why it matters for you specifically:** you will link a hiring manager to one case study. With client-state-only overlays, that link doesn't exist — every case study lives at `/` and is unshareable and invisible to search.

Cost: parallel routes (`@overlay`) are the most conceptually awkward part of the App Router. I'll comment the folder heavily.

Alternative: plain client state. Simpler, but no shareable links.

---

### D3 — Canela Text Trial · **blocks Phase 1**

Your display font is a **trial licence**. Trial fonts are for evaluation only — shipping one on a public site isn't licensed use, and it's your name on the site.

Options:

1. **Buy Canela Text** (Commercial Type) — web licence, cheapest tier is typically low-hundreds USD for a personal site. Exact match to your design.
2. **Substitute a licensed serif.** Free options with a similar high-contrast feel: *Instrument Serif*, *Newsreader*, *Fraunces*. Visually close, not identical — your headline is the most conspicuous type on the page, so this is a real design compromise.
3. **Keep the trial for local development only** and decide before launch. Unblocks Phase 1 immediately; the decision doesn't go away.

If you have the licensed files already, point me at them and this evaporates. Either way: **do you have Canela files anywhere, or should I go with option 3 for now?**

---

### D4 — Waitlist backend · **blocks Phase 8**

The Store card collects an email (Default → Input → Entered → Success). That's data leaving the browser, so something has to receive it.

I'll build a `WaitlistAdapter` interface regardless, so the UI is decoupled and any backend drops in later. The question is what sits behind it:

1. **Nothing yet** — adapter logs locally, UI fully functional. Unblocks Phase 8 now. *Recommended for now.*
2. **Resend / Formspree** — a Route Handler + one API key in an env var. ~30 min.
3. **A real database** — over-engineered for a waitlist.

I'd go with 1 now and 2 before launch. **Confirm?**

---

### D5 — Dark mode · **affects Phase 1**

The theme toggle is designed in both states and there's a dark logo — but there is **no dark version of the homepage**. I don't know the dark background, card surfaces, or text colours.

1. **You design a dark frame.** Best fidelity; needs your time.
2. **I derive a dark palette** from the light tokens and you correct it. Fast; my colour judgement, not yours.
3. **Cut the toggle for now**, ship light-only, add dark later. The token architecture supports it either way.

I'd suggest 2 — it gives you something concrete to react to. But a broken dark mode is worse than no dark mode, so 3 is legitimate.

---

### D6 — Search results UI · **blocks Phase 3**

Figma has Default / Typing / Typed / Searching — but **no results state**. The brief says results should "use the visual structure shown in Figma," and that structure doesn't exist.

1. **You design the results state.** It's the interaction the whole card exists to demonstrate.
2. **I propose one** from the card's existing visual language and you refine it.
3. Card expands and animates but returns a count only, no result rows.

Option 1 is the honest answer for a *design* portfolio's most functional card — but option 2 unblocks me today. **Which?**

---

### D7 — "1 Live Visitor" · **affects Phase 1**

The footer shows a live visitor count with a pulsing dot. Real-time presence needs infrastructure (websockets or a polled analytics endpoint).

1. **Cut it** for now, keep the footer layout. *Recommended.*
2. **Build it properly** — small realtime service, ~half a day, plus a running cost.
3. Static "1 Live Visitor" text. **I won't do this** — it's a fake number on a page whose credibility is the product. Listed only so you know I considered and rejected it.

---

### D8 — Two things in the design that aren't in the brief

- **"Go to Store"** CTA and the Store card — where do these point? An existing product/store URL, or a placeholder?
- **"How I made this portfolio?"** in the footer — a separate page, an overlay, or an external link?

Not blocking; I'll use marked placeholders until you say.

---

## 13. Decisions I made without asking

For the record, so nothing is hidden: CSS Modules over Tailwind · no animation library until proven necessary · typed TS content over MDX · server-component homepage with client islands · no Safari toolbar chrome · one folder per experience · placeholders visibly marked in development · Figma treated as strictly read-only.
