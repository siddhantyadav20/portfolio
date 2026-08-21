# The words that are still missing

Everything here is content the site has a designed, working place for and no
text to put in it. The scaffolding is done: each answer drops into `content/`
as a string and needs no component changes.

I have not written any of it because `PROJECT.md:92` says never to invent
professional claims, metrics or outcomes — and every gap below is exactly that
kind of claim.

Ordered by what a recruiter hits first.

---

## 1. The About story — the biggest one

**Where:** `content/site.ts`, the `about` object. **Renders:** the modal behind
your portrait on the homepage.

A visitor who clicks your face currently reads the word "Placeholder" six
times. This is the site's answer to "who is this person", and it is the only
one.

Four of these render in ordinary finished styling with no placeholder marking
at all, so they read as deliberate copy:

- [ ] **Based in** — city
- [ ] **Currently** — role, company
- [ ] **Before that** — earlier chapters, in one line
- [ ] **Elsewhere** — which links you actually want here

And the prose:

- [ ] **Subtitle**, one sentence. Currently *"Placeholder — the real
      introduction goes here, in Siddhant's own words."* Note it is written
      about you in the third person; the rest of the site speaks as "I".
- [ ] **Paragraph 1** — the existing stand-in describes it as: the detour
      through engineering, watching inspectors work with gloves on, and why
      that became a habit of designing for the hand rather than the mouse. If
      that outline is right, it needs to be true and in your voice.
- [ ] **Paragraph 2** — the stand-in describes how you work: prototypes over
      specs, motion to explain rather than decorate, shipping the thing rather
      than the deck about the thing.

---

## 2. The Inspection case study — 49 words behind your most prominent card

**Where:** `content/work/inspection-photos.ts`, `sections: null`.

This is the first card on the page, it has a real prototype recording, all four
meta rows filled, and a headline metric. Then it ends with *"The full write-up
for this project is still being written."*

The `sections` array takes any number of `{ heading, body, media? }` blocks.
Three or four would be enough:

- [ ] **What was wrong with the old camera flow.** The intro says it "had never
      been designed to its full potential" — what did that mean in practice for
      someone holding the phone?
- [ ] **What you changed, and why that.** The decision, not the process.
- [ ] **How the 13 minutes were measured.** The claim is on the homepage in
      large type; a recruiter who is interested will want to know what it is
      measured against.
- [ ] **Screenshots?** The study currently has the prototype video and nothing
      else. Anything from the before/after would carry a lot here.

---

## 3. The Search case study — currently zero words

**Where:** `content/work/search.ts`. `body`, all four `meta` values, `hero` and
`sections` are all `null`.

This is the emptiest page on the site and it is prerendered, in the sitemap at
priority 0.8, and its share card renders an empty meta row. Pasted into Slack it
previews as a title and nothing.

- [ ] **The four meta rows**: Product, Role, Timeline, Skills.
- [ ] **An opening paragraph** — even three sentences changes this page
      completely.
- [ ] **Any hero image at all.** It is the one study with no artwork.
- [ ] **Where "104,122 remarks" comes from.** There is no dataset anywhere in
      the repo; it is display copy. Same for "~51m saved" and "Navigation first
      → Search first". These are the site's boldest numbers and the study that
      would substantiate them is the empty one.

> **Or:** consider cutting this study from the homepage and the sitemap until
> it exists. Two finished studies read better than three where one is blank.

---

## 4. Facts that disagree with each other

I did not change these, because picking a side asserts a fact.

- [ ] **"20,000+ properties daily"** (`content/site.ts`, the Inspection card)
      vs **"20,000+ inspections daily"** (`content/work/inspection-photos.ts`).
      Same claim, two different units. Which is it?
- [ ] **Years of experience.** `PROJECT.md` and the homepage timeline resolve to
      **5**; `content/canvas.ts` says **4.5** in three places and **5** in a
      fourth. One number, please.
- [ ] **`content/canvas.ts`** — the terminal's project lines carry outcome
      metrics ("task completion +40%", "drop-off −28%", "served 3 designers")
      that appear nowhere else on the site and have no study behind them. They
      are also on the playful surface rather than in the work — the opposite of
      what `PROJECT.md`'s Hiring Principle asks for. Keep, move, or cut?

---

## 5. Two judgement calls

- [ ] **The footer credit.** It currently ends the page with *"Designed on
      Figma. Built using Claude + Qwen."* `PROJECT.md:38` says the site must not
      feel AI-generated. Those two sit oddly together — it is the last thing a
      visitor reads. Entirely your call; I have left it exactly as written.
- [ ] **"Go to Store", "How I made this portfolio?", and the search
      field/category control** are designed, visible, and inert. They are now
      dimmed so they read as pending rather than broken, but the real question
      is whether they should ship at all in this state. The store link needs a
      destination; the search needs a dataset.

---

## What is already handled

For completeness, so you don't re-check these:

- The flagship study's opening line had `it's` for `its`, "based in US", a
  colon used as a comma, and "feature" for "features". Fixed.
- The footer's LinkedIn icon was inert; it now points at the same profile the
  LinkedIn card uses.
- The canvas terminal's LinkedIn link pointed at a slug that 404s. Fixed.
- `© 2026` was hardcoded; the footer now takes the year from the build clock.
- `"~ 51m saved"` / `"~51m saved"` spacing, and a hyphen where the site uses an
  em dash. Both fixed.
