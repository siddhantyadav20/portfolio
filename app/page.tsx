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
              way to move both is to move the markup. */}
          <div className={styles.band}>
            <div className={styles.col2}>
              <Introduction className={styles.intro} />
              <StoreWaitlist />
              <div className={styles.personality}>
                <MusicPlayer />
                <LinkedInCard />
              </div>
            </div>

            <div className={styles.col1}>
              <InspectionExperience />
              <DesignSystemExperience />
            </div>

            <div className={styles.col3}>
              <TimelineExperience />
              <SearchExperience />
            </div>

            <div className={styles.topRow}>
              <AboutMeCard />
              <DesignEngineerCard />
              <CanvasCard />
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
