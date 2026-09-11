import "server-only";

/* ===========================================================================
   Gemini, for the palette's "Ask me instead" — on the free tier.

   THROUGH THE INTERACTIONS API. The first version called
   `models/{model}:streamGenerateContent`, the long-standing endpoint, and in
   production every question came back as "That didn't come through": that
   path now answers a bare 404 — for a real model, a made-up one, with a key or
   without — while `/v1beta/interactions` answers like a live API. Google's
   guides only document Interactions now, so that is what this calls.

   Called over REST with plain `fetch`, the same way `lib/mail` calls Resend:
   no SDK for one endpoint, so no dependency to keep up to date. The key goes
   in the `x-goog-api-key` header rather than a `?key=` query parameter, so it
   can never end up in a URL that something logs.

   WHAT THE FREE TIER COSTS INSTEAD OF MONEY. Google may use free-tier prompts
   and answers to improve its products, and human reviewers may read them. The
   site content is public anyway; the visitor's question is the part that
   travels on those terms. Moving the key to a paid Gemini project changes
   that without changing a line here.
   =========================================================================== */

export const GEMINI_MODEL = "gemini-3.8-flash";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse";

/**
 * Complete `data:` payloads out of a server-sent-events buffer, and whatever
 * has not finished arriving. A network chunk can end anywhere — mid-line, mid
 * JSON — so only blocks closed by a blank line are read, and the rest waits.
 */
export function readSse(buffer: string): { events: string[]; rest: string } {
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() ?? "";
  const events = blocks.flatMap((block) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    return data ? [data] : [];
  });
  return { events, rest };
}

type Event = {
  event_type?: string;
  delta?: { type?: string; text?: string };
  error?: { message?: string; code?: number | string };
};

export type GeminiPiece = { text: string } | { declined: true } | { done: true };

/**
 * What one streamed event contributes.
 *
 * Only `step.delta` events whose delta is `text` are the answer — the shape
 * Google's own streaming samples read. Thinking arrives as other delta types
 * and is skipped. An `error` event throws, so the route says the answer did
 * not come through rather than showing half of one.
 */
export function pieceOf(event: Event): GeminiPiece | null {
  switch (event.event_type) {
    case "step.delta":
      return event.delta?.type === "text" && event.delta.text ? { text: event.delta.text } : null;
    case "interaction.completed":
      return { done: true };
    case "error":
      throw new Error(`Gemini error event: ${event.error?.code ?? ""} ${event.error?.message ?? ""}`.trim());
    default:
      return null;
  }
}

/** The answer, a piece at a time. Throws on anything but a 200. */
export async function* streamGemini(
  system: string,
  question: string,
  signal: AbortSignal,
): AsyncGenerator<Exclude<GeminiPiece, { done: true }>> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      system_instruction: system,
      input: `<question>${question}</question>`,
      stream: true,
      generation_config: {
        // Low: a short, grounded answer, where the wait is the experience.
        thinking_level: "low",
        // Thought tokens count toward this, hence the headroom over ninety
        // words.
        max_output_tokens: 4096,
      },
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    // 429 is the free tier's quota, which is worth being able to tell apart
    // in the logs from a bad key.
    throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let wrote = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = readSse(buffer);
    buffer = rest;
    for (const data of events) {
      let event: Event;
      try {
        event = JSON.parse(data) as Event;
      } catch {
        continue;
      }
      const piece = pieceOf(event);
      if (!piece) continue;
      if ("done" in piece) {
        /* Finished without a word of answer: Gemini declined without saying
           so. The visitor gets the polite line, not an empty panel. */
        if (!wrote) yield { declined: true };
        return;
      }
      if ("text" in piece) wrote = true;
      yield piece;
    }
  }

  if (!wrote) yield { declined: true };
}
