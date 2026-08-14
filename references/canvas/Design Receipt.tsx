import { addPropertyControls, ControlType } from "framer"
import { useState, useEffect, useMemo } from "react"

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 280
 * @framerIntrinsicHeight 720
 */

// ─── Single source of truth for defaults (keeps props + controls in sync) ───
const DEFAULTS = {
    name: "Siddhant Yadav",
    role: "Product/UX Designer",
    yearsExp: 4.5,
    // Optional ":level" (1–5) per skill tunes its "price". Omit and it defaults to 3.
    skills: "User Research:5, Interaction Design:5, Design Systems:4, Prototyping:4, Visual Design:3",
    tools: "Figma, Framer, Notion, Jira, Miro",
    orderNumber: "2024-0042",
    portfolioUrl: "",
    paperColor: "#222222",
    inkColor: "#d9d9d9",
    stampColor: "#e8554a",
}

const WIDTH = 280
const PAD = 24
const EDGE_H = 24 // height of the torn-edge SVGs

// ─── Deterministic randomness (so every person gets a stable, unique receipt) ─
function hashString(str: string): number {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function mulberry32(seed: number) {
    let a = seed >>> 0
    return function () {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ─── Color helpers so the receipt themes from its own paper/ink colors ───────
function parseHex(hex: string) {
    let h = hex.replace("#", "")
    if (h.length === 3)
        h = h
            .split("")
            .map((c) => c + c)
            .join("")
    const n = parseInt(h, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function hexToRgba(hex: string, a: number) {
    const { r, g, b } = parseHex(hex)
    return `rgba(${r},${g},${b},${a})`
}

function isDarkColor(hex: string) {
    const { r, g, b } = parseHex(hex)
    return 0.299 * r + 0.587 * g + 0.114 * b < 128
}

// ─── Torn paper edge: jagged on one side, flat on the other, filled w/ paper ──
function tornEdgePath(seed: number, top: boolean): string {
    const rand = mulberry32(seed)
    const teeth = 38
    const step = WIDTH / teeth
    const pts: string[] = []
    for (let i = 0; i <= teeth; i++) {
        const x = +(i * step).toFixed(1)
        const y = top
            ? +(rand() * 7).toFixed(1)
            : +(EDGE_H - rand() * 7).toFixed(1)
        pts.push(`L${x},${y}`)
    }
    return top
        ? `M0,${EDGE_H} ${pts.join(" ")} L${WIDTH},${EDGE_H} Z`
        : `M0,0 ${pts.join(" ")} L${WIDTH},0 Z`
}

// ─── Build a Code128-flavoured barcode pattern from the order number ─────────
function buildBars(seedStr: string) {
    const rand = mulberry32(hashString(seedStr))
    const bars: { w: number; ink: boolean }[] = []
    let total = 0
    while (total < WIDTH - PAD * 2) {
        const w = 1 + Math.floor(rand() * 3) // 1–3px modules
        bars.push({ w, ink: bars.length % 2 === 0 })
        total += w
    }
    return bars
}

// ─── Parse skills into priced "line items" ───────────────────────────────────
function buildItems(skills: string, seedStr: string) {
    const rand = mulberry32(hashString(seedStr))
    return skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((raw) => {
            const [labelPart, lvlPart] = raw.split(":")
            const label = labelPart.trim()
            let level = parseInt(lvlPart, 10)
            if (isNaN(level)) level = 3
            level = Math.max(1, Math.min(5, level))
            // Higher proficiency = higher "price". Jittered so equal levels differ.
            const price = level * 2.25 + rand() * 1.8 + 0.49
            return { label, level, price }
        })
}

// ─── Presentational helpers (hoisted so they aren't remounted every render) ──
function Divider({ dashed = false }: { dashed?: boolean }) {
    return (
        <div
            aria-hidden
            style={{
                borderTop: dashed
                    ? "1.5px dashed currentColor"
                    : "1.5px solid currentColor",
                opacity: dashed ? 0.25 : 0.2,
                margin: "10px 0",
            }}
        />
    )
}

function LeaderRow({
    label,
    value,
    bold = false,
    size = 11,
}: {
    label: string
    value: string
    bold?: boolean
    size?: number
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 6,
                marginBottom: 3,
                fontWeight: bold ? 600 : 400,
                fontSize: size,
            }}
        >
            <span style={{ whiteSpace: "nowrap", opacity: bold ? 1 : 0.85 }}>
                {label}
            </span>
            <span
                aria-hidden
                style={{
                    flex: 1,
                    borderBottom: "1.5px dotted currentColor",
                    opacity: 0.35,
                    transform: "translateY(-4px)",
                }}
            />
            <span style={{ whiteSpace: "nowrap" }}>{value}</span>
        </div>
    )
}

function SectionLabel({ children }: { children: string }) {
    return (
        <div
            style={{
                fontWeight: 600,
                letterSpacing: 1,
                fontSize: 9,
                opacity: 0.5,
                marginBottom: 6,
            }}
        >
            {children}
        </div>
    )
}

export default function ReceiptComponent(props: {
    name?: string
    role?: string
    skills?: string
    tools?: string
    yearsExp?: number
    orderNumber?: string
    portfolioUrl?: string
    paperColor?: string
    inkColor?: string
    stampColor?: string
}) {
    const name = props.name || DEFAULTS.name
    const role = props.role || DEFAULTS.role
    const exp = props.yearsExp ?? DEFAULTS.yearsExp
    const order = props.orderNumber || DEFAULTS.orderNumber
    const portfolioUrl = props.portfolioUrl || DEFAULTS.portfolioUrl
    const paper = props.paperColor || DEFAULTS.paperColor
    const ink = props.inkColor || DEFAULTS.inkColor
    const stamp = props.stampColor || DEFAULTS.stampColor
    const isDark = isDarkColor(paper)
    // Ink dries darker on light paper (multiply) and lighter on dark paper (screen)
    const inkBlend = isDark ? "screen" : "multiply"

    const items = useMemo(
        () => buildItems(props.skills || DEFAULTS.skills, name),
        [props.skills, name]
    )
    const toolList = useMemo(
        () =>
            (props.tools || DEFAULTS.tools)
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
        [props.tools]
    )
    const subtotal = items.reduce((sum, it) => sum + it.price, 0)

    const seed = useMemo(() => hashString(order + name), [order, name])
    const bars = useMemo(() => buildBars(order + name), [order, name])

    // ─── Live clock ──────────────────────────────────────────────────────────
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])
    const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
    const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    })

    // ─── Print-out animation (respects prefers-reduced-motion) ────────────────
    const [progress, setProgress] = useState(0)
    const [stamped, setStamped] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [printKey, setPrintKey] = useState(0) // bump to replay on click

    useEffect(() => {
        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        if (reduce) {
            setProgress(1)
            setStamped(true)
            return
        }
        setProgress(0)
        setStamped(false)
        const start = performance.now()
        const DURATION = 1400
        let raf = 0
        const tick = (t: number) => {
            const p = Math.min((t - start) / DURATION, 1)
            setProgress(1 - Math.pow(1 - p, 3)) // ease-out cubic
            if (p < 1) raf = requestAnimationFrame(tick)
            else setStamped(true)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [printKey])

    const printing = progress < 1

    return (
        <div
            role="article"
            aria-label={`Design receipt for ${name}, ${role}`}
            onClick={() => setPrintKey((k) => k + 1)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                fontFamily: "'Outfit', 'Courier', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                color: ink,
                position: "relative",
                width: WIDTH,
                cursor: "pointer",
                // The cut line that "prints" the receipt out, top to bottom
                clipPath: `inset(0 0 ${(1 - progress) * 100}% 0)`,
                filter: hovered
                    ? "drop-shadow(0 10px 26px rgba(0,0,0,0.20))"
                    : "drop-shadow(0 3px 8px rgba(0,0,0,0.12))",
                transform: `rotate(-1.2deg) translateY(${hovered ? -3 : 0}px)`,
                transition: "filter 0.3s ease, transform 0.3s ease",
            }}
        >
            {/* Moving printer head while the receipt feeds out */}
            {printing && (
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: `${progress * 100}%`,
                        height: 2,
                        background: "currentColor",
                        boxShadow: "0 0 6px 1px currentColor",
                        opacity: 0.6,
                        zIndex: 5,
                    }}
                />
            )}

            {/* Torn top edge */}
            <svg
                width={WIDTH}
                height={EDGE_H}
                viewBox={`0 0 ${WIDTH} ${EDGE_H}`}
                aria-hidden
                style={{ display: "block", marginBottom: -1 }}
            >
                <path d={tornEdgePath(seed, true)} fill={paper} />
            </svg>

            {/* Receipt body */}
            <div
                style={{
                    background: paper,
                    padding: `4px ${PAD}px 16px`,
                    position: "relative",
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, ${hexToRgba(
                        ink,
                        0.04
                    )} 19px, ${hexToRgba(ink, 0.04)} 20px)`,
                }}
            >
                {/* Subtle paper grain */}
                <svg
                    aria-hidden
                    width="100%"
                    height="100%"
                    style={{
                        position: "absolute",
                        inset: 0,
                        opacity: isDark ? 0.1 : 0.06,
                        mixBlendMode: inkBlend,
                        pointerEvents: "none",
                    }}
                >
                    <filter id={`grain-${seed}`}>
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.9"
                            numOctaves="2"
                        />
                    </filter>
                    <rect
                        width="100%"
                        height="100%"
                        filter={`url(#grain-${seed})`}
                    />
                </svg>

                {/* ── Header ── */}
                <div
                    style={{
                        textAlign: "center",
                        marginBottom: 12,
                        paddingTop: 4,
                    }}
                >
                    <div
                        style={{
                            fontSize: 9,
                            letterSpacing: 3,
                            opacity: 0.5,
                            marginBottom: 4,
                        }}
                    >
                        ★ ★ ★
                    </div>
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 600,
                            letterSpacing: 1,
                            lineHeight: 1.2,
                        }}
                    >
                        DESIGN RECEIPT
                    </div>
                    <div
                        style={{
                            fontSize: 9,
                            letterSpacing: 2,
                            opacity: 0.55,
                            marginTop: 3,
                        }}
                    >
                        EST. IN THE PIXELS
                    </div>
                </div>

                <Divider />

                {/* ── Order info ── */}
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>
                    ORDER #{order}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 8 }}>
                    {dateStr} · {timeStr}
                </div>

                <Divider dashed />

                {/* ── Name / role ── */}
                <div style={{ marginBottom: 8 }}>
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: 13,
                            letterSpacing: 0.5,
                        }}
                    >
                        {name}
                    </div>
                    <div style={{ opacity: 0.65, fontSize: 10 }}>{role}</div>
                </div>

                <Divider dashed />

                {/* ── Skills as priced line items ── */}
                <div style={{ marginBottom: 6 }}>
                    <SectionLabel>ITEMS</SectionLabel>
                    {items.map((it, i) => (
                        <LeaderRow
                            key={i}
                            label={it.label}
                            value={`$${it.price.toFixed(2)}`}
                        />
                    ))}
                </div>

                <Divider dashed />

                {/* ── Tools ── */}
                <div style={{ marginBottom: 6 }}>
                    <SectionLabel>TOOLS USED</SectionLabel>
                    {toolList.map((tool, i) => (
                        <LeaderRow key={i} label={tool} value="daily" />
                    ))}
                </div>

                <Divider />

                {/* ── Stats ── */}
                <LeaderRow label="YEARS EXPERIENCE" value={`${exp} yrs`} bold />
                <LeaderRow label="PROJECTS SHIPPED" value="12+" bold />
                <LeaderRow label="COFFEE CONSUMED" value="∞" bold />

                <Divider />

                {/* ── Totals ── */}
                <LeaderRow
                    label="SUBTOTAL"
                    value={`$${subtotal.toFixed(2)}`}
                    size={11}
                />
                <LeaderRow label="CREATIVITY TAX" value="WAIVED" size={11} />
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        fontSize: 14,
                        fontWeight: 600,
                        marginTop: 6,
                    }}
                >
                    <span>TOTAL XP</span>
                    <span>
                        <span
                            style={{
                                fontSize: 10,
                                opacity: 0.4,
                                textDecoration: "line-through",
                                marginRight: 6,
                            }}
                        >
                            ${subtotal.toFixed(2)}
                        </span>
                        PRICELESS
                    </span>
                </div>

                {/* ── Stamp ── */}
                <div
                    aria-label="Open to work"
                    style={{
                        position: "absolute",
                        right: 14,
                        top: "63%",
                        color: stamp,
                        border: `2.5px solid ${stamp}`,
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textAlign: "center",
                        lineHeight: 1.1,
                        opacity: stamped ? (isDark ? 0.9 : 0.82) : 0,
                        mixBlendMode: inkBlend,
                        pointerEvents: "none",
                        transform: `rotate(-12deg) scale(${stamped ? 1 : 1.6})`,
                        transition:
                            "transform 0.22s cubic-bezier(0.2,1.5,0.4,1), opacity 0.12s ease",
                    }}
                >
                    OPEN
                    <br />
                    TO WORK
                </div>

                <Divider dashed />

                {/* ── Footer ── */}
                <div
                    style={{
                        textAlign: "center",
                        fontSize: 9,
                        opacity: 0.5,
                        lineHeight: 1.8,
                        letterSpacing: 0.5,
                    }}
                >
                    <div>THANK YOU FOR VISITING</div>
                    <div>NO RETURNS · NO REFUNDS</div>
                    <div style={{ marginTop: 6, letterSpacing: 2 }}>★ ★ ★</div>
                </div>

                {/* ── Barcode (deterministic; scannable-looking link if a URL is set) ── */}
                <a
                    href={portfolioUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={portfolioUrl ? "Open portfolio" : "Barcode"}
                    style={{
                        display: "block",
                        marginTop: 14,
                        textDecoration: "none",
                        color: "inherit",
                        cursor: portfolioUrl ? "pointer" : "default",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "flex-end",
                            height: 44,
                        }}
                    >
                        {bars.map((bar, i) => (
                            <div
                                key={i}
                                style={{
                                    width: bar.w,
                                    height: 44,
                                    background: bar.ink
                                        ? "currentColor"
                                        : "transparent",
                                    opacity: 0.8,
                                }}
                            />
                        ))}
                    </div>
                    <div
                        style={{
                            textAlign: "center",
                            fontSize: 8,
                            opacity: 0.45,
                            marginTop: 4,
                            letterSpacing: 3,
                        }}
                    >
                        {order.replace(/-/g, "")}00
                    </div>
                    {portfolioUrl && (
                        <div
                            style={{
                                textAlign: "center",
                                fontSize: 8,
                                opacity: 0.55,
                                letterSpacing: 2,
                                marginTop: 2,
                            }}
                        >
                            ↑ SCAN FOR PORTFOLIO ↑
                        </div>
                    )}
                </a>
            </div>

            {/* Torn bottom edge */}
            <svg
                width={WIDTH}
                height={EDGE_H}
                viewBox={`0 0 ${WIDTH} ${EDGE_H}`}
                aria-hidden
                style={{ display: "block", marginTop: -1 }}
            >
                <path d={tornEdgePath(seed + 1, false)} fill={paper} />
            </svg>
        </div>
    )
}

addPropertyControls(ReceiptComponent, {
    name: {
        type: ControlType.String,
        title: "Name",
        defaultValue: DEFAULTS.name,
    },
    role: {
        type: ControlType.String,
        title: "Role",
        defaultValue: DEFAULTS.role,
    },
    yearsExp: {
        type: ControlType.Number,
        title: "Years Exp",
        defaultValue: DEFAULTS.yearsExp,
        step: 0.5,
    },
    skills: {
        type: ControlType.String,
        title: "Skills",
        description: "Comma separated. Add :1–5 to set proficiency (price).",
        defaultValue: DEFAULTS.skills,
        displayTextArea: true,
    },
    tools: {
        type: ControlType.String,
        title: "Tools",
        description: "Comma separated.",
        defaultValue: DEFAULTS.tools,
    },
    orderNumber: {
        type: ControlType.String,
        title: "Order #",
        defaultValue: DEFAULTS.orderNumber,
    },
    portfolioUrl: {
        type: ControlType.Link,
        title: "Portfolio URL",
    },
    paperColor: {
        type: ControlType.Color,
        title: "Paper",
        defaultValue: DEFAULTS.paperColor,
    },
    inkColor: {
        type: ControlType.Color,
        title: "Ink",
        defaultValue: DEFAULTS.inkColor,
    },
    stampColor: {
        type: ControlType.Color,
        title: "Stamp",
        defaultValue: DEFAULTS.stampColor,
    },
})
