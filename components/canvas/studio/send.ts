"use server";

import { deliver, requester, throttled } from "@/lib/mail";
import { validateSketch, type SketchInput, type SketchReason } from "@/lib/sketch";

/* ===========================================================================
   A sketch, sent to Siddhant.

   The Studio's answer to a brief dealt by the scratch card. Validation
   is `lib/sketch`; delivery, the throttle and the
   no-key log fallback are `lib/mail` (shared with the waitlist).
   =========================================================================== */

const FROM = process.env.SKETCH_FROM ?? "Canvas sketch <onboarding@resend.dev>";

export type SketchResult =
  | { ok: true }
  | { ok: false; reason: SketchReason | "throttled" | "failed" };

export async function sendSketch(input: SketchInput): Promise<SketchResult> {
  const check = validateSketch(input);
  if (!check.ok) return check;

  if (throttled(`sketch:${await requester()}`)) return { ok: false, reason: "throttled" };

  const { base64, brief, contact } = check;
  const from = contact ? ` from ${contact.value}` : "";

  try {
    await deliver(
      {
        from: FROM,
        subject: `Sketch: ${brief.brief}`,
        text: [
          `Somebody scratched a brief on the canvas and drew it.`,
          ``,
          `Brief: ${brief.brief}`,
          `Constraint: ${brief.constraint}`,
          contact
            ? `${contact.kind === "email" ? "Email" : "Phone"}: ${contact.value}`
            : `No contact left.`,
          `Received: ${new Date().toISOString()}`,
        ].join("\n"),
        replyTo: contact?.kind === "email" ? contact.value : undefined,
        attachments: [{ filename: `sketch-${brief.id}.png`, content: base64 }],
      },
      `[sketch] ${brief.id}${from} (${Math.round((base64.length * 3) / 4 / 1024)}KB)`,
    );
    return { ok: true };
  } catch (err) {
    console.error("[sketch] delivery failed", err);
    return { ok: false, reason: "failed" };
  }
}
