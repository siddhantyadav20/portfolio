/**
 * The `target`/`rel` pair for an anchor, decided by where the href actually
 * goes.
 *
 * Anything that leaves the site — a profile, a mail client, a phone dialler —
 * opens in a new tab, so the portfolio is still sitting there when the visitor
 * comes back. Everything internal keeps the current tab, which is the whole
 * reason this is a function and not a literal: the case study routes and the
 * modals they open are same-tab navigations by design, and `/work/<slug>`
 * links must stay that way for the view transition into the reader to run at
 * all.
 *
 * `null`/`undefined` is the `MaybeHref` convention used across `content/` for
 * a destination that does not exist yet — an inert anchor gets nothing.
 *
 * `noopener` is implied by `target="_blank"` in current browsers and stated
 * anyway: it is what stops the opened page reaching back through
 * `window.opener`, and the palette's `window.open` calls spell it out for the
 * same reason.
 */
export function externalLinkProps(href: string | null | undefined) {
  if (!href || !/^(https?:|mailto:|tel:)/i.test(href)) return {};
  return { target: "_blank", rel: "noopener noreferrer" } as const;
}
