import type { ElementType, ComponentPropsWithRef, ReactNode } from "react";
import styles from "./CardShell.module.css";

/** `translucent` is the case studies, `soft` every other card — see
 *  `--surface-soft` in globals.css. */
type Surface = "translucent" | "soft" | "solid" | "glass" | "none";
/** The card's corner at the 1440 frame. Each one is a curve, not a step — see
 *  `--r-card-*` in globals.css for what it does at every other width. 28 and 32
 *  are flat across the range. */
type Radius = 28 | 32 | 40 | 48 | 64;

const radiusClass: Record<Radius, string> = {
  28: styles.r28,
  32: styles.r32,
  40: styles.r40,
  48: styles.r48,
  64: styles.r64,
};

type CardShellProps<T extends ElementType> = {
  as?: T;
  surface?: Surface;
  radius?: Radius;
  /** Opt out of the cursor-proximity field (e.g. the footer). */
  static?: boolean;
  className?: string;
  children?: ReactNode;
  /** Forwarded to the rendered element. React 19 passes `ref` through as an
   *  ordinary prop, so the spread below already delivers it — this is only
   *  what lets a caller say so in types. The Design System card needs it to
   *  put pointer listeners on the card itself. */
} & Omit<ComponentPropsWithRef<T>, "as" | "className" | "children">;

/**
 * The one genuinely repeated surface in the composition: a translucent white
 * card with an iOS-smoothed corner. Nothing else is shared — every experience
 * owns its own internals.
 *
 * Also the anchor point for the cursor-proximity field: the controller finds
 * cards by `[data-prox-card]` and writes transforms straight onto them.
 */
export default function CardShell<T extends ElementType = "div">({
  as,
  surface = "translucent",
  /* The flat rung. Every call site states its own, so this is only what an
     unstated card would get — and a corner that does not move is the safer
     thing to be wrong about than one that grows with the viewport. */
  radius = 32,
  static: isStatic = false,
  className,
  children,
  ...rest
}: CardShellProps<T>) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      className={[
        styles.card,
        "squircle",
        styles[surface],
        radiusClass[radius],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...(isStatic ? {} : { "data-prox-card": "" })}
      {...rest}
    >
      {children}
    </Tag>
  );
}
