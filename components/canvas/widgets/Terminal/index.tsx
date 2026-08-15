"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { readTheme, serverTheme, subscribeTheme } from "@/lib/theme";
import { terminal as data } from "@/content/canvas";
import styles from "./Terminal.module.css";

/* ===========================================================================
   The terminal.

   Ported from references/canvas/Terminal.tsx — the reveal engine, the command
   set, the Levenshtein "did you mean", tab completion and the palette command
   are all the original's. What changed is the plumbing: the Framer property
   controls are gone, the content moved to content/canvas.ts, and ~400 lines
   of inline style objects became a stylesheet.

   One substantive change. The original hard-coded a dark shell and derived its
   chrome by lightening that hex at runtime. Here the default palette comes
   from the *site* theme, so the terminal is dark on the dark board and paper
   on the light one — and `theme <name>` still overrides it locally, because
   that command is the widget's own toy rather than a site preference.
   =========================================================================== */

type LineKind =
  | "ascii"
  | "meta"
  | "divider"
  | "label"
  | "item"
  | "link"
  | "cmd"
  | "error"
  | "blank"
  | "hint"
  | "boot"
  | "bootok";

type Line = { kind: LineKind; text: string; href?: string; delay?: number };

const RULE = "  ─────────────────────────────────────";
const BACK_HINT = "  ↩  type 'help' to see all commands";

const line = (kind: LineKind, text: string, extra?: Partial<Line>): Line => ({
  kind,
  text,
  ...extra,
});

/** Header block every command's output opens with. */
const heading = (label: string): Line[] => [
  line("blank", ""),
  line("divider", RULE),
  line("label", `  ${label}`),
  line("divider", RULE),
];

const numbered = (items: readonly string[]): Line[] =>
  items.map((s, i) => line("item", `  ${String(i + 1).padStart(2, "0")}  ${s}`));

const PALETTES = data.palettes;
const PALETTE_NAMES = ["default", ...Object.keys(PALETTES)];
const COMMANDS = [
  "help",
  "skills",
  "tools",
  "projects",
  "whoami",
  "contact",
  "theme",
  "clear",
] as const;

const OUTPUT: Record<string, Line[]> = {
  help: [
    ...heading("commands"),
    line("item", "  skills     →  what I know"),
    line("item", "  tools      →  what I use"),
    line("item", "  projects   →  what I've shipped"),
    line("item", "  whoami     →  about me"),
    line("item", "  contact    →  let's connect"),
    line("item", "  theme      →  switch colors"),
    line("item", "  clear      →  reset"),
    line("divider", RULE),
    line("hint", "  ⇥  tab to autocomplete"),
    line("blank", ""),
  ],
  skills: [
    ...heading("skills"),
    ...numbered(data.skills),
    line("blank", ""),
    line("hint", BACK_HINT),
    line("blank", ""),
  ],
  tools: [
    ...heading("tools"),
    ...numbered(data.tools),
    line("blank", ""),
    line("hint", BACK_HINT),
    line("blank", ""),
  ],
  projects: [
    ...heading("projects"),
    ...data.projects.flatMap((p, i) => [
      line("blank", ""),
      line("label", `  [${String(i + 1).padStart(2, "0")}] ${p.name}`),
      line("item", `       ${p.desc}`),
    ]),
    line("blank", ""),
    line("hint", BACK_HINT),
    line("blank", ""),
  ],
  whoami: [
    ...heading("about"),
    line("blank", ""),
    ...data.about.map((t) => line("item", t)),
    line("blank", ""),
    line("label", data.aboutNote),
    line("blank", ""),
    line("hint", BACK_HINT),
    line("blank", ""),
  ],
  contact: [
    ...heading("contact"),
    line("blank", ""),
    ...data.contact.map((c) => line("link", c.text, { href: c.href })),
    line("blank", ""),
    line("hint", BACK_HINT),
    line("blank", ""),
  ],
};

const BOOT: Line[] = [
  ...data.boot.map((t, i) => line("boot", t, { delay: [170, 200, 190][i] })),
  line("bootok", data.bootOk, { delay: 240 }),
  line("blank", "", { delay: 120 }),
];

const WELCOME: Line[] = [
  ...data.banner.map((t) => line("ascii", t)),
  line("blank", ""),
  line("meta", data.tagline),
  line("blank", ""),
  line("hint", "  type 'help' to get started  ↓"),
  line("blank", ""),
];

/** How long to wait after printing a line before printing the next. The whole
 *  illusion is here: a uniform delay reads as a progress bar, while boot lines
 *  pausing longer than list items reads as a machine doing work. */
function gapFor(l: Line) {
  if (l.delay != null) return l.delay;
  switch (l.kind) {
    case "boot":
      return 200;
    case "bootok":
      return 240;
    case "ascii":
      return 55;
    case "cmd":
      return 150;
    case "error":
      return 70;
    case "blank":
      return 22;
    default:
      return 34;
  }
}

/** Edit distance, for "did you mean". */
function levenshtein(a: string, b: string) {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/** Nearest command within two edits, or nothing. Two is the useful cut-off:
 *  it catches a typo and a missing letter, and stops short of suggesting
 *  "tools" for "help". */
function suggest(word: string, pool: readonly string[]) {
  let best: string | null = null;
  let bestD = Infinity;
  for (const c of pool) {
    const d = levenshtein(word, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= 2 ? best : null;
}

function commonPrefix(items: string[]) {
  if (items.length === 0) return "";
  let prefix = items[0];
  for (const s of items) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

export default function Terminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [shake, setShake] = useState(false);
  const [palette, setPalette] = useState<string | null>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  /* --- The reveal engine ---------------------------------------------------
     A queue drained one line at a time on a timer, rather than a chunk of
     output appearing at once. Everything printed goes through it, so a command
     typed during the boot sequence queues behind it instead of interleaving. */
  const queue = useRef<Line[]>([]);
  const draining = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const enqueue = useCallback((next: Line[]) => {
    function drain() {
      const item = queue.current.shift();
      if (!item) {
        draining.current = false;
        return;
      }
      setLines((prev) => [...prev, item]);
      timers.current.push(window.setTimeout(drain, gapFor(item)));
    }

    queue.current.push(...next);
    if (!draining.current) {
      draining.current = true;
      timers.current.push(window.setTimeout(drain, 0));
    }
  }, []);

  /**
   * Boot.
   *
   * Written to be idempotent rather than guarded by a "have I booted" ref. The
   * ref is the obvious move and it is wrong here: React 19 runs effects twice
   * in development, so the first pass boots and its cleanup clears the timers,
   * and the second pass sees the flag and returns without re-enqueuing —
   * leaving a terminal that has a prompt, a title bar, and no output at all.
   * That is exactly what it did before this comment existed.
   *
   * Resetting the buffer and booting again costs nothing and survives any
   * number of mounts.
   */
  useEffect(() => {
    // Only the refs need clearing. The double-invoke's cleanup runs before the
    // first `setTimeout(drain, 0)` can fire, so no line has been committed yet
    // and `lines` is still empty — but `queue` is a ref and survives, so
    // without this the second pass would boot into a queue that already held
    // one boot sequence and print it twice.
    queue.current = [];
    draining.current = false;
    enqueue([...BOOT, ...WELCOME]);
    return clearTimers;
  }, [enqueue, clearTimers]);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const wrong = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  }, []);

  const runTheme = useCallback(
    (arg?: string) => {
      if (!arg) {
        enqueue([
          ...heading("themes"),
          ...PALETTE_NAMES.map((t) => line("item", `  •  ${t}`)),
          line("blank", ""),
          line("hint", "  ↩  e.g.  theme matrix"),
          line("blank", ""),
        ]);
        return;
      }
      if (PALETTE_NAMES.includes(arg)) {
        setPalette(arg === "default" ? null : arg);
        enqueue([
          line("blank", ""),
          line("label", `  theme  →  ${arg}  ✓`),
          line("blank", ""),
        ]);
        return;
      }
      const guess = suggest(arg, PALETTE_NAMES);
      enqueue([
        line("blank", ""),
        line(
          "error",
          guess
            ? `  no theme '${arg}'  →  did you mean '${guess}'?`
            : `  no theme '${arg}'  →  try 'theme'`,
        ),
        line("blank", ""),
      ]);
      wrong();
    },
    [enqueue, wrong],
  );

  const run = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      setInput("");
      if (!trimmed) return;

      const [base, arg] = trimmed.toLowerCase().split(/\s+/);
      setHistory((h) => [trimmed, ...h]);
      setHistoryIdx(-1);
      enqueue([line("cmd", trimmed, { delay: 150 })]);

      if (base === "clear") {
        clearTimers();
        queue.current = [];
        draining.current = false;
        setLines([]);
        enqueue([...WELCOME]);
        return;
      }
      if (base === "theme") {
        runTheme(arg);
        return;
      }
      const out = OUTPUT[base];
      if (out) {
        enqueue(out);
        return;
      }
      const guess = suggest(base, COMMANDS);
      enqueue([
        line("blank", ""),
        line(
          "error",
          guess
            ? `  '${base}' not found  →  did you mean '${guess}'?`
            : `  '${base}' not found  →  try 'help'`,
        ),
        line("blank", ""),
      ]);
      wrong();
    },
    [clearTimers, enqueue, runTheme, wrong],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Everything typed in here belongs to the terminal, not to the canvas
    // behind it — the camera's own handler already defers to a focused input,
    // and this stops Enter or the arrows escaping upward as well.
    e.stopPropagation();

    if (e.key === "Enter") {
      run(input);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const typed = input.trim().toLowerCase();
      if (!typed) return;
      const matches = COMMANDS.filter((c) => c.startsWith(typed));
      if (matches.length === 1) {
        setInput(matches[0] + " ");
      } else if (matches.length > 1) {
        const prefix = commonPrefix([...matches]);
        if (prefix.length > typed.length) setInput(prefix);
        enqueue([
          line("cmd", typed, { delay: 60 }),
          line("item", "  " + matches.join("   ")),
          line("blank", ""),
        ]);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setInput(history[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? "" : (history[next] ?? ""));
    }
  }

  /* Which ink set the shell wears. Normally the site theme; a palette command
     can override it, because `theme matrix` is deliberately a dark terminal
     even on a light board and its ink has to follow the background it picked
     rather than the page's. */
  const local = palette
    ? PALETTES[palette as keyof typeof PALETTES][theme]
    : null;

  return (
    <div
      className={`${styles.shell} squircle`}
      // The canvas checks for this before starting a drag, so clicking into
      // the terminal focuses it rather than panning the board.
      data-canvas-interactive=""
      data-tone={local ? local.tone : undefined}
      style={
        local
          ? ({
              "--term-bg": local.bg,
              "--term-accent": local.accent,
            } as React.CSSProperties)
          : undefined
      }
      onClick={() => {
        // Don't steal focus mid-selection — copying a line out is a reasonable
        // thing to want to do with a terminal.
        if (window.getSelection()?.toString()) return;
        inputRef.current?.focus();
      }}
    >
      <div className={styles.bar}>
        <span className={styles.lights} aria-hidden="true">
          <i data-light="red" />
          <i data-light="amber" />
          <i data-light="green" />
        </span>
        <span className={styles.title}>
          {data.user}@{data.host} — zsh
        </span>
        <span className={styles.pulse} aria-hidden="true" />
      </div>

      <div className={styles.output} ref={outputRef}>
        {lines.map((l, i) => (
          <div key={i} className={styles.row}>
            {l.kind === "cmd" && <span className={styles.prompt}>~$</span>}
            {l.href ? (
              <a
                className={styles.link}
                data-kind={l.kind}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {l.text}
              </a>
            ) : (
              <span className={styles.line} data-kind={l.kind}>
                {l.text}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.inputBar} data-shake={shake ? "" : undefined}>
        <span className={styles.prompt}>~$</span>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          aria-label="Terminal input"
        />
      </div>
    </div>
  );
}
