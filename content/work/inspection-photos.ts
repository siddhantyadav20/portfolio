import type { CaseStudy, StudySource } from "./types";

/**
 * Inspection — the flagship study, and the only one with a running prototype.
 *
 * Now the Report Writing Ecosystem: Figma "Report Writing Tool - Case Study
 * Modal - Desktop" (node 1617:8921), every string transcribed from it. It
 * replaced the camera study that lived under this slug, and the slug stayed:
 * `?study=inspection-photos` and `/work/inspection-photos` links are already
 * out in the world, and the homepage card, its morph and the hero recording
 * are the same app either way.
 *
 * What the file has that this does not, on purpose:
 *
 *   · A second copy of the timeline canvas (1617:9636), 320x240, floating
 *     over the right margin beside the version strip. It is outside the
 *     content frame and overlaps the page edge — a sketch of the diagram,
 *     not part of the page.
 *   · Hidden connector lines and a hidden category dropdown on the comment
 *     box. Hidden in the file, so hidden here.
 *
 * Three numbers in the frame do not agree with each other or with the rest of
 * the site, and are transcribed as drawn rather than reconciled here: 10,000+
 * inspectors in the subtitle, 12,397 migrated on the card, 2,172 moved in
 * "A pile up of constraints"; and ~43 minutes of reporting time where the
 * Search study and the CV say 40.
 */

/** The four evidence sources the frame attributes things to. */
const zoom = {
  logo: "/media/report-writing/logo-zoom.png",
  tone: "zoom",
} as const;
const forms = {
  logo: "/media/report-writing/logo-forms.png",
  tone: "forms",
} as const;
const reddit = {
  logo: "/media/report-writing/logo-reddit.png",
  tone: "reddit",
} as const;
const gopro = {
  logo: "/media/report-writing/logo-gopro.png",
  tone: "gopro",
} as const;

const survey: StudySource = { name: "Survey", ...forms };

/** The app's home screen — the still in all three phones of 3.1. */
const homeScreen = {
  src: "/media/report-writing/home-screen.png",
  alt: "WINspect's inspection home: a Full Home Inspection at W123 Main St, the recommended next step (Kitchen), and a row of suggestions waiting for approval",
  width: 726,
  height: 1574,
};

export const inspectionPhotos: CaseStudy = {
  slug: "inspection-photos",
  title: "Report Writing Ecosystem",
  subtitle:
    "This case study covers how we moved 10,000+ home inspectors in US off " +
    "a decade-old legacy platform onto an ecosystem we built from scratch " +
    "without breaking a single day of their work.",

  accent: "blue",

  helpers: ["SaaS", "PropTech", "Product Design", "2023 - Now", "15 min read"],

  body: null,

  outcomes: {
    look: "sky",
    items: [
      {
        value: "~43 mins",
        label: "Reporting Time",
        note: "down from ~4 hrs on ISN (Legacy Platform)",
        fineprint: "*Measured via SmartLook and Database",
        icon: "/icons/timer.svg",
      },
      {
        value: "12,397",
        label: "Inspectors Migrated",
        note: "before the sunset date, 0.2% rollback",
        icon: "/icons/briefcase-tick.svg",
      },
      {
        value: "1,113",
        label: "Daily Inspections",
        note: "conducted over 40+ states across the US currently",
        icon: "/icons/chart.svg",
      },
    ],
  },

  meta: [
    { label: "Product", value: "iOS, iPad + Android" },
    { label: "Role", value: "Product Designer" },
    { label: "Timeline", value: "2023 – Now" },
    {
      label: "Skills",
      value:
        "Product design, Stakeholder management, Interactive prototyping, User research & testing",
    },
  ],

  /* The map's stops are the strip's own journey — "MVP → v1 → v2 →
     Current" — with the two phases the study spends most of its length on put
     in front of it, starting where the inspectors started: on ISN. Every note
     is a line the study already says somewhere, not a new one. */
  journey: {
    after: "timeline",
    stops: [
      { label: "ISN", note: "Legacy tool", section: "timeline" },
      {
        label: "Discovery",
        note: "1,031 responses · 74 interviews",
        section: "the-discovery",
      },
      {
        label: "Synthesis",
        note: "Flexibility and Muscle Memory",
        section: "the-synthesis",
      },
      { label: "MVP", note: "Adapt the workflow", section: "the-products" },
      { label: "Version 1", note: "Learn from real users" },
      { label: "Version 2", note: "Give inspectors more control" },
      { label: "Current", note: "Assist the inspectors" },
    ],
  },

  hero: {
    kind: "prototype",
    plate: "/media/inspection-modal-bg.jpg",
    plateAlt: "A house being inspected",
    width: 2240,
    height: 1400,
    morphName: "inspection-frame",
    caption: {
      index: "0.1",
      label: "Report Writing App - LIVE",
      tag: "PROTOTYPE",
    },
  },

  sections: [
    {
      id: "timeline",
      eyebrow: "THE 60s VERSION",
      label: "Timeline",
      icon: "/icons/calendar-2.svg",
      heading: "Project Timeline",
      headingNote: "MVP  →  v1  →  v2  →  Current",
      blocks: [
        {
          kind: "timeline",
          timeline: {
            months: [
              "Jul 2023",
              "Aug 2023",
              "Sep 2023",
              "Oct 2023",
              "Nov 2023",
              "Dec 2023",
              "Jan 2024",
              "Feb 2024",
              "Mar 2024",
            ],
            bars: [
              {
                label: "ISN",
                note: "Legacy tool (used ~10 years)",
                x: 24,
                y: 78,
                width: 680,
              },
              {
                label: "ISN",
                note: "Legacy tool (used ~10 years)",
                x: 734,
                y: 78,
                width: 680,
              },
            ],
            phases: [
              {
                icon: "/icons/microscope.svg",
                title: "Discovery",
                items: [
                  "Legacy workflow audit",
                  "Competitor Research",
                  "Surveys",
                  "1-1 & Focus Group Interviews",
                ],
                x: 24,
                y: 150,
              },
              {
                icon: "/icons/microscope.svg",
                title: "Discovery",
                items: [
                  "Legacy workflow audit",
                  "Competitor Research",
                  "Surveys",
                  "1-1 & Focus Group Interviews",
                ],
                x: 192,
                y: 290,
              },
            ],
            arrows: [{ x: 560, y: 235, length: 16 }],
          },
          caption: {
            index: "1.1",
            label: "Project Process within Timeline",
            tag: "SCROLLER",
          },
        },
      ],
    },

    {
      id: "the-discovery",
      eyebrow: "THE DISCOVERY",
      label: "The Discovery",
      heading:
        "First we investigated the source. Then we went to the people who lived in it.",
      rhythm: "tight",
      measure: "full",
      blocks: [
        {
          kind: "panel",
          intro: [
            { strong: "ISN's report writer:" },
            " a decade of accumulated structure. ",
            { strong: "Every one of these fields is someone's habit." },
          ],
          media: {
            src: "/media/report-writing/isn-report-writer.png",
            alt: "ISN's report writer: a template's section tree down the left, and the Air Conditioning section open on the right with its type, manufacturer, location and operation fields, each with its own remarks search",
            width: 1944,
            height: 944,
          },
          radius: 16,
          aspect: "1056 / 510",
          caption: {
            index: "2.1",
            label: "ISN's Product Sneak-peek",
            tag: "IMAGE",
          },
        },

        {
          kind: "aside",
          lead: "The ISN(Legacy) Audit",
          body: [
            "Before designing anything, we mapped what ten years of accumulated structure actually looked like: \n" +
              "29 templates, 500+ sub-categories, 7,016,823 remarks.\n" +
              "Understanding what inspectors would lose mattered more than imagining what they'd gain.",
          ],
        },

        {
          kind: "stats",
          heading: "Then the inspectors",
          cards: [
            {
              value: "1031",
              label: "Feedbacks collected",
              source: survey,
              body: "To size the pain: which parts of report writing cost the most time, at scale.",
            },
            {
              value: "74",
              label: "Users interviewed",
              source: { name: "1-1 & Group Interview", ...zoom },
              body: "To find the workflow beneath the workflow: the notepads, workarounds and personal systems inspectors built around ISN's gaps.",
            },
            {
              value: "3",
              label: "Go-Pro Inspections Studied",
              source: { name: "GoPro", ...gopro },
              body: "To see what nobody reports in an interview: where hands are full, gloves are on, and the phone goes in a pocket.",
            },
          ],
        },

        {
          kind: "panel",
          media: {
            src: "/media/report-writing/gopro-basement.jpg",
            alt: "A GoPro frame from an inspection in a basement: the inspector has gloves on, his phone pocketed and a paper checklist out, and there is no signal down there",
            width: 1672,
            height: 941,
          },
          radius: 24,
          badge: { label: "GoPro", logo: gopro.logo },
          caption: {
            index: "2.2",
            label: "In the field",
            tag: "GO PRO RECORDING",
          },
        },
      ],
    },

    {
      id: "the-synthesis",
      eyebrow: "THE SYNTHESIS",
      label: "The Synthesis",
      heading: "This wasn't a redesign. It was a migration with no safety net.",
      blocks: [
        {
          kind: "aside",
          lead: "The reframe",
          body: [
            [
              "We went in assuming inspectors hated ISN. They didn't. They hated the friction — the lag, the 500-category scavenger hunt, the web app that crashed on an iPad mid-inspection. The structure itself had become muscle memory they relied on.\n\n",
              {
                strong:
                  "That distinction rewrote our brief. We weren't designing an escape from ISN. We were designing a faster body for habits that already worked to bring the inspectors over, to then ship other things that’d complement the workflow that already worked.",
              },
            ],
          ],
        },

        {
          kind: "aside",
          lead: "A pile up of constraints",
          body: [
            "Moving 2,172 inspectors to an entirely new product meant designing inside a tight timeline with feedback loops, onboarding, data recovery and training running in parallel.\n" +
              "I argued for, and we committed to an offline-first mobile app as the MVP.\n\n" +
              "It was the harder engineering path, but it was the only one that matched how inspections actually happen. That decision came with its own pile-up:",
          ],
        },

        {
          kind: "constraints",
          items: [
            {
              icon: "/icons/teacher.svg",
              lead: "A decade of muscle memory,",
              body: "inspectors had spent over 10 years using the legacy platform. The redesign had to improve efficiency without forcing users to relearn how they inspected homes.",
            },
            {
              icon: "/icons/cloud-remove.svg",
              lead: "Offline wasn't optional,",
              body: "inspections often happened in areas with unreliable connectivity. Reports, photos and remarks needed to work locally first and sync reliably once a connection became available.",
            },
            {
              icon: "/icons/data-2.svg",
              lead: "Flexible inspection workflows,",
              body: "no two inspectors followed the same sequence. The product had to support multiple ways of documenting an inspection rather than enforcing a rigid workflow.",
            },
            {
              icon: "/icons/calendar-tick.svg",
              lead: "Fixed migration timeline,",
              body: "the legacy platform had a defined sunset date. We needed to ship a stable MVP quickly, then improve the experience through production feedback and phased rollouts.",
            },
            {
              icon: "/icons/lock.svg",
              lead: "Complex inspection ecosystem,",
              body: "the mobile app wasn't the only product. Every decision had to align with template management, reporting, interactive reports, CRM integrations and future web support.",
            },
            {
              icon: "/icons/briefcase.svg",
              lead: "Multiple stakeholders,",
              body: "every feature balanced feedback from inspectors, SMEs, engineering, product managers and executive leadership, each with different priorities, expectations and opinions which we had to prioritise and say NO to.",
            },
          ],
          last: {
            icon: "/icons/note.svg",
            lead: "Template & remarks.",
            body: "Our biggest challenge. Managing 29 different templates with remarks from 40+ states with different requirements for each.",
          },
        },

        {
          kind: "challenge",
          eyebrow: "THE CHALLENGE",
          heading: "Flexibility and Muscle Memory",
          body: "Build one flexible system that serves 29 templates across 40+ states: Usable offline in a basement, learnable in minutes by people with ten years of muscle memory, and shipped before a sunset date we didn't control.",
        },

        {
          kind: "aside",
          lead: "Three themes from 1,031 responses and 74 interviews",
          spacing: "loose",
          body: [
            {
              kind: "quotes",
              look: "sky",
              groups: [
                {
                  heading: "Time pressure is commercial, not personal.",
                  body: "Clients expect same-day reports; every hour of writing time is business risk.",
                  quotes: [
                    {
                      text: "My clients want the report on the same day, and it brings a negative impact on my business when i’m not able to do so.",
                      source: "1-1 Interview",
                      channel: "Zoom",
                      ...zoom,
                    },
                    {
                      text: "It’s so difficult to train my additional inspectors. I get so many inspections calls but have to turn them down as it takes so long to complete even two in a day.",
                      source: "Survey",
                      channel: "Google Forms",
                      ...forms,
                      mark: false,
                    },
                  ],
                },
                {
                  heading: "The tool loses people mid-task.",
                  body: "Inspectors got lost navigating 500+ categories while physically walking a house.",
                  quotes: [
                    {
                      text: "I messed around with it during beta testing…hated it. Wasn’t intuitive and it felt clunky. I’m not sure if they worked out the kinks or not.",
                      source: "Reddit",
                      channel: "r/HomeInspectors",
                      ...reddit,
                    },
                    {
                      text: "I often find myself getting lost within the application, it becomes frustrating after a point. I have 500+ categories to go through for each inspection report.",
                      source: "1-1 Interview",
                      channel: "Zoom",
                      ...zoom,
                    },
                  ],
                },
              ],
            },

            [
              "One thing that really surprised us was that we were considering the inspectors as not tech-savvy but it changed the minute we entered the first interview.\n\n",
              {
                strong:
                  "The workflows they maintained and learnt to work around for over 10 years surprised us.",
              },
            ],
          ],
        },
      ],
    },

    {
      id: "the-products",
      eyebrow: "THE PRODUCTS & their jobs",
      label: "The Products",
      heading: "Winspect’s evolution into an ecosystem",
      rhythm: "tight",
      blocks: [
        {
          kind: "versions",
          active: 0,
          items: [
            { kicker: "Adapt the workflow", label: "Version 0: MVP" },
            { kicker: "Learn from real users", label: "Version 1" },
            { kicker: "Give inspectors more control", label: "Version 2" },
            { kicker: "Assist the inspectors", label: "Current" },
          ],
        },

        {
          kind: "aside",
          lead: "MVP: Adapting to the inspectors",
          body: [
            'With a fixed sunset date, the question was never "what can we build?", it was "what can we responsibly not build yet?" Two inputs drew the line: what the market had already solved, and where the field work actually happens. Instead of introducing something new, we gave the inspectors a familiar playground.',
          ],
        },

        {
          kind: "screens",
          active: 0,
          pills: [
            "Login",
            "Inspection Orders Listing",
            "Order Details",
            "Inspection Workflow",
          ],
          phones: [
            { media: homeScreen, label: "MVP" },
            { media: homeScreen, label: "v1" },
            { media: homeScreen, label: "v2" },
          ],
          caption: { index: "3.1", label: "MVP Launch", tag: "PROTOTYPE" },
        },
      ],
    },
  ],
};
