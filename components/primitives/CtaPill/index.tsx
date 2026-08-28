import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./CtaPill.module.css";

type CtaPillProps<T extends ElementType> = {
  as?: T;
  icon?: ReactNode;
  /**
   * A badge parked against the pill's end — the ⌘K on "Search Portfolio".
   * Its presence is what switches the pill from centred to end-justified, so
   * passing it is the whole opt-in; see `.withTrailing` in the stylesheet.
   */
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * The frosted pill used by Copy Email, Search Portfolio and Explore my Canvas —
 * same gradient, radius, height and blur in all three places.
 */
export default function CtaPill<T extends ElementType = "button">({
  as,
  icon,
  trailing,
  className,
  children,
  ...rest
}: CtaPillProps<T>) {
  const Tag = (as ?? "button") as ElementType;

  return (
    <Tag
      className={[styles.pill, trailing ? styles.withTrailing : null, "liquid", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </Tag>
  );
}
