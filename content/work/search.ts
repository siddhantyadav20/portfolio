import type { CaseStudy } from "./types";

/**
 * Search — skeleton, with a hero that runs.
 *
 * Title and subtitle are the card's own copy from `content/site.ts`, so the
 * study and the card that opens it can never drift apart. Everything else is
 * an empty slot: the meta labels are the same four the Inspection study uses,
 * kept so the scaffold is visible, with `null` values waiting on Siddhant.
 *
 * Until `body` and `sections` are written this study renders its title, its
 * meta scaffold and a marked "not written yet" block. That is deliberate — a
 * study that looks unfinished is honest; one padded with invented detail is
 * not, and this is a real project with real numbers behind it.
 *
 * The hero is the exception, and it is not a hole being filled with filler: it
 * is the same instrument the homepage card runs, which demonstrates the change
 * rather than describing it. A running specimen makes no claim that prose has
 * to back — it shows the old drill-down and the search that replaced it, over a
 * corpus it discloses as a sample. So this page can stop being the one study
 * with no artwork without anybody writing a sentence they have not earned.
 */
export const search: CaseStudy = {
  slug: "search",
  title: "Searching amidst a chaos of 104,122 remarks",
  subtitle: "Navigation first to search first, ~51m saved",

  accent: "blue",

  body: null,

  meta: [
    { label: "Product", value: null },
    { label: "Role", value: null },
    { label: "Timeline", value: null },
    { label: "Skills", value: null },
  ],

  hero: {
    kind: "live",
    view: "remark-finder",
    still: "/media/search.png",
    alt: "The remark search: a query, and the remarks this inspector has used most, from four different categories.",
    width: 823,
    height: 591,
    morphName: "search-frame",
  },

  sections: null,
};
