"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { found } from "@/content/found";
import { useMediaQuery } from "@/lib/clientValue";
import { buzz, warmBuzz } from "@/lib/found/buzz";
import { useVisible } from "@/lib/visible";
import Face, { SHOWN } from "./Face";
import styles from "./FoundCard.module.css";

/** A new message every so often while the phone is on screen. Long enough
 *  that it reads as someone texting, not as a loop. */
const EVERY_MS = 6400;
/** The motor's two pulses, and the shake that goes with them. */
const BUZZ_MS = 560;
/** Hovering buzzes it for real, but not on every pass of the pointer. */
const SOUND_EVERY_MS = 4000;

/**
 * Found's phone on the canvas: the door into the game at /found.
 *
 * What makes it worth a look before anyone reads a word: it is buzzing, and
 * the messages on its lock screen keep coming. It only does that while it is
 * on screen and the tab is in front (`useVisible`), and not at all for anyone
 * who asked for less motion, for whom it is a still phone with three messages.
 *
 * The whole phone is one link. The canvas never starts a pan on a link (see
 * CanvasSurface's pointerdown), so pressing it opens the game and dragging
 * across it doesn't. The first render is always the same three messages: the
 * canvas is server-rendered, and the arrivals only start after mount.
 */
export default function FoundCard() {
  const ref = useRef<HTMLAnchorElement>(null);
  const visible = useVisible(ref);
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [count, setCount] = useState(SHOWN);
  const [buzzing, setBuzzing] = useState(false);
  const stop = useRef(0);
  const lastSound = useRef(0);

  const shake = () => {
    setBuzzing(true);
    window.clearTimeout(stop.current);
    stop.current = window.setTimeout(() => setBuzzing(false), BUZZ_MS);
  };

  useEffect(() => {
    if (!visible || still) return;
    // Only once the phone is actually in view: 15KB nobody on the far side
    // of the board should pay for.
    warmBuzz();
    const timer = window.setInterval(() => {
      setCount((n) => n + 1);
      shake();
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [visible, still]);

  useEffect(() => () => window.clearTimeout(stop.current), []);

  const onEnter = () => {
    const now = Date.now();
    if (now - lastSound.current < SOUND_EVERY_MS) return;
    lastSound.current = now;
    buzz();
    if (!still) shake();
  };

  return (
    <Link
      ref={ref}
      href={found.href}
      className={styles.card}
      aria-label={`${found.cta}. ${found.hint}`}
      onPointerEnter={onEnter}
      onFocus={onEnter}
    >
      <Face count={count} buzzing={buzzing} sizes="320px" />
    </Link>
  );
}
