"use server";

import { deliver, requester, throttled } from "@/lib/mail";
import { validateLetter, type LetterInput, type LetterReason } from "@/lib/letter";

/* ===========================================================================
   A letter from the homepage's compose window, sent to Siddhant.

   Validation is `lib/letter`; delivery, the throttle and the no-key log
   fallback are `lib/mail`, shared with the waitlist and the canvas sketches.

   The visitor's address is the reply-to and part of the display name, so the
   message reads in the inbox as coming from them and Reply answers them. The
   actual sending address stays Resend's shared one — mail cannot be sent *as*
   an address nobody here owns.
   =========================================================================== */

const ADDRESS = process.env.LETTER_FROM ?? "onboarding@resend.dev";

export type LetterResult =
  | { ok: true }
  | { ok: false; reason: LetterReason | "throttled" | "failed" };

export async function sendLetter(input: LetterInput): Promise<LetterResult> {
  const check = validateLetter(input);
  if (!check.ok) return check;

  if (throttled(`letter:${await requester()}`)) return { ok: false, reason: "throttled" };

  const { from, subject, body } = check;

  try {
    await deliver(
      {
        // Quotes and angle brackets would end the display name early.
        from: `"${from.replace(/["<>\\]/g, "")} via Portfolio" <${ADDRESS}>`,
        subject: subject || "No subject",
        text: [
          body,
          ``,
          `—`,
          `Sent from the homepage by ${from}. Reply to answer them.`,
          `Received: ${new Date().toISOString()}`,
        ].join("\n"),
        replyTo: from,
      },
      /* The whole message, not a summary: with no key this line is the only
         copy, and a letter reduced to its length is a letter lost. */
      `[letter] from ${from}: ${JSON.stringify(subject)} ${JSON.stringify(body)}`,
    );
    return { ok: true };
  } catch (err) {
    console.error("[letter] delivery failed", err);
    return { ok: false, reason: "failed" };
  }
}
