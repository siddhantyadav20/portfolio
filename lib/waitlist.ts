/**
 * What counts as a way to reach someone.
 *
 * Shared deliberately: the card uses it to decide whether the Join button is
 * live, and the server action uses it to decide whether to send anything at
 * all. One rule, so the button is never enabled for something the server will
 * then reject — and the server still checks, because the button is not a
 * security boundary.
 */

export type Contact = { kind: "email" | "phone"; value: string };

/* Deliberately permissive. This is a waitlist, not a billing system: the only
   real test of an address is whether mail arrives, and a regex that rejects
   valid-but-unusual addresses (plus tags, new TLDs, quoted locals) costs more
   than it saves. One @, something either side, a dot in the domain. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Everything humans put in phone numbers and nothing else. */
const PHONE_NOISE = /[\s()./-]/g;

export function readContact(raw: string): Contact | null {
  const value = raw.trim();
  if (!value || value.length > 254) return null;

  if (EMAIL.test(value)) return { kind: "email", value };

  const digits = value.replace(PHONE_NOISE, "");
  // E.164 tops out at 15 digits; 7 is the shortest number anyone dials.
  if (/^\+?\d{7,15}$/.test(digits)) return { kind: "phone", value: digits };

  return null;
}
