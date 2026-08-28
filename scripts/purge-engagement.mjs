#!/usr/bin/env node
/**
 * Delete a study's comments and likes.
 *
 * WHY A SCRIPT AND NOT A ROUTE
 *
 * The site has no admin surface and should not grow one for this. A delete
 * that lives behind a URL is a delete that needs an auth story, a token to
 * store, and a permanently reachable endpoint whose only job is to destroy
 * data — three new things to get right so that one person can occasionally
 * clear a test comment. A script run from a terminal that already has the
 * database credentials needs none of them: the credential *is* the
 * authorisation, and when the terminal closes the capability is gone.
 *
 * WHAT IT TOUCHES — everything `lib/engagementStore.ts` writes for a study:
 *
 *   sy:s:<slug>:comments        the thread
 *   sy:s:<slug>:c:<id>:likes    a set per comment, found by SCAN
 *   sy:s:<slug>:likes           the study's own likes   (only with --likes)
 *   sy:s:<slug>:up / :voters    the pre-redesign counters (only with --likes)
 *
 * Comments and likes are deleted separately on purpose. "Delete the comments"
 * and "reset the like count" are different intentions, and the destructive
 * tool should not quietly do the second because you asked for the first.
 *
 * Threads are per study — `sy:s:<slug>:…` — so purging one leaves the others
 * untouched. Naming no slug purges every study in the registry.
 *
 * USAGE
 *
 *   node scripts/purge-engagement.mjs --dry                 # every study, no writes
 *   node scripts/purge-engagement.mjs search --yes          # one study's comments
 *   node scripts/purge-engagement.mjs --likes --yes         # everything, likes too
 *
 * Reads UPSTASH_REDIS_REST_URL / _TOKEN, or the KV_REST_API_* pair, from the
 * environment or from .env.local — the same two pairs `lib/upstash.ts`
 * accepts, so whichever way the database was added, this finds it. It never
 * touches the in-memory dev store: that one lives inside `next dev` and is
 * cleared by restarting it.
 *
 * WITHOUT --yes NOTHING IS DELETED. The default is a dry run that prints what
 * it would remove, because the failure mode of this file is unrecoverable and
 * the failure mode of an extra flag is ten seconds.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* The registry, read rather than duplicated — a slug list that can drift from
   `content/work/` is a script that silently skips a study. This is the one
   line of TypeScript that a plain regex is a better tool for than a parser:
   the alternative is making this file part of the build. */
const SLUGS = readFileSync(join(ROOT, "content/work/index.ts"), "utf8")
  .match(/export const STUDIES = \[([^\]]*)\]/)?.[1]
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
  .map((name) => slugOf(name)) ?? [];

function slugOf(exportName) {
  /* `inspectionPhotos` is exported from `./inspection-photos`, and the slug is
     the filename. Rather than guess the camel-case rule, read the study's own
     `slug:` out of the module it comes from. */
  const file = exportName.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const src = readFileSync(join(ROOT, `content/work/${file}.ts`), "utf8");
  return src.match(/slug:\s*"([^"]+)"/)?.[1] ?? file;
}

/* --- Credentials ----------------------------------------------------------- */

loadEnvLocal();

const URL_ = firstSet(
  process.env.UPSTASH_REDIS_REST_URL,
  process.env.KV_REST_API_URL,
);
const TOKEN = firstSet(
  process.env.UPSTASH_REDIS_REST_TOKEN,
  process.env.KV_REST_API_TOKEN,
);

function firstSet(...values) {
  return values.find((v) => v && v.trim().length > 0);
}

/** `.env.local` if there is one, without adding a dotenv dependency. */
function loadEnvLocal() {
  let text;
  try {
    text = readFileSync(join(ROOT, ".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    // The environment wins: an explicitly exported value is the deliberate one.
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

/* --- Arguments -------------------------------------------------------------- */

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const asked = argv.filter((a) => !a.startsWith("--"));

const commit = flags.has("--yes");
const alsoLikes = flags.has("--likes");

if (flags.has("--help")) {
  console.log(
    [
      "purge-engagement — delete a case study's comments (and optionally its likes)",
      "",
      "  node scripts/purge-engagement.mjs [slug ...] [--likes] [--yes]",
      "",
      "  <no slug>   every study in the registry",
      "  --likes     also clear the study's like count and the legacy vote keys",
      "  --yes       actually delete; without it this is a dry run",
      "",
      `Studies: ${SLUGS.join(", ")}`,
    ].join("\n"),
  );
  process.exit(0);
}

const unknown = asked.filter((s) => !SLUGS.includes(s));
if (unknown.length > 0) {
  fail(`unknown study: ${unknown.join(", ")}\nKnown: ${SLUGS.join(", ")}`);
}

const targets = asked.length > 0 ? asked : SLUGS;

if (!URL_ || !TOKEN) {
  fail(
    "no Upstash credentials.\n" +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or the\n" +
      "KV_REST_API_* pair) in the environment or in .env.local — see\n" +
      ".env.example. Locally, `next dev` without credentials uses an\n" +
      "in-memory store instead, which is cleared by restarting it.",
  );
}

/* --- Redis ------------------------------------------------------------------ */

async function redis(...commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);

  const body = await res.json();
  return body.map((entry) => {
    if (entry.error) throw new Error(`Upstash: ${entry.error}`);
    return entry.result ?? null;
  });
}

/**
 * Every key matching a pattern.
 *
 * `SCAN` rather than `KEYS`, which blocks the server for the length of the
 * keyspace — a rule worth keeping even on a database this small, because the
 * habit is what survives into the one that isn't.
 */
async function scan(pattern) {
  const found = [];
  let cursor = "0";

  do {
    const [page] = await redis(["SCAN", cursor, "MATCH", pattern, "COUNT", 200]);
    cursor = String(page[0]);
    found.push(...page[1]);
  } while (cursor !== "0");

  return found;
}

/* --- The purge --------------------------------------------------------------- */

let removed = 0;

for (const slug of targets) {
  const keys = [`sy:s:${slug}:comments`, ...(await scan(`sy:s:${slug}:c:*:likes`))];
  if (alsoLikes) {
    keys.push(`sy:s:${slug}:likes`, `sy:s:${slug}:up`, `sy:s:${slug}:voters`);
  }

  /* What is actually there, so the report counts comments rather than keys —
     "3 comments" is the number the person running this is thinking in. */
  const [total, ...present] = await redis(
    ["LLEN", `sy:s:${slug}:comments`],
    ...keys.map((k) => ["EXISTS", k]),
  );

  const live = keys.filter((_, i) => Number(present[i]) === 1);
  const likes = alsoLikes ? await count(`sy:s:${slug}:likes`) : null;

  console.log(
    `${commit ? "purging" : "would purge"}  ${slug.padEnd(20)} ` +
      `${String(total).padStart(3)} comment(s)` +
      (likes === null ? "" : `, ${likes} like(s)`) +
      `  [${live.length} key(s)]`,
  );

  if (commit && live.length > 0) {
    await redis(["DEL", ...live]);
    removed += live.length;
  }
}

async function count(key) {
  const [n] = await redis(["SCARD", key]);
  return Number(n) || 0;
}

console.log(
  commit
    ? `\nDeleted ${removed} key(s). This cannot be undone.`
    : "\nDry run — nothing was deleted. Add --yes to commit.",
);

function fail(message) {
  console.error(`purge-engagement: ${message}`);
  process.exit(1);
}
