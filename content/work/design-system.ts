import type { CaseStudy } from "./types";

/**
 * The WinConnect design system.
 *
 * Rewritten a second time, and this rewrite is about provenance.
 *
 * The previous version claimed authorship of the component library: "built it
 * alone", "127 named components", "I decided to own them once instead of
 * watching them be written twelve times". That was not true. The library is a
 * licensed commercial kit — Minimal, an MUI-based admin system — and the
 * counts, the page taxonomy, the shell studies and the three token tiers all
 * came with it. Anyone who has shopped for an MUI kit would have recognised
 * the screenshots, and the audience this study is written for is exactly that
 * person.
 *
 * So the study now says what actually happened, which is a better story and a
 * more senior one: a single designer with twelve products coming bought the
 * vocabulary and spent three years on the grammar. Build-versus-buy is a real
 * decision, almost nobody's portfolio contains one, and every sentence in here
 * survives the interview question "walk me through how you built that".
 *
 * What survived the rewrite is what was always good: the permission-model
 * argument, the audits that promoted a product's answer instead of correcting
 * it, "the library is not the product", and the hindsight section — which is
 * still the best paragraph in this portfolio.
 *
 * Two further passes since, against how senior practitioners in this domain
 * actually write the genre. Three things came out of that reading. Adoption is
 * the field's headline and it is always modelled as a ladder rather than a
 * percentage — so §5 now defines installed against adopted and says which one
 * the audit measures. Maturity models all agree that a single file of
 * components is the bottom rung — so §2 places this project on that rung
 * deliberately, which turns the licence from something to get past into the
 * start of the arc. And practitioners name their governance model rather than
 * describing its behaviour — so §6 says "centralised, and the centre is one
 * person", and §7 now names the bus factor that follows from it.
 *
 * The third pass also removed a number I had invented on the first: "saved the
 * project something like four months" is a counterfactual wearing a
 * measurement's clothes, and it appeared twice.
 *
 * What is still absent is measured outcome. No adoption baseline was taken
 * before the system existed, so `outcomes` counts scope and tenure and the
 * note underneath says so, rather than dressing either up as an efficiency
 * number. See `PROJECT.md`: never invent a portfolio fact.
 *
 * TWO SLOTS ARE DELIBERATELY EMPTY. The `twelve-products` section holds two
 * `mockup` items with `image: null`, which render as marked placeholders —
 * the house convention (see the header of `./types.ts`) is that a visible gap
 * beats filler that reads as finished. They are waiting on real product
 * screens, and that section is the most valuable one on the page.
 */
export const designSystem: CaseStudy = {
  slug: "design-system",

  /* The thesis as the title. It is a claim rather than a label, which is the
     point: it tells a systems reviewer in eight words that the writer knows
     the difference between a library and a system, and it earns the right to
     the sentence that follows it. */
  title: "A component kit is not a design system",

  /* Says what was bought and what was not, in the first two lines, so nothing
     further down has to carry a disclaimer. Two sentences, because the share
     card gives this about five lines at 28px before it pushes the meta row
     off the bottom. */
  subtitle:
    "WinConnect is the system twelve WIN products are built on. I didn't draw " +
    "its components — I chose the foundation, themed it into ours, drew the " +
    "rules for changing it, and have run it alone since late 2023.",

  accent: "rose",

  helpers: ["SaaS", "PropTech", "Design Systems", "2023 → present", "8 min read"],

  body: null,

  /**
   * Scope and tenure. Nothing here counts the foundation's file.
   *
   * The previous version's three numbers were 12 products, 127 components and
   * 1 maintainer, and two of those were counting somebody else's library. What
   * is left is what is mine to count: how many products the system carries,
   * how many designers were behind it, and how long it has been kept alive.
   * Read together they are the argument — twelve, one, three years — and the
   * middle number is the one that does the work.
   */
  outcomes: {
    items: [
      {
        value: "12",
        label: "PRODUCTS",
        note: "shipped on one shared library",
        tint: "teal",
      },
      {
        value: "1",
        label: "DESIGNER",
        note: "no design team behind the system",
        tint: "amber",
      },
      {
        value: "3 years",
        label: "MAINTAINED",
        note: "of publishing, auditing, and saying no",
        tint: "violet",
      },
    ],
    note:
      "Scope and tenure — the things that can be counted. Adoption was never " +
      "baselined before the system existed, so it is argued in the fifth " +
      "section rather than asserted as a number here.",
  },

  /**
   * Share-card only. `helpers` supersedes this on both reading surfaces, so
   * these strings are seen in exactly one place:
   * `app/work/[slug]/opengraph-image.tsx`, which lays the first three *filled*
   * rows on one 1040px line at 28px with `whiteSpace: nowrap` and ellipsises
   * nothing. The first three are therefore kept short enough to survive that
   * line; the fourth never reaches the card and can be as long as it is true.
   *
   * `Role` used to read "Sole designer & maintainer", which in a study about a
   * library implied designing the library. "System owner" is the accurate
   * word: the components were licensed, the system around them was not.
   */
  meta: [
    { label: "Scope", value: "12 products" },
    { label: "Role", value: "System owner & sole maintainer" },
    { label: "Timeline", value: "Late 2023 → present" },
    {
      label: "Skills",
      value:
        "Design systems, theming architecture, governance, audits, design–engineering handoff",
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
      id: "the-situation",
      eyebrow: "THE SITUATION",
      label: "The Situation",
      heading: "One designer, twelve products coming",
      blocks: [
        {
          kind: "aside",
          lead: "Nobody asked for a design system.",
          body: [
            "When I proposed one, WIN had a single thing to show for itself: a marketing website. The ecosystem was a plan — a CRM, an inspection report writer, a learning system, an admin console, an SME toolkit, and more behind them. There was one designer for all of it.",
            "That is an awkward moment to make the argument. There is no drift to point at, no audit to run, no two teams disagreeing in a review. You are describing a problem that products which do not exist yet have not had yet.",
            "It is also the only moment the argument is cheap. The cheapest time to agree what a button is, is before anybody has shipped one.",
          ],
        },

        {
          kind: "insight",
          eyebrow: "THE CONSTRAINT",
          heading:
            "One designer cannot draw a library and ship twelve products.",
          body: [
            "A component library drawn from nothing is months of work before a single product screen exists — and I was the only person who was going to be drawing those screens too.",
            "So the question was never whether WIN needed a system. It was which half of one I could afford to make myself.",
          ],
        },
      ],
    },

    {
      id: "buy-or-build",
      eyebrow: "THE DECISION",
      label: "The Decision",
      heading: "I bought the vocabulary",
      blocks: [
        {
          kind: "prose",
          body: [
            "I licensed the foundation rather than drawing it: Minimal, a commercial MUI-based admin system, with a Figma library and a React implementation that already matched each other. The evaluation took an afternoon. It bought back months I did not have, and it is the decision in this project I am most often asked to defend.",
            "The defence is that a component library is a solved problem and a design system is not. Nobody is going to hire WIN because its date picker was drawn in-house. What was going to decide whether twelve products held together was everything around the components — and that part cannot be licensed, because it is specific to how one organisation actually works.",
          ],
        },

        {
          kind: "aside",
          lead: "Buying is a design decision, not a shortcut.",
          body: [
            "I evaluated foundations the way I would evaluate any dependency the next three years would be built on. The last row is the one most people skip, and it is the one that came true.",
            {
              kind: "table",
              columns: ["WHAT I EVALUATED", "WHY IT DECIDED THE CHOICE"],
              rows: [
                [
                  "Coverage of the boring parts",
                  "Upload, rich text, org chart, product walkthroughs — the components every product rebuilds badly and nobody volunteers to own",
                ],
                [
                  "A coded counterpart",
                  "A Figma library with no React behind it moves the drawing work, not the building work",
                ],
                [
                  "Token structure already in place",
                  "Primitives, semantics and component tokens — something to draw a permission model on top of, rather than invent underneath",
                ],
                [
                  "Theming depth",
                  "Two modes and a settable primary, so twelve products could differ without any of them forking the library",
                ],
                [
                  "What it locked in",
                  "The component API is MUI's. Anything MUI does badly, WIN inherits — and in a couple of places we have",
                ],
              ],
              caption: {
                index: "2.1",
                label: "How the foundation was chosen",
                tag: "TABLE",
              },
            },
          ],
        },

        {
          kind: "insight",
          eyebrow: "THE BET",
          heading:
            "The kit is the vocabulary. The system is the grammar — and only one of the two was for sale.",
          body: [
            "The vocabulary is buyable and largely solved: what a button is, what sizes it comes in, what a table does when it has no rows.",
            "The grammar is not. Which layer a product may change and which it may not. What happens when two products need the same thing for different reasons. Who says no. What a publish does to eleven files that did not ask for it. None of that shipped in the licence, and all of it is what decides whether a system is used or merely installed.",
          ],
        },

        {
          kind: "note",
          eyebrow: "WHERE THIS STARTED",
          heading:
            "A bought kit is the bottom rung, and I knew which rung I was on",
          body: [
            "Every maturity model in this field agrees about the bottom of the ladder: one file of components is a UI kit, and that is all it is. What lifts a kit into a system is the part that has owners — tokens with rules attached, documentation somebody maintains, a code counterpart that stays in step, and products that actually consume it.",
            "The licence bought rung one on the afternoon I bought it. Everything in the sections after this one is the climb, and the climb is the part that took three years.",
          ],
        },
      ],
    },

    {
      id: "making-it-ours",
      eyebrow: "THEMING",
      label: "Making it ours",
      heading: "Theming is a surface, not a setting",
      blocks: [
        {
          kind: "prose",
          body: [
            "A licensed foundation arrives wearing somebody else's brand, and the temptation is to treat re-theming as a find-and-replace on one colour. It is the first place a bought system gives itself away, so it is where I started.",
            "Light and dark are the same variable names holding different tables: background/default goes from #ffffff to #141a21, background/paper from #ffffff to #1c252e, text-primary from #1c252e to #ffffff, and the shadow colour from a cool grey to black — because a grey shadow on a dark page is not a shadow. Nothing is renamed, nothing is conditional, and no component knows which mode it is in.",
            "One token I deliberately held still: primary/main is #005982 in both modes. A product's identity should not change when the lights go out, and making the brand colour mode-dependent is the shortcut that quietly produces two brands.",
            "On top of that sit the two axes a product actually gets to pick — whether the navigation reads as part of the page or as a panel over it, and which primary it takes. Those combinations are why a CRM and an inspection report writer can feel like different products while sharing every component between them. The specimen below is that mechanism, running: move across it to change the primary, down it to cross the modes.",
          ],
        },
        {
          kind: "figure",
          src: "/media/design-system/colors.png",
          alt: "The WinConnect colour page: primary and secondary ramps, four semantic ramps, and a nine-step grey scale",
          width: 1440,
          height: 1298,
          caption:
            "The palette after re-theming: six ramps, five steps each — lighter, light, main, dark, darker — plus a 24% alpha of every main for the shadows built on it, and nine greys. That is the whole palette twelve products draw from.",
        },
        { kind: "live", view: "theming-instrument" },
      ],
    },

    {
      id: "the-permission-model",
      eyebrow: "ARCHITECTURE",
      label: "The permission model",
      heading: "The tier boundary is the permission model",
      blocks: [
        {
          kind: "prose",
          body: [
            "Three layers came with the foundation. A primitive is a fact about the palette: grey/500 is #919eab, spacing-2 is 16, radius-1 is 8. A semantic token is a decision about meaning: text-secondary, background/paper, primary/main. A component token is a decision about one part: nav/vertical/item-root-height is 44, card/radius is 16.",
            "What did not come with it was a rule about who may edit which. That rule is the part I added, and it is the part that has done the most work.",
            "Product teams theme at the semantic layer and nowhere else. Editing a primitive is a palette change and has to be argued for. Editing a component token is a redesign of that component in twelve products at once, which is a conversation, not a keystroke.",
          ],
        },
        {
          kind: "insight",
          eyebrow: "GOVERNANCE",
          heading:
            "A designer opening the library does not have to read a policy to find out what they may change.",
          body: [
            "Most design system governance documents are long because they are trying to describe in prose a boundary the tokens themselves do not draw. Mine is short for the opposite reason.",
            "The layer a value lives in has already said who owns it. The written page only has to name the four things a product may change and get out of the way.",
          ],
        },
        { kind: "live", view: "token-anatomy" },
      ],
    },

    {
      id: "twelve-products",
      eyebrow: "ADOPTION",
      label: "Twelve products",
      heading: "Twelve products, one shell",
      blocks: [
        {
          kind: "prose",
          body: [
            "The products have very little in common as products. A CRM is dense, relational and lives in tables. An inspection report writer is a long linear form that people fill in on site, often on a phone, often in bad light. A learning system is mostly reading. An admin console is mostly destructive actions that need to be hard to do by accident. The SME toolkit is somebody's first ten minutes with the ecosystem.",
            "What they share is not a look. It is the shell — where navigation lives, how deep it nests, what a page header contains, where a settings panel comes from, what a destructive confirmation reads like — plus the tier boundary that says which of those a product may argue with. That is the part that had to be decided once. The rest is each product's own problem, and should be.",
          ],
        },
        {
          kind: "aside",
          lead: "Two products, the same parts.",
          body: [
            "The most useful test of a shared system is not whether two products look alike. It is whether two products that should not look alike can still be built from the same box.",
            {
              kind: "mockup",
              image: null,
              shape: "screen",
              caption: {
                index: "5.1",
                label: "The CRM",
                tag: "PRODUCT SCREEN",
              },
            },
            {
              kind: "mockup",
              image: null,
              shape: "screen",
              caption: {
                index: "5.2",
                label: "The inspection report writer",
                tag: "PRODUCT SCREEN",
              },
            },
          ],
        },
        {
          kind: "insight",
          eyebrow: "THE TEST",
          heading:
            "Installed is not adopted, and only one of the two is worth counting",
          body: [
            "A product is installed when its screens are drawn from the library. It is adopted when the next thing that product builds reaches for the library first, and when a designer who needs something different arrives with a request instead of a local fork.",
            "The distinction matters because the first is easy to reach and easy to mistake for the second. Twelve products are installed. How many are adopted is a question only the audit can answer, which is why the audit is in this study at all.",
          ],
        },

        {
          kind: "figure",
          src: "/media/design-system/shell.png",
          alt: "The shell studies: the dashboard header, the vertical, mini and horizontal navigations, and the page layout, each documented beside every state it takes",
          width: 1440,
          height: 885,
          caption:
            "Vertical, mini and horizontal navigation are three answers to the same question, each documented beside every state it takes. A product picks one. Picking is a choice; drawing a fourth is a conversation with me.",
        },
      ],
    },

    {
      id: "running-it",
      eyebrow: "MAINTENANCE",
      label: "Maintenance",
      heading: "A system nobody maintains is a screenshot",
      blocks: [
        {
          kind: "prose",
          body: [
            "The afternoon in the second section is the whole of the buying. The three years since are the system, and they are the half of this project I would point at first.",
            "The model is centralised, and the centre is one person. That is not a best practice so much as an accurate description: every request, every publish and every audit came through me. It is the cheapest governance a twelve-product ecosystem can run on and the most fragile, and both halves of that are true at the same time.",
            "Every change goes out as a library publish with written release notes, and consuming files choose when to take it. That is a small mechanic with a large consequence: no product has ever been redesigned out from under a designer mid-sprint, which is the fastest way there is to make a team detach from a library and never reattach.",
            "Teams could ask for a component, and most of that work was deciding which requests should not become one. The test I used was whether more than one product needed the thing, and needed it for the same reason. A card only the CRM wants is a CRM component and belongs in the CRM's own file; admitting it to the library makes eleven other products carry it.",
            "And I audited. Periodically I went through shipped products against the library looking for divergence, which is the only way to find out whether a system is being used or merely installed.",
          ],
        },

        {
          kind: "exhibit",
          view: "winconnect-governance-loop",
          caption: {
            index: "6.1",
            label: "How a change gets into twelve products",
            tag: "PROCESS",
          },
        },

        {
          kind: "figure",
          src: "/media/design-system/guidelines.png",
          alt: "The guideline page: how to change mode, navigation colour, palette and typography, plus the icon naming rule and the variables reference",
          width: 1440,
          height: 544,
          caption:
            "The written half of the boundary the tiers already draw, and the thing to notice is how little of it there is: the four things a product may change, and the naming rule that keeps an icon's colour attached to it. Everything not on this page is a conversation with me.",
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
            "The coded counterpart is a React component library. It is not generated from the design file, and a token I change does not reach production on its own — someone has to carry it across.",
            "That seam is the honest limit of this system, and I would rather name it than let a three-tier token architecture imply an automation that does not exist.",
          ],
        },
      ],
    },

    {
      id: "in-hindsight",
      eyebrow: "IN HINDSIGHT",
      label: "In hindsight",
      heading: "The tier I would draw differently",
      blocks: [
        {
          kind: "prose",
          body: [
            "The component-token tier went too deep. I would draw that line higher now.",
            "nav/vertical/item-root-height is 44. That is a real value and it is the right value, and treating it as a governed token was still a mistake of degree. A token that specific stops being a shared decision and becomes a lock: it does not say what the navigation should feel like, it fixes what the navigation is, and a product with a genuine reason to differ has to come to me instead of to the semantic layer.",
            "The tier that earns its keep is the middle one. I leaned on the third because the second was working — which is the ordinary way a system gets over-built. Success at one level of abstraction reads, from the inside, like an argument for another one.",
            "The other cost is the one the second section named in advance. Buying the foundation bought MUI's component API along with it, and where MUI is opinionated in a way that does not suit an inspector standing on a roof in the sun, WIN inherits the opinion. I would make the same trade again — months of runway against a handful of inherited defaults is not a close call — but it is a trade, and a study that only listed what buying gave me would be selling something.",
          ],
        },

        {
          kind: "note",
          eyebrow: "THE COST NOBODY BUDGETS FOR",
          heading: "A system with one maintainer has a bus factor of one",
          body: [
            "Three years of being the only person who can publish is the number at the top of this page and the largest risk in the project, and it would be dishonest to state the first without the second.",
            "The fix is not more process. It is a second person with publish rights and a reason to care. The honest reason there has never been one is that a single maintainer does not feel like a bottleneck until they leave.",
          ],
        },
      ],
    },
  ],
};
