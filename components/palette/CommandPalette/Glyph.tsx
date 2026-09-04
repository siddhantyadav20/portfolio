"use client";

import type { PaletteEntry } from "@/content/palette";

/* ===========================================================================
   The mark at the head of a row.

   Every palette worth copying — Raycast, Linear, Superhuman — puts a glyph in
   front of each row, and none of them do it for decoration. A list of twelve
   sentences is read; a list of twelve sentences with a shape in front of each
   is *scanned*. The eye finds the third page-icon without parsing a word of
   it, which is the difference between a palette you use and a palette you
   read.

   Drawn as geometry rather than pulled from `public/icons`, for the reason the
   two-tone mark in globals.css records: a stencil carries one colour, and
   these have to sit at ink-40 when a row is quiet and at the accent when it is
   the row Enter will run. A mask can do that; it just cannot do it while also
   being nine shapes this site does not otherwise own. Half of these — a flag,
   a trend of bars, a set of corner brackets — have no file to load.

   Keyed on the ENTRY'S OWN GROUP, never on the display group. A study you
   opened yesterday is filed under "Where you left off" and is still a study,
   and it should still look like one; a "recent" clock in front of it would say
   the row had changed kind. The one exception is `do`, where the group says
   nothing useful — "Do" covers copying an email and switching a theme — so
   those key on the destination instead, which is the thing that differs.
   =========================================================================== */

/** Every shape this can draw. */
type GlyphKey =
  | "spark"
  | "page"
  | "bars"
  | "flag"
  | "frame"
  | "note"
  | "clock"
  | "mail"
  | "link"
  | "theme"
  | "sound"
  | "download"
  | "external"
  | "arrow"
  | "target";

/**
 * Which shape a row wears.
 *
 * `do` reads its destination and everything else reads its group — see the
 * header. The `route`/`card` cases are the ones that would otherwise both land
 * on a generic arrow: a route leaves the page and a card is somewhere on the
 * page you are already on, and a palette that draws those the same way has
 * lost the only distinction its reader cares about.
 */
export function glyphFor(entry: PaletteEntry): GlyphKey {
  const to = entry.to;

  if (to.kind === "external") return "external";

  if (entry.group === "do") {
    switch (to.kind) {
      case "action":
        switch (to.action) {
          case "copy-email":
            return "mail";
          case "copy-link":
            return "link";
          case "theme":
            return "theme";
          case "sound":
            return "sound";
          case "resume":
            return "download";
          // A colophon is a page about how the thing was made, and that is
          // what it looks like. In `do` the page glyph cannot be confused
          // with a case study, which is the only other thing wearing it.
          case "colophon":
            return "page";
          default:
            return "arrow";
        }
      case "route":
        return "arrow";
      case "card":
        return "target";
      default:
        return "arrow";
    }
  }

  switch (entry.group) {
    case "start":
      return "spark";
    case "work":
      return "page";
    case "evidence":
      return "bars";
    case "career":
      return "flag";
    case "board":
      return "frame";
    case "listen":
      return "note";
    // Never reached from an entry — `recent` is a display group the empty
    // state assigns and nothing in the index is. Present so the switch is
    // total, and drawn as a clock in case that ever stops being true.
    case "recent":
      return "clock";
    default:
      return "arrow";
  }
}

/**
 * One 16px shape, in `currentColor`.
 *
 * Uniform stroke and round joins throughout, so nine unrelated shapes read as
 * one family. `spark` is the only filled one and that is deliberate: it marks
 * the four questions at the top of the empty state, which are the rows this
 * panel most wants pressed.
 */
export function Glyph({ name }: { name: GlyphKey }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape(name)}
    </svg>
  );
}

function shape(name: GlyphKey) {
  switch (name) {
    case "spark":
      return (
        <path
          d="M8 1.4c.5 3.7 2.9 6.1 6.6 6.6-3.7.5-6.1 2.9-6.6 6.6-.5-3.7-2.9-6.1-6.6-6.6C5.1 7.5 7.5 5.1 8 1.4Z"
          fill="currentColor"
          stroke="none"
        />
      );

    case "page":
      return (
        <>
          <path d="M4.2 2.2h4.9L12 5.1v8.7H4.2Z" />
          <path d="M8.9 2.3v3h3" />
        </>
      );

    case "bars":
      return (
        <>
          <path d="M2.6 13.4h10.8" />
          <path d="M4.8 13.4V9.6M8 13.4V4.9M11.2 13.4V7.6" />
        </>
      );

    case "flag":
      return (
        <>
          <path d="M4 13.6V2.4" />
          <path d="M4 3.2h7.4L9.6 5.9l1.8 2.7H4Z" />
        </>
      );

    case "frame":
      return (
        <>
          <path d="M2.4 5.6V2.4h3.2M10.4 2.4h3.2v3.2M13.6 10.4v3.2h-3.2M5.6 13.6H2.4v-3.2" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </>
      );

    case "note":
      return (
        <>
          <path d="M6.4 11.8V3.1l7.2-1.5v8.7" />
          <circle cx="4.3" cy="11.8" r="2.1" />
          <circle cx="11.5" cy="10.3" r="2.1" />
        </>
      );

    case "clock":
      return (
        <>
          <circle cx="8" cy="8" r="5.9" />
          <path d="M8 4.7V8l2.4 1.6" />
        </>
      );

    case "mail":
      return (
        <>
          <rect x="1.9" y="3.6" width="12.2" height="8.8" rx="1.6" />
          <path d="M2.4 4.9 8 8.8l5.6-3.9" />
        </>
      );

    case "link":
      return (
        <>
          <path d="M6.6 9.4 9.4 6.6" />
          <path d="M9 4.9 10.1 3.8a2.6 2.6 0 0 1 3.7 3.7l-1.1 1.1" />
          <path d="M7 11.1 5.9 12.2a2.6 2.6 0 0 1-3.7-3.7l1.1-1.1" />
        </>
      );

    case "theme":
      return (
        <>
          <circle cx="8" cy="8" r="5.9" />
          {/* The lit half, as a fill rather than a second stroke — a theme
              toggle drawn in outline alone is a circle with a line through it,
              which is a "no". */}
          <path d="M8 2.1a5.9 5.9 0 0 1 0 11.8Z" fill="currentColor" stroke="none" />
        </>
      );

    case "sound":
      return (
        <>
          {/* A cone and one arc. Two arcs is the volume icon in every settings
              panel ever drawn and reads as "loud"; one is a thing making a
              sound, which is what these cues are. Drawn on rather than off —
              the struck-through version would say the sound is already muted,
              and this row is the same row in both states. */}
          <path d="M3.1 6.3h2.2l3.1-2.5v8.4L5.3 9.7H3.1z" />
          <path d="M10.9 6.1a2.7 2.7 0 0 1 0 3.8" />
        </>
      );

    case "download":
      return (
        <>
          <path d="M8 2.2v7.4" />
          <path d="M5.4 7 8 9.6 10.6 7" />
          <path d="M2.7 12v1.8h10.6V12" />
        </>
      );

    case "external":
      return (
        <>
          <path d="M12.2 9.3v4.1H2.6V3.8h4.1" />
          <path d="M9.6 2.6h3.8v3.8" />
          <path d="M13.4 2.6 7.8 8.2" />
        </>
      );

    case "arrow":
      return (
        <>
          <path d="M2.8 8h10" />
          <path d="M9.2 4.4 12.8 8l-3.6 3.6" />
        </>
      );

    case "target":
      return (
        <>
          <circle cx="8" cy="8" r="4.4" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6" />
        </>
      );
  }
}
