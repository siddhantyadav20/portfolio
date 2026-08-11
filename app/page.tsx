import AboutMeCard from "@/components/home/AboutMeCard";
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
    <ProximityField>
      <main className={styles.page}>
        <div className={styles.band}>
          <div className={styles.col1}>
            <InspectionExperience />
            <SearchExperience />
          </div>

          <div className={styles.topRow}>
            <AboutMeCard />
            <DesignEngineerCard />
            <WorkspaceCard />
            <ThemeToggle />
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
            <DesignSystemExperience />
          </div>

          <div className={styles.footerWrap}>
            <SiteFooter />
          </div>
        </div>
      </main>
    </ProximityField>
  );
}
