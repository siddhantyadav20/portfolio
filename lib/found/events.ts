import { episode1 as ep } from "@/content/found/episode1";
import type { Flag } from "@/content/found/types";

/* ===========================================================================
   What the pilot measures, and nothing it doesn't.

   The whole reason Found lives in the portfolio for now is to learn whether
   strangers start it, where they get stuck, and whether they finish. So the
   list is a funnel, a map of where people struggle, and one question:

     open → unlock → d1 → d2 → vault → d3 → end      how far people get
     wrong:<id>, hint:<id>:<tier>                    where it's too hard
     resume                                          whether they come back
     ep2:yes, ep2:no, email                          whether they want more

   An allowlist, shared by the browser and the route, so the store's keys are
   bounded by this file rather than by whatever a request body says. No
   identifier of any kind is sent.
   =========================================================================== */

const MILESTONES = ["open", "resume", "unlock", "d1", "d2", "vault", "d3", "end"] as const;
const VERDICTS = ["ep2:yes", "ep2:no", "email"] as const;

const puzzles = [...ep.locks.map((l) => l.id), ...ep.deductions.map((d) => d.id)];

export const FOUND_EVENTS: readonly string[] = [
  ...MILESTONES,
  ...puzzles.flatMap((id) => [`wrong:${id}`, `hint:${id}:1`, `hint:${id}:2`, `hint:${id}:3`]),
  ...VERDICTS,
];

export const isFoundEvent = (x: unknown): x is string =>
  typeof x === "string" && FOUND_EVENTS.includes(x);

/** The flag that marks each milestone, so progress is counted where it's saved. */
export const MILESTONE_OF: Partial<Record<Flag, (typeof MILESTONES)[number]>> = {
  "lock:passcode": "unlock",
  "solved:went-home": "d1",
  "solved:dev": "d2",
  "lock:vault": "vault",
  "solved:last-seen": "d3",
  dead: "end",
};
