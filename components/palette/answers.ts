import type { AnswerId, PaletteDestination } from "@/content/palette";
import { SHORTCUTS, profile, terminal } from "@/content/canvas";
import { about, canvas as canvasCard, designSystem, intro, linkedin, timeline } from "@/content/site";
import { STUDIES } from "@/content/work";

/* ===========================================================================
   The four questions, answered.

   Same rule as content/palette.ts, and it matters more here because this is
   prose-shaped: every *value* below is read out of content. What this file
   adds is row labels — "Status", "Where", "Email" — which are furniture, not
   claims. If a line here would tell a recruiter something the site does not
   already say somewhere, it does not belong in this file; it belongs in
   CONTENT-INTAKE.md as a question for Siddhant.

   The reason these exist at all: PROJECT.md's hiring principle lists five
   things a recruiter should come away knowing, and the site currently spreads
   them over a scroll, a modal, three routes and a pannable board. Answering
   them in place — no navigation, no page load — is the difference between a
   palette that is a menu and one that is worth remembering.
   =========================================================================== */

export type AnswerRow = {
  readonly label: string;
  readonly value: string;
  /** The quiet line under the value. */
  readonly note?: string;
  /** Makes the row activatable. */
  readonly to?: PaletteDestination;
};

export type Answer = {
  readonly title: string;
  /** One line under the title, when the content already has one. */
  readonly lead?: string;
  readonly rows: readonly AnswerRow[];
  /** The asterisk's other half, where a row carries an asterisk. */
  readonly footnote?: string;
};

/**
 * What has actually shipped, with the numbers attached.
 *
 * Deliberately the outcome tiles rather than the study titles: a title says
 * what a project was called and a tile says what changed, and only one of
 * those is an answer to the question. Studies with no outcomes yet show their
 * subtitle instead of a fabricated figure — the site's standing rule that a
 * visible gap beats plausible filler.
 */
function shipped(): Answer {
  const rows: AnswerRow[] = [];
  const notes: string[] = [];

  for (const study of STUDIES) {
    const items = study.outcomes?.items ?? [];
    if (study.outcomes?.note) notes.push(study.outcomes.note);

    if (items.length === 0) {
      rows.push({
        label: study.title,
        value: study.subtitle,
        to: { kind: "study", slug: study.slug },
      });
      continue;
    }

    for (const item of items) {
      rows.push({
        label: study.title,
        value: `${item.value} ${item.label.toLowerCase()}`,
        note: item.note,
        to: { kind: "study", slug: study.slug },
      });
    }
  }

  return {
    title: "What I’ve shipped",
    rows,
    footnote: notes.join(" "),
  };
}

/**
 * Design, or build.
 *
 * The honest answer is "both", and the site can only argue it by pointing at
 * things rather than asserting it — which is lucky, because pointing at things
 * is what this whole file does. The design system is the strongest single
 * exhibit: 281 tokens across 12 products is a number that only exists if
 * somebody sat in the seam between the two.
 */
function build(): Answer {
  return {
    title: "Design, or build",
    lead: profile.body[0],
    rows: [
      {
        label: "The seam",
        value: `${about.tools.map((t) => t.name).join(" · ")}`,
        note: "What the About card throws out on hover",
        to: { kind: "card", card: "about" },
      },
      {
        label: "A system, not a sticker sheet",
        value: designSystem.stat,
        note: designSystem.statDetail,
        to: { kind: "study", slug: designSystem.studySlug },
      },
      {
        label: "Tools",
        value: terminal.tools.join(", "),
        note: "From the terminal on the canvas",
        to: { kind: "canvas", widget: "terminal" },
      },
      {
        label: "Skills",
        value: terminal.skills.join(", "),
        to: { kind: "canvas", widget: "terminal" },
      },
      {
        label: "The board",
        value: canvasCard.cta,
        note: "Pan, zoom, and a terminal that answers back",
        to: { kind: "route", href: canvasCard.href },
      },
    ],
  };
}

/**
 * Availability.
 *
 * Every line here already exists on the site — inside the profile card on the
 * canvas, behind a pan and a zoom. CONTENT-INTAKE.md §6.2 calls this "the
 * single most useful line to a recruiter" and notes that it is currently the
 * hardest one to reach. This is the fix, and it is one keystroke.
 */
function available(): Answer {
  const now = timeline.entries[timeline.entries.length - 1];

  return {
    title: profile.status.text,
    lead: profile.body[1],
    rows: [
      { label: "Role", value: profile.role },
      { label: "Now", value: `${now.title} · ${now.context}` },
      { label: "Where", value: profile.location },
      {
        label: "Email",
        value: intro.email,
        to: { kind: "action", action: "copy-email" },
      },
      {
        label: "LinkedIn",
        value: linkedin.cta,
        to: { kind: "action", action: "linkedin" },
      },
      {
        label: "Résumé",
        value: "Download the CV",
        to: { kind: "action", action: "resume" },
      },
    ],
  };
}

/**
 * The board's keymap, which used to be a sheet of its own.
 *
 * `/` and `?` on the canvas open this instead now. One keymap, one surface,
 * and it gained a focus trap on the way: the old sheet rendered a
 * `role="dialog"` without using `useModalShell`, so Tab walked straight out of
 * it and into the canvas underneath.
 */
function shortcuts(): Answer {
  return {
    title: "Keyboard shortcuts",
    lead: "On the canvas.",
    rows: SHORTCUTS.map(([key, what]) => ({ label: key, value: what })),
  };
}

export function answerFor(id: AnswerId): Answer | null {
  switch (id) {
    case "shipped":
      return shipped();
    case "build":
      return build();
    case "available":
      return available();
    case "shortcuts":
      return shortcuts();
    case "tour":
      // Not a panel — it runs. See `tour.ts`.
      return null;
  }
}
