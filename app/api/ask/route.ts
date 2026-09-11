import Anthropic from "@anthropic-ai/sdk";
import { ASK_MODEL, ASK_SYSTEM } from "@/lib/ask";
import { requester, throttled } from "@/lib/mail";
import { FAILED_MARK, MAX_QUESTION, REFUSED_MARK } from "@/components/palette/askStream";

/* ===========================================================================
   POST /api/ask — the palette's "Ask me instead", streamed.

   Offered only when a search finds nothing: the palette's index answers
   everything it can, and this is for the question it cannot.

   THE FAILURE MODES ARE THE DESIGN. No `ANTHROPIC_API_KEY` answers 503 before
   anything is spent, and the palette stops offering the row for the rest of
   the visit — the waitlist and the FPL card both failed silently for weeks on
   a missing environment variable, and this one says so. A public endpoint
   that spends money is throttled per requester (`lib/mail`'s window, keyed
   apart from the waitlist's), and a question is a sentence, not a payload.

   Answers stream as plain text; the markers after them are
   components/palette/askStream.ts's.
   =========================================================================== */

/** A low-effort answer lands in a few seconds; this is the ceiling, not the
 *  expectation. */
export const maxDuration = 60;

let client: Anthropic | null = null;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ reason: "offline" }, { status: 503 });
  }

  let question = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "question" in body && typeof body.question === "string") {
      question = body.question.trim();
    }
  } catch {
    // Not JSON. Falls through to the length check.
  }
  if (!question || question.length > MAX_QUESTION) {
    return Response.json({ reason: "invalid" }, { status: 400 });
  }

  if (throttled(`ask:${await requester()}`)) {
    return Response.json({ reason: "throttled" }, { status: 429 });
  }

  client ??= new Anthropic();

  const stream = client.beta.messages.stream(
    {
      model: ASK_MODEL,
      /* Room for adaptive thinking as well as the answer — the answer itself
         is asked to be under 90 words. */
      max_tokens: 4000,
      /* Low effort: a short, grounded answer to a recruiter's question, where
         the wait is the whole experience. */
      output_config: { effort: "low" },
      /* If the model declines, Anthropic's recommended fallback re-runs the
         request server-side rather than handing back a refusal. */
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      /* The site's content, cached for an hour: ~14k tokens that are the same
         for every visitor, so only the question is new each time. */
      system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: `<question>${question}</question>` }],
    },
    // The visitor closing the panel stops the generation, and the bill.
    { signal: request.signal },
  );

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        // Every model in the fallback chain declined.
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode(`\n${REFUSED_MARK}`));
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("[ask] stream failed", err);
          controller.enqueue(encoder.encode(`\n${FAILED_MARK}`));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Keeps proxies from buffering the stream into one late chunk.
      "X-Accel-Buffering": "no",
    },
  });
}
