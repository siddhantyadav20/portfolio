"use client";

import { useEffect, useRef, useState } from "react";
import { oneko } from "@/content/canvas";
import styles from "./Oneko.module.css";

/* ===========================================================================
   The cat.

   oneko: a sprite sheet that chases the pointer, sleeps when it catches up,
   and washes itself when bored. The sheet was already in the Framer canvas —
   it was the one asset I could not identify on the first pass and it turned
   out to be this.

   Deliberately outside the transformed world: the cat walks on the *screen*,
   not on the board. A cat that scaled with the zoom would be a sticker.
   =========================================================================== */

const CELL = oneko.cell;

/* --- The gait ---------------------------------------------------------------

   THE CAT USED TO HAVE ONE SPEED. Ten pixels a tick, whether the pointer was
   thirty pixels away or a thousand — so a small movement and a fling across
   the board looked identical, and the only difference was how long the same
   trudge lasted. A cat that is nearly on you should be padding; a cat that has
   been left behind should be running.

   Speed is now a function of distance, clamped at both ends: below `WALK` it
   is a saunter, and past `RUN` there is nothing more to give. `PURSUIT` is how
   aggressively it closes — distance over this many ticks. */
const WALK = 5;
const RUN = 22;
const PURSUIT = 9;

/** Below this it has arrived, and chasing further is jitter. */
const ARRIVED = 24;

/* --- Anticipation -----------------------------------------------------------

   Two beats that are the difference between an animal and a follower.

   ALERT: a tick of surprise before it sets off, once it has been sitting still
   and the pointer moves away. The old code had this and it could never fire —
   `idleTime` was zeroed on the line above the test that read it, so the branch
   was dead. Restored by testing the value before clearing it.

   SKID: it used to stop dead on the pixel. Now it carries a little past the
   mark and settles back, which is what weight looks like. */
const SKID = 0.34;
const SKID_ABOVE = 13;

/* --- Rest -------------------------------------------------------------------

   Sleep used to be a dice roll: once bored, a 1-in-200 chance per tick. So it
   was unpredictable in the way a random number is unpredictable rather than
   the way an animal is, and there was nothing a visitor could *do* to bring it
   on. Stillness is the trigger now — stop moving the pointer and the cat
   settles where it is, which gives the board a reason to be left alone. */
const STILL_TICKS = 22;

/** Sprite columns per state. Each entry is [col, row] in the sheet. */
const SPRITES: Record<string, [number, number][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  /* THE EIGHT CELLS THIS BUILD NEVER USED. The sheet is 8x4 and the table
     above reached 24 of its 32 cells; these are the rest, and they are the
     classic oneko behaviour that was dropped on the way in — the cat clawing
     at whichever screen edge it has been backed against. It is the one thing
     the cat can do that acknowledges the room it is in rather than the pointer
     it is chasing. */
  scratchWallN: [[0, 0], [0, -1]],
  scratchWallS: [[-7, -1], [-6, -2]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

/** Half the sprite, which is also the margin it is kept inside the viewport. */
const HALF = 16;

export default function Oneko() {
  const ref = useRef<HTMLDivElement>(null);

  /* Re-read rather than snapshotted.

     Both of these used to be plain `matches` checks taken once at mount and
     never looked at again, so turning reduced motion on left the cat running
     until a reload, and plugging in a mouse on a touch device never brought it
     out. `useState` + a `change` listener on each makes the effect below mount
     and unmount with the answer, which is also how the rest of the site tracks
     the preference. */
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const read = () => setAllowed(!calm.matches && fine.matches);

    read();
    calm.addEventListener("change", read);
    fine.addEventListener("change", read);
    return () => {
      calm.removeEventListener("change", read);
      fine.removeEventListener("change", read);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let mouseX = x;
    let mouseY = y;
    let frameCount = 0;
    let idleTime = 0;
    let idleAnim: string | null = null;
    let idleFrame = 0;
    let timer = 0;
    /** Ticks since the pointer last moved. Drives rest — see STILL_TICKS. */
    let stillTicks = 0;

    function setSprite(name: string, frame: number) {
      const list = SPRITES[name];
      const [cx, cy] = list[frame % list.length];
      el!.style.backgroundPosition = `${cx * CELL}px ${cy * CELL}px`;
    }

    function place() {
      el!.style.transform = `translate(${x - HALF}px, ${y - HALF}px)`;
    }

    /**
     * Which screen edge the cat is pinned against with the pointer beyond it,
     * or null. This is what earns the four `scratchWall` poses: the cat cannot
     * reach you, so it takes it out on the wall.
     */
    function wall(): string | null {
      if (x <= HALF + 1 && mouseX < x) return "scratchWallW";
      if (x >= window.innerWidth - HALF - 1 && mouseX > x) return "scratchWallE";
      if (y <= HALF + 1 && mouseY < y) return "scratchWallN";
      if (y >= window.innerHeight - HALF - 1 && mouseY > y) return "scratchWallS";
      return null;
    }

    function idle() {
      idleTime += 1;

      /* Backed into a corner with the pointer still out past it: claw at the
         edge rather than sit. Checked before the rest of idling so it wins —
         a cat that falls asleep against the wall it cannot get through is a
         cat that has given up, which is a different animal. */
      const against = wall();
      if (against) {
        idleAnim = null;
        setSprite(against, Math.floor(frameCount / 2));
        return;
      }

      /* Rest, and it is stillness that brings it on rather than a dice roll.
         Sitting bored is not the same as being left alone: this only starts
         once the *pointer* has stopped too, which makes it something a visitor
         can cause on purpose. Washing stays random — that is a thing a bored
         cat does, not a thing a settled one does. */
      if (!idleAnim && idleTime > 6) {
        if (stillTicks > STILL_TICKS) {
          idleAnim = "sleeping";
          idleFrame = 0;
        } else if (Math.floor(Math.random() * 120) === 0) {
          idleAnim = "scratchSelf";
          idleFrame = 0;
        }
      }

      if (!idleAnim) {
        setSprite("idle", 0);
        return;
      }

      if (idleAnim === "sleeping") {
        if (idleFrame < 8) setSprite("tired", 0);
        else setSprite("sleeping", Math.floor(idleFrame / 4));
        /* It stays asleep until something wakes it, rather than getting up
           after nineteen seconds for no reason. `tick` clears this the moment
           the pointer is far enough away to be worth chasing. */
      } else {
        setSprite(idleAnim, idleFrame);
        if (idleFrame > 9) {
          idleAnim = null;
          idleTime = 0;
        }
      }
      idleFrame += 1;
    }

    function tick() {
      frameCount += 1;
      stillTicks += 1;

      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.hypot(dx, dy);

      if (dist < ARRIVED) {
        idle();
        return;
      }

      /* The beat of surprise, and it is a real one now. The old code set
         `idleTime = 0` on the line above the test that read it, so this branch
         could never run — the cat went from asleep to sprinting inside one
         tick. Read first, then clear. */
      if (idleTime > 1) {
        idleTime = 0;
        idleAnim = null;
        setSprite("alert", 0);
        return;
      }

      idleAnim = null;
      idleTime = 0;

      /* Distance sets the pace: a saunter when it is nearly there, a run when
         it has been left behind. */
      const speed = Math.min(RUN, Math.max(WALK, dist / PURSUIT));

      /* And the sprite keeps up with the legs. A cat running at three times
         walking pace with the same two-frame cycle is a cat on a conveyor
         belt; stepping the frame faster is what sells the effort. */
      const cadence = speed > SKID_ABOVE ? frameCount : Math.floor(frameCount / 2);

      let dir = "";
      dir += dy / dist > 0.5 ? "N" : dy / dist < -0.5 ? "S" : "";
      dir += dx / dist > 0.5 ? "W" : dx / dist < -0.5 ? "E" : "";
      setSprite(dir || "idle", cadence);

      /* The skid. Above a walking pace it carries a little past the mark and
         settles back over the next ticks — a stop that costs something. Below
         it there is no momentum to carry, so it simply arrives. */
      const carry = speed > SKID_ABOVE ? 1 + SKID : 1;

      x -= (dx / dist) * speed * carry;
      y -= (dy / dist) * speed * carry;
      x = Math.min(Math.max(HALF, x), window.innerWidth - HALF);
      y = Math.min(Math.max(HALF, y), window.innerHeight - HALF);
      place();
    }

    function onMove(e: PointerEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      stillTicks = 0;
    }

    place();
    document.addEventListener("pointermove", onMove, { passive: true });
    // A timer, not rAF: the cat moves on a 10fps sprite clock by design —
    // running it at 120Hz would make it glide, and oneko does not glide.
    timer = window.setInterval(tick, 100);

    return () => {
      document.removeEventListener("pointermove", onMove);
      window.clearInterval(timer);
    };
  }, [allowed]);

  return (
    <div
      ref={ref}
      className={styles.cat}
      style={{ backgroundImage: `url(${oneko.sprite})` }}
      aria-hidden="true"
    />
  );
}
