"use server";

import { headers } from "next/headers";
import { readContact, type Contact } from "@/lib/waitlist";

/* ===========================================================================
   Waitlist submission.

   Interim by design. There is no database and no signup service; what a
   waitlist entry does today is arrive in Siddhant's inbox as mail, which is
   the whole of the requirement ("send it to me for now"). When that is
   replaced by something durable, `deliver` is the only function that changes.

   Delivery goes through Resend's REST API over plain `fetch` — no SDK, so no
   dependency, and nothing to keep up to date. Two environment variables:

     RESEND_API_KEY   required for mail to actually leave
     WAITLIST_TO      optional override of the destination

   With no key set the entry is written to the server log instead and the card
   still celebrates. That is a considered trade, not an oversight: the signup
   is captured either way, and a visitor who typed their address correctly
   should not be shown a failure caused by the site's own configuration.
   =========================================================================== */

const TO = process.env.WAITLIST_TO ?? "siddhantyadav20@gmail.com";

/* Resend's shared sending domain. It only delivers to the address that owns
   the API key, which for this mailbox is exactly right — and it means there is
   no domain to verify before the first signup works. */
const FROM = process.env.WAITLIST_FROM ?? "Waitlist <onboarding@resend.dev>";

export type WaitlistResult = { ok: true } | { ok: false; reason: Reason };
type Reason = "invalid" | "failed" | "throttled";

/* --- Throttle ---------------------------------------------------------------
   A Server Action is a public POST endpoint (see the Security section of the
   Server Actions guide), and this one sends mail, so it is worth something.

   Best-effort only, and worth being clear about the limits: the window lives
   in this process's memory, so it resets on deploy and is not shared between
   instances. It stops a browser tab hammering the button; it does not stop a
   distributed flood. A real limiter belongs at the edge.
   --------------------------------------------------------------------------- */

const WINDOW_MS = 60_000;
const PER_WINDOW = 5;
const seen = new Map<string, number[]>();

function throttled(key: string): boolean {
  const now = Date.now();
  const hits = (seen.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(key, hits);

  // The map would otherwise grow for the life of the process.
  if (seen.size > 5000) {
    for (const [k, v] of seen) if (now - v[v.length - 1] > WINDOW_MS) seen.delete(k);
  }

  return hits.length > PER_WINDOW;
}

export async function joinWaitlist(raw: string): Promise<WaitlistResult> {
  const contact = readContact(typeof raw === "string" ? raw : "");
  if (!contact) return { ok: false, reason: "invalid" };

  const head = await headers();
  const who =
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    head.get("x-real-ip") ||
    "unknown";

  if (throttled(who)) return { ok: false, reason: "throttled" };

  try {
    await deliver(contact);
    return { ok: true };
  } catch (err) {
    // The address is in the log line above regardless of what the mail
    // provider did, so a failure here is never a lost signup.
    console.error("[waitlist] delivery failed", err);
    return { ok: false, reason: "failed" };
  }
}

async function deliver(contact: Contact) {
  const key = process.env.RESEND_API_KEY;
  const line = `[waitlist] ${contact.kind}: ${contact.value}`;

  if (!key) {
    console.warn(`${line} — not mailed (set RESEND_API_KEY)`);
    return;
  }

  console.info(line);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject: `Waitlist: ${contact.value}`,
      text: [
        `A new signup for the "Currently Building" waitlist.`,
        ``,
        `${contact.kind === "email" ? "Email" : "Phone"}: ${contact.value}`,
        `Received: ${new Date().toISOString()}`,
      ].join("\n"),
      // Replying to the notification replies to the person who signed up.
      ...(contact.kind === "email" ? { reply_to: contact.value } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}
