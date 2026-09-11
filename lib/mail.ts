import "server-only";

import { headers } from "next/headers";

/* ===========================================================================
   Mail to Siddhant.

   Lifted out of the waitlist's server action when a second thing — a sketch
   from the drawing canvas — needed to arrive the same way. Same rules as it
   always had, now in one place:

   - Delivery goes through Resend's REST API over plain `fetch` — no SDK, so
     no dependency to keep up to date.
   - With no `RESEND_API_KEY` the message is written to the server log instead
     and the caller still reports success. A visitor who did everything right
     should not be shown a failure caused by the site's own configuration,
     and the log line means nothing is lost.
   - Both actions are public POST endpoints that send mail, so both are
     throttled per requester.

   `WAITLIST_TO` is the destination for everything, and keeps its name because
   renaming a deployed environment variable is how mail silently stops.
   =========================================================================== */

const TO = process.env.WAITLIST_TO ?? "siddhantyadav20@gmail.com";

/* --- Throttle ---------------------------------------------------------------
   Best-effort only, and worth being clear about the limits: the window lives
   in this process's memory, so it resets on deploy and is not shared between
   instances. It stops a browser tab hammering the button; it does not stop a
   distributed flood. A real limiter belongs at the edge.

   Keys are scoped by the caller ("waitlist:1.2.3.4") so a sketch does not
   spend somebody's waitlist attempts.
   --------------------------------------------------------------------------- */

const WINDOW_MS = 60_000;
const PER_WINDOW = 5;
const seen = new Map<string, number[]>();

export function throttled(key: string): boolean {
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

/** Who is asking, as well as a proxy will say. */
export async function requester(): Promise<string> {
  const head = await headers();
  return (
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    head.get("x-real-ip") ||
    "unknown"
  );
}

export type Mail = {
  /** Resend's shared sending domain only delivers to the key's own address,
   *  which for this mailbox is exactly right. The display name is free. */
  from: string;
  subject: string;
  text: string;
  /** Replying to the notification replies to the visitor. */
  replyTo?: string;
  /** Base64 content, as Resend takes it. */
  attachments?: { filename: string; content: string }[];
};

/**
 * Send, or log when there is no key.
 *
 * `line` is what reaches the server log either way — it is the record of the
 * message, so it should carry whatever would matter if the mail never came.
 * Throws on a provider failure; the caller decides what the visitor sees.
 */
export async function deliver(mail: Mail, line: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;

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
      from: mail.from,
      to: [TO],
      subject: mail.subject,
      text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      ...(mail.attachments?.length ? { attachments: mail.attachments } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}
