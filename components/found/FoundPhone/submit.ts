"use server";

import { deliver, requester, throttled } from "@/lib/mail";
import { readContact } from "@/lib/waitlist";

/* ===========================================================================
   "Tell me when the next episode is out" — the same interim delivery as the
   store waitlist (components/home/StoreWaitlist/submit.ts): it arrives in
   Siddhant's inbox as mail, or in the server log with no RESEND_API_KEY.
   Separate from that action rather than a parameter on it, so the waitlist
   card's contract doesn't change for a pilot.
   =========================================================================== */

const FROM = process.env.WAITLIST_FROM ?? "Waitlist <onboarding@resend.dev>";

export type NextEpisodeResult = { ok: true } | { ok: false; reason: "invalid" | "failed" | "throttled" };

export async function joinNextEpisode(raw: string, episode: number): Promise<NextEpisodeResult> {
  const contact = readContact(typeof raw === "string" ? raw : "");
  if (!contact || contact.kind !== "email") return { ok: false, reason: "invalid" };
  if (throttled(`found:${await requester()}`)) return { ok: false, reason: "throttled" };
  const n = Number.isInteger(episode) && episode > 1 && episode < 10 ? episode : 2;

  try {
    await deliver(
      {
        from: FROM,
        subject: `Found, Episode ${n}: ${contact.value}`,
        text: [
          `Someone finished Episode ${n - 1} of Low Battery and wants to hear about Episode ${n}.`,
          ``,
          `Email: ${contact.value}`,
          `Received: ${new Date().toISOString()}`,
        ].join("\n"),
        replyTo: contact.value,
      },
      `[found] episode ${n}: ${contact.value}`,
    );
    return { ok: true };
  } catch (err) {
    console.error("[found] delivery failed", err);
    return { ok: false, reason: "failed" };
  }
}
