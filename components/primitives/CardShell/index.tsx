import type { ElementType, ComponentPropsWithRef, ReactNode } from "react";
import styles from "./CardShell.module.css";

type Surface = "translucent" | "solid" | "glass" | "none";
type Radius = 16 | 20 | 24 | 32 | 48;

const radiusClass: Record<Radius, string> = {
  16: styles.r16,
  20: styles.r20,
  24: styles.r24,
  32: styles.r32,
  48: styles.r48,
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
  radius = 24,
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
