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
import WorkspaceCard from "@/components/home/WorkspaceCard";
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
        <main className={styles.page}>
          <div className={styles.band}>
            <div className={styles.col1}>
              <InspectionExperience />
              <DesignSystemExperience />
            </div>

            <div className={styles.topRow}>
              <AboutMeCard />
              <DesignEngineerCard />
              <WorkspaceCard />
              {/* Pinned to the page's top-right corner by this class, not
                  laid out by the row it sits in. See page.module.css. */}
              <ThemeToggle className={styles.themeToggle} />
            </div>

            <div className={styles.col2}>
              <Introduction className={styles.intro} />
              <StoreWaitlist />
              <div className={styles.personality}>
                <MusicPlayer />
                <LinkedInCard />
              </div>
            </div>

            <div className={styles.col3}>
              <TimelineExperience />
              <SearchExperience />
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
