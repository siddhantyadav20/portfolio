/* ===========================================================================
   One track at a time.

   Six records sit on the board and any of them can be clicked. Without a
   single owner they layer, and a canvas playing four songs at once is a bug
   nobody has to report to know about.

   A module singleton rather than context: the discs are server-rendered
   siblings deep inside a transformed world, and threading a provider through
   CanvasWorld would make it a client component for the sake of one <audio>.
   =========================================================================== */

import { drop, lift } from "@/lib/needle";

type Listener = (playingId: string | null) => void;

let el: HTMLAudioElement | null = null;
let playingId: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(playingId);
}

function element() {
  if (!el) {
    el = new Audio();
    el.preload = "none";
    // Ending is the same state as being stopped, so far as the board is
    // concerned — the sleeve closes and the vinyl slides back in.
    el.addEventListener("ended", () => {
      playingId = null;
      emit();
    });
  }
  return el;
}

export function subscribePlaying(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const currentlyPlaying = () => playingId;
export const noneServerSide = () => null;

/** Play `id`, or stop it if it is already the one playing. */
export function toggleTrack(id: string, src: string) {
  const audio = element();
  if (playingId === id) {
    lift();
    audio.pause();
    playingId = null;
    emit();
    return;
  }
  if (audio.src !== new URL(src, window.location.href).href) {
    audio.src = src;
  }
  audio.currentTime = 0;
  /* Before the file, not with it: the mechanism reaches the record first and
     the track arrives out of the surface noise. Switching straight from one
     record to another lands a drop on top of a still-fading one, which is why
     `drop` stops any surface already running. */
  drop();
  // Autoplay can still be refused; failing quietly leaves the sleeve closed,
  // which is the honest representation of "it isn't playing".
  void audio.play().then(
    () => {
      playingId = id;
      emit();
    },
    () => {
      playingId = null;
      emit();
    },
  );
  playingId = id;
  emit();
}

export function stopAll() {
  // Only when there was something to stop — the now-playing card calls this,
  // and so does the canvas closing, and a needle lifting off a turntable that
  // was not running is a sound with nothing behind it.
  if (playingId !== null) lift();
  if (el) el.pause();
  playingId = null;
  emit();
}
