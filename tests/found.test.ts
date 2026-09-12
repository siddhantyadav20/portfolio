import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { episode1 as ep } from "@/content/found/episode1";
import type { Cast, Flag, Message } from "@/content/found/types";
import {
  BUBBLE_MAX,
  DETAIL_MAX,
  LABEL_MAX,
  QUESTION_MAX,
  act,
  answer,
  battery,
  caseFile,
  deductionOpen,
  die,
  dueEvents,
  evidenceAvailable,
  fire,
  has,
  hint,
  lockAvailable,
  newCase,
  see,
  threadMessages,
  tryUnlock,
  type CaseState,
} from "@/lib/found/engine";
import { pickCast, say } from "@/lib/found/voice";
import { calc } from "@/lib/found/calc";
import { FOUND_EVENTS, MILESTONE_OF, isFoundEvent } from "@/lib/found/events";
import { found } from "@/content/found";

/**
 * Found, Episode 1: the script and the rules that play it.
 *
 * The one that matters most is "can be finished": a lock whose clue sits
 * behind the lock, or a question whose proof arrives in an event that waits on
 * that question, is a game nobody can complete — and nobody finds out until a
 * stranger gets stuck forty minutes in. So a perfect player walks the whole
 * episode here, on every change.
 */

const CASTS: Cast[] = (["girl", "boy"] as const).flatMap((gender) =>
  ep.names[gender].map((name) => ({ gender, name })),
);
const noor: Cast = { gender: "girl", name: "Noor" };
const start = () => newCase(noor, "test", 0);

/** Every string anywhere in the episode, with where it came from. */
function strings(value: unknown, path = "ep"): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

const allMessages: Message[] = [
  ...ep.threads.flatMap((t) => t.messages),
  ...ep.vault.thread.messages,
  ...ep.events.flatMap((e) => e.messages),
];

/** The longest a line gets across every name in the pool. */
const longest = (text: string) => Math.max(...CASTS.map((c) => say(text, c).length));

describe("say", () => {
  it("fills pronouns for either cast, capitalised where the script is", () => {
    const line = "{They} said {their} name was {name}. Ask {them}; {they're} {Their} {child}.";
    expect(say(line, { gender: "girl", name: "Mira" })).toBe(
      "She said her name was Mira. Ask her; she's Her daughter.",
    );
    expect(say(line, { gender: "boy", name: "Neel" })).toBe(
      "He said his name was Neel. Ask him; he's His son.",
    );
  });

  it("leaves unknown tokens standing, so the script test can find them", () => {
    expect(say("{nope}", noor)).toBe("{nope}");
  });

  it("deals both genders and every name", () => {
    expect(pickCast(ep.names, () => 0.1)).toEqual({ gender: "girl", name: "Noor" });
    expect(pickCast(ep.names, () => 0.9)).toEqual({ gender: "boy", name: "Neel" });
  });
});

describe("the script", () => {
  it("renders every line for every name with no token left over", () => {
    for (const cast of CASTS)
      for (const [path, text] of strings(ep))
        expect(say(text, cast), `${path} as ${cast.name}`).not.toMatch(/\{[^}]*\}/);
  });

  it("never mixes a plain pronoun into a line about the missing person", () => {
    // Two failures, one rule. A bare "she" about {name} breaks the boy cast;
    // and a line like "He was with {them}" reads "He was with him" when the
    // cast is a boy, so nobody can tell Dev from {name}. Any line that uses a
    // token names everyone else instead of pronouning them.
    const offenders = strings(ep)
      .filter(([, text]) => /\{[A-Za-z']+\}/.test(text))
      .filter(([, text]) => /\b(she|he|her|him|his|hers|herself|himself|daughter|son)\b/i.test(text))
      .map(([path, text]) => `${path}: ${text}`);
    expect(offenders).toEqual([]);
  });

  it("fits its bubbles and the case file", () => {
    for (const m of allMessages) expect(longest(m.text), m.text).toBeLessThanOrEqual(BUBBLE_MAX);
    for (const e of ep.evidence) {
      expect(longest(e.label), e.id).toBeLessThanOrEqual(LABEL_MAX);
      expect(longest(e.detail), e.id).toBeLessThanOrEqual(DETAIL_MAX);
    }
    for (const d of ep.deductions) expect(longest(d.question), d.id).toBeLessThanOrEqual(QUESTION_MAX);
  });

  it("gives every message something to say", () => {
    for (const m of allMessages) expect(m.text.trim() || m.photo, m.at).toBeTruthy();
  });
});

describe("the episode's references", () => {
  const evidence = new Set(ep.evidence.map((e) => e.id));
  const photos = new Set(ep.photos.map((p) => p.id));
  const places = new Set(ep.places.map((p) => p.id));
  const threads = new Set(ep.threads.map((t) => t.id));
  const locks = new Set(ep.locks.map((l) => l.id));
  const deductions = new Set(ep.deductions.map((d) => d.id));
  const events = new Set(ep.events.map((e) => e.id));

  it("has unique ids within each kind", () => {
    for (const list of [ep.evidence, ep.photos, ep.places, ep.threads, ep.locks, ep.deductions, ep.events, ep.memos])
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
  });

  it("shows every piece of evidence in exactly one place", () => {
    const shown = [
      ep.lockscreen.medical.evidence,
      ...allMessages.map((m) => m.evidence),
      ...ep.photos.map((p) => p.evidence),
      ...ep.health.map((h) => h.evidence),
      ...ep.wifi.map((n) => n.evidence),
      ...ep.searches.map((s) => s.evidence),
      ...ep.memos.map((m) => m.evidence),
    ].filter((id): id is string => Boolean(id));
    // `dev-story` is shown by the photo inside Tara's message, not the album.
    expect(shown.sort()).toEqual([...evidence].sort());
  });

  it("points only at things that exist", () => {
    const flagOk = (f: Flag) => {
      if (f === "dead") return true;
      const [kind, id] = f.split(":");
      return (
        (kind === "seen" && evidence.has(id)) ||
        (kind === "lock" && locks.has(id)) ||
        (kind === "solved" && deductions.has(id)) ||
        (kind === "fired" && events.has(id))
      );
    };
    const flags: Flag[] = [
      ...ep.evidence.flatMap((e) => e.requires ?? []),
      ...ep.threads.flatMap((t) => t.requires ?? []),
      ...ep.photos.flatMap((p) => p.requires ?? []),
      ...ep.locks.flatMap((l) => l.requires ?? []),
      ...ep.deductions.flatMap((d) => d.requires),
      ...ep.events.flatMap((e) => e.when),
    ];
    for (const f of flags) expect(flagOk(f), f).toBe(true);

    for (const m of allMessages) if (m.photo) expect(photos.has(m.photo), m.photo).toBe(true);
    for (const s of ep.searches) if (s.place) expect(places.has(s.place), s.query).toBe(true);
    for (const l of ep.locks) for (const c of l.clues) expect(evidence.has(c), `${l.id} → ${c}`).toBe(true);
    for (const e of ep.events) if (e.thread) expect(threads.has(e.thread), e.id).toBe(true);
    for (const d of ep.deductions) {
      if (d.answer.kind === "place") expect(places.has(d.answer.place), d.id).toBe(true);
      else for (const combo of d.answer.accepts) for (const id of combo) expect(evidence.has(id), `${d.id} → ${id}`).toBe(true);
      for (const key of Object.keys(d.nudges))
        expect(evidence.has(key) || places.has(key), `${d.id} nudge ${key}`).toBe(true);
    }
  });

  it("never hides a lock's clues behind that lock", () => {
    for (const l of ep.locks)
      for (const c of l.clues) {
        const e = ep.evidence.find((x) => x.id === c)!;
        expect(e.requires ?? [], `${l.id} → ${c}`).not.toContain(`lock:${l.id}`);
      }
  });

  it("has three questions, in the order the acts expect", () => {
    // `act()` reads the acts off the first, second and last question.
    expect(ep.deductions.map((d) => d.id)).toEqual(["went-home", "dev", "last-seen"]);
  });
});

/**
 * A player who never guesses: looks at everything reachable, opens every lock
 * whose clues they have seen, answers every question they can prove, and lets
 * every due event arrive. Returns the state and the acts it passed through.
 */
function playThrough(): { state: CaseState; acts: string[]; batteries: number[] } {
  let s = start();
  const acts = [act(ep, s)];
  const batteries = [battery(ep, s)];
  // Record after every single action: two acts can pass in one sweep.
  const step = (next: CaseState) => {
    s = next;
    const a = act(ep, s);
    if (a !== acts.at(-1)) {
      acts.push(a);
      batteries.push(battery(ep, s));
    }
  };

  for (let moved = true; moved; ) {
    const before = s.flags.length;

    for (const e of ep.evidence) if (evidenceAvailable(s, e)) step(see(ep, s, e.id));
    for (const l of ep.locks)
      if (lockAvailable(s, l) && l.clues.every((c) => has(s, `seen:${c}`)))
        step(tryUnlock(ep, s, l.id, l.answer).state);
    for (const d of ep.deductions) {
      if (!deductionOpen(s, d)) continue;
      const pick =
        d.answer.kind === "place"
          ? d.answer.place
          : d.answer.accepts.find((combo) => combo.every((id) => has(s, `seen:${id}`)));
      if (pick) step(answer(ep, s, d.id, pick).state);
    }
    for (const e of dueEvents(ep, s)) step(fire(s, e.id));

    moved = s.flags.length !== before;
  }
  return { state: s, acts, batteries };
}

describe("playing it", () => {
  it("can be finished without guessing", () => {
    const { state } = playThrough();
    for (const d of ep.deductions) expect(has(state, `solved:${d.id}`), d.id).toBe(true);
    for (const l of ep.locks) expect(has(state, `lock:${l.id}`), l.id).toBe(true);
    for (const e of ep.events) expect(has(state, `fired:${e.id}`), e.id).toBe(true);
    expect(act(ep, die(state))).toBe("dead");
  });

  it("walks the acts in order while the battery only falls", () => {
    const { acts, batteries } = playThrough();
    expect(acts).toEqual(["locked", "act1", "act2", "act3", "cliff"]);
    for (let i = 1; i < batteries.length; i++) expect(batteries[i]).toBeLessThanOrEqual(batteries[i - 1]);
    expect(ep.battery.dead).toBe(0);
  });

  it("keeps everything behind the passcode until it is typed", () => {
    let s = start();
    s = see(ep, s, "health-walk");
    expect(caseFile(ep, s)).toEqual([]);
    s = see(ep, s, "medical-id");
    expect(caseFile(ep, s).map((e) => e.id)).toEqual(["medical-id"]);

    expect(tryUnlock(ep, s, "passcode", "0000").ok).toBe(false);
    const open = tryUnlock(ep, s, "passcode", "14 / 03 / 06");
    expect(open.ok).toBe(true);
    expect(act(ep, open.state)).toBe("act1");
  });

  it("only counts evidence the player has actually seen", () => {
    let s = tryUnlock(ep, start(), "passcode", "140306").state;
    const unseen = answer(ep, s, "went-home", ["health-walk"]);
    expect(unseen.ok).toBe(false);

    s = see(ep, s, "group-home");
    s = see(ep, s, "health-walk");
    const wrong = answer(ep, s, "went-home", ["group-home"]);
    expect(wrong.ok).toBe(false);
    expect(wrong.reply).toBe(ep.deductions[0].nudges["group-home"]);
    expect(answer(ep, s, "went-home", ["group-home", "health-walk"]).ok).toBe(true);
  });

  it("nudges a wrong pin by place", () => {
    const { state } = playThrough();
    // Re-open the last question to try a wrong pin against it.
    const s = { ...state, flags: state.flags.filter((f) => f !== "solved:last-seen") };
    const r = answer(ep, s, "last-seen", "cinema");
    expect(r.ok).toBe(false);
    expect(r.reply).toBe(ep.deductions[2].nudges.cinema);
  });

  it("gives hints in three steps and then keeps giving the answer", () => {
    let s = start();
    const tiers: number[] = [];
    for (let i = 0; i < 4; i++) {
      const h = hint(ep, s, "passcode")!;
      tiers.push(h.tier);
      s = h.state;
    }
    expect(tiers).toEqual([1, 2, 3, 3]);
    expect(hint(ep, s, "nope")).toBeNull();
  });

  it("delivers live messages into their threads when their moment comes", () => {
    let s = tryUnlock(ep, start(), "passcode", "140306").state;
    expect(dueEvents(ep, s).map((e) => e.id)).toEqual(["mum-delivered"]);
    const before = threadMessages(ep, s, "mum").length;
    s = fire(s, "mum-delivered");
    expect(threadMessages(ep, s, "mum").length).toBe(before + 3);
    expect(dueEvents(ep, s)).toEqual([]);
  });
});

describe("the funnel", () => {
  it("can count a wrong answer and every hint for every lock and question", () => {
    for (const id of [...ep.locks.map((l) => l.id), ...ep.deductions.map((d) => d.id)]) {
      expect(isFoundEvent(`wrong:${id}`), id).toBe(true);
      for (const tier of [1, 2, 3]) expect(isFoundEvent(`hint:${id}:${tier}`), id).toBe(true);
    }
  });

  it("marks milestones with flags a real playthrough reaches", () => {
    const { state } = playThrough();
    for (const [flag, milestone] of Object.entries(MILESTONE_OF)) {
      expect(FOUND_EVENTS, milestone).toContain(milestone);
      if (flag !== "dead") expect(has(state, flag as Flag), flag).toBe(true);
    }
  });

  it("refuses anything off the list", () => {
    for (const bad of ["wrong:nope", "hint:passcode:4", "", 42, null]) expect(isFoundEvent(bad)).toBe(false);
  });

  it("names the route after the episode", () => {
    expect(found.title).toBe(ep.title);
  });
});

describe("the assets", () => {
  const ROOT = join(__dirname, "..");

  it("has every photo and recording the episode points at", () => {
    for (const p of ep.photos) if (p.src) expect(existsSync(join(ROOT, "public", p.src)), p.id).toBe(true);
    for (const m of ep.memos) if (m.src) expect(existsSync(join(ROOT, "public", m.src)), m.id).toBe(true);
    expect(existsSync(join(ROOT, "public", found.wallpaper))).toBe(true);
  });

  it("mixes the memos on the episode's own timeline", () => {
    // scripts/build-found-audio.mjs can't import the episode, so it writes the
    // numbers down. If a memo's length or captions change, re-mix it.
    const script = readFileSync(join(ROOT, "scripts", "build-found-audio.mjs"), "utf8");
    for (const m of ep.memos) {
      const row = script.match(new RegExp(`"${m.id}": \\{ seconds: (\\d+), captions: (\\d+) \\}`));
      expect(row, m.id).not.toBeNull();
      expect(Number(row![1]), m.id).toBe(m.seconds);
      expect(Number(row![2]), m.id).toBe(m.transcript.length);
    }
  });
});

describe("the calculator", () => {
  it("is a real calculator, so the vault stays a secret", () => {
    expect(calc("2+3×4")).toBe("14");
    expect(calc("10÷4−1")).toBe("1.5");
    expect(calc("0.1+0.2")).toBe("0.3");
    expect(calc("−5+2")).toBe("-3");
    expect(calc("9×")).toBe("9");
    expect(calc("7÷0")).toBe("Error");
    expect(calc(ep.locks.find((l) => l.id === "vault")!.answer)).toBe("2719");
  });
});
