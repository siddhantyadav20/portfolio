import { addPropertyControls, ControlType } from "framer"
import { useState, useEffect, useRef } from "react"

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 520
 * @framerIntrinsicHeight 360
 */
export default function TerminalComponent({
    userName,
    hostName,
    skills,
    tools,
    projects,
    accentColor,
    bgColor,
}: {
    userName?: string
    hostName?: string
    skills?: string
    tools?: string
    projects?: string
    accentColor?: string
    bgColor?: string
}) {
    const user = userName || "siddhant"
    const host = hostName || "portfolio"
    const accentProp = accentColor || "#4ade80"
    const bgProp = bgColor || "#222222"

    // accent + bg live in state so the `theme` command can swap them at runtime
    const [accent, setAccent] = useState(accentProp)
    const [bg, setBg] = useState(bgProp)

    // keep state in sync if the values are edited on the Framer canvas
    useEffect(() => setAccent(accentProp), [accentProp])
    useEffect(() => setBg(bgProp), [bgProp])

    const skillList = (
        skills ||
        "User Research,Interaction Design,Design Systems,Prototyping,Visual Design,Motion Design"
    )
        .split(",")
        .map((s) => s.trim())
    const toolList = (
        tools || "Figma,Framer,Notion,Jira,Miro,Principle,Zeroheight"
    )
        .split(",")
        .map((t) => t.trim())
    const projectList = (
        projects ||
        "WIN Home Inspection:UX overhaul · task completion +40%,Mistry.Store:Design system 0→1 · served 3 designers,LikeMinds:Onboarding redesign · drop-off −28%"
    )
        .split(",")
        .map((p) => {
            const idx = p.indexOf(":")
            return {
                name: p.slice(0, idx).trim(),
                desc: p.slice(idx + 1).trim(),
            }
        })

    const SIDDHANT = [
        " ███████╗██╗██████╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗████████╗",
        " ██╔════╝██║██╔══██╗██╔══██╗██║  ██║██╔══██╗████╗  ██║╚══██╔══╝",
        " ███████╗██║██║  ██║██║  ██║███████║███████║██╔██╗ ██║   ██║   ",
        " ╚════██║██║██║  ██║██║  ██║██╔══██║██╔══██║██║╚██╗██║   ██║   ",
        " ███████║██║██████╔╝██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║   ",
        " ╚══════╝╚═╝╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝  ╚═╝  ",
    ]

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
        | "bootok"
    type Line = { kind: LineKind; text: string; href?: string; delay?: number }

    // ── theme presets (default uses the prop-driven values) ──
    const THEMES: Record<string, { accent: string; bg: string }> = {
        amber: { accent: "#f5a623", bg: "#1d1812" },
        matrix: { accent: "#22ff88", bg: "#05110a" },
        ice: { accent: "#38bdf8", bg: "#0c1620" },
        mono: { accent: "#e5e7eb", bg: "#1a1a1a" },
    }
    const THEME_LIST = ["default", "amber", "matrix", "ice", "mono"]

    const CMD_NAMES = [
        "help",
        "skills",
        "tools",
        "projects",
        "whoami",
        "contact",
        "theme",
        "clear",
    ]

    const HELP_OUTPUT: Line[] = [
        { kind: "blank", text: "" },
        { kind: "divider", text: "  ─────────────────────────────────────" },
        { kind: "label", text: "  commands" },
        { kind: "divider", text: "  ─────────────────────────────────────" },
        { kind: "item", text: "  skills     →  what I know" },
        { kind: "item", text: "  tools      →  what I use" },
        { kind: "item", text: "  projects   →  what I've shipped" },
        { kind: "item", text: "  whoami     →  about me" },
        { kind: "item", text: "  contact    →  let's connect" },
        { kind: "item", text: "  theme      →  switch colors" },
        { kind: "item", text: "  clear      →  reset" },
        { kind: "divider", text: "  ─────────────────────────────────────" },
        { kind: "hint", text: "  ⇥  tab to autocomplete" },
        { kind: "blank", text: "" },
    ]

    const COMMANDS: Record<string, Line[]> = {
        help: HELP_OUTPUT,
        skills: [
            { kind: "blank", text: "" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "label", text: "  skills" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            ...skillList.map((s, i) => ({
                kind: "item" as LineKind,
                text: `  ${String(i + 1).padStart(2, "0")}  ${s}`,
            })),
            { kind: "blank", text: "" },
            { kind: "hint", text: "  ↩  type 'help' to see all commands" },
            { kind: "blank", text: "" },
        ],
        tools: [
            { kind: "blank", text: "" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "label", text: "  tools" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            ...toolList.map((t, i) => ({
                kind: "item" as LineKind,
                text: `  ${String(i + 1).padStart(2, "0")}  ${t}`,
            })),
            { kind: "blank", text: "" },
            { kind: "hint", text: "  ↩  type 'help' to see all commands" },
            { kind: "blank", text: "" },
        ],
        projects: [
            { kind: "blank", text: "" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "label", text: "  projects" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            ...projectList.flatMap((p, i) => [
                { kind: "blank" as LineKind, text: "" },
                {
                    kind: "label" as LineKind,
                    text: `  [${String(i + 1).padStart(2, "0")}] ${p.name}`,
                },
                { kind: "item" as LineKind, text: `       ${p.desc}` },
            ]),
            { kind: "blank", text: "" },
            { kind: "hint", text: "  ↩  type 'help' to see all commands" },
            { kind: "blank", text: "" },
        ],
        whoami: [
            { kind: "blank", text: "" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "label", text: "  about" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "blank", text: "" },
            { kind: "item", text: "  Product/UX Designer · 4.5 yrs" },
            { kind: "item", text: "  Currently @ WIN Home Inspection" },
            { kind: "item", text: "  Based in India 🇮🇳" },
            { kind: "blank", text: "" },
            { kind: "label", text: "  Open to new opportunities ✦" },
            { kind: "blank", text: "" },
            { kind: "hint", text: "  ↩  type 'help' to see all commands" },
            { kind: "blank", text: "" },
        ],
        contact: [
            { kind: "blank", text: "" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "label", text: "  contact" },
            {
                kind: "divider",
                text: "  ─────────────────────────────────────",
            },
            { kind: "blank", text: "" },
            {
                kind: "link",
                text: "  ✉   siddhantyadav20@gmail.com",
                href: "mailto:siddhantyadav20@gmail.com",
            },
            {
                kind: "link",
                text: "  in  linkedin.com/in/siddhant-yadav",
                href: "https://linkedin.com/in/siddhant-yadav",
            },
            {
                kind: "link",
                text: "  ig  @designzoid_",
                href: "https://instagram.com/designzoid_",
            },
            { kind: "blank", text: "" },
            { kind: "hint", text: "  ↩  type 'help' to see all commands" },
            { kind: "blank", text: "" },
        ],
    }

    const BOOT_LINES: Line[] = [
        { kind: "boot", text: "  booting portfolio.sh", delay: 170 },
        {
            kind: "boot",
            text: "  loading modules  [████████████]  100%",
            delay: 200,
        },
        {
            kind: "boot",
            text: "  mounting  /skills  /tools  /projects",
            delay: 190,
        },
        { kind: "bootok", text: "  ready ✓", delay: 240 },
        { kind: "blank", text: "", delay: 120 },
    ]

    const WELCOME_LINES: Line[] = [
        ...SIDDHANT.map((t) => ({ kind: "ascii" as LineKind, text: t })),
        { kind: "blank", text: "" },
        {
            kind: "meta",
            text: "  Product/UX Designer  ·  4.5 yrs  ·  India 🇮🇳",
        },
        { kind: "blank", text: "" },
        { kind: "hint", text: "  type 'help' to get started  ↓" },
        { kind: "blank", text: "" },
    ]

    const [lines, setLines] = useState<Line[]>([])
    const [input, setInput] = useState("")
    const [history, setHistory] = useState<string[]>([])
    const [historyIdx, setHistoryIdx] = useState(-1)
    const [cursorOn, setCursorOn] = useState(true)
    const [shake, setShake] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const outputRef = useRef<HTMLDivElement>(null)

    // ── reveal engine: a queue that drains one line at a time ──
    const queueRef = useRef<Line[]>([])
    const drainingRef = useRef(false)
    const timersRef = useRef<number[]>([])
    const bootedRef = useRef(false)

    const gapFor = (l: Line) => {
        if (l.delay != null) return l.delay
        switch (l.kind) {
            case "boot":
                return 200
            case "bootok":
                return 240
            case "ascii":
                return 55
            case "cmd":
                return 150
            case "error":
                return 70
            case "blank":
                return 22
            default:
                return 34
        }
    }

    const clearTimers = () => {
        timersRef.current.forEach((t) => clearTimeout(t))
        timersRef.current = []
    }

    const drain = () => {
        if (queueRef.current.length === 0) {
            drainingRef.current = false
            return
        }
        const next = queueRef.current.shift() as Line
        setLines((prev) => [...prev, next])
        const id = window.setTimeout(drain, gapFor(next))
        timersRef.current.push(id)
    }

    const enqueue = (newLines: Line[]) => {
        queueRef.current.push(...newLines)
        if (!drainingRef.current) {
            drainingRef.current = true
            const id = window.setTimeout(drain, 0)
            timersRef.current.push(id)
        }
    }

    // boot sequence on mount
    useEffect(() => {
        if (bootedRef.current) return
        bootedRef.current = true
        enqueue([...BOOT_LINES, ...WELCOME_LINES])
        return () => clearTimers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // cursor blink
    useEffect(() => {
        const t = setInterval(() => setCursorOn((v) => !v), 530)
        return () => clearInterval(t)
    }, [])

    // scroll to bottom on new output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
    }, [lines])

    // ── small helpers: Levenshtein + nearest-match suggestion ──
    const lev = (a: string, b: string) => {
        const m = a.length
        const n = b.length
        const dp: number[][] = Array.from({ length: m + 1 }, () =>
            new Array(n + 1).fill(0)
        )
        for (let i = 0; i <= m; i++) dp[i][0] = i
        for (let j = 0; j <= n; j++) dp[0][j] = j
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                )
            }
        }
        return dp[m][n]
    }

    const suggest = (word: string, pool: string[]) => {
        let best: string | null = null
        let bestD = Infinity
        for (const c of pool) {
            const d = lev(word, c)
            if (d < bestD) {
                bestD = d
                best = c
            }
        }
        return bestD <= 2 ? best : null
    }

    const triggerShake = () => {
        setShake(true)
        setTimeout(() => setShake(false), 400)
    }

    // ── theme command ──
    const applyTheme = (name: string) => {
        if (name === "default") {
            setAccent(accentProp)
            setBg(bgProp)
        } else {
            setAccent(THEMES[name].accent)
            setBg(THEMES[name].bg)
        }
        enqueue([
            { kind: "blank", text: "" },
            { kind: "label", text: `  theme  →  ${name}  ✓` },
            { kind: "blank", text: "" },
        ])
    }

    const handleTheme = (arg?: string) => {
        if (!arg) {
            enqueue([
                { kind: "blank", text: "" },
                {
                    kind: "divider",
                    text: "  ─────────────────────────────────────",
                },
                { kind: "label", text: "  themes" },
                {
                    kind: "divider",
                    text: "  ─────────────────────────────────────",
                },
                ...THEME_LIST.map((t) => ({
                    kind: "item" as LineKind,
                    text: `  •  ${t}`,
                })),
                { kind: "blank", text: "" },
                { kind: "hint", text: "  ↩  e.g.  theme matrix" },
                { kind: "blank", text: "" },
            ])
            return
        }
        if (THEME_LIST.includes(arg)) {
            applyTheme(arg)
            return
        }
        const guess = suggest(arg, THEME_LIST)
        enqueue([
            { kind: "blank", text: "" },
            {
                kind: "error",
                text: guess
                    ? `  no theme '${arg}'  →  did you mean '${guess}'?`
                    : `  no theme '${arg}'  →  try 'theme'`,
            },
            { kind: "blank", text: "" },
        ])
        triggerShake()
    }

    const runCommand = (raw: string) => {
        const trimmed = raw.trim()
        setInput("")
        if (!trimmed) return

        const lower = trimmed.toLowerCase()
        const [base, arg] = lower.split(/\s+/)

        setHistory((h) => [trimmed, ...h])
        setHistoryIdx(-1)

        // echo what was typed
        enqueue([{ kind: "cmd", text: trimmed, delay: 150 }])

        if (base === "clear") {
            clearTimers()
            queueRef.current = []
            drainingRef.current = false
            setLines([])
            enqueue([...WELCOME_LINES])
            return
        }

        if (base === "theme") {
            handleTheme(arg)
            return
        }

        const output = COMMANDS[base]
        if (output) {
            enqueue(output)
        } else {
            const guess = suggest(base, CMD_NAMES)
            enqueue([
                { kind: "blank", text: "" },
                {
                    kind: "error",
                    text: guess
                        ? `  '${base}' not found  →  did you mean '${guess}'?`
                        : `  '${base}' not found  →  try 'help'`,
                },
                { kind: "blank", text: "" },
            ])
            triggerShake()
        }
    }

    const longestCommonPrefix = (arr: string[]) => {
        if (arr.length === 0) return ""
        let prefix = arr[0]
        for (const s of arr) {
            while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1)
        }
        return prefix
    }

    const handleTab = () => {
        const typed = input.trim().toLowerCase()
        if (!typed) return
        const matches = CMD_NAMES.filter((c) => c.startsWith(typed))
        if (matches.length === 1) {
            setInput(matches[0] + " ")
        } else if (matches.length > 1) {
            const prefix = longestCommonPrefix(matches)
            if (prefix.length > typed.length) setInput(prefix)
            enqueue([
                { kind: "cmd", text: typed, delay: 60 },
                { kind: "item", text: "  " + matches.join("   ") },
                { kind: "blank", text: "" },
            ])
        }
    }

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            runCommand(input)
        } else if (e.key === "Tab") {
            e.preventDefault()
            handleTab()
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            const next = Math.min(historyIdx + 1, history.length - 1)
            setHistoryIdx(next)
            setInput(history[next] || "")
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            const next = Math.max(historyIdx - 1, -1)
            setHistoryIdx(next)
            setInput(next === -1 ? "" : history[next] || "")
        }
    }

    // derived chrome shades from the active bg
    const shade = (hex: string, amt: number) => {
        const h = hex.replace("#", "")
        const full =
            h.length === 3
                ? h
                      .split("")
                      .map((c) => c + c)
                      .join("")
                : h
        const num = parseInt(full, 16)
        const clamp = (v: number) => Math.max(0, Math.min(255, v))
        const r = clamp((num >> 16) + amt)
        const g = clamp(((num >> 8) & 0xff) + amt)
        const b = clamp((num & 0xff) + amt)
        return `#${((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)}`
    }
    const titleBarBg = shade(bg, 16)
    const inputBarBg = shade(bg, -10)

    const getStyle = (kind: LineKind): React.CSSProperties => ({
        color: {
            ascii: accent,
            meta: "rgba(255,255,255,0.45)",
            divider: "rgba(255,255,255,0.15)",
            label: "#e2e8f0",
            item: "rgba(255,255,255,0.55)",
            link: "#cbd5e1",
            cmd: "#ffffff",
            error: "#f87171",
            hint: "rgba(255,255,255,0.25)",
            boot: "rgba(255,255,255,0.38)",
            bootok: accent,
            blank: "transparent",
        }[kind],
        fontSize: kind === "ascii" ? 8.5 : 12,
        lineHeight: kind === "blank" ? "8px" : "1.75",
        whiteSpace: "pre" as const,
        letterSpacing: kind === "ascii" ? 0.3 : 0.2,
        fontWeight: kind === "label" ? 600 : 400,
    })

    return (
        <div
            style={
                {
                    width: 520,
                    height: 360,
                    background: bg,
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily:
                        "'SF Mono','Fira Code','Cascadia Code','Roboto Mono',monospace",
                    boxShadow:
                        "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
                    cursor: "text",
                    userSelect: "none",
                    transition: "background 0.35s ease",
                    "--accent": accent,
                } as React.CSSProperties
            }
            onClick={() => {
                if (window.getSelection()?.toString()) return
                inputRef.current?.focus()
            }}
        >
            {/* ── Title bar ── */}
            <div
                style={{
                    flexShrink: 0,
                    background: titleBarBg,
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "background 0.35s ease",
                }}
            >
                <div style={{ display: "flex", gap: 7 }}>
                    {[
                        ["#ff5f57", "#ff5f5788"],
                        ["#febc2e", "#febc2e88"],
                        ["#28c840", "#28c84088"],
                    ].map(([c, s], i) => (
                        <div
                            key={i}
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: c,
                                boxShadow: `0 0 7px ${s}`,
                            }}
                        />
                    ))}
                </div>
                <div
                    style={{
                        flex: 1,
                        textAlign: "center",
                        color: "rgba(255,255,255,0.28)",
                        fontSize: 11,
                        letterSpacing: 0.5,
                    }}
                >
                    {user}@{host} — zsh
                </div>
                <div
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: accent,
                        boxShadow: `0 0 8px ${accent}`,
                        animation: "tPulse 2s ease-in-out infinite",
                    }}
                />
            </div>

            {/* ── Scrollable output ── */}
            <div
                ref={outputRef}
                style={{
                    flex: 1,
                    overflowY: "scroll",
                    padding: "14px 0 4px",
                    scrollbarWidth: "thin",
                    scrollbarColor: `rgba(255,255,255,0.08) transparent`,
                    userSelect: "text",
                }}
            >
                {lines.map((line, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            padding: "0 20px",
                        }}
                    >
                        {line.kind === "cmd" && (
                            <span
                                style={{
                                    color: accent,
                                    marginRight: 9,
                                    flexShrink: 0,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    userSelect: "none",
                                    textShadow: `0 0 8px ${accent}88`,
                                }}
                            >
                                ~$
                            </span>
                        )}
                        {line.href ? (
                            <a
                                href={line.href}
                                target="_blank"
                                rel="noreferrer"
                                className="tlink"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    ...getStyle(line.kind),
                                    textDecoration: "none",
                                    cursor: "pointer",
                                    borderBottom: `1px solid ${accent}44`,
                                }}
                            >
                                {line.text}
                            </a>
                        ) : (
                            <span style={getStyle(line.kind)}>{line.text}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Input bar ── */}
            <div
                style={{
                    flexShrink: 0,
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    padding: "9px 20px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: inputBarBg,
                    transition: "background 0.35s ease",
                    animation: shake ? "tShake 0.35s ease" : "none",
                }}
            >
                <span
                    style={{
                        color: accent,
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        textShadow: `0 0 10px ${accent}88`,
                        userSelect: "none",
                    }}
                >
                    ~$
                </span>
                <div
                    style={{
                        flex: 1,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        aria-label="terminal input"
                        style={{
                            flex: 1,
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#fff",
                            fontFamily: "inherit",
                            fontSize: 12,
                            caretColor: "transparent",
                            letterSpacing: 0.3,
                            userSelect: "text",
                        }}
                    />
                    {/* blinking cursor */}
                    <span
                        style={{
                            position: "absolute",
                            left: `${input.length * 7.25}px`,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 2,
                            height: 14,
                            background: accent,
                            opacity: cursorOn ? 1 : 0,
                            transition: "opacity 0.08s",
                            pointerEvents: "none",
                            boxShadow: `0 0 6px ${accent}`,
                        }}
                    />
                </div>
                {/* inline hint when empty */}
                {input === "" && (
                    <span
                        style={{
                            color: "rgba(255,255,255,0.14)",
                            fontSize: 11,
                            flexShrink: 0,
                            userSelect: "none",
                        }}
                    >
                        help · skills · projects · theme
                    </span>
                )}
            </div>

            <style>{`
                @keyframes tPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes tShake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-5px)}
                    60%{transform:translateX(5px)}
                    80%{transform:translateX(-3px)}
                }
                .tlink { transition: color 0.15s ease, border-color 0.15s ease; }
                .tlink:hover { color: var(--accent) !important; border-bottom-color: var(--accent) !important; }
                div::-webkit-scrollbar { width: 3px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
            `}</style>
        </div>
    )
}

addPropertyControls(TerminalComponent, {
    userName: {
        type: ControlType.String,
        title: "Username",
        defaultValue: "siddhant",
    },
    hostName: {
        type: ControlType.String,
        title: "Hostname",
        defaultValue: "portfolio",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#4ade80",
    },
    bgColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#222222",
    },
    skills: {
        type: ControlType.String,
        title: "Skills",
        defaultValue:
            "User Research,Interaction Design,Design Systems,Prototyping,Visual Design,Motion Design",
        displayTextArea: true,
    },
    tools: {
        type: ControlType.String,
        title: "Tools",
        defaultValue: "Figma,Framer,Notion,Jira,Miro,Principle,Zeroheight",
        displayTextArea: true,
    },
    projects: {
        type: ControlType.String,
        title: "Projects (name:desc,...)",
        defaultValue:
            "WIN Home Inspection:UX overhaul · task completion +40%,Mistry.Store:Design system 0→1 · served 3 designers,LikeMinds:Onboarding redesign · drop-off −28%",
        displayTextArea: true,
    },
})
