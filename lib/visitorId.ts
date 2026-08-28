import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

/* ===========================================================================
   Who is asking — one answer, for everything that needs one.

   A stable-enough identity, derived and then thrown away: the raw address is
   hashed with a salt and only the digest is ever written down, so no store on
   this site holds an IP address and nothing in any of them identifies a
   visitor to anyone who reads the database.

   It is a heuristic, not an identity. Two people behind one NAT share it; the
   same person on a phone and a laptop gets two. Both are fine for what it is
   measuring — one-person-one-like, and one-person-one-dot in the footer — and
   neither is worth a login to fix.

   IT LIVES HERE RATHER THAN IN `engagementStore` BECAUSE THERE ARE NOW TWO
   CALLERS, and two copies of this would be two salts, two hash inputs and, the
   first time one of them was tweaked, two populations that no longer agree on
   who anybody is. The environment variable keeps its `ENGAGEMENT_` name and
   its default: changing either would re-hash every existing voter and silently
   reset who has already liked what.
   =========================================================================== */

const SALT = process.env.ENGAGEMENT_SALT ?? "sy-engagement";

export async function visitorId(): Promise<string> {
  const head = await headers();
  const ip =
    head.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    head.get("x-real-ip") ||
    "unknown";
  const agent = head.get("user-agent") ?? "";

  return createHash("sha256")
    .update(`${SALT}:${ip}:${agent}`)
    .digest("base64url")
    .slice(0, 22);
}
