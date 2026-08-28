"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { escapeFromField } from "@/lib/modalShell";

type Props = {
  /** Where Escape goes. The same href the close button in the corner has. */
  href: string;
};

/**
 * Escape, on a surface that is not a modal but is indistinguishable from one.
 *
 * The `/work/<slug>` route and the modal a homepage card morphs into render
 * the same `StudyReader` inside the same two control clusters — that is the
 * point of the split, and it is why a shared link opens the study somebody
 * actually copied rather than a plainer second layout of it. The one thing the
 * two surfaces did *not* share was the keyboard: `ModalSurface` binds Escape
 * through `useModalShell`, and the route bound nothing.
 *
 * So Escape closed a study opened from the homepage and did nothing at all to
 * the identical-looking page a shared link opened, with no way for the reader
 * to tell which one they were on. Both of the ways that gets reported are the
 * same bug: "it stops working when I've navigated using a link" is arriving on
 * the route, and "when I've been on the page a while" is the modal's own URL —
 * opening one pushes `/work/<slug>` — being reloaded at some point and coming
 * back as the route.
 *
 * Not `useModalShell`. Everything else that hook does is wrong here: this page
 * is not covering anything, so there is nothing to trap Tab inside, nothing to
 * lock the scroll of, and no opener to hand focus back to. Escape is the only
 * part the route was missing, and it is the only part taken.
 *
 * `router.push` rather than `location.href`, because the close button beside it
 * is a `next/link` — the two controls should be one behaviour, not two spellings
 * of it.
 */
export default function EscapeHome({ href }: Props) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // The comment box gets the first Escape when it is holding something —
      // the same rule the modal follows, out of the same function.
      if (escapeFromField()) return;
      e.preventDefault();
      router.push(href);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, href]);

  return null;
}
