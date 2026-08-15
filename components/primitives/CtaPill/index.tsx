import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./CtaPill.module.css";

type CtaPillProps<T extends ElementType> = {
  as?: T;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * The frosted pill used by Copy Email, Go to Store and Explore my Canvas —
 * same gradient, radius, height and blur in all three places.
 */
export default function CtaPill<T extends ElementType = "button">({
  as,
  icon,
  className,
  children,
  ...rest
}: CtaPillProps<T>) {
  const Tag = (as ?? "button") as ElementType;

  return (
    <Tag
      className={[styles.pill, "liquid", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
    </Tag>
  );
}
