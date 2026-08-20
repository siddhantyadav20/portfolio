import type { CaseStudy } from "./types";

/**
 * Search — skeleton.
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
 */
export const search: CaseStudy = {
  slug: "search",
  title: "Searching amidst a chaos of 104,122 remarks",
  subtitle: "Navigation first to search first, ~51m saved",

  body: null,

  meta: [
    { label: "Product", value: null },
    { label: "Role", value: null },
    { label: "Timeline", value: null },
    { label: "Skills", value: null },
  ],

  hero: null,

  sections: null,
};
