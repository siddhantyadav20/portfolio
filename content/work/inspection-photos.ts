import type { CaseStudy } from "./types";

/**
 * Inspection — the flagship study, and the only one with a running prototype.
 *
 * Migrated out of `content/site.ts` (where it lived as `inspection.caseStudy`)
 * without changing the slug: `?study=inspection-photos` links are already
 * shareable from the modal's copy button, and some may exist.
 *
 * Everything above `sections` is Siddhant's own copy, transcribed from Figma
 * "Case Study - Modal" (node 62:3688). `sections` is the full write-up, which
 * is still to be written — the layout below it is finished, the words are not.
 */
export const inspectionPhotos: CaseStudy = {
  slug: "inspection-photos",
  title: "Capturing 200+ Inspection Photos",
  subtitle:
    "Cut reporting time by 13 minutes per inspection, across 20,000+ inspections daily",

  body: "In early 2026, after launching an offline-first mobile app for conducting home inspections for inspectors based in the US in early 2025, we set out to redesign the camera flow — one of the most crucial and most heavily used features, and one that had never been designed to its full potential.",

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
  },

  sections: null,
};
