import { NextResponse } from "next/server";
import { countEvent, readFunnel } from "@/lib/found/store";

/**
 * Found's funnel. A POST counts one allowlisted event; a GET reads the whole
 * funnel back, for Siddhant only.
 *
 * The GET is behind `FOUND_STATS_TOKEN` (as `?token=`) everywhere but
 * `next dev`: the numbers are harmless, but a pilot's drop-off chart is not
 * something to publish by accident. Without the variable set on Vercel the
 * GET is simply a 404 (see the memory about .env.local not being Vercel).
 */
type Body = { event?: unknown; seconds?: unknown } | null;

export async function POST(request: Request) {
  let body: Body = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    // No body, or not JSON. Nothing to count.
  }
  return json({ counted: await countEvent(body?.event, body?.seconds) });
}

export async function GET(request: Request) {
  const token = process.env.FOUND_STATS_TOKEN;
  const given = new URL(request.url).searchParams.get("token");
  const open = process.env.NODE_ENV === "development";
  if (!open && (!token || given !== token)) return json({ error: "Not found" }, 404);
  return json(await readFunnel());
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
