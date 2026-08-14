import { useEffect, useRef, useState } from "react"

// Palette
const BG = "#222222"
const FG = "#d9d9d9"
const ACCENT = "#3B5FBF" // single pop of color (wizard hat / CTA)

export default function ScratchCard() {
    const scratchRef = useRef(null)
    const containerRef = useRef(null)
    const isScratching = useRef(false)
    const lastPos = useRef(null)
    const hasPopped = useRef(false)

    // idle attract animation
    const rafId = useRef(0)
    const idleRef = useRef(true)
    const lastDust = useRef(0)
    const particleId = useRef(0)

    const [revealPct, setRevealPct] = useState(0)
    const [started, setStarted] = useState(false)
    const [wizardVisible, setWizardVisible] = useState(false)
    const [bounced, setBounced] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [navigateReady, setNavigateReady] = useState(false)
    const [activeScratch, setActiveScratch] = useState(false)
    const [launched, setLaunched] = useState(false)

    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 })
    const [cursorInside, setCursorInside] = useState(false)
    const [particles, setParticles] = useState([])
    const [confetti, setConfetti] = useState([])

    // ---- Foil drawing -------------------------------------------------------
    const drawFoil = (sheenPos) => {
        const canvas = scratchRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        ctx.globalCompositeOperation = "source-over"
        ctx.clearRect(0, 0, 300, 300)

        // dark brushed-metal base
        const base = ctx.createLinearGradient(0, 0, 300, 300)
        base.addColorStop(0, "#2e2e2e")
        base.addColorStop(0.4, "#202020")
        base.addColorStop(0.6, "#262626")
        base.addColorStop(1, "#171717")
        ctx.fillStyle = base
        ctx.fillRect(0, 0, 300, 300)

        // faint grain lines
        ctx.strokeStyle = "rgba(217,217,217,0.025)"
        ctx.lineWidth = 1
        for (let i = -10; i < 30; i++) {
            ctx.beginPath()
            ctx.moveTo(i * 14, 0)
            ctx.lineTo(i * 14 + 60, 300)
            ctx.stroke()
        }

        // chess motif texture (light grey, subtle)
        const items = [
            { x: 22, y: 48, r: -18, s: 36, p: "♟" },
            { x: 78, y: 28, r: 8, s: 28, p: "♞" },
            { x: 145, y: 42, r: -6, s: 40, p: "♛" },
            { x: 210, y: 22, r: 14, s: 30, p: "♝" },
            { x: 265, y: 52, r: -22, s: 34, p: "♜" },
            { x: 42, y: 105, r: 20, s: 32, p: "♔" },
            { x: 118, y: 92, r: -10, s: 38, p: "♘" },
            { x: 188, y: 108, r: 16, s: 28, p: "♙" },
            { x: 252, y: 88, r: -8, s: 36, p: "♕" },
            { x: 18, y: 168, r: 6, s: 30, p: "♗" },
            { x: 88, y: 155, r: -24, s: 40, p: "♚" },
            { x: 162, y: 172, r: 12, s: 32, p: "♟" },
            { x: 228, y: 150, r: -16, s: 28, p: "♞" },
            { x: 275, y: 170, r: 18, s: 36, p: "♛" },
            { x: 52, y: 228, r: -12, s: 34, p: "♝" },
            { x: 122, y: 218, r: 8, s: 30, p: "♜" },
            { x: 192, y: 235, r: -20, s: 38, p: "♔" },
            { x: 258, y: 222, r: 14, s: 28, p: "♘" },
            { x: 28, y: 278, r: 16, s: 32, p: "♙" },
            { x: 102, y: 268, r: -8, s: 36, p: "♕" },
            { x: 172, y: 282, r: 10, s: 30, p: "♗" },
            { x: 240, y: 272, r: -18, s: 34, p: "♚" },
        ]
        items.forEach(({ x, y, r, s, p }) => {
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate((r * Math.PI) / 180)
            ctx.fillStyle = "rgba(217,217,217,0.09)"
            ctx.font = `${s}px serif`
            ctx.fillText(p, 0, 0)
            ctx.restore()
        })

        // centered prompt baked into the foil
        ctx.save()
        ctx.textAlign = "center"
        ctx.fillStyle = "rgba(217,217,217,0.85)"
        ctx.font = "700 19px 'Outfit', system-ui, sans-serif"
        ctx.fillText("SCRATCH HERE", 150, 150)
        ctx.fillStyle = "rgba(217,217,217,0.4)"
        ctx.font = "600 11px 'Outfit', system-ui, sans-serif"
        ctx.fillText("• • •", 150, 172)
        ctx.restore()

        // moving diagonal sheen (idle only)
        if (sheenPos !== null) {
            const g = ctx.createLinearGradient(
                sheenPos - 130,
                0,
                sheenPos + 130,
                300
            )
            g.addColorStop(0, "rgba(217,217,217,0)")
            g.addColorStop(0.45, "rgba(217,217,217,0)")
            g.addColorStop(0.5, "rgba(217,217,217,0.28)")
            g.addColorStop(0.55, "rgba(217,217,217,0)")
            g.addColorStop(1, "rgba(217,217,217,0)")
            ctx.fillStyle = g
            ctx.fillRect(0, 0, 300, 300)
        }
    }

    // idle attract loop
    useEffect(() => {
        const start = performance.now()
        const loop = (t) => {
            if (!idleRef.current) return
            const dt = (t - start) / 1000
            const period = 3.2
            const pos = -150 + ((dt % period) / period) * 600
            drawFoil(pos)
            rafId.current = requestAnimationFrame(loop)
        }
        rafId.current = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(rafId.current)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // confetti on reveal
    useEffect(() => {
        if (!wizardVisible) return
        const pieces = Array.from({ length: 46 }).map((_, i) => {
            const palette = [FG, "#ffffff", ACCENT, "#5b7fe0", "#8c8c8c"]
            return {
                id: i,
                left: 50 + (Math.random() * 60 - 30),
                color: palette[i % palette.length],
                xEnd: (Math.random() * 2 - 1) * 160,
                rot: (Math.random() * 2 - 1) * 720,
                delay: Math.random() * 0.15,
                dur: 1.6 + Math.random() * 1.1,
                size: 6 + Math.random() * 7,
                round: Math.random() > 0.5,
            }
        })
        setConfetti(pieces)
        const tm = setTimeout(() => setConfetti([]), 3000)
        return () => clearTimeout(tm)
    }, [wizardVisible])

    // ---- Scratching ---------------------------------------------------------
    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height),
        }
    }

    const spawnDust = (x, y) => {
        const now = performance.now()
        if (now - lastDust.current < 45) return
        lastDust.current = now
        const batch = Array.from({ length: 3 }).map(() => {
            const id = particleId.current++
            return {
                id,
                x,
                y,
                dx: (Math.random() * 2 - 1) * 34,
                dy: -10 - Math.random() * 28,
                size: 3 + Math.random() * 4,
            }
        })
        setParticles((p) => [...p.slice(-20), ...batch])
        const ids = batch.map((b) => b.id)
        setTimeout(
            () => setParticles((p) => p.filter((q) => !ids.includes(q.id))),
            650
        )
    }

    const scratchAt = (x, y) => {
        const canvas = scratchRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        ctx.globalCompositeOperation = "destination-out"

        const draw = (px, py) => {
            const g = ctx.createRadialGradient(px, py, 0, px, py, 38)
            g.addColorStop(0, "rgba(0,0,0,1)")
            g.addColorStop(0.5, "rgba(0,0,0,0.95)")
            g.addColorStop(1, "rgba(0,0,0,0)")
            ctx.beginPath()
            ctx.arc(px, py, 38, 0, Math.PI * 2)
            ctx.fillStyle = g
            ctx.fill()
        }

        draw(x, y)
        if (lastPos.current) {
            const dist = Math.hypot(
                x - lastPos.current.x,
                y - lastPos.current.y
            )
            const steps = Math.ceil(dist / 6)
            for (let i = 1; i < steps; i++) {
                draw(
                    lastPos.current.x + (x - lastPos.current.x) * (i / steps),
                    lastPos.current.y + (y - lastPos.current.y) * (i / steps)
                )
            }
        }
        lastPos.current = { x, y }

        const data = ctx.getImageData(0, 0, 300, 300).data
        let t = 0
        for (let i = 3; i < data.length; i += 80) if (data[i] < 128) t++
        const pct = (t / ((300 * 300) / 20)) * 100
        setRevealPct(pct)

        if (pct > 60 && !hasPopped.current) {
            hasPopped.current = true
            setWizardVisible(true)
            setBounced(true)
            setTimeout(() => setBounced(false), 800)
            setTimeout(() => setNavigateReady(true), 550)
        }
    }

    const beginIfIdle = () => {
        if (idleRef.current) {
            idleRef.current = false
            cancelAnimationFrame(rafId.current)
            drawFoil(null) // settle to plain foil before erasing
            setStarted(true)
        }
    }

    const startScratch = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (navigateReady) return
        beginIfIdle()
        isScratching.current = true
        setActiveScratch(true)
        lastPos.current = null
        const canvas = scratchRef.current
        if (!canvas) return
        const pos = getPos(e, canvas)
        scratchAt(pos.x, pos.y)
    }

    const onMove = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const canvas = scratchRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        setCursorPos({ x: clientX - rect.left, y: clientY - rect.top })
        if (!isScratching.current) return
        const pos = getPos(e, canvas)
        scratchAt(pos.x, pos.y)
        spawnDust(clientX - rect.left, clientY - rect.top)
    }

    const stopScratch = (e) => {
        e?.stopPropagation()
        isScratching.current = false
        setActiveScratch(false)
        lastPos.current = null
    }

    const goPlay = () => {
        setLaunched(true)
        try {
            window.location.href = "https://siddhant.framer.website/chess"
        } catch (err) {
            /* sandbox: navigation may be blocked in preview */
        }
    }

    const handleClick = (e) => {
        e.stopPropagation()
        if (navigateReady) goPlay()
    }

    const reset = (e) => {
        e?.stopPropagation()
        hasPopped.current = false
        idleRef.current = true
        isScratching.current = false
        lastPos.current = null
        setStarted(false)
        setWizardVisible(false)
        setNavigateReady(false)
        setRevealPct(0)
        setLaunched(false)
        setConfetti([])
        setParticles([])
        const start = performance.now()
        const loop = (t) => {
            if (!idleRef.current) return
            const dt = (t - start) / 1000
            const period = 3.2
            const pos = -150 + ((dt % period) / period) * 600
            drawFoil(pos)
            rafId.current = requestAnimationFrame(loop)
        }
        rafId.current = requestAnimationFrame(loop)
    }

    // progress ring geometry
    const R = 150
    const C = 2 * Math.PI * R
    const ringPct = Math.min(revealPct / 60, 1)

    return (
        <div
            style={{
                width: 380,
                height: 420,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: FG,
                fontFamily: "'Outfit', system-ui, sans-serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;900&display=swap');
                @keyframes cardBounce {
                    0%{transform:translate(0,0) rotate(0)}
                    10%{transform:translate(-5px,-7px) rotate(-2deg)}
                    20%{transform:translate(5px,7px) rotate(2deg)}
                    30%{transform:translate(-5px,-5px) rotate(-1deg)}
                    40%{transform:translate(5px,5px) rotate(1deg)}
                    55%{transform:translate(-3px,-3px) rotate(-1deg)}
                    70%{transform:translate(3px,3px) rotate(0)}
                    85%{transform:translate(-1px,-1px) rotate(0)}
                    100%{transform:translate(0,0) rotate(0)}
                }
                @keyframes floatUp {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
                @keyframes floatDown {0%,100%{transform:translateY(0) scaleX(-1) scaleY(-1)}50%{transform:translateY(10px) scaleX(-1) scaleY(-1)}}
                @keyframes bob {0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-7px)}}
                @keyframes cardFloat {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
                @keyframes coinWobble {0%,100%{transform:translate(-50%,-50%) rotate(-12deg)}50%{transform:translate(-50%,-50%) rotate(12deg)}}
                @keyframes dust {to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
                @keyframes confettiFall {to{transform:translate(var(--xe),330px) rotate(var(--rot));opacity:0}}
                @keyframes ctaPop {0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
                @keyframes ctaGlow {0%,100%{box-shadow:0 0 0 0 rgba(59,95,191,.55)}50%{box-shadow:0 0 26px 6px rgba(59,95,191,.55)}}
                @keyframes arrowNudge {0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
                @media (prefers-reduced-motion: reduce){
                    *{animation-duration:.001ms!important;animation-iteration-count:1!important}
                }
            `}</style>

            {/* soft ambient glow */}
            {!launched && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 340,
                        height: 340,
                        borderRadius: "50%",
                        transform: "translate(-50%,-50%)",
                        background:
                            "radial-gradient(circle, rgba(217,217,217,0.10) 0%, rgba(217,217,217,0) 68%)",
                        pointerEvents: "none",
                        zIndex: 0,
                    }}
                />
            )}

            {/* hint pill (idle only) */}
            {!started && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: 10,
                        transform: "translateX(-50%)",
                        background: "rgba(217,217,217,0.10)",
                        color: FG,
                        fontWeight: 600,
                        fontSize: 12,
                        letterSpacing: "1.5px",
                        padding: "7px 15px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                        border: "1px solid rgba(217,217,217,0.18)",
                        pointerEvents: "none",
                        animation: "bob 2.4s ease-in-out infinite",
                        zIndex: 6,
                    }}
                >
                    SCRATCH TO PLAY
                </div>
            )}

            {/* THE CARD */}
            <div
                ref={containerRef}
                onClick={handleClick}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={() => {
                    setCursorInside(true)
                    setHovered(true)
                }}
                onMouseLeave={() => {
                    setCursorInside(false)
                    setHovered(false)
                }}
                style={{
                    width: 300,
                    height: 300,
                    borderRadius: 24,
                    overflow: "hidden",
                    position: "relative",
                    cursor: navigateReady ? "pointer" : "none",
                    flexShrink: 0,
                    userSelect: "none",
                    zIndex: 2,
                    boxShadow:
                        "0 18px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,217,217,0.08)",
                    transform:
                        hovered && !bounced ? "translateY(-4px)" : "none",
                    transition: "transform 0.25s ease",
                    animation: bounced
                        ? "cardBounce 0.8s cubic-bezier(0.36,0.07,0.19,0.97)"
                        : !started && !hovered
                          ? "cardFloat 4s ease-in-out infinite"
                          : "none",
                }}
            >
                {/* Layer 0 — base bg */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: BG,
                        zIndex: 0,
                    }}
                />

                {/* glow behind wizard */}
                {wizardVisible && (
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            bottom: -40,
                            width: 280,
                            height: 280,
                            transform: "translateX(-50%)",
                            background:
                                "radial-gradient(circle, rgba(59,95,191,0.45) 0%, rgba(59,95,191,0) 60%)",
                            zIndex: 1,
                            pointerEvents: "none",
                        }}
                    />
                )}

                {/* Layer 2 — PLAY texts */}
                {revealPct > 2 && (
                    <>
                        <div
                            style={{
                                position: "absolute",
                                top: 35,
                                right: -6,
                                fontWeight: 900,
                                fontSize: "96px",
                                color: FG,
                                lineHeight: 1,
                                letterSpacing: "-4px",
                                whiteSpace: "nowrap",
                                zIndex: 1,
                                animation:
                                    hovered && wizardVisible
                                        ? "floatUp 2s ease-in-out infinite"
                                        : "none",
                            }}
                        >
                            PLAY
                        </div>
                        <div
                            style={{
                                position: "absolute",
                                bottom: 35,
                                left: -6,
                                fontWeight: 900,
                                fontSize: "96px",
                                color: FG,
                                lineHeight: 1,
                                letterSpacing: "-4px",
                                whiteSpace: "nowrap",
                                zIndex: 1,
                                transform: "scaleX(-1) scaleY(-1)",
                                animation:
                                    hovered && wizardVisible
                                        ? "floatDown 2s ease-in-out infinite 0.3s"
                                        : "none",
                            }}
                        >
                            PLAY
                        </div>
                    </>
                )}

                {/* Layer 3 — Wizard */}
                <div
                    style={{
                        position: "absolute",
                        bottom: wizardVisible ? -4 : -250,
                        left: -4,
                        transition: wizardVisible
                            ? "bottom 0.45s cubic-bezier(0.34,1.5,0.64,1)"
                            : "bottom 0.5s ease-in",
                        zIndex: 2,
                    }}
                >
                    <WizardSVG />
                </div>

                {/* dust particles */}
                {particles.map((p) => (
                    <div
                        key={p.id}
                        style={{
                            position: "absolute",
                            left: p.x,
                            top: p.y,
                            width: p.size,
                            height: p.size,
                            borderRadius: "50%",
                            background: FG,
                            opacity: 0.8,
                            pointerEvents: "none",
                            zIndex: 4,
                            "--dx": `${p.dx}px`,
                            "--dy": `${p.dy}px`,
                            animation: "dust 0.6s ease-out forwards",
                        }}
                    />
                ))}

                {/* Layer 4 — scratch canvas */}
                <canvas
                    ref={scratchRef}
                    width={300}
                    height={300}
                    onMouseDown={startScratch}
                    onMouseMove={onMove}
                    onMouseUp={stopScratch}
                    onMouseLeave={stopScratch}
                    onTouchStart={startScratch}
                    onTouchMove={onMove}
                    onTouchEnd={stopScratch}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        touchAction: "none",
                        zIndex: 3,
                        display: navigateReady ? "none" : "block",
                    }}
                />

                {/* progress ring */}
                {started && !navigateReady && (
                    <svg
                        width="300"
                        height="300"
                        viewBox="0 0 300 300"
                        style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            zIndex: 5,
                            transform: "rotate(-90deg)",
                        }}
                    >
                        <circle
                            cx="150"
                            cy="150"
                            r={R - 6}
                            fill="none"
                            stroke="rgba(217,217,217,0.12)"
                            strokeWidth="4"
                        />
                        <circle
                            cx="150"
                            cy="150"
                            r={R - 6}
                            fill="none"
                            stroke={FG}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * (R - 6)}
                            strokeDashoffset={
                                2 * Math.PI * (R - 6) * (1 - ringPct)
                            }
                            style={{
                                transition: "stroke-dashoffset 0.1s linear",
                            }}
                        />
                    </svg>
                )}

                {/* custom coin cursor */}
                {cursorInside && !navigateReady && (
                    <div
                        style={{
                            position: "absolute",
                            left: cursorPos.x,
                            top: cursorPos.y,
                            transform: "translate(-50%,-50%)",
                            pointerEvents: "none",
                            zIndex: 10,
                            animation: activeScratch
                                ? "coinWobble 0.18s ease-in-out infinite"
                                : "none",
                        }}
                    >
                        <CoinCursor />
                    </div>
                )}
            </div>

            {/* PLAY NOW CTA */}
            {navigateReady && !launched && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        goPlay()
                    }}
                    style={{
                        position: "absolute",
                        bottom: 18,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: ACCENT,
                        color: "#fff",
                        border: "none",
                        fontFamily: "inherit",
                        fontWeight: 700,
                        fontSize: 15,
                        letterSpacing: "0.3px",
                        padding: "13px 26px",
                        borderRadius: 999,
                        cursor: "pointer",
                        zIndex: 7,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        animation:
                            "ctaPop 0.4s cubic-bezier(0.34,1.5,0.64,1), ctaGlow 1.8s ease-in-out 0.4s infinite",
                    }}
                >
                    PLAY NOW
                    <span
                        style={{
                            animation: "arrowNudge 1s ease-in-out infinite",
                        }}
                    >
                        →
                    </span>
                </button>
            )}

            {launched && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 22,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: FG,
                        fontWeight: 600,
                        fontSize: 14,
                        zIndex: 7,
                    }}
                >
                    Loading chess…
                </div>
            )}

            {/* confetti */}
            {confetti.map((c) => (
                <div
                    key={c.id}
                    style={{
                        position: "absolute",
                        top: 150,
                        left: `${c.left}%`,
                        width: c.size,
                        height: c.round ? c.size : c.size * 0.4,
                        background: c.color,
                        borderRadius: c.round ? "50%" : 2,
                        pointerEvents: "none",
                        zIndex: 8,
                        "--xe": `${c.xEnd}px`,
                        "--rot": `${c.rot}deg`,
                        animation: `confettiFall ${c.dur}s ease-in ${c.delay}s forwards`,
                    }}
                />
            ))}

            {/* tiny reset (handy for the preview) */}
            <button
                onClick={reset}
                title="Reset"
                style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "rgba(217,217,217,0.08)",
                    color: FG,
                    border: "1px solid rgba(217,217,217,0.18)",
                    cursor: "pointer",
                    fontSize: 14,
                    zIndex: 9,
                    lineHeight: 1,
                }}
            >
                ↺
            </button>
        </div>
    )
}

function CoinCursor() {
    return (
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
            <circle
                cx="23"
                cy="23"
                r="20"
                fill="#d9d9d9"
                stroke="#111"
                strokeWidth="2.5"
            />
            <circle
                cx="23"
                cy="23"
                r="15"
                fill="none"
                stroke="#111"
                strokeWidth="1.5"
                strokeDasharray="2 3"
                opacity="0.5"
            />
            <path
                d="M23 13 l2.6 6.3 6.8.5 -5.2 4.4 1.7 6.6 -5.9-3.6 -5.9 3.6 1.7-6.6 -5.2-4.4 6.8-.5 Z"
                fill="#111"
                opacity="0.85"
            />
        </svg>
    )
}

function WizardSVG() {
    return (
        <svg
            width="180"
            height="230"
            viewBox="0 0 180 230"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M82 4 L114 88 L50 88 Z"
                fill="#3B5FBF"
                stroke="#111"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            <path
                d="M82 4 L86 32 L84 62 L82 80"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <ellipse
                cx="82"
                cy="89"
                rx="40"
                ry="11"
                fill="#2A4A9F"
                stroke="#111"
                strokeWidth="3"
            />
            <ellipse cx="82" cy="91" rx="33" ry="6.5" fill="rgba(0,0,0,0.2)" />
            <path
                d="M42 96 Q36 116 38 132"
                stroke="#1a0f0a"
                strokeWidth="11"
                strokeLinecap="round"
            />
            <path
                d="M122 96 Q128 116 126 132"
                stroke="#1a0f0a"
                strokeWidth="11"
                strokeLinecap="round"
            />
            <path
                d="M62 90 Q74 85 82 88 Q90 85 102 90"
                stroke="#1a0f0a"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
            />
            <ellipse
                cx="82"
                cy="128"
                rx="38"
                ry="42"
                fill="#F5C89A"
                stroke="#111"
                strokeWidth="3.5"
            />
            <path
                d="M52 110 Q62 103 72 108"
                stroke="#1a0f0a"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M92 108 Q102 103 112 110"
                stroke="#1a0f0a"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M70 108 L74 113"
                stroke="#1a0f0a"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <path
                d="M94 113 L90 108"
                stroke="#1a0f0a"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <ellipse
                cx="66"
                cy="122"
                rx="10"
                ry="11"
                fill="white"
                stroke="#111"
                strokeWidth="2.5"
            />
            <ellipse
                cx="98"
                cy="122"
                rx="10"
                ry="11"
                fill="white"
                stroke="#111"
                strokeWidth="2.5"
            />
            <circle cx="67" cy="120" r="6.5" fill="#111" />
            <circle cx="99" cy="120" r="6.5" fill="#111" />
            <circle cx="67" cy="120" r="3.5" fill="#2C4A9F" />
            <circle cx="99" cy="120" r="3.5" fill="#2C4A9F" />
            <circle cx="69" cy="118" r="2.5" fill="white" />
            <circle cx="101" cy="118" r="2.5" fill="white" />
            <path
                d="M56 127 Q66 131 76 127"
                stroke="#111"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M88 127 Q98 131 108 127"
                stroke="#111"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M78 134 Q82 140 86 134"
                stroke="#C8956A"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M68 146 Q82 151 96 146"
                stroke="#111"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M68 146 Q66 149 68 151"
                stroke="#111"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M96 146 Q98 149 96 151"
                stroke="#111"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
            <ellipse
                cx="52"
                cy="134"
                rx="9"
                ry="5.5"
                fill="rgba(240,120,90,0.22)"
            />
            <ellipse
                cx="112"
                cy="134"
                rx="9"
                ry="5.5"
                fill="rgba(240,120,90,0.22)"
            />
            <rect
                x="70"
                y="166"
                width="24"
                height="14"
                rx="6"
                fill="#F5C89A"
                stroke="#111"
                strokeWidth="2.5"
            />
            <path
                d="M38 180 Q30 230 28 230 L136 230 Q134 230 126 180 Q108 192 82 192 Q56 192 38 180Z"
                fill="#111"
                stroke="#111"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M64 176 L82 190 L100 176"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path d="M82 190 L82 230" stroke="#333" strokeWidth="1.5" />
            <path
                d="M52 186 Q46 206 44 230"
                stroke="#333"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M112 186 Q118 206 120 230"
                stroke="#333"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M38 180 Q18 168 8 155 Q4 148 10 144 Q16 140 22 148 Q30 160 42 168"
                fill="#111"
                stroke="#111"
                strokeWidth="2"
            />
            <ellipse
                cx="10"
                cy="144"
                rx="10"
                ry="9"
                fill="#F5C89A"
                stroke="#111"
                strokeWidth="2.5"
                transform="rotate(-20 10 144)"
            />
            <path
                d="M4 138 Q2 132 6 130"
                stroke="#F5C89A"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d="M10 136 Q8 130 12 128"
                stroke="#F5C89A"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d="M16 138 Q16 132 18 130"
                stroke="#F5C89A"
                strokeWidth="5"
                strokeLinecap="round"
            />
        </svg>
    )
}
