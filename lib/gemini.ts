import "server-only";

/* ===========================================================================
   Gemini, for the palette's "Ask me instead" — on the free tier.

   Called over REST with plain `fetch`, the same way `lib/mail` calls Resend:
   no SDK for one endpoint, so no dependency to keep up to date. The key goes
   in the `x-goog-api-key` header rather than the `?key=` query parameter, so
   it can never end up in a URL that something logs.

   WHAT THE FREE TIER COSTS INSTEAD OF MONEY. Google may use free-tier prompts
   and answers to improve its products, and human reviewers may read them. The
   site content is public anyway; the visitor's question is the part that
   travels on those terms. Moving the key to a paid Gemini project changes
   that without changing a line here.

   Thinking is left at the model's default. The only thinking control Google
   documents for Gemini 3.x belongs to its newer Interactions API, not to
   `streamGenerateContent`, and an unrecognised field is not worth the risk.
   Thought tokens count toward `maxOutputTokens`, hence the headroom.
   =========================================================================== */

export const GEMINI_MODEL = "gemini-3.8-flash";

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

/** Finish reasons that mean Gemini stopped because it would not continue,
 *  rather than because it was done. */
const DECLINED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

type Chunk = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
};

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

export type GeminiPiece = { text: string } | { declined: true };

/** What one streamed chunk contributes: text, and whether Gemini declined. */
export function piecesOf(chunk: Chunk): GeminiPiece[] {
  if (chunk.promptFeedback?.blockReason) return [{ declined: true }];
  const candidate = chunk.candidates?.[0];
  const out: GeminiPiece[] = [];
  for (const part of candidate?.content?.parts ?? []) {
    // Thought summaries, if a model ever sends them, are not the answer.
    if (part.text && !part.thought) out.push({ text: part.text });
  }
  if (candidate?.finishReason && DECLINED.has(candidate.finishReason)) out.push({ declined: true });
  return out;
}

/** The answer, a piece at a time. Throws on anything but a 200. */
export async function* streamGemini(
  system: string,
  question: string,
  signal: AbortSignal,
): AsyncGenerator<GeminiPiece> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: `<question>${question}</question>` }] }],
      // Room for the default thinking as well as a ninety-word answer.
      generationConfig: { maxOutputTokens: 4096 },
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

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = readSse(buffer);
    buffer = rest;
    for (const data of events) {
      let chunk: Chunk;
      try {
        chunk = JSON.parse(data) as Chunk;
      } catch {
        continue;
      }
      for (const piece of piecesOf(chunk)) {
        yield piece;
        if ("declined" in piece) return;
      }
    }
  }
}
