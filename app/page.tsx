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
import SmoothScroll from "@/components/interaction/SmoothScroll";
import styles from "./page.module.css";

/**
 * The homepage is a server component: everything below renders to HTML and
 * ships no JavaScript except the few islands that genuinely need it
 * (Introduction's copy button, and the pointer field wrapper).
 */
export default function Home() {
  return (
    <>
      {/* Momentum scrolling, and only here. The case studies are documents and
          read better native — see the note in the component. Rendered outside
          the field because it draws nothing and is not part of the
          composition the pointer is pushing around. */}
      <SmoothScroll />

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

              THE ORDER BELOW IS FIGMA'S PHONE FRAME, NOT THE DESKTOP COLUMNS.

              It used to be col2 → col1 → col3 → topRow, which is the order the
              *grid* wants and no order a reader does. On a phone that read:
              introduction, then a side project's waitlist, then a music
              player, then LinkedIn — and only then the first case study.

              Figma 843:2477 is the first phone design this site has had, and
              this is its order: who is this, what have they shipped, what are
              they building, the two remaining studies, and then one bordered
              section holding the canvas, the timeline, the identity chips and
              the personality pair — the way further in, gathered into a place
              rather than trailing off as loose cards.

              Two wrappers here are the wide grid's, not the frame's. `.lead`
              exists so the Introduction can lead while the rest of column 2
              ends the page; `.col1` exists because Inspection and the Design
              System are one content-driven column up there and the frame's
              order would split it. Everything else the frame asks for, this
              gives it. See page.module.css. */}
          <div className={styles.band}>
            <div className={styles.lead}>
              <Introduction className={styles.intro} />
            </div>

            {/* The two case studies stay one wrapper because on the wide grid
                they are column 1 — a single content-driven flow spanning the
                whole page. Figma's phone frame puts the Store waitlist between
                them; doing that in the DOM splits that column, and rebuilding
                it means pinning every desktop row to a measured constant. This
                stylesheet refuses to pin the Introduction's row on purpose, so
                the waitlist follows the pair instead of splitting it. That is
                the one place this layout departs from the phone frame. */}
            <div className={styles.col1}>
              <InspectionExperience />
              <DesignSystemExperience />
            </div>

            <div className={styles.store}>
              <StoreWaitlist />
            </div>

            <div className={styles.search}>
              <SearchExperience />
            </div>

            {/* Figma 844:2887 — on a phone these four are one bordered section
                rather than four cards in a row of their own, which is what
                turns "here are some more things about me" into a place. On the
                wide grid the wrapper is `display: contents`, so every child
                below is placed on the band's own grid exactly where it always
                was and this box does not exist at all. */}
            <div className={`${styles.closing} squircle`}>
              {/* Slots, because `.closing` is `display: contents` on the wide
                  grid and these two are then placed on the band directly —
                  which needs a box this stylesheet owns a class on. */}
              <div className={styles.canvasSlot}>
                <CanvasCard />
              </div>

              <div className={styles.timelineSlot}>
                <TimelineExperience />
              </div>

              <div className={styles.chips}>
                <AboutMeCard />
                <DesignEngineerCard />
              </div>

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
