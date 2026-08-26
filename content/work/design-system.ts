import type { CaseStudy } from "./types";

/**
 * The WinConnect design system.
 *
 * Rewritten from a tour of the library into a study of the work. The previous
 * version described the artefact accurately and never said who made it: `Role`
 * and `Timeline` were `null`, and the words "I" and "we" did not appear in the
 * file. Sole authorship is confirmed, so first person here is the accurate
 * voice rather than a stylistic choice.
 *
 * The claim the old opening made — twelve products "were being designed as
 * twelve products" — was wrong, and wrong in the direction that made the work
 * smaller. There were no products. There was one marketing website, and the
 * system was proposed before the first product existed. That is the study now.
 *
 * Sections two to six are still checkable against the library itself — the page
 * count, the token tiers, the composition, the mode tables. Nothing in them is
 * an estimate, because a design system case study that rounds its own numbers
 * is arguing against itself.
 *
 * What is still absent is measured outcome: adoption rate, handoff time, a
 * before and after. No baseline was taken before the system existed, so there
 * is nothing honest to compare against — and `outcomes.note` now says that on
 * the page rather than only here, where no reader can see it.
 */
export const designSystem: CaseStudy = {
  slug: "design-system",
  title: "The system came before the products",

  /* The product enumeration that used to sit here — CRM, report writer,
     learning system, admin console, SME toolkit — moved to the `one-shell`
     section, which lists them anyway and has room to say what each one is
     like. Two sentences also fit the share card, where the long version ran to
     five lines and pushed the meta row off the bottom. */
  subtitle:
    "WinConnect is the design system twelve products in the WIN ecosystem " +
    "are built on. I proposed it before the first of them existed, built it " +
    "alone, and have maintained it since.",

  helpers: ["SaaS", "PropTech", "Design Systems", "2023 → present", "8 min read"],

  body: null,

  /**
   * Counts, not outcomes, and the note says so.
   *
   * The temptation in this genre is an adoption percentage. There is no
   * measurement behind one here, and `PROJECT.md` forbids inventing it — so
   * these three are things that can be counted in the file itself, and the
   * caveat underneath does the work a fake number would have done badly.
   */
  outcomes: {
    items: [
      {
        value: "12",
        label: "PRODUCTS",
        note: "built on one library",
        tint: "teal",
      },
      {
        value: "127",
        label: "COMPONENTS",
        note: "instanced 1,341 times in the file",
        tint: "amber",
      },
      /* Deliberately not "281 tokens" — the homepage card already carries that
         number, and a second entry for it only ever showed up as a duplicate
         row in the palette. This slot buys the fact nothing else on the site
         states: that the maintenance has been one person's, continuously. */
      {
        value: "1",
        label: "MAINTAINER",
        note: "since late 2023, by publish and audit",
        tint: "violet",
      },
    ],
    note:
      "Counts from the library itself, not measured outcomes. No adoption " +
      "baseline was taken before the system existed, so this study does not " +
      "claim one.",
  },

  /**
   * Share-card only. `helpers` supersedes this list on both reading surfaces,
   * so the one place these strings are ever seen is
   * `app/work/[slug]/opengraph-image.tsx` — which lays out the first three
   * *filled* rows on one 1040px line at 28px, `whiteSpace: nowrap`, and
   * ellipsises nothing. Every value below is therefore kept short enough to
   * survive that line rather than short enough to read well in a table.
   *
   * The previous version could afford "12 products across the WIN ecosystem"
   * only because Role and Timeline were `null` and it was the sole column.
   * With all three filled, that string plus the other two overran the card.
   */
  meta: [
    { label: "Scope", value: "12 products" },
    { label: "Role", value: "Sole designer & maintainer" },
    { label: "Timeline", value: "Late 2023 → present" },
    // Fourth, so never on the card, so free to be as long as it is true.
    {
      label: "Skills",
      value:
        "Design systems, token architecture, theming, governance, design–engineering handoff",
    },
  ],

  /**
   * The hero is the instrument the homepage card is, at full size — so the
   * card does not cross-fade into a photograph of itself on the way in, it
   * grows, and is still running when it arrives.
   *
   * `still` is what surfaces that cannot run it fall back to: the OG card,
   * most of all, which is rendered on a server with no DOM to speak of.
   */
  hero: {
    kind: "live",
    view: "theming-instrument",
    still: "/media/design-system.png",
    alt: "The WinConnect dashboard shell, split between its light and dark colour modes",
    width: 426,
    height: 256,
    morphName: "design-system-frame",
  },

  sections: [
    {
      id: "the-problem",
      eyebrow: "THE PROBLEM",
      label: "The Problem",
      heading: "There were no twelve products yet",
      blocks: [
        {
          kind: "aside",
          lead: "Nobody asked for a design system.",
          body: [
            "When I proposed it, WIN had one thing to show for itself: a marketing website. It used components in the sense that any website does — a button here, a card there, redrawn whenever somebody needed one. Nothing was shared, because there was nothing yet to share it with.",
            "That is an awkward moment to argue for a system. There is no drift to point at, no audit to run, no two teams disagreeing in a review. The argument has to be made about products that do not exist, on the grounds that the cheapest time to agree what a button is, is before anyone has shipped one.",
            "I made it anyway, and then I built the thing on my own.",
          ],
        },

        {
          kind: "insight",
          eyebrow: "THE BET",
          heading:
            "A system built after the products is a consolidation project. Built before them, it is a contract.",
          body: [
            "Consolidation is the safer of the two. You know exactly what you are reconciling, because it already exists and is already wrong.",
            "A contract is a wager on products you have not met. It is also the only version that ever gets honoured, because the alternative is asking teams to unship what they have already built. I took the wager, and it held twelve times. The last section is where it cost me something.",
          ],
        },
      ],
    },

    {
      id: "a-contract",
      eyebrow: "THE DECISION",
      label: "The Decision",
      heading: "A contract, not a sticker sheet",
      blocks: [
        {
          kind: "prose",
          body: [
            "The library documents 45 surfaces: six foundations, 34 component pages, four studies of the application shell, and four whole product surfaces — chat, mail, calendar and a kanban board — assembled entirely out of the parts. 127 named components, instanced 1,341 times inside the file itself.",
            "The four shell studies are the ones that were not obvious, and they are the ones I would defend hardest. The obvious version of this project stops at the component — a page of buttons, a palette, a type scale — and it is obvious because it is the part everyone already agrees is a design system. I turned it down for a specific reason. Component libraries that stop at the component leave every product to invent its own navigation, its own settings panel, its own notification tray, and the shared buttons inside them fool nobody. What products actually disagree about was never the button.",
            "The other decision visible here is how far down the documentation goes. A page for Walktour, for Upload, for the organizational chart, for the rich text editor — the parts nobody wants to own, which is exactly why they get rebuilt in each product until somebody does. I decided to own them once instead of watching them be written twelve times.",
          ],
        },
        {
          kind: "figure",
          src: "/media/design-system/components.png",
          alt: "The contained button, documented across six colours, three states, two icon positions and three sizes",
          width: 962,
          height: 498,
          caption:
            "Every variant crossed with colour, state, icon position and size, and drawn. Documented as a matrix rather than as a gallery, because a gallery hides its own gaps and a matrix shows them. This is one quarter of one page; the library has 34 like it.",
        },
        {
          kind: "figure",
          src: "/media/design-system/taxonomy.png",
          alt: "Eight component pages side by side: Buttons, Inputs, Feedback, Data display, Navigation, Surfaces, Chart and Other",
          width: 1920,
          height: 608,
          caption:
            "The 34 pages are grouped by what a part does, not by what it looks like: Buttons, Inputs, Feedback, Data display, Navigation, Surfaces, Chart, Other. It is the shape an engineer already has in their head, which is most of the reason anyone finds anything in here.",
        },
      ],
    },

    {
      id: "three-tiers",
      eyebrow: "ARCHITECTURE",
      label: "Architecture",
      heading: "Three tiers, and only the middle one has opinions",
      blocks: [
        {
          kind: "prose",
          body: [
            "Every value in the system sits in one of three layers, and which layer a value lives in decides who is allowed to change it.",
            "A primitive is a fact about the palette: grey/500 is #919eab, spacing-2 is 16, radius-1 is 8. A semantic token is a decision about meaning: text-secondary, background/paper, primary/main. A component token is a decision about one part: nav/vertical/item-root-height is 44, card/radius is 16, button/lg-height is 48, header/desktop-height is 72.",
            "The rule that follows is the useful part. Product teams theme at the semantic layer and nowhere else. Editing a primitive is a palette change and has to be argued for; editing a component token is a redesign of that component in twelve products at once.",
          ],
        },
        {
          kind: "insight",
          eyebrow: "GOVERNANCE",
          heading: "The tier boundary is the permission model",
          body: [
            "Most design system governance documents are long because they are trying to describe in prose a boundary the tokens themselves do not draw. Mine is short for the opposite reason.",
            "A designer opening the library does not have to read a policy to find out what they may change. The layer a value lives in has already told them.",
          ],
        },
        {
          kind: "figure",
          src: "/media/design-system/colors.png",
          alt: "The colour page: primary and secondary ramps, four semantic ramps, and a nine-step grey scale",
          width: 1440,
          height: 1298,
          caption:
            "Six ramps, five steps each — lighter, light, main, dark, darker — plus a 24% alpha of every main for the shadows built on it. Nine greys. That is the entire palette twelve products draw from.",
        },
        { kind: "live", view: "token-anatomy" },
      ],
    },

    {
      id: "composed-tokens",
      label: "Composed tokens",
      heading: "Tokens made of other tokens",
      blocks: [
        {
          kind: "prose",
          body: [
            "The values that drift first between products are elevation and type scale, because both are places where a designer in a hurry types a number. So I made neither of them a number.",
            "shadow/card is not a shadow. It is two stacked effects, each assembled from a colour token and four numeric primitives — offset, blur, spread — which means the elevation ramp has one definition and every card in the ecosystem re-rules the moment it changes. The same structure holds for the dropdown and dialog shadows, which is why they are visibly a family rather than three shadows that happen to coexist.",
            "The type styles hold no numbers of their own either. h1 is a font composed from h1/size, h1/line-height, h1/weight and h1/letter-spacing. Eleven styles, all built the same way: one edit to the scale, and twelve products re-set.",
          ],
        },
        {
          kind: "figure",
          src: "/media/design-system/shadows.png",
          alt: "The shadow page: the z1 to z24 elevation ramp and the composed card, dropdown and dialog shadows",
          width: 1440,
          height: 1072,
        },
        {
          kind: "figure",
          src: "/media/design-system/type.png",
          alt: "The typography page: the Axiforma specimen and the h1 to caption scale",
          width: 1440,
          height: 1540,
          caption:
            "The scale runs 64/80 at h1 down to 12/18 at caption. Every step is four variables, not four numbers.",
        },
      ],
    },

    {
      id: "theming",
      label: "Theming",
      heading: "Theming is a surface, not a setting",
      blocks: [
        {
          kind: "prose",
          body: [
            "Light and dark are the same variable names holding different tables. background/default goes from #ffffff to #141a21, background/paper from #ffffff to #1c252e, text-primary from #1c252e to #ffffff, and the shadow colour from a cool grey to black — because a grey shadow on a dark page is not a shadow. Nothing is renamed, nothing is conditional, and no component knows which mode it is in.",
            "One token I deliberately held still: primary/main is #005982 in both. A product's identity should not change when the lights go out, and making the brand colour mode-dependent is the shortcut that quietly produces two brands.",
            "On top of that sit the two axes the shell studies document — whether the navigation reads as part of the page or as a panel over it, and which primary a given product takes. Those combinations are why a CRM and an inspection report writer can feel like different products while sharing every component between them. The specimen below is that mechanism, running: move across it to change the primary, down it to cross the modes.",
          ],
        },
        { kind: "live", view: "theming-instrument" },
      ],
    },

    {
      id: "one-shell",
      label: "One shell",
      heading: "One shell, twelve products",
      blocks: [
        {
          kind: "prose",
          body: [
            "The products the system carries have very little in common as products. A CRM is dense, relational and lives in tables. An inspection report writer is a long linear form that people fill in on site, often on a phone, often badly lit. A learning system is mostly reading. An admin console is mostly destructive actions that need to be hard to do by accident. The SME toolkit is somebody's first ten minutes with the ecosystem.",
            "What they share is not a look. It is the shell — where navigation lives, how deep it nests, what a page header contains, where a settings panel comes from, what a destructive confirmation reads like — plus the tier boundary that says which of those a product may argue with. That is the part that had to be designed once and documented properly; the rest is each product's own problem, and should be.",
          ],
        },
        {
          kind: "figure",
          src: "/media/design-system/shell.png",
          alt: "The shell studies: the dashboard header, the vertical, mini and horizontal navigations, and the page layout, each documented beside every state it takes",
          width: 1440,
          height: 885,
          caption:
            "The shell, documented the way a component is. Vertical, mini and horizontal navigation are three answers to the same question, and a product picks one rather than drawing its own — every state of each is on the right of its page, so picking is a choice and not a redesign.",
        },
      ],
    },

    {
      id: "keeping-it-alive",
      eyebrow: "MAINTENANCE",
      label: "Maintenance",
      heading: "A system nobody maintains is a screenshot",
      blocks: [
        {
          kind: "prose",
          body: [
            "Building it took months. Maintaining it has taken nearly three years, and it is the half of this project I would point at first.",
            "Every change went out as a library publish with written release notes, and consuming files chose when to take it. That is a small mechanic with a large consequence: no product was ever redesigned out from under a designer mid-sprint, which is the fastest way there is to make a team detach from a library and never reattach.",
            "Teams could ask for a component, and most of that work was deciding which requests should not become one. The test I used was whether more than one product needed the thing, and needed it for the same reason. A card only the CRM wants is a CRM component and belongs in the CRM's own file; admitting it to the library makes eleven other products carry it. The guidelines page is the written half of the same boundary the tiers draw — what a product may theme, what it must not touch, and how to consume the library without detaching from it.",
            "And I audited. Periodically I went through shipped products against the library looking for divergence, which is the only way to find out whether a system is being used or merely installed.",
          ],
        },

        {
          kind: "figure",
          src: "/media/design-system/guidelines.png",
          alt: "The guideline page: how to change mode, navigation colour, palette and typography, plus the icon naming rule and the variables reference",
          width: 1440,
          height: 544,
          caption:
            "The guidelines page, and the thing to notice is how little of it there is. It documents the four things a product is allowed to change and the naming rule that keeps an icon's colour attached to it. Everything not on this page is a conversation with me, and the tiers already said which.",
        },

        {
          kind: "note",
          eyebrow: "WHAT THE AUDITS ACTUALLY FOUND",
          heading: "Not every divergence was a mistake",
          body: [
            "More than once a product had solved something better locally than the library had solved it centrally. The right move there was to promote their version into the system, not to pull them back to mine.",
            "A library that only ever corrects the products it serves stops being read as a resource and starts being read as a rule, and teams route around rules.",
          ],
        },

        {
          kind: "note",
          eyebrow: "THE SEAM",
          heading: "The library is not the product",
          body: [
            "The coded counterpart is a React component library, built by engineers from my specifications and reviewed by me. It is not generated from the design file. A token I change does not reach production on its own — someone has to carry it across.",
            "That seam is the honest limit of this system, and I would rather name it than let a three-tier token architecture imply an automation that does not exist.",
          ],
        },
      ],
    },

    {
      id: "what-id-change",
      eyebrow: "IN HINDSIGHT",
      label: "In hindsight",
      heading: "The tier I would draw differently",
      blocks: [
        {
          kind: "prose",
          body: [
            "The component-token tier went too deep. I would draw that line higher now.",
            "nav/vertical/item-root-height is 44. That is a real value and it is the right value, and encoding it as a token was still a mistake of degree. A token that specific stops being a shared decision and becomes a lock: it does not say what the navigation should feel like, it fixes what the navigation is, and a product with a genuine reason to differ has to come to me instead of to the semantic layer.",
            "The tier that earns its keep is the middle one. I built the third because the second was working — which is the ordinary way a system gets over-built. Success at one level of abstraction reads, from the inside, like an argument for another one.",
          ],
        },
      ],
    },
  ],
};
