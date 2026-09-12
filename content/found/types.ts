/* ===========================================================================
   Found — the shape of a story.

   A story is data: who texted what, what the photos say, which code opens
   which lock, which question needs which proof, and what the player can do
   and say. `lib/found/engine.ts` plays it; `components/found` draws it.
   Neither knows the plot.

   It arrives in episodes, and every piece of a later episode is gated on the
   flag that starts it (`ep:2`), so one story object holds the whole thing
   and a save from Episode 1 simply carries on.

   Any string that names the missing person goes through `say()` in
   `lib/found/voice.ts`, which fills `{name}`, `{they}`, `{them}`, `{their}`,
   `{theirs}`, `{they're}`, `{child}` and `{kid}` (capitalised forms too) for
   whichever cast this playthrough dealt, plus the player's own numbers
   (`{firstPickup}`, `{minutes}` …) from their session.
   =========================================================================== */

export type Gender = "girl" | "boy";

/** Who went missing this time. Dealt once, when the envelope is opened. */
export type Cast = { readonly gender: Gender; readonly name: string };

export type AppId =
  | "envelope"
  | "lock"
  | "messages"
  | "photos"
  | "calculator"
  | "health"
  | "settings"
  | "maps"
  | "memos"
  | "notes"
  | "guardian"
  | "nightcam"
  | "news"
  | "food";

/**
 * A fact about a playthrough. Everything that gates anything is one of these:
 *
 *   seen:<evidence>        the player looked at it
 *   lock:<lock>            they opened it
 *   solved:<deduction>     they proved it
 *   fired:<event>          a live message arrived
 *   did:<action>           they did something to the phone (charged it,
 *                          turned Wi-Fi on, got the passcode wrong …)
 *   said:<reply>:<option>  they sent that; `said:<reply>` once it's settled
 *   ep:<n>                 an episode began (`ep:2`) or ended (`ep:2-done`)
 *   dead                   the battery gave out at the end of Episode 1
 */
export type Flag =
  | `seen:${string}`
  | `lock:${string}`
  | `solved:${string}`
  | `fired:${string}`
  | `did:${string}`
  | `said:${string}`
  | `ep:${string}`
  | "dead";

/** One entry in the case file. Seen by opening wherever it lives. */
export type Evidence = {
  readonly id: string;
  readonly app: AppId;
  /** The case file's row. Budget: `LABEL_MAX`. */
  readonly label: string;
  /** Why it matters, in a line. Budget: `DETAIL_MAX`. */
  readonly detail: string;
  /** Beyond the passcode, which every app but the lock screen and the envelope needs. */
  readonly requires?: readonly Flag[];
};

export type Message = {
  readonly from: "owner" | "them" | "system";
  /** Group threads only: who in the group said it. */
  readonly sender?: string;
  readonly at: string;
  /** Budget: `BUBBLE_MAX`. May be empty when the message is a photo or a card. */
  readonly text: string;
  /** A photo id, shown under the text. */
  readonly photo?: string;
  /** A card drawn from the player's own session, not from the script. */
  readonly card?: "guardian";
  /** Seen when this message is on screen. */
  readonly evidence?: string;
  /** Only in the thread once these are true (an episode's backlog, mostly). */
  readonly requires?: readonly Flag[];
  /** Deleted by its sender once this flag is set: K. scrubbing his side. */
  readonly scrubbedBy?: Flag;
};

export type Thread = {
  readonly id: string;
  readonly contact: string;
  readonly group?: boolean;
  /** The thread is in the list but its messages are somewhere else. */
  readonly moved?: boolean;
  /** An unknown number the player can give a name to. */
  readonly nameable?: boolean;
  readonly messages: readonly Message[];
  /** A thread that only exists once something writes into it. */
  readonly requires?: readonly Flag[];
};

export type Photo = {
  readonly id: string;
  /** `received` photos arrive inside messages; `nightcam` ones live in NightCam. */
  readonly album: "recents" | "deleted" | "received" | "nightcam";
  /** Under /public. Absent until the real photograph exists. */
  readonly src?: string;
  /** What the photograph shows. It is also the placeholder until `src` exists. */
  readonly alt: string;
  readonly takenAt: string;
  readonly place: string;
  /** A second line on the info sheet, like "Deleted Sat 00:07". */
  readonly note?: string;
  readonly evidence?: string;
  readonly requires?: readonly Flag[];
  /** What the phone's text recognition reads off the photo (Live Text). */
  readonly liveText?: string;
  /** Drawn over the photo itself, the way a story carries its timestamp. */
  readonly overlay?: string;
  /** Recently Deleted offers "Recover" for it (a player action). */
  readonly recoverable?: boolean;
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
  readonly requires?: readonly Flag[];
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
  readonly requires?: readonly Flag[];
  /** A search this phone made after it reached the player. */
  readonly byYou?: boolean;
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

export type Note = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** A receipt is drawn as paper, in the hand that wrote it. */
  readonly kind?: "note" | "receipt";
  readonly evidence?: string;
  readonly requires?: readonly Flag[];
};

/** A device signed in to the missing person's account (Settings). */
export type Device = {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly evidence?: string;
  readonly requires?: readonly Flag[];
};

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
    | { readonly kind: "place"; readonly place: string }
    /** Typed. Compared after `normaliseAnswer`, so write these normalised. */
    | { readonly kind: "text"; readonly accepts: readonly string[] };
  /** Said when it is solved. */
  readonly right: string;
  /** Said for a specific wrong pick: evidence id, place id, typed answer,
   *  or `{name}` for the missing person's own name typed in. */
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
  /** …and none of these. */
  readonly unless?: readonly Flag[];
  /** Where the messages land. Null for an event that is only an effect. */
  readonly thread: string | null;
  readonly messages: readonly Message[];
  /** A system banner with no thread behind it. */
  readonly banner?: string;
  readonly effect?: "show-you" | "power-off" | "episode-end" | "open-notes";
};

export type ReplyOption = {
  readonly id: string;
  /** What gets sent from the phone. `null` is choosing not to answer. */
  readonly text: string | null;
  readonly requires?: readonly Flag[];
  /** In a `repeat` exchange, the pick that settles it. */
  readonly final?: boolean;
};

/**
 * A moment the player can answer, from a short list — never free text, so
 * the story can't be talked off its rails. Every pick is sent from the
 * missing person's phone, and every pick is something the phone did.
 */
export type Reply = {
  readonly id: string;
  readonly thread: string;
  readonly when: readonly Flag[];
  /** Picks stay open until a `final` one is chosen (a test that can be failed). */
  readonly repeat?: boolean;
  readonly options: readonly ReplyOption[];
};

export type Headline = {
  readonly id: string;
  readonly at: string;
  /** Budget: `HEADLINE_MAX`. */
  readonly title: string;
  /** Paragraphs, some only true for this player. */
  readonly lines: readonly {
    readonly text: string;
    readonly requires?: readonly Flag[];
    readonly unless?: readonly Flag[];
  }[];
  readonly requires?: readonly Flag[];
};

/**
 * Where the story is: what the screen shows and where the battery sits.
 * The current stage is the last one in its episode whose flags all hold, so
 * the list is written in order, each stage carrying what came before it.
 */
export type Stage = {
  readonly id: string;
  readonly episode: 1 | 2;
  readonly when: readonly Flag[];
  readonly battery: number;
  readonly screen: "lock" | "phone" | "end" | "charge" | "relock";
};

/** Something the player can do to the phone itself, and what it needs first. */
export type PlayerAction = {
  readonly id: string;
  readonly sets: Flag;
  readonly requires: readonly Flag[];
  /** Nothing waits on it: it only changes what the phone remembers. */
  readonly optional?: boolean;
};

export type Ending = {
  readonly title: string;
  readonly questions: readonly string[];
  readonly ask: string;
  readonly cta?: string;
};

export type Story = {
  readonly id: string;
  readonly title: string;
  readonly names: Readonly<Record<Gender, readonly string[]>>;
  readonly surname: string;
  readonly envelope: {
    readonly lines: readonly string[];
    readonly cta: string;
    /** The label, line by line, in the hand that wrote it. */
    readonly label: readonly string[];
    readonly evidence: string;
  };
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
  readonly devices: readonly Device[];
  readonly evidence: readonly Evidence[];
  readonly locks: readonly Lock[];
  readonly deductions: readonly Deduction[];
  readonly events: readonly LiveEvent[];
  readonly replies: readonly Reply[];
  readonly headlines: readonly Headline[];
  readonly stages: readonly Stage[];
  readonly actions: readonly PlayerAction[];
  /** Mum's monitoring app, and what its report is built from. */
  readonly guardian: {
    readonly owner: string;
    readonly since: string;
    /** The notification that flickers as Episode 1's battery dies. */
    readonly sting: string;
    /** Moments of the player's session the report lists, in the player's own time. */
    readonly timeline: readonly { readonly flag: Flag; readonly label: string }[];
  };
  readonly nightcam: { readonly items: number; readonly firstFrame: string };
  readonly food: readonly { readonly at: string; readonly item: string; readonly to: string; readonly price: string }[];
  /** What the keyboard suggests: the words this phone's owner types most. */
  readonly keyboard: readonly string[];
  readonly end: Ending;
  readonly end2: Ending;
};

/** The pieces a later episode adds. Threads with an existing id add messages. */
export type Part = {
  readonly [K in
    | "threads"
    | "photos"
    | "wifi"
    | "searches"
    | "memos"
    | "devices"
    | "evidence"
    | "locks"
    | "deductions"
    | "events"
    | "replies"
    | "headlines"
    | "stages"
    | "actions"]?: Story[K];
} & {
  readonly vaultNotes?: readonly Note[];
  readonly vaultMessages?: readonly Message[];
  readonly end2?: Ending;
};

/** Kept so older imports read the same. */
export type Episode = Story;
