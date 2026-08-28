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
 *   · The Problem used to end on a `note` ("THE REAL PROBLEM") followed by an
 *     `insight` ("THE INSIGHT"). Figma 548:12210 folds both into one panel,
 *     "THE SYNTHESIS", whose two lines are the two headings that used to be a
 *     paragraph apart. The section then continues into the constraints, which
 *     it never did before.
 *
 * Three of the four sections are written. What has not been exported yet is
 * artwork rather than argument: the two device screens in the launch and the
 * explorations, and explorations 2 and 3, whose cards Figma draws as one
 * component in one state. Those slots are marked rather than filled — see the
 * `null` convention in `types.ts`.
 */
export const inspectionPhotos: CaseStudy = {
  slug: "inspection-photos",
  title: "When you observe, you document",
  subtitle:
    "Redesigning how home inspectors capture, organise and turn visual " +
    "evidence into a report. Moving the camera from a standalone capture " +
    "tool into a context-aware part of the inspection workflow.",

  accent: "blue",

  helpers: ["SaaS", "PropTech", "Product Design", "2026", "AI", "10 min read"],

  body: null,

  outcomes: {
    items: [
      {
        value: "*40 minutes",
        label: "INSPECTION TIME",
        note: "for documenting observations",
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
    caption: { index: "0.1", label: "The Final Flow", tag: "PROTOTYPE" },
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

            {
              kind: "figure",
              media: {
                src: "/media/inspection-jira.png",
                alt: "Two tickets in the Winspect backlog: one asking for categorisation inside the camera flow, one for a Zillow integration",
                width: 1664,
                height: 252,
              },
              caption: { index: "1.1", label: "JIRA Backlog", tag: "SPRINT" },
              /* The board is real and its ticket titles are not the two this
                 story is about, so they are covered over rather than the whole
                 figure being faked. Fractions of the 832x120 frame it is drawn
                 in — see the aside's figure in `StudySections`. */
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
          ],
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
          kind: "insight",
          eyebrow: "THE SYNTHESIS",
          heading: "Taking the photo wasn't the problem, what happened after it was",
          body: [
            "The inspector already knows what they're looking at when they capture it.",
            "We were asking the product to forget it, and the inspector to remember it later.",
          ],
        },

        {
          kind: "aside",
          lead: "The constraints",
          body: [
            "Well to start off, the inspectors were primarily 40-60 year old who feared change, and were used to the flows that they were using for almost a year now. The change management was one constraint I had to deal with throughout, but there were some others too:",

            {
              kind: "table",
              columns: ["CONSTRAINT", "WHAT IT MEANT FOR DESIGN"],
              rows: [
                [
                  "Existing reporting model",
                  "Photos still needed to map to the right inspection context",
                ],
                [
                  "ML capabilities",
                  "Assistance could suggest, but couldn't become a dependency",
                ],
                [
                  "Field environment",
                  "Primary actions had to remain fast and predictable, and available for offline mode (many areas did not have network)",
                ],
                [
                  "Existing product architecture",
                  "We couldn't solve everything by rebuilding the workflow",
                ],
                ["Tech Limitations", "No image recognition"],
                [
                  "Evidence quality",
                  "Speed couldn't come at the cost of usable documentation",
                ],
              ],
              caption: { index: "1.3", label: "Constraints", tag: "TABLE" },
            },
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
      blocks: [
        {
          kind: "aside",
          lead: "What the data said",
          body: [
            "To start off, I already had good understanding of how the inspectors were using the gallery from interviews and SmartLook session recordings. I had to build something that does not get in the way, but acts as a supporting layer inside the camera flow itself.",

            {
              kind: "collage",
              /* Back to front, which is the order Figma stacks them in:
                 behaviour flows underneath, then the heatmaps, then the
                 dashboards on top. The renderer knows where each one goes. */
              images: [
                {
                  src: "/media/smartlook-heatmaps.png",
                  alt: "SmartLook heatmaps over three screens of the inspection app, with the heaviest touches on the capture and submit controls",
                  width: 720,
                  height: 367,
                },
                {
                  src: "/media/smartlook-behaviour-flows.png",
                  alt: "A SmartLook behaviour-flow diagram for iOS, showing sessions moving repeatedly between the camera screen and the modal that hosts remarks",
                  width: 720,
                  height: 371,
                },
                {
                  src: "/media/smartlook-dashboards.png",
                  alt: "SmartLook dashboards counting cover photo additions, camera photos clicked, camera photos uploaded and photos uploaded from the device library",
                  width: 720,
                  height: 370,
                },
              ],
              caption: { index: "2.1", label: "SmartLook", tag: "ANALYTICS" },
            },

            "The data confirmed the synthesis, the inspectors captured multiple photos and then searched remarks to then attach the photos to the remarks",
          ],
        },

        {
          kind: "aside",
          lead: "We explored 3 different ways of solving the same problem",
          body: [
            {
              kind: "carousel",
              slides: [
                {
                  eyebrow: "EXPLORATION 1",
                  body: [
                    "The exploration focused on allowing inspectors to capture multiple photos at the same time, and then perform certain actions for the batch:",
                  ],
                  points: [
                    "Add to Remark: The photos taken could be attached to the remark straight away after taking them.",
                    "Categorise: The photos taken could be categorised to the specific category so that it’s easy for the inspector to find when needed among almost 500 photos.",
                  ],
                  rejected: [
                    "The flow still did not solve the issue of combining the capture and documentation.",
                    "Leaving the camera to document seemed like a job for later rather than doing it between the capture",
                    "We added a step b/w the capture which irritated the inspectors who wanted to just take multiple photos to store to gallery",
                  ],
                  worked: [
                    "The inspectors were able to take multiple pictures in a flow undisturbed.",
                    "The inspectors were able to categorise which reduced their work for the later stage of documentation",
                  ],
                  image: null,
                },

                /* Two and three are real explorations that have not been
                   written up. Figma draws this card as one component in one
                   state, so the file has copy for the first only — and the
                   lead beside the carousel says there were three, which a
                   carousel of one would contradict. */
                {
                  eyebrow: "EXPLORATION 2",
                  body: [],
                  rejected: [],
                  worked: [],
                  image: null,
                },
                {
                  eyebrow: "EXPLORATION 3",
                  body: [],
                  rejected: [],
                  worked: [],
                  image: null,
                },
              ],
              caption: { index: "2.2", label: "Explorations", tag: "CAROUSEL" },
            },
          ],
        },
      ],
    },

    {
      id: "the-launch",
      eyebrow: "THE LAUNCH",
      label: "The Launch",
      heading: "What went to production",
      blocks: [
        {
          kind: "aside",
          lead: "So, what shipped?",
          body: [
            "The version that shipped was a combination of multiple explorations we did with the users, each interaction was defined by what we believed would work.",

            {
              kind: "mockup",
              image: null,
              caption: { index: "3.1", label: "v1 Launch", tag: "PROTOTYPE" },
            },

            "The launch was made with a fallback setting, the inspectors could choose whether they wanted to enter the flow or not with a toggle that was being monitored. The flow was used by ~31% of the users (data from backend).",
          ],
        },

        {
          kind: "aside",
          lead: "What the users said",
          spacing: "loose",
          body: [
            {
              kind: "quotes",
              groups: [
                {
                  heading: "Voice is cool, but the interruption isn’t",
                  body: "The inspectors liked that they had to just speak out the issue while taking pictures, but hated that they had to wait for the results which was delaying taking the remaining photos from the location they were inspecting",
                  quotes: [
                    {
                      text: "The voice is cool, but it acts as a blocker to take the rest of my photos. Switching back to the classic mode but kudos to thinking different",
                      source: "1-1 Interview",
                      channel: "Zoom",
                    },
                  ],
                },
                {
                  heading: "Quick commands save time but need better accuracy",
                  body: "Inspectors enjoyed using quick voice commands to tag issues but found the recognition errors frustrating and slowing down the process",
                  quotes: [
                    {
                      text: "Love how fast I can tag things, but it keeps misunderstanding me—hope they improve it soon!",
                      source: "User Feedback",
                      channel: "Field Test",
                    },
                  ],
                },
                {
                  heading: "Photo review feature boosts confidence and reduces errors",
                  body: "Inspectors appreciated being able to review photos immediately with voice notes, which helped verify issues before moving on",
                  quotes: [
                    {
                      text: "Reviewing photos with voice notes right after snapping them really helps me catch mistakes early.",
                      source: "Focus Group",
                      channel: "Mobile App",
                    },
                  ],
                },
              ],
            },

            "One thing that was clear: We were on the right track!",
          ],
        },
      ],
    },
  ],
};
