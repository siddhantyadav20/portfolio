import Image from "next/image";
import CardShell from "@/components/primitives/CardShell";
import CtaPill from "@/components/primitives/CtaPill";
import { workspace } from "@/content/site";
import styles from "./WorkspaceCard.module.css";

/**
 * Shell only. The interactive canvas lives behind this boundary and is Phase 7 —
 * nothing here assumes what it will be.
 */
export default function WorkspaceCard() {
  return (
    <CardShell radius={24} surface="solid" className={styles.card}>
      <Image
        src="/media/workspace.png"
        alt=""
        width={322}
        height={246}
        className={styles.bg}
      />
      <CtaPill
        as="a"
        href={workspace.href}
        className={styles.cta}
        icon={
          <img src="/icons/mouse-square.svg" alt="" width={20} height={20} />
        }
      >
        {workspace.cta}
      </CtaPill>
    </CardShell>
  );
}
