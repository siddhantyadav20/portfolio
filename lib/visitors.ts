/* ===========================================================================
   How many people have ever been here.

   Types and the one rule both sides check, in a file with no `server-only` and
   no Redis in it — the same split `lib/engagement.ts` makes, and for the same
   reason: the browser mints the id and the server decides whether to store it,
   so the two have to agree on what an id looks like, and there is exactly one
   place that says.
   =========================================================================== */

export type Visitors = {
  /** `false` with no database attached — the footer keeps its em dash. */
  readonly configured: boolean;
  /** Distinct browsers seen since this shipped. */
  readonly total: number;
};

export const NO_VISITORS: Visitors = { configured: false, total: 0 };

/** Where the browser keeps its id. Read by nothing else. */
export const VISITOR_KEY = "sy.visitor";

/**
 * A v4 UUID, and nothing else.
 *
 * WHY THE SERVER CHECKS AN ID IT DID NOT MINT. The count is a set, and the
 * member is supplied by the caller — that is what makes it survive somebody's
 * IP changing, and it is also the one thing about this design that could be
 * abused. Two rules keep it honest, and this is the first: an id has to be
 * exactly the shape `crypto.randomUUID()` produces, so the set cannot be used
 * as a place to store arbitrary strings, and no single entry can be larger
 * than 36 bytes. The second is the per-address limit in `lib/visitorStore.ts`,
 * which bounds how many *new* ids one address can introduce.
 *
 * Neither can stop a determined person inflating a portfolio's visitor count
 * somewhat, and nothing short of a real analytics vendor would. Together they
 * mean it takes deliberate, sustained effort from many addresses rather than a
 * loop in a console — which is the right amount of defence for a number in a
 * footer.
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

/**
 * The count as the footer says it.
 *
 * A fixed locale rather than the visitor's own: this renders in a client
 * component after hydration, so a browser in a `1.234,5` locale would be free
 * to disagree with one next to it about a number that is a fact about the
 * site, not about the reader.
 */
export function formatVisitors(total: number): string {
  return total.toLocaleString("en-US");
}
