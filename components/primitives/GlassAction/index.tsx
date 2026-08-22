import Link from "next/link";
import type { ReactNode, Ref } from "react";
import styles from "./GlassAction.module.css";

type Props = {
  /** Renders a link instead of a button — the route's close, which goes home. */
  href?: string;
  onClick?: () => void;
  /** The control's accessible name. Always required: every one of these is an
   *  icon, and an icon is not a name. */
  label: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

/**
 * Figma node 67:4229 — a 64x64 glass disc with a glyph in it, radius 60.
 *
 * Every control in the reader's two clusters is one of these: Share on the
 * left, the close on the right, and the theme toggle is the same plate at
 * double width. It lives here rather than in `ModalSurface` because the
 * `/work/<slug>` route needs the identical cluster and is a server component —
 * importing the class name out of a `"use client"` module would have pulled
 * the whole modal shell into a route that never opens one.
 */
export default function GlassAction({
  href,
  onClick,
  label,
  className,
  ref,
  children,
}: Props) {
  const cls = [styles.action, "liquid", className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
        <span className="srOnly">{label}</span>
      </Link>
    );
  }

  return (
    <button ref={ref} type="button" className={cls} onClick={onClick}>
      {children}
      <span className="srOnly">{label}</span>
    </button>
  );
}

/**
 * The close glyph — two 2x23.756 rounded bars at ±45deg, which is how Figma
 * draws it rather than as an icon file.
 *
 * `currentColor`, not #000: `.action` sets `color: var(--ink)`, so the glyph
 * follows the theme instead of vanishing into a dark plate.
 */
export function CloseGlyph() {
  return (
    <span className={styles.cross} aria-hidden="true">
      <span className={styles.bar} />
      <span className={styles.bar} />
    </span>
  );
}
