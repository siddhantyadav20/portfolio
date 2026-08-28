"use client";

import { createContext, useContext } from "react";

/**
 * Whether a case-study card is the one that owns its study, or a copy of it
 * standing somewhere else.
 *
 * The three homepage cards are not thumbnails. Each is the study arguing for
 * itself — a phone playing the real recording, a running search, a live
 * theming instrument — and each one owns two things besides: the modal it
 * opens, and the `view-transition-name` the modal morphs out of.
 *
 * Both of those are singular, and that is why this exists. The foot of every
 * case study now shows the *other* studies' cards, so a second copy of a card
 * can be on the page at the same time as the first:
 *
 *   · Two live elements sharing one `view-transition-name` abort the
 *     transition for both — so the copy in a study's footer would break the
 *     morph on the homepage card it is a copy of.
 *   · A card inside a modal that opens its own modal opens it on top of the
 *     one you are already reading.
 *
 * `"link"` is the copy: same card, same hover, same instrument, and a plain
 * anchor underneath instead of the morph. Nothing about what makes the card
 * worth looking at is behind this flag — only what makes it the original.
 */
export type StudyCardMode = "live" | "link";

const Ctx = createContext<StudyCardMode>("live");

export const StudyCardModeProvider = Ctx.Provider;

export function useStudyCardMode(): StudyCardMode {
  return useContext(Ctx);
}

/** Shorthand — every card asks the same question. */
export function useIsLiveCard(): boolean {
  return useStudyCardMode() === "live";
}
