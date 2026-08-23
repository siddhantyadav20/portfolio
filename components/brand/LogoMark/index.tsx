import { LOGO_BOX, LOGO_S, LOGO_Y } from "@/content/logo";

/**
 * The mark.
 *
 * One element for both themes and both surfaces — the Introduction card and the
 * arrival sequence render this same component, which is what makes the
 * hand-over between them exact rather than approximate.
 *
 * The two tones are `--mark-s` and `--mark-y`, declared in globals.css and
 * swapped by the theme. That is the thing the PNG pair could not do: the mark
 * is two-tone, so `currentColor` never reached it and the only way to theme a
 * bitmap was to ship two of them.
 *
 * `partClass` lets a caller put a class on each tone so it can animate them
 * separately. Nothing else needs it, and it renders nothing when omitted.
 */
export default function LogoMark({
  className,
  title,
  partClass,
  ...rest
}: {
  className?: string;
  /** Given, the mark is announced. Omitted, it is decorative. */
  title?: string;
  partClass?: { s?: string; y?: string };
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${LOGO_BOX.w} ${LOGO_BOX.h}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      /* Spread last so a caller's `data-` hook actually reaches the DOM.
         TypeScript does not check hyphenated JSX attributes, so a component
         that quietly drops them fails silently — which is exactly what
         happened to `data-logo` the first time. */
      {...rest}
    >
      <g className={partClass?.y} fill="var(--mark-y)">
        <path d={LOGO_Y} />
      </g>
      <g className={partClass?.s} fill="var(--mark-s)">
        {LOGO_S.map((d) => (
          <path key={d.slice(0, 12)} d={d} />
        ))}
      </g>
    </svg>
  );
}
