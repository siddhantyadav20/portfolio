import { teaser } from "./index";
import type { Episode } from "./types";

/* ===========================================================================
   Episode 1 — Low Battery.

   THE TRUTH (never shown whole; the player assembles it):
   On Friday, {name} Sethi, 19, went to Tara's twentieth birthday in Parel.
   At 21:40 K. confirmed a cash job: photograph the inside of Shree Ram Mills,
   shut since 2009, Gate 3, 23:30, while the guard was off. {They} left the
   party at 22:02 and told the group {they} were going home. Dev followed
   {them} outside; they argued on the pavement ({name} joined his hotspot at
   22:20). Dev went back in; {name} searched for the mill at 22:24 and walked
   4.1 km to it. At 23:36 the phone joined the mill's guest Wi-Fi. At 23:38
   {they} photographed a white van inside the gate. At 23:41 {they} told K.
   the building wasn't empty. At 23:52 {they} recorded 41 seconds of
   footsteps, a train, and a whisper. After that the phone never moved again.

   What the pilot leaves open, on purpose: who deleted the van photo at 00:07,
   who is texting from the unknown number, what was in the van, and why the
   phone came to you.

   Times are 24-hour, as the phone would show them. Other characters are
   written plainly; only the missing person goes through tokens.
   =========================================================================== */

export const episode1: Episode = {
  id: "ep1",
  title: "Low Battery",
  names: { girl: ["Noor", "Mira", "Ishita"], boy: ["Kabir", "Arjun", "Neel"] },
  surname: "Sethi",

  envelope: {
    lines: [
      "It came with this morning's post.",
      "A padded envelope, your name on the front in block capitals. No stamp. No note.",
      "Inside, a phone. As you pick it up, it buzzes.",
    ],
    cta: "Take it out",
  },

  lockscreen: {
    medical: {
      name: "{name} Sethi",
      born: "14 March 2006",
      blood: "B+",
      contact: "Mum · +91 98•• ••4410",
      evidence: "medical-id",
    },
    // Shared with the canvas phone, which keeps them arriving.
    notifications: teaser.slice(0, 3),
  },

  /* --- Messages ------------------------------------------------------------ */

  threads: [
    {
      id: "mum",
      contact: "Mum",
      messages: [
        { from: "them", at: "Fri 16:48", text: "Bring curd on the way back. The big one." },
        { from: "owner", at: "Fri 16:49", text: "ok maa" },
        { from: "owner", at: "Fri 22:05", text: "leaving tara's. home by 11, don't wait up" },
        { from: "them", at: "Fri 23:31", text: "Where are you beta?" },
        { from: "them", at: "Sat 00:14", text: "It's past 12. Pick up." },
        { from: "them", at: "Sat 01:40", text: "Papa is going to Tara's building." },
        { from: "them", at: "Sat 09:12", text: "Tara says you left at 10. Where did you go after?" },
        {
          from: "them",
          at: "Sat 18:30",
          text: "We went to the police. They say you're 19, you'll come back on your own. I told them you always come back.",
        },
        { from: "them", at: "Sun 07:02", text: "Beta please. Just one message. Nobody is angry." },
        { from: "them", at: "Sun 23:58", text: "I keep calling so I can hear your voicemail." },
      ],
    },
    {
      id: "tara",
      contact: "Tara",
      messages: [
        { from: "owner", at: "Wed 23:02", text: "if anyone asks, i was at yours last night" },
        { from: "them", at: "Wed 23:03", text: "{name}. what are you doing" },
        { from: "owner", at: "Wed 23:05", text: "work. real money. i'll tell you after" },
        { from: "them", at: "Wed 23:05", text: "is this the K thing" },
        { from: "owner", at: "Wed 23:06", text: "delete that" },
        { from: "them", at: "Wed 23:07", text: "fine. but at least lock that stuff away" },
        { from: "owner", at: "Wed 23:07", text: "it is. same code as my gym locker 🙃", evidence: "tara-code" },
        { from: "them", at: "Wed 23:08", text: "wow. unhackable. genius." },
        { from: "owner", at: "Fri 22:03", text: "left. don't be mad" },
        { from: "them", at: "Fri 22:04", text: "you said you'd stay for cake!!" },
        { from: "them", at: "Fri 22:41", text: "dev came back in looking like someone kicked his dog" },
        { from: "them", at: "Sat 01:12", text: "text me when you're home" },
        { from: "them", at: "Sat 10:20", text: "{name}??" },
        { from: "them", at: "Sat 10:22", text: "your mum called. i said you left at 10. which is TRUE" },
        { from: "them", at: "Sat 10:23", text: "i didn't tell her about K. should i??" },
        { from: "them", at: "Sun 21:15", text: "i'm scared. please" },
      ],
    },
    {
      id: "dev",
      contact: "Dev",
      messages: [
        { from: "them", at: "Mon 20:10", text: "you've been weird for weeks" },
        { from: "them", at: "Mon 20:11", text: "who is K" },
        { from: "owner", at: "Mon 20:30", text: "not your business anymore" },
        { from: "them", at: "Fri 22:18", text: "come outside" },
        { from: "them", at: "Fri 22:31", text: "you're really doing this?" },
        { from: "them", at: "Fri 22:32", text: "fine. go." },
        { from: "them", at: "Sat 00:50", text: "i'm sorry about what i said outside" },
        { from: "them", at: "Sat 14:03", text: "your mum called me. where are you" },
      ],
    },
    {
      id: "group",
      contact: "Tara turns 20 🎂",
      group: true,
      messages: [
        { from: "them", sender: "Ria", at: "Fri 18:52", text: "who's bringing ice" },
        { from: "them", sender: "Sam", at: "Fri 18:53", text: "not me, i brought ice last time and nobody thanked me" },
        { from: "them", sender: "Tara", at: "Fri 21:15", text: "no more photos of me blowing candles i look deranged" },
        { from: "owner", at: "Fri 22:02", text: "heading home, dead tired. happy bday T ❤️", evidence: "group-home" },
        { from: "them", sender: "Tara", at: "Fri 22:02", text: "LIAR it's 10pm" },
        { from: "them", sender: "Ria", at: "Sat 11:30", text: "has anyone heard from {name}" },
      ],
    },
    {
      id: "k",
      contact: "K.",
      moved: true,
      messages: [],
    },
    {
      id: "unknown",
      contact: "+91 •••• ••3107",
      messages: [],
      requires: ["fired:unknown-vault"],
    },
  ],

  /* --- Photos -------------------------------------------------------------- */

  photos: [
    {
      id: "cinema",
      album: "recents",
      src: "/found/photos/cinema.jpg",
      alt: "A cinema's facade at night, its sign still lit, a car sliding past.",
      takenAt: "Tue 23:52",
      place: "Lalbaug",
    },
    {
      id: "locker",
      album: "recents",
      src: "/found/photos/locker.jpg",
      alt: "A combination padlock on the grille of locker 14 at the college gym.",
      liveText: "2719",
      takenAt: "Wed 07:41",
      place: "College gym",
      evidence: "locker",
    },
    {
      id: "cake",
      album: "recents",
      src: "/found/photos/cake.jpg",
      alt: "Candles spelling BIRTHDAY, lit in the dark, a second before Tara blew them out.",
      takenAt: "Fri 21:12",
      place: "Parel",
    },
    {
      id: "balcony",
      album: "recents",
      src: "/found/photos/balcony.jpg",
      alt: "Fairy lights strung over Tara's terrace, the party somewhere underneath them.",
      takenAt: "Fri 21:40",
      place: "Parel",
    },
    {
      id: "shoes",
      album: "recents",
      src: "/found/photos/shoes.jpg",
      alt: "{Their} own sneakers on Tara's front step. Taken looking down, on the way out.",
      takenAt: "Fri 21:58",
      place: "Parel",
    },
    {
      id: "street",
      album: "recents",
      src: "/found/photos/street.jpg",
      alt: "Light smeared into streaks. Taken while walking fast.",
      takenAt: "Fri 22:41",
      place: "Flyover, Lalbaug",
      evidence: "street",
    },
    {
      id: "van",
      album: "deleted",
      src: "/found/photos/van.jpg",
      alt: "Near-black. A wall, one lit doorway, and something white parked in the dark.",
      liveText: "GATE 3",
      takenAt: "Fri 23:38",
      place: "Location unavailable",
      note: "Deleted Sat 00:07",
      evidence: "deleted-photo",
    },
    {
      id: "story",
      album: "received",
      src: "/found/photos/story.jpg",
      alt: "Tara's story: Dev holding the cake up to the camera, his face out of frame.",
      overlay: "23:40",
      takenAt: "Fri 23:40",
      place: "Parel",
      requires: ["fired:tara-story"],
    },
  ],

  /* --- Health, Wi-Fi, Maps, Voice Memos ------------------------------------ */

  health: [
    {
      day: "Friday",
      hours: [0, 0, 0, 0, 0, 0, 0, 420, 1210, 380, 300, 520, 610, 340, 280, 410, 690, 720, 150, 880, 640, 210, 3970, 2020],
      walk: { from: "22:30", to: "23:40", km: 4.1 },
      evidence: "health-walk",
    },
    {
      day: "Saturday",
      hours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  ],

  wifi: [
    { ssid: "SRM-GATE3-GUEST", lastJoined: "Fri 23:36", evidence: "wifi-srm" },
    { ssid: "Dev's iPhone", lastJoined: "Fri 22:20", evidence: "wifi-dev" },
    { ssid: "TaraFlat_5G", lastJoined: "Fri 19:34" },
    { ssid: "Sethi_Home", lastJoined: "Fri 17:06", evidence: "wifi-home" },
    { ssid: "College-Guest", lastJoined: "Fri 12:40" },
  ],

  places: [
    { id: "home", label: "Home", x: 30, y: 16 },
    { id: "dev", label: "Dev's building", x: 74, y: 28 },
    { id: "tara", label: "Tara's flat", x: 38, y: 52 },
    { id: "cinema", label: "Lalbaug cinema", x: 72, y: 70 },
    { id: "station", label: "Currey Road station", x: 50, y: 98 },
    { id: "srm", label: "Shree Ram Mills", x: 28, y: 112 },
  ],

  searches: [
    { query: "Shree Ram Mills, Gate 3", at: "Fri 22:24", place: "srm", evidence: "maps-srm" },
    { query: "Tara", at: "Fri 19:05", place: "tara" },
    { query: "24 hr chemist near me", at: "Wed 02:10" },
  ],

  memos: [
    {
      id: "rec-14",
      title: "New Recording 14",
      at: "Fri 23:52",
      seconds: 41,
      src: "/found/memo-14.m4a",
      transcript: [
        "[footsteps on grit]",
        "[a local train horn, very close]",
        "[breathing, held]",
        "“someone's here”",
        "[a metal door]",
        "[recording ends]",
      ],
      evidence: "memo-train",
    },
    {
      id: "rec-13",
      title: "New Recording 13",
      at: "Tue 23:40",
      // Long enough for the whisper to land after its caption and finish.
      seconds: 13,
      src: "/found/memo-13.m4a",
      transcript: ["[wind]", "“note to self: the cinema sign flickers every nine seconds, shoot on the dark”"],
    },
  ],

  /* --- The vault (Calculator) ---------------------------------------------- */

  vault: {
    thread: {
      id: "k-vault",
      contact: "K.",
      messages: [
        { from: "them", at: "Tue 13:20", text: "Saw your night shots on the college page. The cinema one. There's a paying job if you want it." },
        { from: "owner", at: "Tue 13:41", text: "what kind of job" },
        { from: "them", at: "Tue 13:44", text: "Empty buildings. Photograph what's inside. The client likes to know before they buy." },
        { from: "owner", at: "Tue 13:45", text: "is that legal" },
        { from: "them", at: "Tue 13:52", text: "It's photography." },
        { from: "them", at: "Thu 18:10", text: "15k. Half now, half after." },
        { from: "them", at: "Fri 21:40", text: "Tonight. 11:30. Gate 3. The guard is off till 12.", evidence: "k-brief" },
        { from: "them", at: "Fri 21:41", text: "Leave your phone at home." },
        { from: "owner", at: "Fri 21:43", text: "need it for the torch" },
        { from: "them", at: "Fri 21:44", text: "Then turn your location off." },
        { from: "owner", at: "Fri 23:41", text: "there's a van here. you said it would be empty", evidence: "k-van" },
      ],
    },
    notes: [
      {
        id: "kit",
        title: "kit",
        body: "tripod\n35mm + the fast lens\nblack everything\nNO FLASH\n2nd floor, east side\nin and out in 20",
      },
    ],
  },

  /* --- The case file ------------------------------------------------------- */

  evidence: [
    { id: "medical-id", app: "lock", label: "Medical ID", detail: "{name} Sethi, born 14 March 2006. Emergency contact: Mum." },
    { id: "group-home", app: "messages", label: "“Heading home” at 22:02", detail: "What {name} told the group as {they} left Tara's party." },
    { id: "tara-code", app: "messages", label: "Same code as the gym locker", detail: "On Wednesday {name} told Tara the K. stuff was locked away with the locker's code." },
    { id: "locker", app: "photos", label: "Locker 14's padlock", detail: "A combination padlock at the college gym. The dials read 2 · 7 · 1 · 9." },
    { id: "street", app: "photos", label: "A blurred street at 22:41", detail: "Taken walking, forty minutes after “heading home”." },
    { id: "deleted-photo", app: "photos", label: "Deleted photo, 23:38", detail: "A gate marked 3 and something white parked in the dark. Someone deleted it at 00:07." },
    { id: "health-walk", app: "health", label: "4.1 km walked, 22:30–23:40", detail: "Friday's steps don't stop at ten. {They} walked for over an hour after leaving." },
    { id: "wifi-home", app: "settings", label: "Home Wi-Fi, last joined 17:06", detail: "The phone never came back to the home network on Friday night." },
    { id: "wifi-dev", app: "settings", label: "Joined Dev's iPhone at 22:20", detail: "{name} was close enough to join Dev's hotspot, twenty minutes after leaving." },
    { id: "wifi-srm", app: "settings", label: "Joined SRM-GATE3-GUEST, 23:36", detail: "A guest network at a place that shut down years ago." },
    { id: "maps-srm", app: "maps", label: "Searched “Shree Ram Mills, Gate 3”", detail: "Searched at 22:24, four minutes after the hotspot." },
    { id: "memo-train", app: "memos", label: "Voice memo, 23:52", detail: "Footsteps, a train horn very close, and a whisper: “someone's here”." },
    { id: "dev-story", app: "messages", label: "Tara's story, 23:40", detail: "Dev at the party, holding the cake up to the camera, at 23:40.", requires: ["fired:tara-story"] },
    { id: "k-brief", app: "calculator", label: "“Gate 3. 11:30.”", detail: "K. told {name} where and when. The guard would be off till midnight.", requires: ["lock:vault"] },
    { id: "k-van", app: "calculator", label: "“There's a van here”", detail: "{name}'s last message to K., at 23:41. No reply.", requires: ["lock:vault"] },
  ],

  locks: [
    {
      id: "passcode",
      app: "lock",
      answer: "140306",
      clues: ["medical-id"],
      hints: [
        "A locked phone still shows a few things to whoever is holding it.",
        "Look for Emergency on the lock screen. People pick numbers they already know.",
        "The birthday, day month year: 14 03 06.",
      ],
    },
    {
      id: "vault",
      app: "calculator",
      answer: "2719",
      clues: ["tara-code", "locker"],
      requires: ["lock:passcode"],
      hints: [
        "Why is a calculator on the home screen of someone who never does maths?",
        "{name} told Tara on Wednesday night which code {they} used to lock things away.",
        "The gym locker's dials: type 2719, then =.",
      ],
    },
  ],

  deductions: [
    {
      id: "went-home",
      question: "Did {name} go home after the party?",
      ask: "Everyone says {they} did. Show one thing that says otherwise.",
      requires: ["lock:passcode"],
      answer: { kind: "evidence", accepts: [["health-walk"], ["wifi-home"], ["deleted-photo"]] },
      right: "{They} never went home. The phone hadn't touched the home Wi-Fi since five, and at 22:30 {they} started walking.",
      nudges: {
        "group-home": "That's what {they} said. Find something that shows what {they} did.",
        street: "{They} were walking somewhere at 22:41. That could still be the way home.",
        "medical-id": "That's who {they} are. Not where {they} went.",
      },
      otherwise: "That doesn't say anything about after ten o'clock.",
      hints: [
        "A phone keeps records of more than messages. Where else would Friday night leave a trace?",
        "Try Health, or the list of Wi-Fi networks in Settings.",
        "Health shows 4.1 km walked from 22:30 to 23:40. Show that.",
      ],
    },
    {
      id: "dev",
      question: "Was Dev with {name} when {they} vanished?",
      ask: "Dev was with {them} at 22:20. Show where Dev was after that.",
      requires: ["seen:wifi-dev"],
      answer: { kind: "evidence", accepts: [["dev-story"]] },
      right: "At 23:40 Dev was at the party, holding up the cake, kilometres away. Whatever happened to {name}, Dev wasn't there.",
      nudges: {
        "wifi-dev": "That puts Dev beside {them} at 22:20. {name} kept walking for another hour.",
        "health-walk": "That's {name}'s walk. Where was Dev while {they} walked?",
      },
      otherwise: "That doesn't say where Dev was after 22:20.",
      hints: [
        "Someone who was at the party would know when Dev came back in.",
        "Keep an eye on Messages. Tara has something she wants whoever has this phone to see.",
        "Open Tara's thread and show her story from 23:40.",
      ],
    },
    {
      id: "last-seen",
      question: "Where was {name} at 23:52?",
      ask: "Put a pin where {they} recorded that last memo.",
      requires: ["solved:dev", "lock:vault"],
      answer: { kind: "place", place: "srm" },
      right: "Shree Ram Mills, Gate 3. Shut since 2009. {name} walked there, went inside, and at 23:52 {they} stopped moving.",
      nudges: {
        home: "The home Wi-Fi hadn't seen this phone since five in the afternoon.",
        tara: "{They} left Tara's at 22:02 and kept walking.",
        dev: "Dev was at the party. His building was nothing to do with it.",
        cinema: "That was Tuesday's job. Friday was somewhere else.",
        station: "The train was close. Close enough to hear, not to board.",
      },
      otherwise: "Nothing on this phone puts {them} there.",
      hints: [
        "Three things on this phone point at the same place. One is a network name.",
        "SRM-GATE3-GUEST, a search in Maps, and a train in the memo. Find where they meet on the map.",
        "Pin Shree Ram Mills.",
      ],
    },
  ],

  /* --- What happens because you got somewhere ------------------------------ */

  events: [
    {
      id: "mum-delivered",
      when: ["lock:passcode"],
      thread: "mum",
      messages: [
        { from: "them", at: "now", text: "It says delivered." },
        { from: "them", at: "now", text: "Beta?" },
        { from: "them", at: "now", text: "Whoever has this phone. Please call me. Please." },
      ],
    },
    {
      id: "dev-reading",
      when: ["seen:wifi-dev"],
      thread: "dev",
      messages: [
        { from: "them", at: "now", text: "your mum says your phone came back on" },
        { from: "them", at: "now", text: "if someone's reading this: it wasn't me" },
        { from: "them", at: "now", text: "i went back inside. ask anyone" },
      ],
    },
    {
      id: "tara-story",
      when: ["solved:went-home", "fired:dev-reading"],
      thread: "tara",
      messages: [
        { from: "them", at: "now", text: "dev says someone has {name}'s phone" },
        { from: "them", at: "now", text: "i don't know who you are. but he was here till 1. look" },
        { from: "them", at: "now", text: "", photo: "story", evidence: "dev-story" },
      ],
    },
    {
      id: "unknown-vault",
      when: ["lock:vault"],
      thread: "unknown",
      messages: [{ from: "them", at: "now", text: "Close the calculator." }],
    },
    {
      id: "cliff-share",
      when: ["solved:last-seen"],
      thread: null,
      messages: [],
      banner: "K. started sharing their location with you.",
      effect: "share-location",
    },
    {
      id: "cliff-voice",
      when: ["fired:cliff-share"],
      thread: "unknown",
      messages: [
        { from: "them", at: "now", text: "You're not {name}." },
        { from: "them", at: "now", text: "Who is this?" },
        { from: "them", at: "now", text: "Keep it charged." },
      ],
      effect: "power-off",
    },
  ],

  battery: { locked: 4, act1: 4, act2: 3, act3: 2, cliff: 1, dead: 0 },

  end: {
    title: "End of Episode 1",
    questions: [
      "Who deleted the photo at 00:07?",
      "What was in the van?",
      "Who posted you the phone?",
      "Where is {name}?",
    ],
    ask: "Would you play Episode 2?",
  },
};
