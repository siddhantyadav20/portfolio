import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { found, teaser } from "@/content/found";
import { story as ep } from "@/content/found/story";
import type { Cast, Flag, Message, Reply, ReplyOption } from "@/content/found/types";
import { calc } from "@/lib/found/calc";
import {
  BUBBLE_MAX,
  DETAIL_MAX,
  HEADLINE_MAX,
  LABEL_MAX,
  QUESTION_MAX,
  VISIT_CAP_MS,
  actionAvailable,
  answer,
  battery,
  buildReport,
  caseFile,
  choose,
  clockNow,
  deductionOpen,
  die,
  dueEvents,
  evidenceAvailable,
  fire,
  has,
  hint,
  lockAvailable,
  morning,
  newCase,
  normaliseAnswer,
  openApp,
  openReply,
  perform,
  replyOptions,
  see,
  sessionVars,
  stage,
  threadMessages,
  tryUnlock,
  logUsage,
  TOO_MUCH,
  type CaseState,
} from "@/lib/found/engine";
import { FOUND_EVENTS, MILESTONE_OF, isFoundEvent } from "@/lib/found/events";
import { upgrade } from "@/lib/found/progress";
import { VARS, pickCast, say } from "@/lib/found/voice";

/**
 * Low Battery, Episodes 1 and 2: the script and the rules that play it.
 *
 * The one that matters most is "can be finished": a lock whose clue sits
 * behind the lock, a question whose proof arrives in an event that waits on
 * that question, a reply that can never be sent — any of them is a game
 * nobody can complete, and nobody finds out until a stranger gets stuck
 * forty minutes in. So a perfect player walks both episodes here, and a few
 * curious ones make sure every line in the script can actually happen.
 */

const ROOT = join(__dirname, "..");
const CASTS: Cast[] = (["girl", "boy"] as const).flatMap((gender) => ep.names[gender].map((name) => ({ gender, name })));
const noor: Cast = { gender: "girl", name: "Noor" };
const start = () => newCase(noor, "test", 0);
const SAMPLE: Record<(typeof VARS)[number], string> = {
  firstPickup: "08:14",
  pickups: "23",
  minutes: "34",
  mapsTime: "6 minutes",
  pinnedAt: "09:02",
};

/** Every string anywhere in the story, with where it came from. */
function strings(value: unknown, path = "ep"): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

const allMessages: Message[] = [
  ...ep.threads.flatMap((t) => t.messages),
  ...ep.vault.thread.messages,
  ...ep.events.flatMap((e) => e.messages),
];
const replyTexts = ep.replies.flatMap((r) => r.options.flatMap((o) => (o.text ? [o.text] : [])));

/** The longest a line gets across every name in the pool. */
const longest = (text: string) => Math.max(...CASTS.map((c) => say(text, c, SAMPLE).length));

describe("say", () => {
  it("fills pronouns for either cast, capitalised where the script is", () => {
    const line = "{They} said {their} name was {name}. Ask {them}; {they're} {Their} {child}.";
    expect(say(line, { gender: "girl", name: "Mira" })).toBe("She said her name was Mira. Ask her; she's Her daughter.");
    expect(say(line, { gender: "boy", name: "Neel" })).toBe("He said his name was Neel. Ask him; he's His son.");
  });

  it("quotes the player's own numbers back", () => {
    expect(say("First pickup {firstPickup}", noor, SAMPLE)).toBe("First pickup 08:14");
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
        expect(say(text, cast, SAMPLE), `${path} as ${cast.name}`).not.toMatch(/\{[^}]*\}/);
  });

  it("never mixes a plain pronoun into a line about the missing person", () => {
    // A bare "she" about {name} breaks the boy cast; and "He was with {them}"
    // reads "He was with him" when the cast is a boy. Any line that uses a
    // cast token names everyone else instead of pronouning them.
    const castToken = /\{(name|they|them|their|theirs|they're|child|kid)\}/i;
    const offenders = strings(ep)
      .filter(([, text]) => castToken.test(text))
      .filter(([, text]) => /\b(she|he|her|him|his|hers|herself|himself|daughter|son)\b/i.test(text))
      .map(([path, text]) => `${path}: ${text}`);
    expect(offenders).toEqual([]);
  });

  it("keeps the verb agreeing when {they} becomes she or he", () => {
    // `say` swaps the pronoun, never the verb after it: "{They} were walking"
    // reads "She were walking". Name the missing person there instead
    // ("{name} was walking"), or use {they're}.
    const plural = /\b(she|he) (are|aren't|were|weren't|have|haven't|do|don't|go|say|know|want|need|like|keep|come|think)\b/i;
    const offenders = [noor, { gender: "boy", name: "Neel" } as Cast].flatMap((cast) =>
      strings(ep)
        .map(([path, text]) => [path, say(text, cast, SAMPLE)] as const)
        .filter(([, text]) => plural.test(text))
        .map(([path, text]) => `${path}: ${text}`),
    );
    expect(offenders).toEqual([]);
  });

  it("fits its bubbles, the case file and the headlines", () => {
    for (const text of [...allMessages.map((m) => m.text), ...replyTexts])
      expect(longest(text), text).toBeLessThanOrEqual(BUBBLE_MAX);
    for (const e of ep.evidence) {
      expect(longest(e.label), e.id).toBeLessThanOrEqual(LABEL_MAX);
      expect(longest(e.detail), e.id).toBeLessThanOrEqual(DETAIL_MAX);
    }
    for (const d of ep.deductions) expect(longest(d.question), d.id).toBeLessThanOrEqual(QUESTION_MAX);
    for (const h of ep.headlines) expect(longest(h.title), h.id).toBeLessThanOrEqual(HEADLINE_MAX);
  });

  it("gives every message something to show", () => {
    for (const m of allMessages) expect(m.text.trim() || m.photo || m.card, m.at).toBeTruthy();
  });

  it("writes typed answers the way they'll be compared", () => {
    for (const d of ep.deductions)
      if (d.answer.kind === "text") for (const a of d.answer.accepts) expect(normaliseAnswer(a), d.id).toBe(a);
  });

  it("opens on the canvas phone's own lines", () => {
    expect(ep.lockscreen.notifications).toEqual(teaser.slice(0, 4));
    expect(teaser[0].text).toBe("Don't unlock it.");
  });
});

describe("the story's references", () => {
  const ids = <T extends { id: string }>(list: readonly T[]) => new Set(list.map((x) => x.id));
  const evidence = ids(ep.evidence);
  const photos = ids(ep.photos);
  const places = ids(ep.places);
  const threads = new Set([...ep.threads.map((t) => t.id), ep.vault.thread.id]);
  const locks = ids(ep.locks);
  const deductions = ids(ep.deductions);
  const events = ids(ep.events);
  const replies = new Map(ep.replies.map((r) => [r.id, new Set(r.options.map((o) => o.id))]));
  const actionFlags = new Set<Flag>(ep.actions.map((a) => a.sets));

  it("has unique ids within each kind", () => {
    for (const list of [
      ep.evidence, ep.photos, ep.places, ep.threads, ep.locks, ep.deductions, ep.events,
      ep.memos, ep.replies, ep.headlines, ep.stages, ep.actions, ep.devices,
    ] as unknown as { id: string }[][])
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
  });

  it("shows every piece of evidence in exactly one place", () => {
    const shown = [
      ep.envelope.evidence,
      ep.lockscreen.medical.evidence,
      ...allMessages.map((m) => m.evidence),
      ...ep.photos.map((p) => p.evidence),
      ...ep.health.map((h) => h.evidence),
      ...ep.wifi.map((n) => n.evidence),
      ...ep.searches.map((s) => s.evidence),
      ...ep.memos.map((m) => m.evidence),
      ...ep.devices.map((d) => d.evidence),
      ...ep.vault.notes.map((n) => n.evidence),
    ].filter((id): id is string => Boolean(id));
    expect([...shown].sort()).toEqual([...evidence].sort());
  });

  it("points only at things that exist", () => {
    const flagOk = (f: Flag): boolean => {
      if (f === "dead") return true;
      const [kind, id, extra] = f.split(":");
      switch (kind) {
        case "seen": return evidence.has(id);
        case "lock": return locks.has(id);
        case "solved": return deductions.has(id);
        case "fired": return events.has(id);
        case "did": return actionFlags.has(f) || (id === "wrong" && locks.has(extra));
        case "said": return replies.has(id) && (extra === undefined || replies.get(id)!.has(extra));
        case "ep": return actionFlags.has(f);
        default: return false;
      }
    };
    const flags: Flag[] = [
      ...ep.evidence.flatMap((e) => e.requires ?? []),
      ...ep.threads.flatMap((t) => [...(t.requires ?? []), ...t.messages.flatMap((m) => [...(m.requires ?? []), ...(m.scrubbedBy ? [m.scrubbedBy] : [])])]),
      ...ep.vault.thread.messages.flatMap((m) => [...(m.requires ?? []), ...(m.scrubbedBy ? [m.scrubbedBy] : [])]),
      ...ep.vault.notes.flatMap((n) => n.requires ?? []),
      ...ep.photos.flatMap((p) => p.requires ?? []),
      ...ep.wifi.flatMap((n) => n.requires ?? []),
      ...ep.searches.flatMap((s) => s.requires ?? []),
      ...ep.devices.flatMap((d) => d.requires ?? []),
      ...ep.locks.flatMap((l) => l.requires ?? []),
      ...ep.deductions.flatMap((d) => d.requires),
      ...ep.events.flatMap((e) => [...e.when, ...(e.unless ?? []), ...e.messages.flatMap((m) => m.requires ?? [])]),
      ...ep.replies.flatMap((r) => [...r.when, ...r.options.flatMap((o) => o.requires ?? [])]),
      ...ep.headlines.flatMap((h) => [...(h.requires ?? []), ...h.lines.flatMap((l) => [...(l.requires ?? []), ...(l.unless ?? [])])]),
      ...ep.stages.flatMap((s) => s.when),
      ...ep.actions.flatMap((a) => a.requires),
      ...ep.guardian.timeline.map((t) => t.flag),
    ];
    const bad = flags.filter((f) => !flagOk(f));
    expect(bad).toEqual([]);

    for (const m of allMessages) if (m.photo) expect(photos.has(m.photo), m.photo).toBe(true);
    for (const s of ep.searches) if (s.place) expect(places.has(s.place), s.query).toBe(true);
    for (const l of ep.locks) for (const c of l.clues) expect(evidence.has(c), `${l.id} → ${c}`).toBe(true);
    for (const e of ep.events) if (e.thread) expect(threads.has(e.thread), e.id).toBe(true);
    for (const r of ep.replies) expect(threads.has(r.thread), r.id).toBe(true);
    expect(photos.has(ep.nightcam.firstFrame)).toBe(true);
    for (const d of ep.deductions) {
      if (d.answer.kind === "place") expect(places.has(d.answer.place), d.id).toBe(true);
      if (d.answer.kind === "evidence") {
        for (const combo of d.answer.accepts) for (const id of combo) expect(evidence.has(id), `${d.id} → ${id}`).toBe(true);
        for (const key of Object.keys(d.nudges)) expect(evidence.has(key) || key === "{name}", `${d.id} nudge ${key}`).toBe(true);
      }
    }
  });

  it("never hides a lock's clues behind that lock", () => {
    for (const l of ep.locks)
      for (const c of l.clues) {
        const e = ep.evidence.find((x) => x.id === c)!;
        expect(e.requires ?? [], `${l.id} → ${c}`).not.toContain(`lock:${l.id}`);
      }
  });

  it("starts each episode on a stage that needs nothing more than the episode", () => {
    expect(ep.stages.filter((s) => s.episode === 1)[0].when).toEqual([]);
    expect(ep.stages.filter((s) => s.episode === 2)[0].when).toEqual(["ep:2"]);
  });
});

/* --- Players ------------------------------------------------------------------ */

type Style = {
  /** Type a wrong passcode first (the phone photographs you). */
  wrongFirst?: boolean;
  /** Flip every optional setting the phone offers. */
  optional?: boolean;
  /** Which option to take in a one-shot reply. */
  pickIndex?: number;
};

/**
 * A player who never guesses: looks at everything reachable, opens every lock
 * whose clues they have seen, answers every question they can prove, sends
 * replies, lets every due event arrive, and plugs the phone in when it dies.
 */
function playThrough(style: Style = {}) {
  let s = start();
  const stages: string[] = [stage(ep, s).id];
  const batteries: Record<1 | 2, number[]> = { 1: [battery(ep, s)], 2: [] };
  const step = (next: CaseState) => {
    s = next;
    const st = stage(ep, s);
    if (st.id !== stages.at(-1)) {
      stages.push(st.id);
      batteries[st.episode].push(st.battery);
    }
  };

  if (style.wrongFirst) step(tryUnlock(ep, s, "passcode", "000000").state);

  for (let pass = 0; pass < 300; pass++) {
    const before = s.flags.length;

    for (const e of ep.evidence) if (evidenceAvailable(s, e)) step(see(ep, s, e.id));
    for (const l of ep.locks)
      if (lockAvailable(s, l) && l.clues.every((c) => has(s, `seen:${c}`))) step(tryUnlock(ep, s, l.id, l.answer).state);
    for (const d of ep.deductions) {
      if (!deductionOpen(s, d)) continue;
      const a = d.answer;
      const pick =
        a.kind === "place" ? a.place : a.kind === "text" ? a.accepts[0] : a.accepts.find((c) => c.every((id) => has(s, `seen:${id}`)));
      if (pick) step(answer(ep, s, d.id, pick).state);
    }
    for (const r of ep.replies) {
      if (openReply(ep, s, r.thread)?.id !== r.id) continue;
      const opts = replyOptions(s, r);
      const pick: ReplyOption | undefined = r.repeat
        ? (style.optional ? opts.find((o) => !o.final) : undefined) ?? opts.find((o) => o.final)
        : opts[Math.min(style.pickIndex ?? 0, opts.length - 1)];
      if (pick) step(choose(ep, s, r.id, pick.id));
    }
    for (const e of dueEvents(ep, s)) {
      step(fire(s, e.id));
      if (e.effect === "power-off") step(die(ep, s));
    }
    for (const a of ep.actions)
      if ((style.optional || !a.optional) && actionAvailable(ep, s, a.id)) step(perform(ep, s, a.id));

    if (s.flags.length === before) break;
  }
  return { state: s, stages, batteries };
}

/** Is `sub` in `list`, in order? */
const inOrder = (sub: readonly string[], list: readonly string[]) => {
  let i = 0;
  for (const x of sub) {
    i = list.indexOf(x, i);
    if (i < 0) return false;
    i++;
  }
  return true;
};

describe("playing it", () => {
  it("can be finished, both episodes, without guessing", () => {
    const { state } = playThrough();
    for (const d of ep.deductions) expect(has(state, `solved:${d.id}`), d.id).toBe(true);
    for (const l of ep.locks) expect(has(state, `lock:${l.id}`), l.id).toBe(true);
    for (const f of ["dead", "ep:2", "said:r3107-b", "fired:e2-thanks", "ep:2-done"] as Flag[])
      expect(has(state, f), f).toBe(true);
    expect(stage(ep, state).id).toBe("e2-end");
  });

  it("can make every line in the script happen, across a few different players", () => {
    const fired = new Set<string>();
    for (const style of [{}, { wrongFirst: true, optional: true }, { pickIndex: 1 }, { pickIndex: 2, optional: true }] as Style[])
      for (const f of playThrough(style).state.flags) if (f.startsWith("fired:")) fired.add(f.slice(6));
    expect(ep.events.map((e) => e.id).filter((id) => !fired.has(id))).toEqual([]);
  });

  it("walks the stages in order: the battery runs down, then charges up", () => {
    const { stages, batteries } = playThrough();
    const e1 = ep.stages.filter((s) => s.episode === 1).map((s) => s.id);
    const e2 = ep.stages.filter((s) => s.episode === 2).map((s) => s.id);
    expect(inOrder(stages.filter((id) => e1.includes(id)), e1)).toBe(true);
    expect(inOrder(stages.filter((id) => e2.includes(id)), e2)).toBe(true);
    expect(stages.slice(0, 1)).toEqual(["locked"]);
    expect(stages).toContain("dead");
    expect(stages.at(-1)).toBe("e2-end");
    for (let i = 1; i < batteries[1].length; i++) expect(batteries[1][i]).toBeLessThanOrEqual(batteries[1][i - 1]);
    for (let i = 1; i < batteries[2].length; i++) expect(batteries[2][i]).toBeGreaterThanOrEqual(batteries[2][i - 1]);
  });

  it("keeps everything behind the passcode until it is typed, and remembers a wrong one", () => {
    let s = start();
    s = see(ep, s, "health-walk");
    s = see(ep, s, "envelope");
    s = see(ep, s, "medical-id");
    expect(caseFile(ep, s).map((e) => e.id)).toEqual(["envelope", "medical-id"]);

    const wrong = tryUnlock(ep, s, "passcode", "0000");
    expect(wrong.ok).toBe(false);
    expect(has(wrong.state, "did:wrong:passcode")).toBe(true);
    const open = tryUnlock(ep, wrong.state, "passcode", "14 / 03 / 06");
    expect(open.ok).toBe(true);
    expect(stage(ep, open.state).id).toBe("act1");
  });

  it("only counts evidence the player has actually seen", () => {
    let s = tryUnlock(ep, start(), "passcode", "140306").state;
    expect(answer(ep, s, "went-home", ["health-walk"]).ok).toBe(false);
    s = see(ep, s, "group-home");
    s = see(ep, s, "health-walk");
    const wrong = answer(ep, s, "went-home", ["group-home"]);
    expect(wrong.reply).toBe(ep.deductions[0].nudges["group-home"]);
    expect(answer(ep, s, "went-home", ["health-walk"]).ok).toBe(true);
  });

  it("takes a typed answer however it's typed, and nudges the missing person's own name", () => {
    let s = playThrough().state;
    s = { ...s, flags: s.flags.filter((f) => f !== "solved:e2-who") };
    expect(answer(ep, s, "e2-who", "  Me!! ").ok).toBe(true);
    expect(answer(ep, s, "e2-who", "It was me").ok).toBe(true);
    const own = answer(ep, s, "e2-who", "noor");
    expect(own.ok).toBe(false);
    expect(own.reply).toBe(ep.deductions.find((d) => d.id === "e2-who")!.nudges["{name}"]);
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

  it("delivers read receipts because you opened the thread", () => {
    let s = tryUnlock(ep, start(), "passcode", "140306").state;
    expect(dueEvents(ep, s).map((e) => e.id)).toEqual(["mum-delivered"]);
    s = fire(s, "mum-delivered");
    expect(dueEvents(ep, s)).toEqual([]);
    s = perform(ep, s, "open:mum");
    expect(dueEvents(ep, s).map((e) => e.id)).toEqual(["mum-read"]);
  });

  it("sends a different cliffhanger to someone who got the passcode wrong", () => {
    const right = playThrough().state;
    const wrong = playThrough({ wrongFirst: true }).state;
    expect(has(right, "fired:cliff-voice-read")).toBe(true);
    expect(has(right, "fired:cliff-voice-photo")).toBe(false);
    expect(has(wrong, "fired:cliff-voice-photo")).toBe(true);
    expect(has(wrong, "fired:cliff-voice-read")).toBe(false);
  });

  it("keeps a failed test open until the right answer, and shows your words where you sent them", () => {
    const done = playThrough().state;
    const at = done.flags.indexOf("fired:e2-3107-test");
    let s: CaseState = { ...done, flags: done.flags.slice(0, at + 1) };
    const r = ep.replies.find((x) => x.id === "r3107-b")!;
    expect(openReply(ep, s, "unknown")?.id).toBe("r3107-b");

    s = choose(ep, s, "r3107-b", "b1");
    s = fire(s, "e2-3107-b1");
    expect(openReply(ep, s, "unknown")?.id).toBe("r3107-b");
    expect(replyOptions(s, r).map((o) => o.id)).not.toContain("b1");

    const texts = threadMessages(ep, s, "unknown").map((m) => m.text);
    expect(texts.indexOf("The envelope said TO YOU, BY HAND.")).toBeLessThan(texts.indexOf("he'd know that. he wrote it."));

    // The right answer only exists once they've found where {name} is.
    s = { ...s, flags: [...s.flags.filter((f) => f !== "solved:e2-alive"), "solved:e2-alive"] };
    s = choose(ep, s, "r3107-b", "b4");
    expect(has(s, "said:r3107-b")).toBe(true);
    expect(openReply(ep, s, "unknown")).toBeUndefined();
  });

  it("won't let the final answer be given before it's been found", () => {
    const done = playThrough().state;
    const at = done.flags.indexOf("fired:e2-3107-test");
    const s: CaseState = { ...done, flags: done.flags.slice(0, at + 1).filter((f) => f !== "solved:e2-alive") };
    const r = ep.replies.find((x) => x.id === "r3107-b")!;
    expect(replyOptions(s, r).map((o) => o.id)).not.toContain("b4");
    expect(has(choose(ep, s, "r3107-b", "b4"), "said:r3107-b")).toBe(false);
  });

  it("lands Episode 2's backlog after everything that happened on Monday morning", () => {
    const s = playThrough().state;
    const mum = threadMessages(ep, s, "mum").map((m) => m.text);
    expect(mum.indexOf("It says delivered.")).toBeGreaterThan(-1);
    expect(mum.indexOf("It says delivered.")).toBeLessThan(mum.indexOf("They came. They said you're okay."));
  });

  it("scrubs K.'s side of the vault once Episode 2 begins", () => {
    const s = playThrough().state;
    const vault = threadMessages(ep, s, ep.vault.thread.id);
    expect(vault.filter((m) => m.from === "them").every((m) => m.text === "This message was deleted.")).toBe(true);
    expect(vault.some((m) => m.text.includes("mum has an app on it"))).toBe(true);
  });

  it("only brings Wi-Fi back once there's charge for it", () => {
    const done = playThrough().state;
    const at = done.flags.indexOf("said:r3107-a");
    const before: CaseState = { ...done, flags: done.flags.slice(0, at).filter((f) => f !== "did:wifi-on") };
    expect(actionAvailable(ep, before, "wifi-on")).toBe(false);
    expect(actionAvailable(ep, { ...before, flags: [...before.flags, "said:r3107-a"] }, "wifi-on")).toBe(true);
    expect(battery(ep, { ...before, flags: [...before.flags, "said:r3107-a"] })).toBe(50);
  });
});

describe("Mum's report", () => {
  const MIN = 60_000;
  const session = (): CaseState => {
    let s = newCase(noor, "t", 1_000_000);
    s = { ...s, flags: ["lock:passcode", "lock:vault", "solved:last-seen"], at: { "lock:passcode": 1_000_000 + 4 * MIN, "lock:vault": 1_000_000 + 21 * MIN, "solved:last-seen": 1_000_000 + 52 * MIN } };
    s = logUsage(s, "maps", 3 * MIN);
    s = logUsage(s, "maps", 3 * MIN);
    s = logUsage(s, "photos", 3 * MIN);
    s = logUsage(s, "photos", 9 * MIN); // one long visit: capped
    s = openApp(openApp(openApp(s)));
    return s;
  };

  it("is built from the player's own morning", () => {
    const r = buildReport(ep, session());
    expect(r.firstPickup).toBe("08:14");
    expect(r.pickups).toBe(3);
    expect(r.apps[0]).toEqual({ app: "photos", minutes: Math.round((3 * MIN + VISIT_CAP_MS) / MIN) });
    expect(r.timeline.map((t) => t.label)).toEqual(["Unlocked", "Calculator", "Maps · Shree Ram Mills"]);
    expect(r.timeline.map((t) => t.time)).toEqual(["08:14", "08:31", "09:02"]);
  });

  it("quotes it in words the story can use", () => {
    const v = sessionVars(ep, session());
    expect(v.firstPickup).toBe("08:14");
    expect(v.mapsTime).toBe("6 minutes");
    expect(v.pinnedAt).toBe("09:02");
  });

  it("stops Monday morning's clock before the police arrive", () => {
    const s = newCase(noor, "t", 0);
    expect(morning(s, 0)).toBe("08:10");
    expect(morning(s, 500 * MIN)).toBe("09:50");
    expect(clockNow(s, 30 * MIN)).toBe("08:40");
  });

  it("makes something plausible of a save from before any of this was measured", () => {
    const r = buildReport(ep, newCase(noor, "t", 0));
    expect(r.apps.length).toBeGreaterThan(0);
    expect(r.minutes).toBeGreaterThan(10);
  });

  it("is frozen when the battery dies, so Episode 2 can't change Monday", () => {
    const dead = die(ep, session());
    const later = logUsage({ ...dead, flags: [...dead.flags, "ep:2"] }, "maps", 30 * MIN);
    expect(later.report).toEqual(dead.report);
    expect(sessionVars(ep, later).mapsTime).toBe("6 minutes");
  });
});

describe("saves", () => {
  it("carries an Episode 1 save straight into Episode 2", () => {
    const v1 = { v: 1, run: "r", cast: noor, flags: ["lock:passcode", "dead"], hints: {}, started: 5 };
    const up = upgrade(v1)!;
    expect(up.v).toBe(2);
    expect(up.flags).toEqual(["lock:passcode", "dead"]);
    expect(stage(ep, up).id).toBe("dead");
    expect(actionAvailable(ep, up, "start-ep2")).toBe(true);
  });

  it("refuses anything that isn't a save", () => {
    for (const bad of [null, 1, "x", {}, { v: 3, run: "r", cast: noor, flags: [], hints: {}, started: 0 }]) expect(upgrade(bad)).toBeNull();
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
    const flags = new Set<string>();
    for (const style of [{}, { pickIndex: 1 }, { pickIndex: 2 }] as Style[]) for (const f of playThrough(style).state.flags) flags.add(f);
    for (const [flag, milestone] of Object.entries(MILESTONE_OF)) {
      expect(FOUND_EVENTS, milestone).toContain(milestone);
      expect(flags.has(flag), flag).toBe(true);
    }
  });

  it("refuses anything off the list", () => {
    for (const bad of ["wrong:nope", "hint:passcode:4", "", 42, null]) expect(isFoundEvent(bad)).toBe(false);
  });

  it("names the route after the story", () => {
    expect(found.title).toBe(ep.title);
  });
});

describe("the assets", () => {
  it("has every photo and recording the story points at", () => {
    for (const p of ep.photos) if (p.src) expect(existsSync(join(ROOT, "public", p.src)), p.id).toBe(true);
    for (const m of ep.memos) if (m.src) expect(existsSync(join(ROOT, "public", m.src)), m.id).toBe(true);
    expect(existsSync(join(ROOT, "public", found.wallpaper))).toBe(true);
  });

  it("mixes the memos on the story's own timeline", () => {
    // scripts/build-found-audio.mjs can't import the story, so it writes the
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

// Keep the type import honest.
export type { Reply };

describe("showing evidence", () => {
  it("takes exactly the evidence that proves it, not everything at once", () => {
    const { state: done } = playThrough();
    const everything = ep.evidence.map((e) => e.id);
    for (const d of ep.deductions) {
      if (d.answer.kind !== "evidence") continue;
      const open: CaseState = { ...done, flags: done.flags.filter((f) => f !== `solved:${d.id}`) };
      const shown = answer(ep, open, d.id, everything);
      expect(shown.ok, d.id).toBe(false);
      expect(shown.reply, d.id).toBe(TOO_MUCH);
      expect(answer(ep, open, d.id, d.answer.accepts[0]).ok, d.id).toBe(true);
    }
  });
});
