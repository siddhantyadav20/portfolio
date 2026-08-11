import Image from "next/image";
import CardShell from "@/components/primitives/CardShell";
import GlassChip from "@/components/primitives/GlassChip";
import { music } from "@/content/site";
import styles from "./MusicPlayer.module.css";

/**
 * Figma "Music Player", Default (paused) state.
 *
 * No audio is loaded in Phase 1 — playback, progress and track changes are
 * Phase 8. The play control is a real button so behaviour can attach later,
 * and it starts paused by design (audio never autoplays).
 */
export default function MusicPlayer() {
  return (
    <CardShell radius={24} surface="solid" className={styles.card}>
      <Image
        src="/media/album.png"
        alt=""
        width={254}
        height={280}
        className={styles.cover}
      />

      <button type="button" className={styles.play}>
        <img src="/icons/play.svg" alt="" width={32} height={32} />
        <span className="srOnly">Play {music.track}</span>
      </button>

      <GlassChip className={styles.chip}>
        <div className={styles.helper}>
          <span className={styles.label}>
            <img src="/icons/music.svg" alt="" width={16} height={16} />
            {music.label}
          </span>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.progress}>
            {music.index}/{music.total}
          </span>
        </div>
        <p className={styles.track}>{music.track}</p>
      </GlassChip>

      <div className={styles.bars} aria-hidden="true">
        <span className={styles.barActive} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </div>
    </CardShell>
  );
}
