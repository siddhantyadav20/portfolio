import type { CaseStudy } from "./types";

/**
 * Inspection — the flagship study, and the only one with a running prototype.
 *
 * Migrated out of `content/site.ts` (where it lived as `inspection.caseStudy`)
 * without changing the slug: `?study=inspection-photos` links are already
 * shareable from the modal's copy button, and some may exist.
 *
 * Every string below is transcribed from Figma "Case Study - Modal"
 * (node 62:3688), which is the redesign of this reader rather than a new
 * document — so a few things moved rather than appearing:
 *
 *   · `title` is now the study's own line ("When you observe, you document")
 *     rather than the homepage card's headline. The card keeps its own copy in
 *     `content/site.ts`, which is why the two were never the same string.
 *   · The four-row meta list is superseded on the page by `helpers`. It stays
 *     in the data because the share card still renders it — see the study's
 *     `opengraph-image.tsx`, which lays out the first three filled rows.
 *   · The old opening paragraph is gone from the design, and with it from
 *     `body`. It read: "In early 2026, after launching an offline-first mobile
 *     app for conducting home inspections for inspectors based in the US in
 *     early 2025, we set out to redesign the camera flow — one of the most
 *     crucial and most heavily used features, and one that had never been
 *     designed to its full potential." Kept here rather than deleted, because
 *     it is the only place the 2025 launch is written down.
 *
 * The write-up is about a third of the way through: the intro and The Problem
 * are finished, How Might We is a heading with nothing under it yet, and the
 * two sections after it are not written. The rail at the left edge shows all
 * of them, so the shape of the argument is visible before the words are.
 */
export const inspectionPhotos: CaseStudy = {
  slug: "inspection-photos",
  title: "When you observe, you document",
  subtitle:
    "Redesigning how home inspectors capture, organise and turn visual " +
    "evidence into a report. Moving the camera from a standalone capture " +
    "tool into a context-aware part of the inspection workflow.",

  helpers: ["SaaS", "PropTech", "Product Design", "2026", "10 min read"],

  body: null,

  outcomes: {
    items: [
      {
        value: "*35 minutes",
        label: "LESS TIME",
        note: "to documenting observations",
        tint: "amber",
      },
      {
        value: "52",
        label: "FEWER CLICKS",
        note: "to add 18 remarks on average",
        tint: "teal",
      },
      {
        value: "89%",
        label: "ADOPTION",
        note: "of ML assisted remarks",
        tint: "violet",
      },
    ],
    note:
      "*Metrics reflect the broader Winspect redesign and are not attributed " +
      "solely to the camera workflow",
  },

  meta: [
    { label: "Product", value: "iOS, iPad + Android" },
    { label: "Role", value: "Product Designer" },
    { label: "Timeline", value: "Jan 2026 - Mar 2026" },
    {
      label: "Skills",
      value:
        "Product design, Stakeholder management, Interactive prototyping, User research & testing",
    },
  ],

  hero: {
    kind: "prototype",
    plate: "/media/inspection-modal-bg.jpg",
    plateAlt: "A house being inspected",
    width: 2240,
    height: 1400,
    morphName: "inspection-frame",
    caption: { index: "0.1", label: "The final flow", tag: "PROTOTYPE" },
  },

  sections: [
    {
      id: "the-problem",
      eyebrow: "THE PROBLEM",
      label: "The Problem",
      heading: "Inspectors don't take photos. They collect evidence.",
      blocks: [
        {
          kind: "aside",
          lead: "The request was simple. The problem wasn't.",
          body: [
            "The original request was straightforward: make it easier for inspectors to add multiple photos to an observation. But tracing the existing workflow revealed that we weren't solving a camera problem. We were solving a handoff problem.",
          ],
          figure: {
            src: "/media/inspection-jira.png",
            alt: "Two tickets in the Winspect backlog: one asking for categorisation inside the camera flow, one for a Zillow integration",
            width: 1664,
            height: 252,
            caption: { index: "1.1", label: "JIRA backlog", tag: "IMAGE" },
            /* The board is real and its ticket titles are not the two this
               story is about, so they are covered over rather than the whole
               figure being faked. Fractions of the 832x120 frame it is drawn
               in — see `StudyOverlay`. */
            overlays: [
              {
                text: "Allow categorisation on the camera flow by allowing inspectors to choose insp...",
                left: 108 / 832,
                top: 32 / 120,
                width: 397 / 832,
                height: 24 / 120,
              },
              {
                text: "Zillow Integration <> Automatically add property details using zillow’s info",
                left: 113 / 832,
                top: 60 / 120,
                width: 397 / 832,
                height: 24 / 120,
              },
            ],
          },
        },

        {
          kind: "exhibit",
          view: "inspection-split-flow",
          caption: {
            index: "1.2",
            label: "The existing camera",
            tag: "PROTOTYPE + FLOW ANALYSIS",
          },
        },

        {
          kind: "note",
          eyebrow: "THE REAL PROBLEM",
          heading: "The photo wasn't the problem. What happened after it was",
          body: [
            "The inspector wasn't struggling to take photos. They were being asked to organise evidence too early.",
            "An issue is easiest to document while it's still in front of you. But the workflow separated capture from documentation: forcing inspectors to remember what they had seen, find the right remark, and attach the right images later.",
          ],
        },

        {
          kind: "insight",
          eyebrow: "THE INSIGHT",
          heading:
            "The inspector already knows what they're looking at when they capture it",
          /* Figma repeats the heading verbatim as the first line of this
             panel's body. Left in, the same sentence reads twice in a row and
             looks like a bug rather than emphasis, so only the second line
             survives here. */
          body: [
            "We were asking the product to forget it, and the inspector to remember it later.",
          ],
        },
      ],
    },

    {
      id: "how-might-we",
      eyebrow: "HOW MIGHT WE",
      label: "How Might We",
      heading:
        "Connect capture and documentation without slowing the inspection?",
      blocks: [],
    },
  ],
};
