import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef, useState } from "react"

// CommandPalette
// Linear/Raycast-style command palette (Cmd/Ctrl + K) plus a "?" keyboard
// shortcuts sheet. Drives the canvas through window.CanvasAPI and the
// "canvas:confetti" event. Place once on the Home page.

type Item = {
    id: string
    label: string
    hint?: string
    group: string
    keywords?: string
    run: () => void
}

export default function CommandPalette(props) {
    const { email, resumeUrl, accent } = props
    const [open, setOpen] = useState(false)
    const [help, setHelp] = useState(false)
    const [q, setQ] = useState("")
    const [idx, setIdx] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    const api = () =>
        typeof window !== "undefined" ? (window as any).CanvasAPI : null
    const go = (path: string) => {
        if (typeof window !== "undefined") window.location.assign(path)
    }
    const confetti = () => {
        if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("canvas:confetti"))
    }
    const copyEmail = () => {
        try {
            navigator.clipboard.writeText(email)
        } catch (e) {}
    }

    const items: Item[] = [
        {
            id: "home",
            label: "Go to Home",
            group: "Navigate",
            keywords: "start canvas",
            run: () => go("/"),
        },
        {
            id: "projects",
            label: "Go to Projects",
            group: "Navigate",
            keywords: "work case study",
            run: () => go("/projects"),
        },
        {
            id: "about",
            label: "Go to About",
            group: "Navigate",
            keywords: "bio me",
            run: () => go("/about"),
        },
        {
            id: "craft",
            label: "Go to Craft",
            group: "Navigate",
            keywords: "experiments play",
            run: () => go("/craft"),
        },
        {
            id: "chess",
            label: "Play Chess",
            group: "Navigate",
            keywords: "game",
            run: () => go("/chess"),
        },
        {
            id: "reset",
            label: "Reset view",
            hint: "R",
            group: "Canvas",
            keywords: "center fit recenter",
            run: () => api() && api().reset(),
        },
        {
            id: "launch",
            label: "Lift off",
            hint: "Space",
            group: "Canvas",
            keywords: "rocket fly blast",
            run: () => api() && api().launch(),
        },
        {
            id: "zoomin",
            label: "Zoom in",
            hint: "+",
            group: "Canvas",
            keywords: "scale closer",
            run: () => api() && api().zoomIn(),
        },
        {
            id: "zoomout",
            label: "Zoom out",
            hint: "−",
            group: "Canvas",
            keywords: "scale farther",
            run: () => api() && api().zoomOut(),
        },
        {
            id: "confetti",
            label: "Drop confetti",
            hint: "C",
            group: "Canvas",
            keywords: "celebrate party",
            run: confetti,
        },
        {
            id: "email",
            label: "Copy email",
            group: "Connect",
            keywords: "mail contact reach",
            run: copyEmail,
        },
        {
            id: "resume",
            label: "Open résumé",
            group: "Connect",
            keywords: "cv work pdf",
            run: () => {
                if (typeof window !== "undefined")
                    window.open(resumeUrl, "_blank")
            },
        },
        {
            id: "help",
            label: "Keyboard shortcuts",
            hint: "?",
            group: "Connect",
            keywords: "keys help cheatsheet",
            run: () => {
                setOpen(false)
                setHelp(true)
            },
        },
    ]

    const filtered = items.filter((it) => {
        if (!q) return true
        const s = (it.label + " " + (it.keywords || "")).toLowerCase()
        return q
            .toLowerCase()
            .split(" ")
            .every((w) => s.includes(w))
    })

    useEffect(() => {
        if (typeof window === "undefined") return
        const editable = () => {
            const a = document.activeElement as any
            return (
                a &&
                a !== inputRef.current &&
                (a.tagName === "INPUT" ||
                    a.tagName === "TEXTAREA" ||
                    a.isContentEditable)
            )
        }
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
                e.preventDefault()
                setHelp(false)
                setOpen((o) => !o)
                return
            }
            if (e.key === "Escape") {
                setOpen(false)
                setHelp(false)
                return
            }
            if (!open && !help && e.key === "?" && !editable()) {
                e.preventDefault()
                setHelp(true)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, help])

    useEffect(() => {
        if (open) {
            setQ("")
            setIdx(0)
            setTimeout(() => inputRef.current && inputRef.current.focus(), 30)
        }
    }, [open])

    useEffect(() => setIdx(0), [q])

    const run = (it?: Item) => {
        const target = it || filtered[idx]
        if (!target) return
        setOpen(false)
        target.run()
    }

    const onListKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setIdx((i) => Math.min(filtered.length - 1, i + 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setIdx((i) => Math.max(0, i - 1))
        } else if (e.key === "Enter") {
            e.preventDefault()
            run()
        }
    }

    // ---- styling ----
    const css = `
    @keyframes cpIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
    @keyframes cpFade{from{opacity:0}to{opacity:1}}
    .cp-input::placeholder{color:rgba(255,255,255,.34)}
    .cp-row{transition:background .12s ease}
    `
    const overlay: React.CSSProperties = {
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "rgba(10,11,13,.46)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "cpFade .16s ease",
        fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }
    const panel: React.CSSProperties = {
        marginTop: "16vh",
        width: "min(560px, 92vw)",
        background: "rgba(30,32,37,.86)",
        border: "1px solid rgba(255,255,255,.09)",
        borderRadius: 16,
        boxShadow:
            "0 24px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05)",
        overflow: "hidden",
        animation: "cpIn .2s cubic-bezier(.22,1,.36,1)",
    }

    let lastGroup = ""

    return (
        <>
            <style>{css}</style>

            {open && (
                <div style={overlay} onMouseDown={() => setOpen(false)}>
                    <div style={panel} onMouseDown={(e) => e.stopPropagation()}>
                        <input
                            ref={inputRef}
                            className="cp-input"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={onListKey}
                            placeholder="Type a command or search…"
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "18px 20px",
                                fontSize: 16,
                                color: "#fff",
                                background: "transparent",
                                border: "none",
                                borderBottom: "1px solid rgba(255,255,255,.07)",
                                outline: "none",
                            }}
                        />
                        <div
                            style={{
                                maxHeight: 360,
                                overflowY: "auto",
                                padding: "8px 8px 10px",
                            }}
                        >
                            {filtered.length === 0 && (
                                <div
                                    style={{
                                        padding: "22px 16px",
                                        color: "rgba(255,255,255,.4)",
                                        fontSize: 14,
                                    }}
                                >
                                    No matches. Try “projects” or “confetti”.
                                </div>
                            )}
                            {filtered.map((it, i) => {
                                const head =
                                    it.group !== lastGroup ? it.group : null
                                lastGroup = it.group
                                const active = i === idx
                                return (
                                    <div key={it.id}>
                                        {head && (
                                            <div
                                                style={{
                                                    padding: "12px 12px 6px",
                                                    fontSize: 11,
                                                    letterSpacing: ".08em",
                                                    textTransform: "uppercase",
                                                    color: "rgba(255,255,255,.34)",
                                                }}
                                            >
                                                {head}
                                            </div>
                                        )}
                                        <div
                                            className="cp-row"
                                            onMouseEnter={() => setIdx(i)}
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                run(it)
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                cursor: "pointer",
                                                background: active
                                                    ? "rgba(255,255,255,.07)"
                                                    : "transparent",
                                                boxShadow: active
                                                    ? `inset 2px 0 0 ${accent}`
                                                    : "none",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 14.5,
                                                    color: active
                                                        ? "#fff"
                                                        : "rgba(255,255,255,.82)",
                                                }}
                                            >
                                                {it.label}
                                            </span>
                                            {it.hint && (
                                                <kbd
                                                    style={{
                                                        fontSize: 11.5,
                                                        color: "rgba(255,255,255,.6)",
                                                        background:
                                                            "rgba(255,255,255,.07)",
                                                        border: "1px solid rgba(255,255,255,.1)",
                                                        borderRadius: 6,
                                                        padding: "2px 7px",
                                                        fontFamily:
                                                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                                                    }}
                                                >
                                                    {it.hint}
                                                </kbd>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {help && (
                <div style={overlay} onMouseDown={() => setHelp(false)}>
                    <div
                        style={{ ...panel, width: "min(440px, 92vw)" }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: "18px 20px 6px",
                                fontSize: 15,
                                fontWeight: 600,
                                color: "#fff",
                            }}
                        >
                            Keyboard shortcuts
                        </div>
                        <div style={{ padding: "6px 12px 14px" }}>
                            {[
                                ["Drag / trackpad", "Pan the canvas"],
                                ["⌘ / Ctrl + scroll", "Zoom"],
                                ["+ / −", "Zoom in / out"],
                                ["R", "Reset view"],
                                ["Space", "Lift off"],
                                ["C", "Drop confetti"],
                                ["⌘ / Ctrl + K", "Command palette"],
                                ["?", "This menu"],
                            ].map(([k, label]) => (
                                <div
                                    key={k}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "9px 12px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 14,
                                            color: "rgba(255,255,255,.8)",
                                        }}
                                    >
                                        {label}
                                    </span>
                                    <kbd
                                        style={{
                                            fontSize: 12,
                                            color: "rgba(255,255,255,.66)",
                                            background: "rgba(255,255,255,.07)",
                                            border: "1px solid rgba(255,255,255,.1)",
                                            borderRadius: 6,
                                            padding: "3px 8px",
                                            fontFamily:
                                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                                        }}
                                    >
                                        {k}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

CommandPalette.defaultProps = {
    email: "siddhantyadav20@gmail.com",
    resumeUrl: "https://siddhant.framer.website/about",
    accent: "#6E78FF",
}

addPropertyControls(CommandPalette, {
    email: { type: ControlType.String, title: "Email", defaultValue: "siddhantyadav20@gmail.com" },
    resumeUrl: {
        type: ControlType.Link,
        title: "Résumé URL",
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#6E78FF",
    },
})
