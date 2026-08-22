import type { CaseStudy } from "./types";

/**
 * The WinConnect design system.
 *
 * Sections one to four are all checkable against the library itself — the page
 * count, the token tiers, the composition, the mode tables. Nothing in them is
 * an estimate, because a design system case study that rounds its own numbers
 * is arguing against itself.
 *
 * What is deliberately absent is outcome: adoption rates, handoff time, the
 * before and after. Those are measurements, this file has none of them yet,
 * and `meta` says so with `null` rather than with a plausible sentence. See
 * the note in `types.ts`.
 */
export const designSystem: CaseStudy = {
  slug: "design-system",
  title: "Scaling a Design System across 12 products",
  subtitle: "281 reusable tokens, used across 12 products",

  body:
    "Twelve products in the WIN ecosystem — a CRM, an inspection report " +
    "writer, a learning system, an admin console, an SME toolkit and the " +
    "rest — were being designed as twelve products. WinConnect is the " +
    "contract underneath them: three tiers of token, 127 components, and a " +
    "shell documented far enough down that two teams can disagree about a " +
    "screen without disagreeing about a scrollbar.",

  meta: [
    { label: "Product", value: "12 products across the WIN ecosystem" },
    { label: "Role", value: null },
    { label: "Timeline", value: null },
    // Short on purpose. The share card renders only the first three filled
    // rows, so while Role and Timeline are still unwritten this one is a
    // column on it, and a longer value runs off the right edge. Once those two
    // are filled this drops off the card and can grow again.
    { label: "Skills", value: "Design systems, tokens, theming" },
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
      id: "a-contract",
      heading: "A contract, not a sticker sheet",
      blocks: [
        {
          kind: "prose",
          body: [
            "The library documents 45 surfaces: six foundations, 34 component pages, four studies of the application shell, and four whole product surfaces — chat, mail, calendar and a kanban board — assembled entirely out of the parts. 127 named components, instanced 1,341 times inside the file itself.",
            "The four shell studies are the ones that were not obvious, and they are the ones that mattered most. Component libraries usually stop at the component, and then every product invents its own navigation, its own settings panel, its own notification tray, and the shared buttons inside them fool nobody. What the products actually disagreed about was never the button.",
            "The other decision visible here is how far down the documentation goes. A page for Walktour, for Upload, for the organizational chart, for the rich text editor — the parts nobody wants to own, which is exactly why they get rebuilt in each product until somebody does.",
          ],
        },
        {
          kind: "figure",
          src: "/media/design-system/components.png",
          alt: "The contained button, documented across six colours, three states, two icon positions and three sizes",
          width: 962,
          height: 498,
          caption:
            "One quarter of one component page. Every variant is crossed with colour, state, icon position and size and drawn — documented as a matrix rather than as a gallery, so a gap in it is visible. The button has four such blocks; the library has 34 pages like it.",
        },
      ],
    },

    {
      id: "three-tiers",
      heading: "Three tiers, and only the middle one has opinions",
      blocks: [
        {
          kind: "prose",
          body: [
            "Every value in the system sits in one of three layers, and which layer a value lives in decides who is allowed to change it.",
            "A primitive is a fact about the palette: grey/500 is #919eab, spacing-2 is 16, radius-1 is 8. A semantic token is a decision about meaning: text-secondary, background/paper, primary/main. A component token is a decision about one part: nav/vertical/item-root-height is 44, card/radius is 16, button/lg-height is 48, header/desktop-height is 72.",
            "The rule that follows is the useful part. Product teams theme at the semantic layer and nowhere else. Editing a primitive is a palette change and has to be argued for; editing a component token is a redesign of that component in twelve products at once. Most design system governance documents are long because they are trying to describe a boundary that the tokens themselves do not draw. Here the tier is the boundary.",
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
      heading: "Tokens made of other tokens",
      blocks: [
        {
          kind: "prose",
          body: [
            "The values that drift first between products are elevation and type scale, because both are places where a designer in a hurry types a number. So neither is a number here.",
            "shadow/card is not a shadow. It is two stacked effects, each assembled from a colour token and four numeric primitives — offset, blur, spread — which means the elevation ramp has one definition and every card in the ecosystem re-rules the moment it changes. The same structure holds for the dropdown and dialog shadows, which is why they are visibly a family rather than three shadows that happen to coexist.",
            "The type styles hold no numbers of their own either. h1 is a font composed from h1/size, h1/line-height, h1/weight and h1/letter-spacing. Eleven styles, all built the same way, so changing the scale is one edit in one place instead of eleven edits that have to agree.",
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
      heading: "Theming is a surface, not a setting",
      blocks: [
        {
          kind: "prose",
          body: [
            "Light and dark are the same variable names holding different tables. background/default goes from #ffffff to #141a21, background/paper from #ffffff to #1c252e, text-primary from #1c252e to #ffffff, and the shadow colour from a cool grey to black — because a grey shadow on a dark page is not a shadow. Nothing is renamed, nothing is conditional, and no component knows which mode it is in.",
            "One token deliberately does not move: primary/main is #005982 in both. A product's identity should not change when the lights go out, and making the brand colour mode-dependent is the shortcut that quietly produces two brands.",
            "On top of that sit the two axes the shell studies document — whether the navigation reads as part of the page or as a panel over it, and which primary a given product takes. Those combinations are why a CRM and an inspection report writer can feel like different products while sharing every component between them. The specimen below is that mechanism, running: move across it to change the primary, down it to cross the modes.",
          ],
        },
        { kind: "live", view: "theming-instrument" },
      ],
    },

    {
      id: "one-shell",
      heading: "One shell, twelve products",
      blocks: [
        {
          kind: "prose",
          body: [
            "The products the system carries have very little in common as products. A CRM is dense, relational and lives in tables. An inspection report writer is a long linear form that people fill in on site, often on a phone, often badly lit. A learning system is mostly reading. An admin console is mostly destructive actions that need to be hard to do by accident. The SME toolkit is somebody's first ten minutes with the ecosystem.",
            "What they share is not a look. It is the shell — where navigation lives, how deep it nests, what a page header contains, where a settings panel comes from, what a destructive confirmation reads like — plus the tier boundary that says which of those a product may argue with. That is the part that had to be designed once and documented properly; the rest is each product's own problem, and should be.",
          ],
        },
      ],
    },
  ],
};
