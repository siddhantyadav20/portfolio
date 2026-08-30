"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Spinner.module.css";

/* ===========================================================================
   The searching state's loader.

   Figma 80:7719 and 869:6948 draw this as a flat PNG, which is the one thing it
   cannot be: it is the only element on the card whose entire job is to say
   "still working". So it is a Lottie — `searching.lottie.json`, a 2.7KB ring
   pulled from LottieFiles' free packages CDN
   (assets10.lottiefiles.com/packages/lf20_b88nh30c.json, "loading_6", Lottie
   Simple License) and retinted to `--blue-bright` by the script in this
   commit's message. Two strokes: a full ring at 30% and a trimmed arc at 100%
   sweeping over it, so one hue reads on both the white card and the dark one.

   WHY IT IS LOADED THE WAY IT IS. `lottie-web`'s light build is 47KB gzipped —
   more than this card's whole share of the homepage, and the homepage's
   critical path has been cut twice already. So neither the player nor the
   animation is in the page bundle: both arrive through a dynamic import, and
   the import does not start until something is actually about to search. The
   card can sit on screen forever without paying for either.

   Which leaves a gap of a hundred milliseconds or so between "searching" and
   "the player is ready", and a loader that is blank while it loads is a joke at
   its own expense. `.ring` below is a plain conic-gradient spinner that renders
   on the first frame and is replaced the moment the real one mounts. Under
   reduced motion it is not replaced at all — see `still`.
   =========================================================================== */

type Props = {
  /** Design pixels. Scaled by `--u` like everything else on the card. */
  size: number;
  /** What a screen reader hears. The 14px one inside the Send button is
   *  decorative — the button already says what it is doing — so it passes
   *  nothing and is hidden instead. */
  label?: string;
};

/**
 * Below this, the ring is the whole animation and the Lottie never loads.
 *
 * The file puts a loader inside the 32px Send button as well as under the
 * field, and at 14px the Lottie is not worth having: its arc is a sweeping trim
 * path, so a third of the loop is an arc under two pixels long and the thing
 * reads as a flickering dot. The conic ring holds a constant stroke at any size
 * and is legible at 14 — and it costs the second instance nothing, since the
 * player it would have needed is already the expensive part.
 */
const LOTTIE_ABOVE = 24;

/**
 * Warm the chunk before it is wanted.
 *
 * Called when the field is first typed into, which is a beat or two before the
 * search it will run. By the time the loader is on screen the import has
 * usually resolved and the fallback ring is never seen. Idempotent, and the
 * result is discarded — this is a fetch, not a load.
 */
export function preloadSpinner() {
  if (typeof window === "undefined") return;
  void import("lottie-web/build/player/lottie_light");
  void import("./searching.lottie.json");
}

export default function Spinner({ size, label }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* Reduced motion keeps the fallback, which is a static ring: the animation
       is decorative, it says nothing the words beside it do not, and a thing
       that exists only to spin is exactly what the setting is about. The card
       around it stays fully usable — see the note on the cue. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (size < LOTTIE_ABOVE) return;

    let dead = false;
    let anim: { destroy: () => void } | null = null;

    void (async () => {
      const [player, data] = await Promise.all([
        import("lottie-web/build/player/lottie_light"),
        import("./searching.lottie.json"),
      ]);

      // Unmounted while the chunk was in flight — which is the common case for
      // a fast search, so it is a return and not an error.
      if (dead || !host.current) return;

      anim = player.default.loadAnimation({
        container: host.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: data.default,
      });
      setReady(true);
    })();

    return () => {
      dead = true;
      anim?.destroy();
    };
  }, [size]);

  return (
    <span
      className={styles.spinner}
      style={{ ["--size" as string]: `calc(${size} * var(--u))` }}
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label && <span className="srOnly">{label}</span>}
      {/* Both are always in the tree; `data-ready` hides the fallback rather
          than unmounting it, so the swap cannot reflow the row it sits in. */}
      <span className={styles.ring} data-ready={ready ? "" : undefined} />
      <span className={styles.lottie} ref={host} />
    </span>
  );
}
