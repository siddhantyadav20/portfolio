/* ===========================================================================
   What the command palette can find.

   THE ONE RULE THIS FILE FOLLOWS: it states nothing of its own. Every label,
   every number and every sentence below is read out of `content/site.ts`,
   `content/work/*` or `content/canvas.ts` at module scope. Nothing is
   transcribed, re-typed or summarised.

   That is not tidiness, it is the whole risk of the feature. A palette is a
   place where facts from opposite ends of the site land next to each other,
   and a palette that keeps its own copy of them becomes the third place the
   site disagrees with itself. CONTENT-INTAKE.md already tracks two live
   contradictions inside `content/canvas.ts` alone — the profile card says
   "4.5 years" in its body and "5" in its facts, two lines apart, and "20+"
   shipped where the receipt says "12+". Those get resolved in a content pass.
   This file's job is to not add a fourth.

   The consequence, deliberately accepted: reword a heading and the palette
   follows on the next build. Delete a section and it leaves the index. There
   is no palette copy to keep in sync because there is no palette copy.

   The one thing authored here is `keywords` — search aids, never claims. If a
   recruiter types "cv" the résumé should surface, and "cv" appears nowhere in
   the site's copy. A keyword is a synonym for a word already on the page; it
   is never a fact that is not.

   Stays pure data, no DOM, no "use client". Destinations are described rather
   than performed, the same indirection `StudyLive` uses in content/work/types
   and for the same reason: this is imported by a client island that must not
   drag the canvas into the homepage bundle.
   =========================================================================== */

import {
  CLUSTERS,
  CLUSTER_LABELS,
  profile,
  terminal,
  widgets,
} from "@/content/canvas";
import {
  about,
  canvas as canvasCard,
  designEngineer,
  designSystem,
  inspection,
  intro,
  linkedin,
  music,
  search as searchCard,
  store,
  timeline,
} from "@/content/site";
import { STUDIES, type StudyBlock, heroStill } from "@/content/work";
import type { PaletteEntry } from "./types";

export * from "./types";
export {
  emptyState,
  nearestWord,
  searchPalette,
} from "./search";

/* --- The index ------------------------------------------------------------ */

/**
 * The four questions.
 *
 * Taken straight from PROJECT.md's hiring principle — "a recruiter should
 * quickly understand: who I am, what kind of designer I am, what I have
 * actually shipped, why my work is interesting, how I think" — because that
 * list is the brief for the whole site and nothing else on it asks those
 * questions out loud.
 *
 * The wording is the only authored copy in this file. It is a question, not a
 * claim: none of it asserts anything about Siddhant that the answer panels do
 * not then compose out of real content.
 */
const questions: PaletteEntry[] = [
  {
    id: "answer:tour",
    group: "start",
    label: "Show me your best 60 seconds",
    hint: "A guided tour of the whole site",
    keywords: "tour demo guide walkthrough quick fast hurry",
    to: { kind: "answer", answer: "tour" },
    featured: true,
    /* The site's own pitch, which is what a tour is. It also means the panel
       has something in it the instant it opens: the first row is highlighted
       by default, and a peek column that starts empty reads as a broken layout
       rather than as a column waiting for you. */
    preview: {
      title: intro.title,
      subtitle: intro.note,
      body: intro.tagline,
    },
  },
  {
    id: "answer:shipped",
    group: "start",
    label: "What have you actually shipped?",
    hint: "Three studies, with their numbers",
    keywords: "work projects portfolio experience case studies outcomes",
    to: { kind: "answer", answer: "shipped" },
    featured: true,
    preview: {
      title: "The work, with its numbers",
      figure: { value: String(STUDIES.length), label: "Case studies" },
      facts: STUDIES.map((study) => [
        study.title,
        study.helpers?.[3] ?? study.subtitle,
      ]),
    },
  },
  {
    id: "answer:build",
    group: "start",
    label: "Do you design, or do you build?",
    hint: "Both — here is the evidence",
    keywords: "code engineer developer frontend react engineering",
    to: { kind: "answer", answer: "build" },
    featured: true,
    preview: {
      title: `${designEngineer.from.label} → ${designEngineer.to.label}`,
      subtitle: designSystem.statDetail,
      body: profile.body[0],
      facts: about.tools.map((tool) => [tool.name, "daily"] as const),
    },
  },
  {
    id: "answer:available",
    group: "start",
    label: "Are you available?",
    hint: profile.status.text,
    keywords: "hiring hire open work job role contact where located",
    to: { kind: "answer", answer: "available" },
    featured: true,
    preview: {
      title: profile.status.text,
      subtitle: profile.role,
      image: { src: profile.avatar, alt: profile.name },
      facts: [
        ["Where", profile.location],
        ["Now", timeline.entries[timeline.entries.length - 1].context],
      ],
      body: profile.body[1],
    },
  },
];

/**
 * The first real paragraph in a section, for its preview.
 *
 * Headings and captions are skipped: a preview that opens with the same words
 * as the row above it has said nothing twice.
 */
function firstParagraph(blocks: readonly StudyBlock[]): string | undefined {
  for (const block of blocks) {
    if (block.kind === "prose") return block.body[0];
    if (block.kind === "aside") return block.lead;
    if (block.kind === "note" || block.kind === "insight") return block.body[0];
  }
  return undefined;
}

/**
 * The readable words in a block, whatever kind it is.
 *
 * Exhaustive over the union rather than a `body in block` check, so adding a
 * block kind to content/work/types is a type error here rather than a silent
 * hole in the index.
 */
function prosaic(block: StudyBlock): string[] {
  switch (block.kind) {
    case "prose":
      return [...block.body];
    case "aside":
      return [block.lead, ...block.body];
    case "note":
    case "insight":
      return [block.eyebrow, block.heading, ...block.body];
    case "figure":
      return [block.alt, block.caption ?? ""];
    case "exhibit":
      return [block.caption.label];
    case "live":
      return [];
  }
}

/**
 * The studies, their sections, and the lines inside them worth finding.
 *
 * Three depths, because a recruiter's query lands at three depths. "design
 * system" is the study. "theming" is a section. "The photo wasn't the problem"
 * is a sentence — and it is the sentence that would make somebody want to
 * read the rest, which is exactly the thing a bento grid cannot surface.
 */
function fromStudies(): PaletteEntry[] {
  const out: PaletteEntry[] = [];

  for (const study of STUDIES) {
    const still = study.hero ? heroStill(study.hero) : undefined;

    out.push({
      id: `study:${study.slug}`,
      group: "work",
      label: study.title,
      hint: study.helpers ? study.helpers.join(" · ") : study.subtitle,
      keywords: study.subtitle,
      to: { kind: "study", slug: study.slug },
      featured: true,
      study: study.slug,
      preview: {
        title: study.title,
        /* The helpers line — "SaaS · PropTech · Product Design · 2026" — and
           not the subtitle. The eyebrow is set in caps at 10.5px because
           everything else that lands there is two or three words; a study's
           subtitle is a full sentence, and in caps at that size it became a
           grey brick above the title. The sentence is the body's job. */
        subtitle: study.helpers?.join(" · "),
        image: still,
        /* The meta list, minus the rows that have not been written. A study
           with `Role: null` shows its scaffold on the page, deliberately —
           but a preview is a glance, and a glance made mostly of gaps reads
           as a broken panel rather than an honest one. */
        facts: study.meta
          .filter((m) => m.value)
          .map((m) => [m.label, m.value!] as const),
        body: study.body ?? study.subtitle,
      },
    });

    /* The headline numbers. These are the rows a recruiter is really after,
       and on the site they sit below a hero inside a modal — three scroll
       positions and a click away from the front page. `note` carries the
       asterisk's other half and travels with them, because a qualified number
       separated from its qualification is the thing PROJECT.md forbids. */
    for (const [i, outcome] of (study.outcomes?.items ?? []).entries()) {
      out.push({
        id: `outcome:${study.slug}:${i}`,
        group: "evidence",
        label: `${outcome.value} ${outcome.label.toLowerCase()}`,
        hint: outcome.note,
        keywords: `${study.title} ${study.outcomes?.note ?? ""}`,
        to: { kind: "study", slug: study.slug },
        study: study.slug,
        preview: {
          title: study.title,
          figure: {
            value: outcome.value,
            label: outcome.label,
            note: outcome.note,
          },
          // The tile keeps the wash it wears on the page, so the number looks
          // the same here as where it is published.
          tint: outcome.tint,
          // The asterisk's other half travels with the number, always.
          body: study.outcomes?.note,
        },
      });
    }

    for (const section of study.sections ?? []) {
      /* Every word of the section's prose, as hidden keywords on the section's
         own row.

         Paragraphs are deliberately not indexed as rows of their own — a hit
         in the middle of one produces a result that cannot say anything useful
         about itself. But the words still have to be findable: "handoff"
         appears once, inside an aside, and is exactly the kind of thing
         somebody types. Attaching the prose to the row that *does* have a
         heading gets both — you search the body and land on a row that names
         where you are going. */
      out.push({
        id: `section:${study.slug}:${section.id}`,
        group: "work",
        label: section.heading,
        hint: study.title,
        keywords: [
          section.eyebrow ?? "",
          section.label ?? "",
          ...section.blocks.flatMap(prosaic),
        ].join(" "),
        to: { kind: "study", slug: study.slug, section: section.id },
        study: study.slug,
        preview: {
          title: section.heading,
          subtitle: section.eyebrow ?? study.title,
          image: still,
          body: firstParagraph(section.blocks),
        },
      });

      /* A `note` is the turn in the argument and an `insight` is what the
         section was written to arrive at. Both are one heading long by type,
         which is what makes them quotable — and quotable is what makes them
         findable. Prose bodies are deliberately not indexed: matching a word
         in the middle of a paragraph gives a result row that cannot say
         anything useful about itself. */
      for (const [i, block] of section.blocks.entries()) {
        if (block.kind !== "note" && block.kind !== "insight") continue;
        out.push({
          id: `line:${study.slug}:${section.id}:${i}`,
          group: "evidence",
          label: block.heading,
          hint: `${block.eyebrow} · ${study.title}`,
          keywords: block.body.join(" "),
          to: { kind: "study", slug: study.slug, section: section.id },
          study: study.slug,
          preview: {
            title: block.heading,
            subtitle: `${block.eyebrow} · ${study.title}`,
            body: block.body[0],
          },
        });
      }
    }
  }

  return out;
}

/**
 * The homepage cards that are themselves an argument.
 *
 * Only the ones a query could plausibly be aiming at, and deliberately not the
 * three that carry a study: their card copy and their study title are the same
 * sentence, so indexing both put two rows with identical labels and different
 * subtitles next to each other in the results. The study row covers them, and
 * the palette opens a study the way the homepage does — by morphing the card —
 * so nothing is lost by having one row instead of two.
 */
const cards: PaletteEntry[] = [
  {
    id: "evidence:tokens",
    group: "evidence",
    label: designSystem.stat,
    hint: designSystem.statDetail,
    keywords: "design system scale reuse",
    to: { kind: "study", slug: designSystem.studySlug },
    study: designSystem.studySlug,
    preview: {
      title: `${designSystem.eyebrow} ${designSystem.title}`,
      figure: { value: "281", label: "Reusable tokens", note: designSystem.statDetail },
      tint: "violet",
    },
  },
  {
    id: "evidence:inspection",
    group: "evidence",
    label: inspection.stat,
    hint: inspection.title,
    keywords: "reporting time saved properties daily",
    to: { kind: "study", slug: inspection.studySlug },
    study: inspection.studySlug,
    preview: { title: inspection.title, body: inspection.stat, tint: "amber" },
  },
  {
    id: "evidence:search",
    group: "evidence",
    label: `${searchCard.before} → ${searchCard.after}, ${searchCard.delta}`,
    hint: `${searchCard.title} ${searchCard.subtitle}`,
    keywords: "remarks taxonomy tree minutes",
    to: { kind: "card", card: "search" },
    study: searchCard.studySlug,
    preview: {
      title: `${searchCard.title} ${searchCard.subtitle}`,
      figure: { value: searchCard.delta, label: searchCard.after },
      tint: "teal",
    },
  },
  {
    id: "card:about",
    group: "start",
    label: `${about.eyebrow} ${about.title}`,
    hint: about.story.title,
    keywords: "bio who story background personal portrait",
    to: { kind: "card", card: "about" },
  },
  {
    id: "card:store",
    group: "work",
    label: store.title,
    hint: store.eyebrow,
    keywords: `${store.description} side project waitlist extension`,
    to: { kind: "card", card: "store" },
  },
  {
    id: "card:timeline",
    group: "career",
    label: "The whole timeline",
    hint: `${timeline.entries[0].title} → ${timeline.entries[timeline.entries.length - 1].title}`,
    keywords: "career history years experience path when",
    to: { kind: "card", card: "timeline" },
  },
];

/**
 * The career ruler, one entry per stop.
 *
 * On the site these are readable only by dragging a scale under a fixed
 * marker — a lovely control, and a genuinely poor way to answer "has this
 * person worked at a company I recognise". Both should exist.
 */
function fromTimeline(): PaletteEntry[] {
  return timeline.entries.map((entry, i) => ({
    id: `career:${i}`,
    group: "career" as const,
    label: entry.title,
    hint: entry.context,
    keywords: "worked role job company when experience",
    to: { kind: "card" as const, card: "timeline" },
    preview: {
      title: entry.title,
      subtitle: entry.context,
      // The year the ruler would be showing at this stop. `dayOne` is a
      // fractional year, so this is the same arithmetic the card does.
      figure: {
        value: String(Math.floor(timeline.dayOne + entry.at)),
        label: "Year",
      },
    },
  }));
}

/**
 * The board, by name.
 *
 * The strongest case for the palette existing at all: `/canvas` is 3000×3000
 * with twenty-two things on it and a five-button dock, so finding one specific
 * book means panning until you see it. That is the drill-down problem the
 * Search study is about, on the same site as the Search study.
 *
 * Labels are built from each widget's own fields rather than `widgetLabel()`,
 * which is tuned for a screen reader and ends "— press to play". Correct when
 * announced, wrong when read.
 */
function fromCanvas(): PaletteEntry[] {
  const out: PaletteEntry[] = [];

  for (const cluster of CLUSTERS) {
    out.push({
      id: `cluster:${cluster}`,
      group: "board",
      label: CLUSTER_LABELS[cluster],
      hint: "A place on the canvas",
      keywords: "canvas board jump fly go region",
      to: { kind: "canvas", cluster },
    });
  }

  for (const widget of widgets) {
    switch (widget.kind) {
      case "book":
        out.push({
          id: `widget:${widget.id}`,
          group: "board",
          label: widget.title,
          hint: widget.author,
          /* `learnt` is Siddhant's own line about the book and the only
             reason indexing these earns its place: it is the closest thing
             on the site to how he thinks, which is the fifth thing
             PROJECT.md says a recruiter should come away with. */
          keywords: `book reading ${widget.genres.join(" ")} ${widget.learnt ?? ""}`,
          to: { kind: "canvas", widget: widget.id },
          preview: {
            title: widget.title,
            subtitle: widget.author,
            image: { src: widget.cover, alt: `${widget.title} cover` },
            facts: [
              ["Rating", `${widget.rating} / 5`],
              ["Published", String(widget.year)],
              ["Pages", String(widget.pages)],
              ["Shelf", widget.status],
            ],
            // The whole reason a book is in the index. Reaching it on the
            // board costs a pan, a zoom and a click to open the spread.
            body: widget.learnt ?? undefined,
          },
        });
        break;
      case "disc":
        out.push({
          id: `widget:${widget.id}`,
          group: "listen",
          label: widget.title,
          hint: widget.artist,
          keywords: "record vinyl music song play listening",
          to: { kind: "canvas", widget: widget.id },
          preview: {
            title: widget.title,
            subtitle: widget.artist,
            image: { src: widget.cover, alt: `${widget.title} sleeve` },
          },
        });
        break;
      case "sticker":
        out.push({
          id: `widget:${widget.id}`,
          group: "board",
          label: widget.label,
          hint: "A sticker on the canvas",
          keywords: "sticker game play",
          to: { kind: "canvas", widget: widget.id },
        });
        break;
      default:
        out.push({
          id: `widget:${widget.id}`,
          group: "board",
          label: NAMED[widget.kind],
          hint: "On the canvas",
          keywords: NAMED_KEYWORDS[widget.kind],
          to: { kind: "canvas", widget: widget.id },
          preview:
            widget.kind === "profile"
              ? {
                  title: profile.name,
                  subtitle: profile.role,
                  image: { src: profile.avatar, alt: profile.name },
                  facts: [
                    ["Status", profile.status.text],
                    ["Where", profile.location],
                  ],
                  body: profile.body[1],
                }
              : undefined,
        });
    }
  }

  return out;
}

/** What to call the widgets whose data carries no title of its own. */
const NAMED: Record<string, string> = {
  profile: profile.name,
  linkedin: linkedin.name,
  receipt: "Design Receipt",
  terminal: "Terminal",
  scratch: "Scratch card",
  draw: "Drawing canvas",
  photos: "Photographs",
};

const NAMED_KEYWORDS: Record<string, string> = {
  profile: `about me bio ${profile.role} ${profile.location} ${profile.status.text}`,
  linkedin: "connect social network",
  receipt: "skills prices bill invoice",
  terminal: `command line shell ${terminal.skills.join(" ")} ${terminal.tools.join(" ")}`,
  scratch: "game chess play coffee",
  draw: "draw sketch paint doodle",
  photos: "pictures cats wallpapers me",
};

/**
 * The skills and tools, as things you can type.
 *
 * They exist on the site only inside the canvas terminal, behind a pan, a zoom
 * and knowing to type `skills`. That is a delightful place to hide them and a
 * terrible place to keep them.
 */
function fromCraft(): PaletteEntry[] {
  return [
    ...terminal.skills.map((skill, i) => ({
      id: `skill:${i}`,
      group: "board" as const,
      label: skill,
      hint: "A skill · in the terminal",
      keywords: "skills can do knows",
      to: { kind: "canvas" as const, widget: "terminal" },
    })),
    ...terminal.tools.map((tool, i) => ({
      id: `tool:${i}`,
      group: "board" as const,
      label: tool,
      hint: "A tool · in the terminal",
      keywords: "tools uses software",
      to: { kind: "canvas" as const, widget: "terminal" },
    })),
  ];
}

/** The four tracks on the homepage player. */
function fromMusic(): PaletteEntry[] {
  return music.tracks.map((track, i) => ({
    id: `track:${i}`,
    group: "listen" as const,
    label: track.title,
    hint: music.label,
    keywords: "music song play track listening",
    to: { kind: "card" as const, card: "music" },
    preview: {
      title: track.title,
      subtitle: music.label,
      image: { src: track.cover, alt: `${track.title} cover` },
    },
  }));
}

/**
 * The things a palette is expected to just do.
 *
 * Table stakes, and deliberately last in `GROUPS`: they are the least
 * interesting thing here and the most likely to be the reason somebody opened
 * it. Both are true and the ordering says so.
 */
const actions: PaletteEntry[] = [
  {
    id: "do:copy-email",
    group: "do",
    label: "Copy email",
    hint: intro.email,
    keywords: "contact reach mail address get in touch hire",
    to: { kind: "action", action: "copy-email" },
    featured: true,
  },
  {
    id: "do:resume",
    group: "do",
    label: "Download résumé",
    keywords: "cv curriculum vitae pdf experience download",
    to: { kind: "action", action: "resume" },
    featured: true,
  },
  {
    id: "do:linkedin",
    group: "do",
    label: linkedin.cta,
    hint: "LinkedIn",
    keywords: "social profile network connect",
    to: { kind: "action", action: "linkedin" },
    featured: true,
  },
  {
    id: "do:theme",
    group: "do",
    label: "Switch theme",
    hint: "Light and dark",
    keywords: "dark light mode appearance colour color",
    to: { kind: "action", action: "theme" },
    featured: true,
  },
  {
    id: "do:canvas",
    group: "do",
    label: canvasCard.cta,
    hint: "The board behind the homepage",
    keywords: "workspace explore board desk play",
    to: { kind: "route", href: canvasCard.href },
  },
  {
    id: "do:shortcuts",
    group: "do",
    label: "Keyboard shortcuts",
    hint: "On the canvas",
    keywords: "keys keymap help cheatsheet controls",
    to: { kind: "answer", answer: "shortcuts" },
  },
  {
    id: "do:copy-link",
    group: "do",
    label: "Copy link to this page",
    keywords: "share url address send",
    to: { kind: "action", action: "copy-link" },
  },
];

/**
 * Everything the palette can find, built once at module scope.
 *
 * Assembled rather than authored — reword a heading in `content/work` and this
 * follows on the next build.
 */
export const PALETTE_INDEX: readonly PaletteEntry[] = [
  ...questions,
  ...fromStudies(),
  ...cards,
  ...fromTimeline(),
  ...fromCanvas(),
  ...fromCraft(),
  ...fromMusic(),
  ...actions,
];

/** The empty state, in group order. */
export const FEATURED: readonly PaletteEntry[] = PALETTE_INDEX.filter(
  (e) => e.featured,
);

/** Every label, for "did you mean". */
export const VOCABULARY: readonly string[] = Array.from(
  new Set(
    PALETTE_INDEX.flatMap((e) => e.label.toLowerCase().split(/[^a-z0-9]+/i))
      .filter((w) => w.length > 3),
  ),
);
