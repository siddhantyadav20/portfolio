"use client";

/**
 * The whole board, in the order it should be auditioned.
 *
 * Ordered by material rather than by widget — all the paper together, then the
 * card, then the metal, then the impacts — because the failure being hunted is
 * two different objects arriving as the same sound, and that is only audible
 * when the neighbours are the ones most likely to be confused.
 */

import { openBook, closeBook, riffle } from "@/components/canvas/widgets/Book/leaf";
import { slip, shuffle } from "@/components/canvas/widgets/PhotoStack/slip";
import { rasp, reveal } from "@/components/canvas/widgets/ScratchCard/rasp";
import { playSticker } from "@/components/canvas/widgets/Sticker/sounds";
import { key, enter } from "@/components/canvas/widgets/Terminal/keys";
import { print } from "@/components/canvas/widgets/Receipt/printer";
import { graphite } from "@/components/canvas/widgets/DrawingCanvas/graphite";
import { enterRoom } from "@/components/canvas/CanvasSurface/room";
import { createJet } from "@/components/home/DesignEngineerCard/jet";
import { celebrate } from "@/components/home/StoreWaitlist/won";
import { switched } from "@/components/home/ThemeToggle/switched";
import { confirmed } from "@/lib/confirm";
import { drop, lift } from "@/lib/needle";
import type { SfxCue } from "@/lib/sfx-manifest";

/** A cue that runs until told to stop returns its stopper. */
export type Stop = () => void;

export type Row = {
  id: string;
  label: string;
  /** What it is a picture of. The thing the recording has to be OF. */
  object: string;
  /** The recorded cue this row auditions, if it has one. */
  cue?: SfxCue;
  /** What the site plays today. */
  synth?: () => Stop | void;
  /** Held rather than fired. */
  sustained?: boolean;
  /** Abstractions are listed so the board can be heard whole, but they are not
   *  candidates for replacement — see the rule in lib/sfx.ts. */
  abstract?: boolean;
  note?: string;
};

/** Run a granular cue for a while, the way a real drag does. */
function drag(fn: (speed: number) => void, speed: number): Stop {
  const timer = window.setInterval(() => fn(speed), 16);
  return () => window.clearInterval(timer);
}

export const BOARD: Row[] = [
  /* --- Paper ------------------------------------------------------------- */
  {
    id: "book-page",
    label: "Book · hover",
    object: "one page lifting, arcing, settling",
    cue: "book-page",
    synth: riffle,
    note: "The one cue on this widget that already works. Match it, do not improve it.",
  },
  {
    id: "book-open",
    label: "Book · open",
    object: "a hundred pages riffling past a thumb",
    cue: "book-riffle-open",
    synth: openBook,
    note: "42 scheduled bursts. The ratchet.",
  },
  {
    id: "book-close",
    label: "Book · close",
    object: "the block running back, landing on the boards",
    cue: "book-riffle-close",
    synth: closeBook,
  },
  {
    id: "photo-slip",
    label: "Photos · next",
    object: "one print sliding off a stack",
    cue: "photo-slip",
    synth: slip,
    note: "62ms bandpass at 4.2kHz — all treble, no body.",
  },
  {
    id: "photo-shuffle",
    label: "Photos · category",
    object: "the whole block moving, then squaring up",
    cue: "photo-settle",
    synth: shuffle,
    note: "Today this is the row above, longer and lower. It has to differ in kind.",
  },

  /* --- Card and foil ------------------------------------------------------ */
  {
    id: "scratch-slow",
    label: "Scratch · slow",
    object: "a coin dragged across foil, gently",
    cue: "scratch-rub",
    synth: () => drag(rasp, 0.35),
    sustained: true,
  },
  {
    id: "scratch-fast",
    label: "Scratch · fast",
    object: "the same coin, hard and quick",
    cue: "scratch-rub",
    synth: () => drag(rasp, 1.6),
    sustained: true,
    note: "The firecracker: bright driven grains plus rings at 5.2k and 7.7k.",
  },
  {
    id: "scratch-reveal",
    label: "Scratch · reveal",
    object: "a rising fourth — a result, not an object",
    synth: reveal,
    abstract: true,
    note: "Stays synthesised. Correctly a note.",
  },
  {
    id: "pencil",
    label: "Pencil",
    object: "graphite moving on paper",
    cue: "pencil-draw",
    synth: () => drag(graphite, 0.8),
    sustained: true,
  },
  {
    id: "printer",
    label: "Receipt",
    object: "a thermal printer stepping paper out",
    cue: "printer-run",
    synth: print,
  },

  /* --- Keys and metal ----------------------------------------------------- */
  {
    id: "key",
    label: "Terminal · key",
    object: "one keystroke",
    cue: "key-press",
    synth: key,
    note: "Fires faster than anything else here. Needs four takes minimum.",
  },
  {
    id: "enter",
    label: "Terminal · enter",
    object: "the big key, with a body under it",
    cue: "key-enter",
    synth: enter,
  },
  {
    id: "needle-drop",
    label: "Needle · drop",
    object: "a stylus landing in a groove",
    cue: "needle-drop",
    synth: drop,
    note: "Sits next to real music, so a synthesised stylus is the most exposed cue on the site.",
  },
  {
    id: "needle-lift",
    label: "Needle · lift",
    object: "the stylus coming off",
    cue: "needle-lift",
    synth: lift,
  },

  /* --- Impacts ------------------------------------------------------------ */
  {
    id: "rifle",
    label: "Sticker · rifle",
    object: "a rifle: report, mechanism, room",
    cue: "sticker-rifle",
    synth: () => playSticker("recoil"),
    note: "PEAK is 0.16, raised because the synth had no transient. A real one does — bring it back down.",
  },
  {
    id: "kick",
    label: "Sticker · bicycle kick",
    object: "a boot through a football",
    cue: "sticker-kick",
    synth: () => playSticker("bicycle"),
  },
  {
    id: "punch",
    label: "Sticker · punch",
    object: "a punch landing — dull, damped, no ring",
    cue: "sticker-punch",
    synth: () => playSticker("hadouken"),
    note: "Must not be confusable with the football above.",
  },
  {
    id: "rocket",
    label: "Sticker · rocket",
    object: "ignition, then a roar that leaves",
    cue: "sticker-rocket",
    synth: () => playSticker("flight"),
  },
  {
    id: "jet",
    label: "Designer/Engineer · jet",
    object: "an aircraft passing",
    cue: "jet-pass",
    sustained: true,
    synth: () => {
      const jet = createJet();
      if (!jet) return;
      jet.drive(1, 0.6);
      return () => {
        jet.release();
        window.setTimeout(() => jet.dispose(), 900);
      };
    },
  },

  /* --- Abstractions, for hearing the board whole --------------------------- */
  {
    id: "room",
    label: "Canvas · entry",
    object: "the room opening",
    synth: enterRoom,
    abstract: true,
    note: "Do not touch. Its 340ms hold is settled against the card morph.",
  },
  {
    id: "confirm",
    label: "Copy confirm",
    object: "an acknowledgement",
    synth: confirmed,
    abstract: true,
  },
  {
    id: "theme",
    label: "Theme toggle",
    object: "a switch",
    synth: () => switched("dark"),
    abstract: true,
  },
  {
    id: "won",
    label: "Waitlist",
    object: "a celebration",
    synth: celebrate,
    abstract: true,
  },
];
