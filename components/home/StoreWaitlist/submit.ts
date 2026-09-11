"use server";

import { deliver, requester, throttled } from "@/lib/mail";
import { readContact, type Contact } from "@/lib/waitlist";

/* ===========================================================================
   Waitlist submission.

   Interim by design. There is no database and no signup service; what a
   waitlist entry does today is arrive in Siddhant's inbox as mail, which is
   the whole of the requirement ("send it to me for now"). When that is
   replaced by something durable, `lib/mail`'s `deliver` is the only function
   that changes.

   Delivery, the throttle and the no-key fallback live in `lib/mail` now — the
   drawing canvas sends sketches the same way. Two environment variables:

     RESEND_API_KEY   required for mail to actually leave
     WAITLIST_TO      optional override of the destination

   With no key set the entry is written to the server log instead and the card
   still celebrates. That is a considered trade, not an oversight: the signup
   is captured either way, and a visitor who typed their address correctly
   should not be shown a failure caused by the site's own configuration.
   =========================================================================== */

/* Resend's shared sending domain. It only delivers to the address that owns
   the API key, which for this mailbox is exactly right — and it means there is
   no domain to verify before the first signup works. */
const FROM = process.env.WAITLIST_FROM ?? "Waitlist <onboarding@resend.dev>";

export type WaitlistResult = { ok: true } | { ok: false; reason: Reason };
type Reason = "invalid" | "failed" | "throttled";

export async function joinWaitlist(raw: string): Promise<WaitlistResult> {
  const contact = readContact(typeof raw === "string" ? raw : "");
  if (!contact) return { ok: false, reason: "invalid" };

  if (throttled(`waitlist:${await requester()}`)) return { ok: false, reason: "throttled" };

  try {
    await notify(contact);
    return { ok: true };
  } catch (err) {
    // The address is in the log line regardless of what the mail provider
    // did, so a failure here is never a lost signup.
    console.error("[waitlist] delivery failed", err);
    return { ok: false, reason: "failed" };
  }
}

function notify(contact: Contact) {
  return deliver(
    {
      from: FROM,
      subject: `Waitlist: ${contact.value}`,
      text: [
        `A new signup for the "Currently Building" waitlist.`,
        ``,
        `${contact.kind === "email" ? "Email" : "Phone"}: ${contact.value}`,
        `Received: ${new Date().toISOString()}`,
      ].join("\n"),
      // Replying to the notification replies to the person who signed up.
      replyTo: contact.kind === "email" ? contact.value : undefined,
    },
    `[waitlist] ${contact.kind}: ${contact.value}`,
  );
}
