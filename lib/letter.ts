import { readContact } from "@/lib/waitlist";

/* ===========================================================================
   What a letter from the homepage has to be before it is worth mailing.

   Pure, and separate from the server action, for the reason `lib/waitlist`
   and `lib/sketch` are: the compose window uses it to decide whether Send is
   live, the action uses it to decide whether to send, and the test can reach
   it without a request. The window is not a security boundary, so the server
   checks again.
   =========================================================================== */

export const LETTER_SUBJECT_MAX = 160;
export const LETTER_BODY_MAX = 5000;

export type LetterInput = { from: string; subject: string; body: string };

export type LetterReason = "from" | "body" | "too-long";

export type LetterCheck =
  | { ok: true; from: string; subject: string; body: string }
  | { ok: false; reason: LetterReason };

const text = (v: unknown) => (typeof v === "string" ? v : "");

export function validateLetter(input: LetterInput): LetterCheck {
  if (!input || typeof input !== "object") return { ok: false, reason: "from" };

  /* An email and nothing else. `readContact` also accepts a phone number,
     which is a fine way to join a waitlist and no way to be replied to — and
     the whole point of the From line is that replying to the notification
     reaches the person who wrote it. */
  const contact = readContact(text(input.from));
  if (contact?.kind !== "email") return { ok: false, reason: "from" };

  // One line, whatever was pasted into it. A subject is a header.
  const subject = text(input.subject).replace(/\s+/g, " ").trim();
  const body = text(input.body).replace(/\r\n?/g, "\n").trim();

  if (!body) return { ok: false, reason: "body" };
  if (subject.length > LETTER_SUBJECT_MAX || body.length > LETTER_BODY_MAX) {
    return { ok: false, reason: "too-long" };
  }

  return { ok: true, from: contact.value, subject, body };
}
