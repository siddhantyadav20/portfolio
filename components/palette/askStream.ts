/* ===========================================================================
   The wire between /api/ask and the palette's answer view.

   The route streams plain text — the answer as it is written — and three
   markers the model and the route append after it. Plain text rather than
   JSON events because the answer is the only thing that has to arrive a word
   at a time; the rest is a line at the end.

   Every marker starts with §, and the parser hides anything from the first §
   onwards, so a marker that has only half arrived ("…inspection time §sou")
   never flashes in the answer.

   Shared by the server and the client, so neither can spell a marker the
   other does not know.
   =========================================================================== */

/** The model ends its answer with this, then the palette ids it drew on. */
export const SOURCES_MARK = "§sources:";
/** The route appends this when every model in the chain declined. */
export const REFUSED_MARK = "§refused";
/** The route appends this when the stream broke. */
export const FAILED_MARK = "§failed";
/** The route sends this before retrying a broken answer: everything written
 *  before it was the failed attempt and is thrown away. */
export const RESET_MARK = "§reset";

/** Longest question the route will take. A sentence, not an essay. */
export const MAX_QUESTION = 280;

export type AskRead = {
  /** The answer, with every marker removed. */
  text: string;
  /** Palette entry ids the answer drew on, most relevant first, at most three. */
  sources: string[];
  refused: boolean;
  failed: boolean;
};

export function readAsk(stream: string): AskRead {
  // Only the last attempt counts — see RESET_MARK.
  const cut = stream.lastIndexOf(RESET_MARK);
  const raw = cut === -1 ? stream : stream.slice(cut + RESET_MARK.length);

  const refused = raw.includes(REFUSED_MARK);
  const failed = raw.includes(FAILED_MARK);

  const at = raw.indexOf("§");
  const text = (at === -1 ? raw : raw.slice(0, at)).trim();
  const tail = at === -1 ? "" : raw.slice(at);

  const sources = tail.startsWith(SOURCES_MARK)
    ? tail
        .slice(SOURCES_MARK.length)
        .split(/[\n§]/)[0]
        .split(",")
        /* Gemini cited "[answer:tour]" — the brackets the prompt shows the
           ids in — so the brackets come off before an id is looked up. */
        .map((id) => id.trim().replace(/^\[/, "").replace(/\]$/, "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return { text, sources, refused, failed };
}
