import AboutMeCard from "@/components/home/AboutMeCard";
import BottomBlur from "@/components/home/BottomBlur";
import DesignEngineerCard from "@/components/home/DesignEngineerCard";
import DesignSystemExperience from "@/components/home/DesignSystemExperience";
import InspectionExperience from "@/components/home/InspectionExperience";
import Introduction from "@/components/home/Introduction";
import LinkedInCard from "@/components/home/LinkedInCard";
import MusicPlayer from "@/components/home/MusicPlayer";
import SearchExperience from "@/components/home/SearchExperience";
import SiteFooter from "@/components/home/SiteFooter";
import StoreWaitlist from "@/components/home/StoreWaitlist";
import ThemeToggle from "@/components/home/ThemeToggle";
import TimelineExperience from "@/components/home/TimelineExperience";
import CanvasCard from "@/components/home/CanvasCard";
import ProximityField from "@/components/interaction/ProximityField";
import styles from "./page.module.css";

/**
 * The homepage is a server component: everything below renders to HTML and
 * ships no JavaScript except the few islands that genuinely need it
 * (Introduction's copy button, and the pointer field wrapper).
 */
export default function Home() {
  return (
    <>
      <ProximityField>
        <main id="main" className={styles.page}>
          {/* Pinned to the page's top-right corner by this class rather than
              laid out, so where it sits in the markup is free — and it is
              first, because that is where it is painted. It used to live in
              `.topRow`, which put it sixth in the tab order behind every card
              on the page while sitting visually above all of them. */}
          <ThemeToggle className={styles.themeToggle} />

          {/* Source order is the *mobile* reading order, and the desktop grid
              places every child explicitly by `grid-column`/`grid-row`, so
              this costs the wide layout nothing.

              It replaces a block of `order` declarations that reordered these
              five visually and left the tab order following the markup — so a
              phone visitor read the Introduction first and tabbed into the
              Inspection card first. `order` moves paint, never focus; the only
              way to move both is to move the markup.

              THE ORDER BELOW IS A HIERARCHY, NOT THE DESKTOP COLUMNS.

              It used to be col2 → col1 → col3 → topRow, which is the order the
              *grid* wants and no order a reader does. On a phone that read:
              introduction, then a side project's waitlist, then a music
              player, then LinkedIn — and only then the first case study. About
              Me landed 3,619px down, at 81% of the page, and the canvas at
              3,915. The three things a recruiter came for were last.

              Now it answers the questions in the order they get asked: who is
              this (Introduction), what kind of designer (About, the
              Design/Engineer card, the canvas), what have they shipped
              (Inspection, Design System), how did they get here (Timeline,
              Search), what are they doing now (the Store waitlist), and who
              are they otherwise (music, LinkedIn).

              `.lead` exists only so the Introduction can lead while the rest of
              column 2 goes last — the two are one flow on the desktop grid and
              two different places in the narrative. See page.module.css. */}
          <div className={styles.band}>
            <div className={styles.lead}>
              <Introduction className={styles.intro} />
            </div>

            <div className={styles.topRow}>
              <AboutMeCard />
              <DesignEngineerCard />
              <CanvasCard />
            </div>

            <div className={styles.col1}>
              <InspectionExperience />
              <DesignSystemExperience />
            </div>

            <div className={styles.col3}>
              <TimelineExperience />
              <SearchExperience />
            </div>

            <div className={styles.col2}>
              <StoreWaitlist />
              <div className={styles.personality}>
                <MusicPlayer />
                <LinkedInCard />
              </div>
            </div>

            <div className={styles.footerWrap}>
              <SiteFooter />
            </div>
          </div>
        </main>
      </ProximityField>

      {/* Outside the field on purpose: it is fixed to the viewport, not a
          member of the composition the pointer is pushing around. */}
      <BottomBlur />
    </>
  );
}
