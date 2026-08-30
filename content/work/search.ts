import type { CaseStudy } from "./types";

/**
 * Search — the access layer between field intent and institutional knowledge.
 *
 * V2, written from `WINspect_Search_Ideology_Case_Study_V2_Brief.docx` with the
 * earlier knowledge document behind it for facts. The brief moved three things,
 * and they are why this file was rewritten rather than extended:
 *
 *   · SCOPE. It is scope-locked to Search. Camera, Gallery, Preview, the SME
 *     Toolkit and AI appear only where they explain Search's problem,
 *     constraints or consequences. The first draft let the ecosystem sprawl.
 *
 *   · THE PROBLEM. V1 framed ownership as an authorship fight — inspectors
 *     against SMEs. The brief locates it a layer down: the knowledge model
 *     belonged to the organisation and did not match how an inspector thinks
 *     standing in a property. Ownership is still here, but as the system Search
 *     sits on rather than as the plot.
 *
 *   · THE DECISION. "Coexist instead of replace" — search does not kill
 *     categories — is the strongest senior call in the work and was absent from
 *     V1, which had search simply winning. It is now the hinge of section 3.
 *
 * WHAT IS DELIBERATELY NOT HERE.
 *
 *   · No quotes. The brief supplies five bracketed placeholders for research,
 *     shake feedback, Support signals and comments, and says to hold them until
 *     the real ones are inserted. A page that renders `[RESEARCH QUOTE — ...]`
 *     is worse than one that doesn't, and the reader's quote component asks for
 *     a source and a channel, which would be a fabricated attribution. The
 *     findings those quotes evidence are written as prose; the five insertion
 *     points are §2, §3, §5, §7 and §8.
 *
 *   · No unverified metrics. The brief keeps 87%, ~11,000 and the caveated
 *     ~45 minutes, and marks everything else as a placeholder. Still out: the
 *     adoption progression, the total remark count, service and infographic
 *     counts.
 *
 *   · Artwork. The brief's evidence set — categories, the search states,
 *     camera, gallery, preview, SME Toolkit — is not exported yet, so those
 *     slots use the file's `null` convention rather than being filled or
 *     dropped.
 *
 * The title is the study's own line, not the homepage card's. The card says
 * "Finding signal in 104,122 remarks" because that is what the card
 * demonstrates; the study asks the question the work was about.
 */
export const search: CaseStudy = {
  slug: "search",
  title: "Who owns the way an inspection is written?",
  subtitle:
    "A hundred thousand expert-written inspection remarks, and inspectors " +
    "who kept navigating past all of them. The problem was never the search " +
    "box. It was the distance between what an inspector saw and where the " +
    "organisation had filed it.",

  accent: "blue",

  helpers: [
    "SaaS",
    "PropTech",
    "Product Design",
    "2023 — 2025",
    "Enterprise Search",
    /* ~2,470 words in the body, measured off the rendered page rather than
       guessed. At a reading pace of about 230 a minute that is eleven. */
    "11 min read",
  ],

  body:
    "A remark is the sentence an inspector puts in a report: what they saw, " +
    "where it was, and how serious it is. A full inspection needs dozens of " +
    "them, and WINspect already had a good library — written and maintained " +
    "by subject-matter experts, and organised the way the organisation " +
    "understood its own work. This is the story of getting a field " +
    "professional to that knowledge in the ten seconds they are standing in " +
    "front of the thing it describes.",

  outcomes: {
    items: [
      {
        value: "*45 minutes",
        label: "END TO END",
        note: "down from three to four hours",
        tint: "amber",
      },
      {
        value: "87%",
        label: "REUSED, NOT WRITTEN",
        note: "of remarks added through search",
        tint: "teal",
      },
      {
        value: "~11,000",
        label: "INSPECTORS",
        note: "across roughly 900 inspection teams",
        tint: "violet",
      },
    ],
    note:
      "*The end-to-end figure reflects the broader WINspect redesign — camera, " +
      "search, offline and AI-assisted documentation — and is not attributed " +
      "to search alone",
  },

  meta: [
    { label: "Product", value: "iOS, Android, iPad + Web" },
    { label: "Role", value: "Product Designer, solo from Dec 2023" },
    { label: "Timeline", value: "Jul 2023 - 2025" },
    {
      label: "Skills",
      value:
        "Product design, Systems thinking, Stakeholder management, User research & testing, Data collaboration",
    },
  ],

  hero: {
    kind: "live",
    view: "remark-finder",
    still: "/media/search.png",
    alt: "The remark search: a query, and the remarks this inspector has used most, from four different categories.",
    width: 823,
    height: 591,
    morphName: "search-frame",
    caption: {
      index: "0.1",
      label: "Search, as it works now",
      tag: "LIVE SPECIMEN",
    },
  },

  sections: [
    {
      id: "the-setup",
      eyebrow: "THE SETUP",
      label: "The Setup",
      heading: "The content was never the problem",
      blocks: [
        {
          kind: "aside",
          lead: "A good library, filed by the people who built it.",
          body: [
            "WINspect is the product WIN Home Inspection's inspectors use to run an inspection and write the report at the end of it. Roughly 11,000 of them, across about 900 teams.",

            "The remark library was large and it was genuinely good — expert-authored, reviewed, and structured to cover the range of things a house can be wrong about. The product exposed it the way the organisation understood it: category, then subcategory, then a list. The legacy system had 491 subcategories. The redesign had already cut that to 78, moving the leftover variation into contextual Abouts — attribute sets hung off each subcategory.",

            "So by the time I picked this up, the tree had been pruned and search existed. Inspectors kept navigating anyway.",

            {
              kind: "mockup",
              image: null,
              caption: {
                index: "1.1",
                label: "The incumbent — category navigation",
                tag: "MOBILE",
              },
            },
          ],
        },

        {
          kind: "aside",
          lead: "What was fixed before I got here",
          body: [
            "Most of this list is not design constraint in the abstract. It is the shape of a product mid-migration with a deadline:",

            {
              kind: "table",
              columns: ["CONSTRAINT", "WHAT IT MEANT FOR DESIGN"],
              rows: [
                [
                  "The taxonomy was settled",
                  "Categories, subcategories and their attributes were fixed. I could change the way in, not the model underneath",
                ],
                [
                  "Offline first",
                  "Crawlspaces and basements have no signal. Anything an inspector depends on had to work with none",
                ],
                [
                  "The ISN sunset",
                  "March 2024 migrated the entire user base off the legacy product. Nothing could ship that needed a long runway",
                ],
                [
                  "Field conditions",
                  "Phone in one hand, mid-inspection, often with the client standing next to them. Sometimes gloves. Rarely a free minute",
                ],
                [
                  "Early relevance was poor",
                  "Search had been wrong often enough to be worth avoiding. Trust had to be re-earned before behaviour would move",
                ],
              ],
              caption: { index: "1.2", label: "Constraints", tag: "TABLE" },
            },
          ],
        },
      ],
    },

    {
      id: "the-observation",
      eyebrow: "THE OBSERVATION",
      label: "The Observation",
      heading: "The problem wasn't the search box",
      blocks: [
        {
          kind: "aside",
          lead: "Nobody thinks in taxonomy.",
          body: [
            "An inspector standing in a property thinks: I saw a crack in a window. The library thinks: Exterior, then Windows, then a list of forty things. Those are not the same sentence, and everything hard about this project lives in the distance between them.",

            "Navigating wasn't stubbornness or a habit nobody had broken. It was the only route that didn't require guessing what the system had decided to call the thing they had just looked at. Category navigation is slow and it is certain. A search box that comes back wrong twice makes slow and certain look like a bargain.",

            "Which meant the fix I had been reaching for — better ranking, a more prominent entry point, fewer taps to the same place — was aimed at the wrong thing. None of it closes a gap between two ways of describing the same crack.",
          ],
        },

        {
          kind: "insight",
          eyebrow: "THE REFRAME",
          heading:
            "I stopped designing a search box and started designing an access layer",
          body: [
            "The question was never how to return a better list. It was how a field professional's own words reach a body of knowledge someone else organised.",
            "That is not a retrieval problem you tune. It is an interface between two mental models, and it had to be designed as one.",
          ],
        },
      ],
    },

    {
      id: "the-ideology",
      eyebrow: "THE IDEOLOGY",
      label: "The Ideology",
      heading: "Start from what was observed, not from where it was filed",
      blocks: [
        {
          kind: "aside",
          lead: "Search-first, as a principle rather than a feature.",
          body: [
            "Search-first is one sentence: when an inspector knows what they observed, they should be able to start there. Not at the top of a tree, and not by first learning how the organisation files things.",

            "The temptation with a principle like that is to enforce it — make search the only door and let the tree wither. I chose not to, and it is the decision I would defend hardest.",

            {
              kind: "table",
              columns: ["THE DECISION", "WHY"],
              rows: [
                [
                  "Search coexists with categories, it doesn't replace them",
                  "Category navigation is the better tool when you know the system or want to browse a section deliberately. Removing it would have punished the experienced inspectors first",
                ],
                [
                  "Optimise for field intent, not taxonomy literacy",
                  "The inspector should describe what they saw. Learning the filing system is work the product should be doing",
                ],
                [
                  "A result has to earn trust before it earns a tap",
                  "Reuse means putting somebody else's sentence in your report under your name. That needs context, not just relevance",
                ],
                [
                  "Reuse is not always verbatim",
                  "Expert language is a starting point. The system has to let an inspector adapt it to the house in front of them",
                ],
                [
                  "Production behaviour is the judge",
                  "Whether search looks elegant matters far less than whether people stop navigating around it",
                ],
              ],
              caption: {
                index: "3.1",
                label: "The principles, and what they cost",
                tag: "TABLE",
              },
            },

            "Making search fast enough to win on merit is a harder brief than making it mandatory. It is also the only version where the inspector stays in control, which is the whole ideology.",
          ],
        },
      ],
    },

    {
      id: "retrieval",
      eyebrow: "THE RETRIEVAL MOMENT",
      label: "Retrieval",
      heading: "From a query to a result you'd stake a report on",
      blocks: [
        {
          kind: "aside",
          lead: "Finding it is step one. Trusting it is the hard part.",
          body: [
            "A plain list of matching sentences would have been a worse product than the tree. The tree at least told you where you were. So a result card carries what an inspector needs to judge it without opening it: the branch it was filed under, the status it will carry into the report, where it applies, the wording itself, and how often it has actually been used.",

            "The branch line is doing more work than it looks. It is also the evidence for the whole approach — a set of results whose paths disagree with each other is a set no single walk down the tree could have produced.",

            {
              kind: "mockup",
              image: null,
              caption: {
                index: "4.1",
                label: "Search — query, filters, results",
                tag: "MOBILE",
              },
            },
          ],
        },

        {
          kind: "note",
          eyebrow: "RANKING",
          heading:
            "Relevance decides what matches. Usage decides what comes first.",
          body: [
            "Keyword relevance is weighed first, and how often a remark has been used orders results that are similarly relevant. Search for a missing shingle and the phrasing you have reached for a thousand times outranks the one you have used fifty — without either beating a genuinely better match.",
            "Every result carries two counts: your own company's use, and the network's. Keeping them separate is the point. A remark the network leans on that you have barely touched is worth a look; one you use constantly that nobody else does is your house style. One number could say neither.",
          ],
        },

        {
          kind: "note",
          eyebrow: "EDIT & ADD",
          heading: "The button that admits expert wording isn't always final",
          body: [
            "Every state and every inspector's local conventions shape how a finding has to read. A system that only offers Add is quietly insisting the library got it right for every house in the country.",
            "Edit & Add opens the remark before it goes in. The edited version is the inspector's to keep rather than a change to everybody else's copy — which is what turns a one-off edit into something they can reuse instead of redoing.",
          ],
        },

        {
          kind: "live",
          view: "remark-finder",
        },
      ],
    },

    {
      id: "field-conditions",
      eyebrow: "FIELD CONDITIONS",
      label: "Field Conditions",
      heading: "Typing is not the only way in",
      blocks: [
        {
          kind: "aside",
          lead: "A query assumes a free hand and a spare minute.",
          body: [
            "Search-first has an obvious failure mode: it assumes someone is in a position to type. On a roof, in an attic, halfway through explaining a finding to the client standing beside them, they are usually not.",

            "So the surface offers a zero-query path. Suggested observations come up before anything is typed — ranked by what this inspector actually reaches for, which makes the empty state the most useful screen in the flow rather than a blank waiting for input.",

            "The same logic reaches into capture. Suggestions can surface while an inspector is photographing the thing they are about to write up, because that is the moment they know exactly what they are looking at. Search that only exists on its own screen has already made them leave the observation to go and describe it.",

            {
              kind: "mockup",
              image: null,
              caption: {
                index: "5.1",
                label: "Suggested observations, and discovery at capture",
                tag: "MOBILE",
              },
            },

            "And all of it works offline. That was not a nice-to-have — it settled the hierarchy of the whole feature set. Anything an inspector depends on in a basement with no signal could not be the thing that needed a network.",
          ],
        },
      ],
    },

    {
      id: "the-loop",
      eyebrow: "THE LOOP",
      label: "The Loop",
      heading: "Finding a remark isn't the job. Writing the report is.",
      blocks: [
        {
          kind: "aside",
          lead: "Search had to know which inspection it was standing in.",
          body: [
            "A search that returns good results and then forgets what you did with them has solved a smaller problem than the one an inspector has. They are not browsing a library. They are assembling a document, in order, against a property.",

            "So the surface separates what you can draw from and what you have already used: My Library against Added to Report. It reports where the current inspection has got to — remarks added, issues found — so search is attached to this job rather than floating above the product. Picking a remark is not a search result being dismissed, it is a report getting one row longer.",

            {
              kind: "mockup",
              image: null,
              caption: {
                index: "6.1",
                label: "Search → report → preview",
                tag: "FLOW",
              },
            },

            "Downstream, those remarks become the report: gathered in the gallery against their evidence, promoted into the summary when they carry an issue status, and rendered into the document the client actually reads. Designing retrieval without that tail would have optimised the part of the job that was never the point.",
          ],
        },
      ],
    },

    {
      id: "governance",
      eyebrow: "THE SYSTEM BEHIND IT",
      label: "The System",
      heading: "Search is only as good as the library it searches",
      blocks: [
        {
          kind: "aside",
          lead: "You cannot design retrieval and ignore the thing being retrieved.",
          body: [
            "Every ranking decision above is downstream of how the library is written, categorised and maintained. That work happens in the SME Toolkit, where remarks carry utilisation counts, company-key context, categories, locations, terms, and draft and template state — and where support and SMEs can see what is being used, by whom, and what has gone stale.",

            {
              kind: "mockup",
              image: null,
              caption: {
                index: "7.1",
                label: "SME Toolkit — utilisation and governance",
                tag: "WEB",
              },
            },

            "This is also where the ownership question gets answered properly. A search over one central library is a search over somebody else's words. So the sources are separated — an inspector's own library, the network's, and the SME-authored baseline — the filters are additive, and the selection persists. Any remark can be saved into an inspector's own library, where the saved copy becomes theirs to maintain rather than an edit to everyone else's.",
          ],
        },

        {
          kind: "note",
          eyebrow: "THE PART I GOT WRONG FIRST",
          heading:
            "I argued for inspector-owned libraries before the MVP, and lost",
          body: [
            "I expected language this local — state by state, house by house — would not survive central authorship. The objections were real ones about quality, duplication and library bloat, and I had no evidence to answer them with. Only the expectation.",
            "What changed the decision was a launch, not a better-argued version of the same case. Opening authorship then did exactly what had been predicted: the library grew fast and messily, which is why governance and weekly utilisation cleanup exist. Being right about ownership created the maintenance problem, and the maintenance problem was mine to solve too.",
          ],
        },
      ],
    },

    {
      id: "production",
      eyebrow: "IN PRODUCTION",
      label: "In Production",
      heading: "Behaviour was the only opinion that counted",
      blocks: [
        {
          kind: "aside",
          lead: "The feature was finished. The argument wasn't.",
          body: [
            "The measure was never whether the search screen tested well. It was whether inspectors stopped routing around it — and that is a question only production answers, through what people search, what they reuse, what they shake the phone to complain about, and what Support keeps getting asked.",

            "87% of remarks now enter a report through search rather than being written new. That is the number I would put the whole ideology on: not that search is used, but that the library is being reused instead of retyped, which is what the access layer was for.",

            "AI earned a smaller role than expected, and the trend is the interesting part. It fills the gap when search comes back empty — describe the observation, shape the result, save it to your library so the next similar finding is a search rather than a generation. Its share of new remarks fell as the libraries matured. Not because generation got worse; because there was less left to generate.",
          ],
        },

        {
          kind: "insight",
          eyebrow: "WHAT I TOOK FROM IT",
          heading:
            "Enterprise search is a negotiation between intent and institutional knowledge",
          body: [
            "I came into this thinking I was designing search. I left having designed the relationship between a field professional and a body of institutional knowledge.",
            "The hard part was never returning a result. It was making the result relevant enough to trust, editable enough to own, and close enough to the work that searching became faster than navigating.",
            "Start from what the person observed, not from how the system is organised.",
          ],
        },
      ],
    },
  ],
};
