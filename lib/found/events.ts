import { story as ep } from "@/content/found/story";
import type { Flag } from "@/content/found/types";

/* ===========================================================================
   What the pilot measures, and nothing it doesn't.

   The whole reason Found lives in the portfolio for now is to learn whether
   strangers start it, where they get stuck, whether they finish, and whether
   the turn lands. So the list is a funnel, a map of where people struggle,
   what they chose, and a few questions:

     open → unlock → d1 → d2 → vault → d3 → end                   Episode 1
     ep2-start → e2-who → e2-wanted → e2-why → e2-wifi →
       e2-alive → e2-trust → e2-delivered → ep2-end               Episode 2
     e2-saw:yes|maybe|no                                          did the turn land
     mum:lie|truth|silence, k:threat                              what they chose
     wrong:<id>, hint:<id>:<tier>                                 where it's too hard
     resume                                                       whether they come back
     ep2:yes|no, ep3:yes|no, email                                whether they want more

   An allowlist, shared by the browser and the route, so the store's keys are
   bounded by this file rather than by whatever a request body says. No
   identifier of any kind is sent.
   =========================================================================== */

const MILESTONES = [
  "open",
  "resume",
  "unlock",
  "d1",
  "d2",
  "vault",
  "d3",
  "end",
  "ep2-start",
  "e2-who",
  "e2-wanted",
  "e2-why",
  "e2-wifi",
  "e2-alive",
  "e2-trust",
  "e2-delivered",
  "ep2-end",
] as const;

const CHOICES = ["mum:lie", "mum:truth", "mum:silence", "k:threat"] as const;
const VERDICTS = ["ep2:yes", "ep2:no", "ep3:yes", "ep3:no", "email", "e2-saw:yes", "e2-saw:maybe", "e2-saw:no"] as const;

const puzzles = [...ep.locks.map((l) => l.id), ...ep.deductions.map((d) => d.id)];

export const FOUND_EVENTS: readonly string[] = [
  ...MILESTONES,
  ...CHOICES,
  ...puzzles.flatMap((id) => [`wrong:${id}`, `hint:${id}:1`, `hint:${id}:2`, `hint:${id}:3`]),
  ...VERDICTS,
];

export const isFoundEvent = (x: unknown): x is string => typeof x === "string" && FOUND_EVENTS.includes(x);

type Tracked = (typeof MILESTONES)[number] | (typeof CHOICES)[number];

/** The flag that marks each milestone or choice, so it's counted where it's saved. */
export const MILESTONE_OF: Partial<Record<Flag, Tracked>> = {
  "lock:passcode": "unlock",
  "solved:went-home": "d1",
  "solved:dev": "d2",
  "lock:vault": "vault",
  "solved:last-seen": "d3",
  dead: "end",
  "ep:2": "ep2-start",
  "solved:e2-who": "e2-who",
  "solved:e2-wanted": "e2-wanted",
  "solved:e2-why": "e2-why",
  "did:wifi-on": "e2-wifi",
  "solved:e2-alive": "e2-alive",
  "said:r3107-b": "e2-trust",
  "solved:e2-delivered": "e2-delivered",
  "ep:2-done": "ep2-end",
  "said:r-mum:lie": "mum:lie",
  "said:r-mum:truth": "mum:truth",
  "said:r-mum:silence": "mum:silence",
  "said:r5520:threat": "k:threat",
};
