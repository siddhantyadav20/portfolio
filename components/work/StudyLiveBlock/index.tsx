import RemarkFinderSpecimen from "@/components/interaction/RemarkFinder/RemarkFinderSpecimen";
import ThemingSpecimen from "@/components/interaction/ThemingInstrument/ThemingSpecimen";
import TokenAnatomy from "./TokenAnatomy";
import type { StudyLive } from "@/content/work";

type Props = {
  view: StudyLive;
  /** Fill the caller's box and drop the figure's own frame and caption. What
   *  a hero wants; a block in prose does not. */
  bare?: boolean;
  className?: string;
};

/**
 * The bridge between a study's data and a running specimen.
 *
 * `content/work` is imported by a server route and has to stay serialisable,
 * so a section asks for a specimen by name and this is where the name becomes
 * a component. Only two exist, and both belong to the Design System study —
 * the indirection is not speculative generality, it is the only way a plain
 * object can reach a client component from a server page.
 *
 * Not a client component itself: it renders them, which a server component may
 * do. `TokenAnatomy` ships no JavaScript at all.
 */
export default function StudyLiveBlock({ view, bare, className }: Props) {
  switch (view) {
    case "theming-instrument":
      return <ThemingSpecimen bare={bare} className={className} />;
    case "token-anatomy":
      return <TokenAnatomy />;
    case "remark-finder":
      return <RemarkFinderSpecimen bare={bare} className={className} />;
  }
}
