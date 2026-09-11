import Anthropic from "@anthropic-ai/sdk";
import { ASK_MODEL, ASK_SYSTEM } from "@/lib/ask";
import { streamGemini } from "@/lib/gemini";
import { requester, throttled } from "@/lib/mail";
import { FAILED_MARK, MAX_QUESTION, REFUSED_MARK, RESET_MARK } from "@/components/palette/askStream";

/* ===========================================================================
   POST /api/ask — the palette's "Ask me instead", streamed.

   Offered only when a search finds nothing: the palette's index answers
   everything it can, and this is for the question it cannot.

   WHICH MODEL ANSWERS IS WHICHEVER KEY IS SET. `GEMINI_API_KEY` first — it is
   the free tier, and it is the one Siddhant has (lib/gemini.ts has what free
   costs instead of money). `ANTHROPIC_API_KEY` if that is set instead. Both
   read the same grounded prompt from lib/ask.ts and stream the same text and
   markers, so the palette cannot tell them apart.

   THE FAILURE MODES ARE THE DESIGN. No key at all answers 503 before anything
   is spent, and the palette stops offering the row for the rest of the visit —
   the waitlist and the FPL card both failed silently for weeks on a missing
   environment variable, and this one says so. A public endpoint that spends a
   quota is throttled per requester (`lib/mail`'s window, keyed apart from the
   waitlist's), and a question is a sentence, not a payload.
   =========================================================================== */

/** A short answer lands in a few seconds; this is the ceiling, not the
 *  expectation — it has to hold two attempts and the pause between them. */
export const maxDuration = 60;

/**
 * ONE RETRY, AFTER A BREATH.
 *
 * On Gemini's free tier, questions asked back to back broke off a word in —
 * "I", then nothing — while the same questions twenty seconds apart all
 * answered. Every question carries the whole site, so the per-minute token
 * quota is the likely culprit, and a short pause is often all it needs. The
 * retry is announced with RESET_MARK first, so the palette throws away the
 * broken word or two instead of printing the answer twice. A second failure
 * is reported as one, with its status code.
 */
const RETRY_AFTER_MS = 2500;

let anthropic: Anthropic | null = null;

export async function POST(request: Request) {
  const provider = process.env.GEMINI_API_KEY
    ? "gemini"
    : process.env.ANTHROPIC_API_KEY
      ? "anthropic"
      : null;
  if (!provider) {
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

  const answer = () =>
    provider === "gemini" ? fromGemini(question, request.signal) : fromClaude(question, request.signal);

  const encoder = new TextEncoder();
  const write = (controller: ReadableStreamDefaultController<Uint8Array>, text: string) =>
    controller.enqueue(encoder.encode(text));

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          for await (const piece of answer()) {
            if ("text" in piece) write(controller, piece.text);
            else write(controller, `\n${REFUSED_MARK}`);
          }
          break;
        } catch (err) {
          if (request.signal.aborted) break;
          console.error(`[ask] ${provider} attempt ${attempt} failed`, err);

          if (attempt === 1) {
            write(controller, `\n${RESET_MARK}`);
            await pause(RETRY_AFTER_MS, request.signal);
            if (request.signal.aborted) break;
            continue;
          }

          /* The upstream status code rides after the marker — "§failed 429" —
             and nothing else from the error does. The palette shows the same
             sentence either way; the number is what lets a failure be told
             apart from outside without the server logs: 429 is the free
             tier's quota, 5xx is Google's side. */
          const code = err instanceof Error ? (/\b([45]\d\d)\b/.exec(err.message)?.[1] ?? "") : "";
          write(controller, `\n${FAILED_MARK}${code ? ` ${code}` : ""}`);
        }
      }
      controller.close();
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

/** A wait the visitor closing the panel cuts short. */
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

type Piece = { text: string } | { declined: true };

function fromGemini(question: string, signal: AbortSignal): AsyncIterable<Piece> {
  return streamGemini(ASK_SYSTEM, question, signal);
}

/** Claude Opus 5, for when an Anthropic key is what is configured. */
async function* fromClaude(question: string, signal: AbortSignal): AsyncGenerator<Piece> {
  anthropic ??= new Anthropic();
  const stream = anthropic.beta.messages.stream(
    {
      model: ASK_MODEL,
      /* Room for adaptive thinking as well as the answer — the answer itself
         is asked to be under 90 words. */
      max_tokens: 4000,
      // Low effort: a short, grounded answer where the wait is the experience.
      output_config: { effort: "low" },
      /* If the model declines, Anthropic's recommended fallback re-runs the
         request server-side rather than handing back a refusal. */
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      /* The site's content, cached: the same for every visitor, so only the
         question is new each time. */
      system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: `<question>${question}</question>` }],
    },
    // The visitor closing the panel stops the generation, and the bill.
    { signal },
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { text: event.delta.text };
    }
  }
  const final = await stream.finalMessage();
  // Every model in the fallback chain declined.
  if (final.stop_reason === "refusal") yield { declined: true };
}
