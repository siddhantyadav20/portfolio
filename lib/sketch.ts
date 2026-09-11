import { briefs, type Brief } from "@/content/canvas";
import { readContact, type Contact } from "@/lib/waitlist";

/* ===========================================================================
   What a sketch has to be before it is worth mailing.

   Pure, and separate from the server action, for the reason `lib/waitlist`
   is: the widget uses it to decide whether Send is live, the action uses it
   to decide whether to send, and the test can reach it without a request.

   THE SIZE CAP IS UNDER NEXT'S, NOT AT IT. A Server Action body is limited to
   1MB by default (next.config `serverActions.bodySizeLimit`), and base64 is a
   third bigger than the bytes it carries, plus the action's own framing. The
   widget exports at a fixed 640px rather than at the screen's DPR, which puts
   an ordinary sketch well under 150KB; 600KB is the ceiling for a page
   scribbled solid, and it leaves the request comfortably inside the limit.
   =========================================================================== */

export const SKETCH_MAX_BYTES = 600_000;

/** The side of the exported PNG, px. Twice the paper's 320. */
export const SKETCH_EXPORT_PX = 640;

const PREFIX = "data:image/png;base64,";
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type SketchInput = {
  /** A `data:image/png;base64,` URL. */
  png: string;
  briefId: string;
  /** Optional, so the visitor can be replied to. */
  contact?: string;
};

export type SketchReason = "invalid" | "too-large" | "contact";

export type SketchCheck =
  | { ok: true; base64: string; brief: Brief; contact: Contact | null }
  | { ok: false; reason: SketchReason };

/** Decoded length of a base64 string, without decoding it. */
export function base64Bytes(b64: string): number {
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

export function validateSketch(input: SketchInput): SketchCheck {
  if (!input || typeof input.png !== "string" || typeof input.briefId !== "string") {
    return { ok: false, reason: "invalid" };
  }

  // Only a brief the site actually deals — never free text from the client.
  const brief = briefs.find((b) => b.id === input.briefId);
  if (!brief) return { ok: false, reason: "invalid" };

  if (!input.png.startsWith(PREFIX)) return { ok: false, reason: "invalid" };
  const base64 = input.png.slice(PREFIX.length);
  // Length first: a regex over a multi-megabyte string is the expensive check.
  if (base64Bytes(base64) > SKETCH_MAX_BYTES) return { ok: false, reason: "too-large" };
  if (!base64 || !BASE64.test(base64)) return { ok: false, reason: "invalid" };

  const raw = typeof input.contact === "string" ? input.contact.trim() : "";
  const contact = raw ? readContact(raw) : null;
  // Typed something that is not a way to reach anyone: say so rather than
  // send a sketch nobody can be answered about.
  if (raw && !contact) return { ok: false, reason: "contact" };

  return { ok: true, base64, brief, contact };
}
