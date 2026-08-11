import type { ReactNode } from "react";
import styles from "./GlassChip.module.css";

/**
 * The frosted green-tinted stat chip. Genuinely repeated: it appears on the
 * Inspection, Search and Design System cards and on the Music Player, with
 * identical fill, stroke, radius and blur in Figma.
 */
export default function GlassChip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[styles.chip, "squircle", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
