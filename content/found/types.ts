/* ===========================================================================
   Found — the shape of an episode.

   An episode is data: who texted what, what the photos say, which code opens
   which lock and which question needs which proof. `lib/found/engine.ts` plays
   it; `components/found` draws it. Neither knows the story.

   Any string that names the missing person goes through `say()` in
   `lib/found/voice.ts`, which fills `{name}`, `{they}`, `{them}`, `{their}`,
   `{theirs}`, `{they're}`, `{child}` and `{kid}` (capitalised forms too) for
   whichever cast this playthrough dealt. Other characters are written plainly.
   =========================================================================== */

export type Gender = "girl" | "boy";

/** Who went missing this time. Dealt once, when the envelope is opened. */
export type Cast = { readonly gender: Gender; readonly name: string };

export type AppId =
  | "lock"
  | "messages"
  | "photos"
  | "calculator"
  | "health"
  | "settings"
  | "maps"
  | "memos"
  | "notes";

/**
 * A fact about a playthrough. Everything that gates anything is one of these:
 * the player saw a piece of evidence, opened a lock, answered a question, or a
 * live message arrived. `dead` is the battery giving out at the very end.
 */
export type Flag =
  | `seen:${string}`
  | `lock:${string}`
  | `solved:${string}`
  | `fired:${string}`
  | "dead";

/** One entry in the case file. Seen by opening wherever it lives. */
export type Evidence = {
  readonly id: string;
  readonly app: AppId;
  /** The case file's row. Budget: `LABEL_MAX`. */
  readonly label: string;
  /** Why it matters, in a line. Budget: `DETAIL_MAX`. */
  readonly detail: string;
  /** Beyond the passcode, which every app but the lock screen needs. */
  readonly requires?: readonly Flag[];
};

export type Message = {
  readonly from: "owner" | "them" | "system";
  /** Group threads only: who in the group said it. */
  readonly sender?: string;
  readonly at: string;
  /** Budget: `BUBBLE_MAX`. */
  readonly text: string;
  /** A photo id, shown under the text. */
  readonly photo?: string;
  /** Seen when this message is on screen. */
  readonly evidence?: string;
};

export type Thread = {
  readonly id: string;
  readonly contact: string;
  readonly group?: boolean;
  /** The thread is in the list but its messages are somewhere else. */
  readonly moved?: boolean;
  readonly messages: readonly Message[];
  /** A thread that only exists once a live event writes into it. */
  readonly requires?: readonly Flag[];
};

export type Photo = {
  readonly id: string;
  /** `received` photos arrive inside messages and never sit in an album. */
  readonly album: "recents" | "deleted" | "received";
  /** Under /public. Absent until the real photograph exists. */
  readonly src?: string;
  /** What the photograph shows. It is also the placeholder until `src` exists. */
  readonly alt: string;
  readonly takenAt: string;
  readonly place: string;
  /** A second line on the info sheet, like "Deleted Sat 00:07". */
  readonly note?: string;
  /** What the phone's text recognition reads off the photo (Live Text):
   *  the detail a puzzle needs, which no stock photograph happens to show. */
  readonly liveText?: string;
  /** Drawn over the photo itself, the way a story carries its timestamp. */
  readonly overlay?: string;
  readonly evidence?: string;
  readonly requires?: readonly Flag[];
};

export type HealthDay = {
  readonly day: string;
  /** Steps per hour, midnight first. The total is their sum. */
  readonly hours: readonly number[];
  readonly walk?: { readonly from: string; readonly to: string; readonly km: number };
  readonly evidence?: string;
};

export type Network = {
  readonly ssid: string;
  readonly lastJoined: string;
  readonly evidence?: string;
};

export type Place = {
  readonly id: string;
  readonly label: string;
  /** On the map's 100 × 140 sheet. */
  readonly x: number;
  readonly y: number;
};

export type Search = {
  readonly query: string;
  readonly at: string;
  readonly place?: string;
  readonly evidence?: string;
};

export type Memo = {
  readonly id: string;
  readonly title: string;
  readonly at: string;
  readonly seconds: number;
  /** Under /public. Absent until the recording exists. */
  readonly src?: string;
  /** What you hear, as captions. Also the only version until `src` exists. */
  readonly transcript: readonly string[];
  readonly evidence?: string;
};

export type Note = { readonly id: string; readonly title: string; readonly body: string };

/** Three steps, in order: a nudge, a pointer, the answer. */
export type Hints = readonly [string, string, string];

export type Lock = {
  readonly id: string;
  readonly app: AppId;
  /** Digits only. Input is compared with everything but digits removed. */
  readonly answer: string;
  /** The evidence that, between them, gives the answer away. */
  readonly clues: readonly string[];
  readonly hints: Hints;
  readonly requires?: readonly Flag[];
};

export type Deduction = {
  readonly id: string;
  /** The case file's heading. Budget: `QUESTION_MAX`. */
  readonly question: string;
  /** What the player is asked to do about it. */
  readonly ask: string;
  /** When the question appears in the case file. */
  readonly requires: readonly Flag[];
  readonly answer:
    | { readonly kind: "evidence"; readonly accepts: readonly (readonly string[])[] }
    | { readonly kind: "place"; readonly place: string };
  /** Said when it is solved. */
  readonly right: string;
  /** Said for a specific wrong pick, keyed by evidence or place id. */
  readonly nudges: Readonly<Record<string, string>>;
  /** Said for any other wrong pick. */
  readonly otherwise: string;
  readonly hints: Hints;
};

/**
 * Something that happens because the player got somewhere — never because a
 * clock ran out. Thinking slowly is never punished.
 */
export type LiveEvent = {
  readonly id: string;
  readonly when: readonly Flag[];
  /** Where the messages land. Null for an event that is only an effect. */
  readonly thread: string | null;
  readonly messages: readonly Message[];
  /** A system banner with no thread behind it. */
  readonly banner?: string;
  readonly effect?: "share-location" | "power-off";
};

export type Act = "locked" | "act1" | "act2" | "act3" | "cliff" | "dead";

export type Episode = {
  readonly id: string;
  readonly title: string;
  readonly names: Readonly<Record<Gender, readonly string[]>>;
  readonly surname: string;
  readonly envelope: { readonly lines: readonly string[]; readonly cta: string };
  readonly lockscreen: {
    readonly medical: {
      readonly name: string;
      readonly born: string;
      readonly blood: string;
      readonly contact: string;
      readonly evidence: string;
    };
    readonly notifications: readonly { readonly from: string; readonly text: string }[];
  };
  readonly threads: readonly Thread[];
  readonly photos: readonly Photo[];
  readonly health: readonly HealthDay[];
  readonly wifi: readonly Network[];
  readonly places: readonly Place[];
  readonly searches: readonly Search[];
  readonly memos: readonly Memo[];
  readonly vault: { readonly thread: Thread; readonly notes: readonly Note[] };
  readonly evidence: readonly Evidence[];
  readonly locks: readonly Lock[];
  readonly deductions: readonly Deduction[];
  readonly events: readonly LiveEvent[];
  readonly battery: Readonly<Record<Act, number>>;
  readonly end: { readonly title: string; readonly questions: readonly string[]; readonly ask: string };
};
