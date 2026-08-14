import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"
import { motion, AnimatePresence } from "framer-motion"

/**
 * MUSIC PLAYER  —  single reusable component (add one per song, set props)
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 200
 */

// ───────────────────────────────────────────────────────────
//  Corner smoothing (iOS-style squircle) — no dependencies.
// ───────────────────────────────────────────────────────────
const rad = (d: number) => (d * Math.PI) / 180

function squirclePath(
    w: number,
    h: number,
    cornerRadius: number,
    smoothing: number
): string {
    const budget = Math.min(w, h) / 2
    let r = Math.min(cornerRadius, budget)
    let p = (1 + smoothing) * r
    let cr = r
    if (p > budget) {
        if (smoothing === 0) {
            cr = budget
            p = budget
        } else {
            cr = budget / (1 + smoothing)
            p = budget
        }
    }
    const arcMeasure = 90 * (1 - smoothing)
    const arc = Math.sin(rad(arcMeasure / 2)) * cr * Math.SQRT2
    const alpha = (90 - arcMeasure) / 2
    const p3p4 = cr * Math.tan(rad(alpha / 2))
    const beta = 45 * smoothing
    const c = p3p4 * Math.cos(rad(beta))
    const d = c * Math.tan(rad(beta))
    const b = (p - arc - c - d) / 3
    const a = 2 * b
    return [
        `M ${w - p} 0`,
        `c ${a} 0 ${a + b} 0 ${a + b + c} ${d}`,
        `a ${cr} ${cr} 0 0 1 ${arc} ${arc}`,
        `c ${d} ${c} ${d} ${b + c} ${d} ${a + b + c}`,
        `l 0 ${h - 2 * p}`,
        `c 0 ${a} 0 ${a + b} ${-d} ${a + b + c}`,
        `a ${cr} ${cr} 0 0 1 ${-arc} ${arc}`,
        `c ${-c} ${d} ${-(b + c)} ${d} ${-(a + b + c)} ${d}`,
        `l ${-(w - 2 * p)} 0`,
        `c ${-a} 0 ${-(a + b)} 0 ${-(a + b + c)} ${-d}`,
        `a ${cr} ${cr} 0 0 1 ${-arc} ${-arc}`,
        `c ${-d} ${-c} ${-d} ${-(b + c)} ${-d} ${-(a + b + c)}`,
        `l 0 ${-(h - 2 * p)}`,
        `c 0 ${-a} 0 ${-(a + b)} ${d} ${-(a + b + c)}`,
        `a ${cr} ${cr} 0 0 1 ${arc} ${-arc}`,
        `c ${c} ${-d} ${b + c} ${-d} ${a + b + c} ${-d}`,
        `z`,
    ].join(" ")
}

// ───────────────────────────────────────────────────────────
//  Inject Outfit font + keyframes once (client only).
// ───────────────────────────────────────────────────────────
function useGlobalAssets() {
    useEffect(() => {
        if (typeof document === "undefined") return
        if (!document.getElementById("cc-outfit-font")) {
            const l = document.createElement("link")
            l.id = "cc-outfit-font"
            l.rel = "stylesheet"
            l.href =
                "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
            document.head.appendChild(l)
        }
        if (!document.getElementById("cc-mp-keyframes")) {
            const s = document.createElement("style")
            s.id = "cc-mp-keyframes"
            s.textContent = `
@keyframes ccSpin { to { transform: rotate(360deg); } }
@keyframes ccEq { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }`
            document.head.appendChild(s)
        }
    }, [])
}

const FONT = "'Outfit', system-ui, -apple-system, sans-serif"
const DRAG_THRESHOLD = 8
const PLAY_EVENT = "cc-music-play"

interface Props {
    cover?: { src?: string } | string
    audio?: string
    song?: string
    artist?: string
    cornerRadius?: number
    cornerSmoothing?: number
    spinSeconds?: number
    width?: number
    height?: number
    style?: React.CSSProperties
}

export default function MusicPlayer(props: Props) {
    const {
        cover,
        audio,
        song = "Safe and Sound",
        artist = "Capital Cities",
        cornerRadius = 32,
        cornerSmoothing = 0.6,
        spinSeconds = 4,
        width = 200,
        height = 200,
        style,
    } = props

    const id = useId()
    useGlobalAssets()

    const [isPlaying, setIsPlaying] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [canHover, setCanHover] = useState(false)
    const [mounted, setMounted] = useState(false)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const downRef = useRef<{ x: number; y: number } | null>(null)

    const coverSrc = typeof cover === "string" ? cover : cover?.src || ""

    useEffect(() => setMounted(true), [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
        setCanHover(mq.matches)
        const h = (e: MediaQueryListEvent) => setCanHover(e.matches)
        mq.addEventListener?.("change", h)
        return () => mq.removeEventListener?.("change", h)
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const a = new Audio()
        a.preload = "none"
        if (audio) a.src = audio
        const onEnd = () => {
            a.currentTime = 0
            setIsPlaying(false)
        }
        a.addEventListener("ended", onEnd)
        audioRef.current = a
        return () => {
            a.pause()
            a.removeEventListener("ended", onEnd)
            audioRef.current = null
        }
    }, [audio])

    useEffect(() => {
        if (typeof window === "undefined") return
        const onOther = (e: Event) => {
            if ((e as CustomEvent).detail !== id) {
                audioRef.current?.pause()
                setIsPlaying(false)
            }
        }
        window.addEventListener(PLAY_EVENT, onOther)
        return () => window.removeEventListener(PLAY_EVENT, onOther)
    }, [id])

    const play = () => {
        if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }))
        const a = audioRef.current
        if (a && audio) a.play().catch(() => {})
        setIsPlaying(true)
    }
    const pause = () => {
        audioRef.current?.pause()
        setIsPlaying(false)
    }
    const stopReset = () => {
        const a = audioRef.current
        if (a) {
            a.pause()
            a.currentTime = 0
        }
        setIsPlaying(false)
    }

    const onPointerDown = (e: React.PointerEvent) => {
        downRef.current = { x: e.clientX, y: e.clientY }
    }
    const onClick = (e: React.MouseEvent) => {
        const d = downRef.current
        downRef.current = null
        if (!d) return
        const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y)
        if (moved > DRAG_THRESHOLD) return
        isPlaying ? pause() : play()
    }

    // geometry (defensive — never collapse to 0)
    const w = Number(width) || 200
    const h = Number(height) || 200
    const minSide = Math.min(w, h)
    const discSize = Math.round(minSide * 0.82)
    const peek = Math.round(w * 0.42)

    let coverPath = ""
    try {
        coverPath = squirclePath(w, h, cornerRadius, cornerSmoothing)
    } catch {
        coverPath = ""
    }
    const coverClip = coverPath
        ? {
              clipPath: `path('${coverPath}')`,
              WebkitClipPath: `path('${coverPath}')`,
          }
        : { borderRadius: cornerRadius }

    return (
        <div
            style={{
                ...style,
                position: "relative",
                width: w,
                height: h,
                fontFamily: FONT,
                cursor: "pointer",
                userSelect: "none",
                WebkitUserSelect: "none",
                overflow: "visible",
                touchAction: "manipulation",
            }}
            onPointerDown={onPointerDown}
            onClick={onClick}
            onMouseEnter={() => canHover && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            role="button"
            aria-label={`Play ${song} by ${artist}`}
        >
            {/* vinyl disc */}
            <motion.div
                animate={{ x: isPlaying ? peek : 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                style={{
                    position: "absolute",
                    top: (h - discSize) / 2,
                    left: (w - discSize) / 2,
                    width: discSize,
                    height: discSize,
                    zIndex: 1,
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background:
                            "radial-gradient(circle at 50% 50%, #2a2a2a 0 30%, #0e0e0e 30% 100%)",
                        boxShadow:
                            "0 8px 22px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        animation: `ccSpin ${spinSeconds}s linear infinite`,
                        animationPlayState: isPlaying ? "running" : "paused",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            background:
                                "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)",
                        }}
                    />
                    <div
                        style={{
                            width: "38%",
                            height: "38%",
                            borderRadius: "50%",
                            backgroundImage: coverSrc
                                ? `url(${coverSrc})`
                                : "linear-gradient(135deg,#6b8cae,#c98b6b)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            display: "grid",
                            placeItems: "center",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                            zIndex: 1,
                        }}
                    >
                        <div
                            style={{
                                width: "16%",
                                height: "16%",
                                borderRadius: "50%",
                                background: "#0e0e0e",
                                boxShadow:
                                    "inset 0 0 0 1px rgba(255,255,255,0.15)",
                            }}
                        />
                    </div>
                </div>
            </motion.div>

            {/* album cover */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    ...coverClip,
                    backgroundColor: "#1b1b1b",
                    backgroundImage: coverSrc
                        ? `url(${coverSrc})`
                        : "linear-gradient(135deg,#6b8cae,#c98b6b)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.35))",
                    display: "grid",
                    placeItems: "center",
                }}
            >
                {!coverSrc && (
                    <span
                        style={{
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 14,
                            opacity: 0.8,
                            textAlign: "center",
                            padding: 12,
                        }}
                    >
                        Add a cover
                    </span>
                )}
            </div>

            {/* hover tooltip */}
            <AnimatePresence>
                {hovered && !isPlaying && canHover && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        style={{
                            position: "absolute",
                            top: "calc(100% + 16px)",
                            left: "25%",
                            transform: "translateX(-50%)",
                            zIndex: 4,
                            background: "#222222",
                            color: "#d9d9d9",
                            padding: "8px 12px",
                            borderRadius: 12,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                lineHeight: 1.6,
                            }}
                        >
                            {song}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 400,
                                opacity: 0.65,
                                marginTop: 1,
                            }}
                        >
                            {artist}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* "Now playing" card → top-right of the page */}
            {mounted &&
                typeof document !== "undefined" &&
                createPortal(
                    <AnimatePresence>
                        {isPlaying && (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, x: 24, y: -8 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                exit={{ opacity: 0, x: 24, y: -8 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 24,
                                }}
                                style={{
                                    position: "fixed",
                                    top: 20,
                                    right: 20,
                                    zIndex: 2147483000,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "10px 12px",
                                    background: "#222222",
                                    color: "#d9d9d9",
                                    borderRadius: 16,
                                    fontFamily: FONT,
                                    boxShadow: "0 12px 34px rgba(0,0,0,0.4)",
                                    maxWidth: 320,
                                }}
                            >
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        flexShrink: 0,
                                        backgroundImage: coverSrc
                                            ? `url(${coverSrc})`
                                            : "linear-gradient(135deg,#6b8cae,#c98b6b)",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }}
                                />
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 5,
                                            fontSize: 10,
                                            letterSpacing: 0.4,
                                            textTransform: "uppercase",
                                            opacity: 0.6,
                                            marginBottom: 2,
                                        }}
                                    >
                                        <Equalizer />
                                        Now playing
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            lineHeight: 1.6,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {song}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            opacity: 0.6,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {artist}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        stopReset()
                                    }}
                                    aria-label="Stop"
                                    style={{
                                        marginLeft: 4,
                                        width: 34,
                                        height: 34,
                                        flexShrink: 0,
                                        borderRadius: "50%",
                                        border: "none",
                                        cursor: "pointer",
                                        background: "#d9d9d9",
                                        display: "grid",
                                        placeItems: "center",
                                    }}
                                >
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                    >
                                        <rect
                                            x="1.5"
                                            y="1"
                                            width="3.2"
                                            height="10"
                                            rx="1"
                                            fill="#222222"
                                        />
                                        <rect
                                            x="7.3"
                                            y="1"
                                            width="3.2"
                                            height="10"
                                            rx="1"
                                            fill="#222222"
                                        />
                                    </svg>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    )
}

function Equalizer() {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "flex-end",
                gap: 1.5,
                height: 9,
            }}
        >
            {[0, 0.25, 0.5].map((delay, i) => (
                <span
                    key={i}
                    style={{
                        width: 2,
                        height: "100%",
                        background: "#d9d9d9",
                        borderRadius: 1,
                        transformOrigin: "bottom",
                        animation: `ccEq 0.9s ease-in-out ${delay}s infinite`,
                    }}
                />
            ))}
        </span>
    )
}

addPropertyControls(MusicPlayer, {
    cover: { type: ControlType.ResponsiveImage, title: "Cover" },
    audio: {
        type: ControlType.File,
        title: "Audio",
        allowedFileTypes: ["mp3", "wav", "m4a", "aac", "ogg"],
    },
    song: {
        type: ControlType.String,
        title: "Song",
        defaultValue: "Safe and Sound",
    },
    artist: {
        type: ControlType.String,
        title: "Artist",
        defaultValue: "Capital Cities",
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 32,
    },
    cornerSmoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.6,
        displayStepper: true,
    },
    spinSeconds: {
        type: ControlType.Number,
        title: "Spin (s)",
        min: 1,
        max: 12,
        step: 0.5,
        defaultValue: 4,
    },
})
