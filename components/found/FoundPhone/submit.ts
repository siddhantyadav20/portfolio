"use server";

import { deliver, requester, throttled } from "@/lib/mail";
import { readContact } from "@/lib/waitlist";

/* ===========================================================================
   "Tell me when Episode 2 is out" — the same interim delivery as the store
   waitlist (components/home/StoreWaitlist/submit.ts): it arrives in
   Siddhant's inbox as mail, or in the server log with no RESEND_API_KEY.
   Separate from that action rather than a parameter on it, so the waitlist
   card's contract doesn't change for a pilot.
   =========================================================================== */

const FROM = process.env.WAITLIST_FROM ?? "Waitlist <onboarding@resend.dev>";

export type EpisodeTwoResult = { ok: true } | { ok: false; reason: "invalid" | "failed" | "throttled" };

export async function joinEpisodeTwo(raw: string): Promise<EpisodeTwoResult> {
  const contact = readContact(typeof raw === "string" ? raw : "");
  if (!contact || contact.kind !== "email") return { ok: false, reason: "invalid" };
  if (throttled(`found:${await requester()}`)) return { ok: false, reason: "throttled" };

  try {
    await deliver(
      {
        from: FROM,
        subject: `Found, Episode 2: ${contact.value}`,
        text: [
          `Someone finished Low Battery and wants to hear about Episode 2.`,
          ``,
          `Email: ${contact.value}`,
          `Received: ${new Date().toISOString()}`,
        ].join("\n"),
        replyTo: contact.value,
      },
      `[found] episode 2: ${contact.value}`,
    );
    return { ok: true };
  } catch (err) {
    console.error("[found] delivery failed", err);
    return { ok: false, reason: "failed" };
  }
}
