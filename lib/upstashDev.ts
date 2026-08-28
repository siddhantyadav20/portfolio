import "server-only";

/* ===========================================================================
   A Redis-shaped thing that lives in this process, for development only.

   Without Upstash credentials the engagement block renders as "not connected"
   — which is the right thing for a visitor and useless for building it. You
   cannot see a thread page, a like toggle, or a rate limit fire against a
   store that isn't there, and the alternative to this file is provisioning a
   database before you can look at a comment box.

   It is deliberately small and deliberately unreachable from production:
   `lib/upstash.ts` only reaches for it when `NODE_ENV !== "production"` AND no
   credentials are set, and it says so in the server log the first time. It
   holds everything in a Map, so it empties on every restart. That is a
   feature — a dev store that accumulates is a dev store you start trusting.

   Only the commands `lib/engagementStore.ts` actually issues are implemented.
   Anything else throws by name rather than returning a plausible answer,
   because a silent wrong answer here would be debugged as a bug in the store
   above it.
   =========================================================================== */

type Entry =
  | { kind: "string"; value: string; expires?: number }
  | { kind: "set"; value: Set<string> }
  | { kind: "list"; value: string[] }
  | { kind: "hash"; value: Map<string, string> };

/**
 * Hung off `globalThis`, not held in a module-level `const`.
 *
 * Next does not give the route handler and the Server Actions the same module
 * instance — they are built into different graphs — so a plain module-level
 * Map is two Maps, and a comment written through the action was invisible to
 * the route that reads the thread. It looked exactly like a store that drops
 * writes. One global, keyed by a symbol so nothing else can collide with it,
 * and both graphs see the same data.
 *
 * It also survives the module reloads that HMR does on every save, which is
 * the difference between a thread you can build against and one that empties
 * whenever you touch a file.
 */
const GLOBAL = Symbol.for("sy.upstash.dev");

type Host = typeof globalThis & { [GLOBAL]?: Map<string, Entry> };

const store: Map<string, Entry> = ((globalThis as Host)[GLOBAL] ??= new Map());

function live(key: string): Entry | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.kind === "string" && entry.expires && entry.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

function asSet(key: string): Set<string> {
  const entry = live(key);
  if (entry?.kind === "set") return entry.value;
  const value = new Set<string>();
  store.set(key, { kind: "set", value });
  return value;
}

function asList(key: string): string[] {
  const entry = live(key);
  if (entry?.kind === "list") return entry.value;
  const value: string[] = [];
  store.set(key, { kind: "list", value });
  return value;
}

export function devRedis(
  commands: readonly (readonly (string | number)[])[],
): readonly unknown[] {
  return commands.map((command) => {
    const [name, ...args] = command;
    const op = String(name).toUpperCase();
    const key = String(args[0] ?? "");

    switch (op) {
      /* --- Sets: the like --- */
      case "SADD": {
        const set = asSet(key);
        let added = 0;
        for (const member of args.slice(1)) {
          if (!set.has(String(member))) {
            set.add(String(member));
            added += 1;
          }
        }
        return added;
      }
      case "SREM": {
        const set = asSet(key);
        return set.delete(String(args[1])) ? 1 : 0;
      }
      case "SCARD":
        return asSet(key).size;
      case "SISMEMBER":
        return asSet(key).has(String(args[1])) ? 1 : 0;

      /* --- Lists: the thread --- */
      case "LPUSH": {
        const list = asList(key);
        list.unshift(String(args[1]));
        return list.length;
      }
      case "LLEN":
        return asList(key).length;
      case "LRANGE": {
        const list = asList(key);
        const start = Number(args[1]);
        const stop = Number(args[2]);
        // Redis's stop is inclusive, and -1 means "to the end".
        return list.slice(start, stop < 0 ? undefined : stop + 1);
      }
      case "LTRIM": {
        const list = asList(key);
        const kept = list.slice(Number(args[1]), Number(args[2]) + 1);
        store.set(key, { kind: "list", value: kept });
        return "OK";
      }

      /* --- Hashes: only ever read, and only the legacy keys --- */
      case "HLEN": {
        const entry = live(key);
        return entry?.kind === "hash" ? entry.value.size : 0;
      }
      case "HGETALL": {
        const entry = live(key);
        if (entry?.kind !== "hash") return [];
        return [...entry.value].flat();
      }

      /* --- Strings: the rate limiter --- */
      case "INCR": {
        const entry = live(key);
        const next = (entry?.kind === "string" ? Number(entry.value) || 0 : 0) + 1;
        store.set(key, {
          kind: "string",
          value: String(next),
          expires: entry?.kind === "string" ? entry.expires : undefined,
        });
        return next;
      }
      case "EXPIRE": {
        const entry = live(key);
        if (entry?.kind !== "string") return 0;
        // `NX` — only when there is no expiry yet, which is how the limiter
        // sets the window on the first hit and not on every one after it.
        if (args[2] === "NX" && entry.expires) return 0;
        entry.expires = Date.now() + Number(args[1]) * 1000;
        return 1;
      }
      case "GET": {
        const entry = live(key);
        return entry?.kind === "string" ? entry.value : null;
      }
      case "TTL": {
        const entry = live(key);
        // Redis's own answers: -2 for a key that is not there, -1 for one with
        // no expiry, seconds otherwise. The limiter branches on all three.
        if (!entry) return -2;
        if (entry.kind !== "string" || !entry.expires) return -1;
        return Math.max(0, Math.ceil((entry.expires - Date.now()) / 1000));
      }

      default:
        throw new Error(`[upstash-dev] ${op} is not implemented`);
    }
  });
}

/** Drops everything. Exported for tests, which must not inherit each other's
 *  state through a module-level Map. */
export function devRedisReset(): void {
  store.clear();
}
