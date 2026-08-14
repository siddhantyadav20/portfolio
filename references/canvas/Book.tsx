import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType } from "framer"
import { motion, AnimatePresence } from "framer-motion"

/**
 * BOOK  —  a 3D book that opens into a reading spread.
 *
 * v2 changes:
 *   • FIX — stars rendered black in production. The old <linearGradient>
 *     used id={`s${i}-${color}`}; hex colors put a "#" inside the id, so
 *     fill="url(#s0-#E07A3A)" is an invalid fragment reference and SVG
 *     falls back to black. Duplicate ids across book instances collided
 *     too, and url(#…) also breaks on any page with a <base href>.
 *     The rating is now drawn with a clipped overlay — zero SVG ids,
 *     zero url() references, immune to all of the above.
 *   • Star fill sweeps in when the spread opens, with a numeric label.
 *   • Vertical title on the spine (visible during the hover peek).
 *   • A bookmark ribbon that slips out of the pages on hover.
 *   • Keyboard support (Tab + Enter/Space), visible focus ring.
 *   • prefers-reduced-motion respected (no parallax, no sweeps).
 *   • Scrollable excerpt gets a soft fade at the bottom edge.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 160
 * @framerIntrinsicHeight 240
 */

// ───────────────────────────────────────────────────────────
//  Corner smoothing (iOS-style squircle) — shared with the player.
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
//  Inject Outfit (UI) + Newsreader (reading serif) + keyframes once.
// ───────────────────────────────────────────────────────────
function useGlobalAssets() {
    useEffect(() => {
        if (typeof document === "undefined") return
        if (!document.getElementById("cc-book-fonts")) {
            const l = document.createElement("link")
            l.id = "cc-book-fonts"
            l.rel = "stylesheet"
            l.href =
                "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
            document.head.appendChild(l)
        }
        if (!document.getElementById("cc-book-keyframes")) {
            const s = document.createElement("style")
            s.id = "cc-book-keyframes"
            s.textContent = `
@keyframes ccPulse { 0%,100% { transform: scaleY(0.4); opacity:.5 } 50% { transform: scaleY(1); opacity:1 } }
.cc-book-root:focus-visible { outline: 2px solid rgba(255,255,255,0.85); outline-offset: 6px; border-radius: 8px; }
.cc-book-excerpt::-webkit-scrollbar { width: 4px }
.cc-book-excerpt::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px }`
            document.head.appendChild(s)
        }
    }, [])
}

function useReducedMotion() {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        if (typeof window === "undefined") return
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReduced(mq.matches)
        const h = (e: MediaQueryListEvent) => setReduced(e.matches)
        mq.addEventListener?.("change", h)
        return () => mq.removeEventListener?.("change", h)
    }, [])
    return reduced
}

const FONT = "'Outfit', system-ui, -apple-system, sans-serif"
const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif"
const OPEN_EVENT = "cc-book-open"
const DRAG_THRESHOLD = 8

interface Props {
    coverImage?: { src?: string } | string
    bindingColor?: string
    backCoverColor?: string
    title?: string
    author?: string
    description?: string
    rating?: number
    year?: string
    pages?: number
    genre?: string
    readMoreUrl?: string
    showRibbon?: boolean
    cornerRadius?: number
    cornerSmoothing?: number
    width?: number
    height?: number
    style?: React.CSSProperties
}

export default function BookComponent(props: Props) {
    const {
        coverImage,
        bindingColor = "#E07A3A",
        backCoverColor = "#C0392B",
        title = "Book Title",
        author = "Author Name",
        description = "An opening passage waiting to be written. Drop in a short excerpt or blurb here, and it will appear on the right-hand page when the book is opened — set in a quiet reading serif, with a drop cap to start.",
        rating = 4.5,
        year = "2024",
        pages = 320,
        genre = "Fiction",
        readMoreUrl,
        showRibbon = true,
        cornerRadius = 4,
        cornerSmoothing = 0.6,
        width = 160,
        height = 240,
        style,
    } = props

    const id = useId()
    useGlobalAssets()
    const reduced = useReducedMotion()

    const [open, setOpen] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [canHover, setCanHover] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [tilt, setTilt] = useState({ x: 0, y: 0 })

    const rootRef = useRef<HTMLDivElement | null>(null)
    const downRef = useRef<{ x: number; y: number } | null>(null)

    const coverSrc =
        typeof coverImage === "string" ? coverImage : coverImage?.src || ""

    const W = Number(width) || 160
    const H = Number(height) || 240
    const D = Math.round(Math.min(W, H) * 0.2) // thickness

    useEffect(() => setMounted(true), [])

    // Pointer capability (no parallax / tooltip on touch).
    useEffect(() => {
        if (typeof window === "undefined") return
        const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
        setCanHover(mq.matches)
        const h = (e: MediaQueryListEvent) => setCanHover(e.matches)
        mq.addEventListener?.("change", h)
        return () => mq.removeEventListener?.("change", h)
    }, [])

    // Only one book open at a time across the page.
    useEffect(() => {
        if (typeof window === "undefined") return
        const onOther = (e: Event) => {
            if ((e as CustomEvent).detail !== id) setOpen(false)
        }
        window.addEventListener(OPEN_EVENT, onOther)
        return () => window.removeEventListener(OPEN_EVENT, onOther)
    }, [id])

    // Esc to close.
    useEffect(() => {
        if (!open || typeof window === "undefined") return
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open])

    const openBook = () => {
        if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }))
        setOpen(true)
    }
    const toggle = () => (open ? setOpen(false) : openBook())

    // Distinguish click from drag.
    const onPointerDown = (e: React.PointerEvent) => {
        downRef.current = { x: e.clientX, y: e.clientY }
    }
    const onClick = (e: React.MouseEvent) => {
        const d = downRef.current
        downRef.current = null
        if (!d) return
        const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y)
        if (moved > DRAG_THRESHOLD) return
        toggle()
    }
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggle()
        }
    }

    // Mouse-follow parallax (skipped when reduced motion is requested).
    const onMove = (e: React.MouseEvent) => {
        if (!canHover || reduced || !rootRef.current) return
        const r = rootRef.current.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        setTilt({ x: -py * 10, y: px * 12 })
    }
    const resetTilt = () => setTilt({ x: 0, y: 0 })

    // Cover squircle clip.
    let coverPath = ""
    try {
        coverPath = squirclePath(W, H, cornerRadius, cornerSmoothing)
    } catch {
        coverPath = ""
    }
    const coverClip = coverPath
        ? {
              clipPath: `path('${coverPath}')`,
              WebkitClipPath: `path('${coverPath}')`,
          }
        : { borderRadius: cornerRadius }

    const peek = hovered && !open && !reduced ? -10 : 0
    const sceneTransform = `translateZ(-${D}px) rotateX(${tilt.x}deg) rotateY(${
        peek + tilt.y
    }deg)`

    const pageEdge = `repeating-linear-gradient(
        to bottom,
        #f9f4ec 0px, #f9f4ec 1.5px,
        #e5dcc8 1.5px, #e5dcc8 2.5px
    )`
    const pageEdgeH = pageEdge.replace("to bottom", "to right")

    // Spine label fits when the book is reasonably tall.
    const showSpineTitle = D >= 22 && H >= 150

    return (
        <div
            ref={rootRef}
            className="cc-book-root"
            style={{
                ...style,
                width: W,
                height: H,
                perspective: 900,
                cursor: "pointer",
                position: "relative",
                fontFamily: FONT,
                userSelect: "none",
                WebkitUserSelect: "none",
            }}
            onPointerDown={onPointerDown}
            onClick={onClick}
            onKeyDown={onKeyDown}
            onMouseEnter={() => canHover && setHovered(true)}
            onMouseLeave={() => {
                setHovered(false)
                resetTilt()
            }}
            onMouseMove={onMove}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`Open ${title} by ${author}`}
        >
            {/* hover tooltip (matches the player's dark pill) */}
            <AnimatePresence>
                {hovered && !open && canHover && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        style={{
                            position: "absolute",
                            bottom: "calc(100% + 16px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 50,
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
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {title}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                opacity: 0.6,
                                marginTop: 1,
                            }}
                        >
                            {author}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D book box */}
            <div
                style={{
                    width: W,
                    height: H,
                    position: "relative",
                    transformStyle: "preserve-3d",
                    transform: sceneTransform,
                    transition: hovered
                        ? "transform 0.12s ease-out"
                        : "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
                    opacity: open ? 0 : 1,
                }}
            >
                {/* FRONT COVER */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        transform: `translateZ(${D}px)`,
                        ...coverClip,
                        overflow: "hidden",
                        background: coverSrc ? "#111" : "#2a2a2a",
                        boxShadow: "2px 4px 22px rgba(0,0,0,0.4)",
                    }}
                >
                    {coverSrc ? (
                        <img
                            src={coverSrc}
                            alt={title}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "12px 10px",
                                boxSizing: "border-box",
                                background: `linear-gradient(135deg, ${bindingColor}, ${backCoverColor})`,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "#fff",
                                    textAlign: "center",
                                    lineHeight: 1.4,
                                    opacity: 0.9,
                                }}
                            >
                                {title}
                            </span>
                        </div>
                    )}
                    {/* subtle sheen */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(105deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 32%)",
                            pointerEvents: "none",
                        }}
                    />
                </div>

                {/* BOOKMARK RIBBON — slips out of the pages on hover */}
                {showRibbon && (
                    <div
                        aria-hidden
                        style={{
                            position: "absolute",
                            top: H - 2,
                            right: Math.round(W * 0.16),
                            width: 11,
                            height: hovered && !reduced ? 30 : 16,
                            transform: `translateZ(${D - 3}px)`,
                            transition:
                                "height 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
                            background: `linear-gradient(to bottom, ${bindingColor}, ${backCoverColor})`,
                            clipPath:
                                "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 6px), 0 100%)",
                            boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
                        }}
                    />
                )}

                {/* BACK COVER */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        transform: `rotateY(180deg) translateZ(${D}px)`,
                        background: backCoverColor,
                        borderRadius: "4px 2px 2px 4px",
                    }}
                />

                {/* SPINE */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: D,
                        height: H,
                        transformOrigin: "left center",
                        transform: "rotateY(-90deg)",
                        background: bindingColor,
                        boxShadow: "inset -3px 0 8px rgba(0,0,0,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                    }}
                >
                    {showSpineTitle && (
                        <span
                            style={{
                                writingMode: "vertical-rl",
                                fontSize: Math.min(12, D * 0.42),
                                fontWeight: 600,
                                letterSpacing: 1.2,
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.85)",
                                whiteSpace: "nowrap",
                                maxHeight: H - 24,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {title}
                        </span>
                    )}
                </div>

                {/* PAGE EDGES */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: W,
                        width: D,
                        height: H,
                        transformOrigin: "left center",
                        transform: "rotateY(90deg)",
                        background: pageEdge,
                    }}
                />

                {/* TOP EDGE */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: W,
                        height: D,
                        transformOrigin: "center top",
                        transform: "rotateX(90deg)",
                        background: pageEdgeH,
                    }}
                />

                {/* BOTTOM EDGE */}
                <div
                    style={{
                        position: "absolute",
                        top: H,
                        left: 0,
                        width: W,
                        height: D,
                        transformOrigin: "center top",
                        transform: "rotateX(-90deg)",
                        background: pageEdgeH,
                    }}
                />
            </div>

            {/* Reading spread — portaled, blurred backdrop */}
            {mounted &&
                typeof document !== "undefined" &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: reduced ? 0 : 0.25,
                                }}
                                onClick={() => setOpen(false)}
                                style={{
                                    position: "fixed",
                                    inset: 0,
                                    zIndex: 2147483000,
                                    display: "grid",
                                    placeItems: "center",
                                    padding: 24,
                                    background: "rgba(8,8,10,0.55)",
                                    backdropFilter: "blur(8px)",
                                    WebkitBackdropFilter: "blur(8px)",
                                    fontFamily: FONT,
                                }}
                            >
                                <Spread
                                    coverSrc={coverSrc}
                                    bindingColor={bindingColor}
                                    backCoverColor={backCoverColor}
                                    title={title}
                                    author={author}
                                    description={description}
                                    rating={rating}
                                    year={year}
                                    pages={pages}
                                    genre={genre}
                                    readMoreUrl={readMoreUrl}
                                    coverClip={coverClip}
                                    reduced={reduced}
                                    onClose={() => setOpen(false)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    )
}

// ───────────────────────────────────────────────────────────
//  The open spread (dark frame, cover + reading column).
// ───────────────────────────────────────────────────────────
function Spread({
    coverSrc,
    bindingColor,
    backCoverColor,
    title,
    author,
    description,
    rating,
    year,
    pages,
    genre,
    readMoreUrl,
    coverClip,
    reduced,
    onClose,
}: any) {
    const meta = [year, pages ? `${pages} pp` : "", genre].filter(Boolean)
    return (
        <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} by ${author}`}
            initial={
                reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 14 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{
                display: "flex",
                gap: 28,
                alignItems: "stretch",
                flexWrap: "wrap",
                maxWidth: 720,
                width: "100%",
                padding: 28,
                borderRadius: 28,
                background: "#1b1b1b",
                color: "#d9d9d9",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
                position: "relative",
                boxSizing: "border-box",
                perspective: 1200,
            }}
        >
            {/* close */}
            <button
                onClick={onClose}
                aria-label="Close"
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    background: "#d9d9d9",
                    color: "#222",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 16,
                    lineHeight: 1,
                    zIndex: 2,
                }}
            >
                ✕
            </button>

            {/* left: cover hinging open like a real board */}
            <motion.div
                initial={
                    reduced ? { opacity: 0 } : { rotateY: -55, opacity: 0 }
                }
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 170,
                    damping: 21,
                    delay: reduced ? 0 : 0.05,
                }}
                style={{
                    flex: "0 0 200px",
                    aspectRatio: "2 / 3",
                    minWidth: 160,
                    ...coverClip,
                    overflow: "hidden",
                    background: coverSrc
                        ? "#111"
                        : `linear-gradient(135deg, ${bindingColor}, ${backCoverColor})`,
                    boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
                    transformOrigin: "left center",
                    position: "relative",
                }}
            >
                {coverSrc && (
                    <img
                        src={coverSrc}
                        alt={title}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                )}
                {/* gutter shadow — the book's fold */}
                <div
                    style={{
                        position: "absolute",
                        inset: "0 auto 0 0",
                        width: 18,
                        background:
                            "linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0))",
                        pointerEvents: "none",
                    }}
                />
            </motion.div>

            {/* right: reading column */}
            <div
                style={{
                    flex: "1 1 280px",
                    minWidth: 240,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* reading eyebrow */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 10,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        opacity: 0.6,
                        marginBottom: 12,
                    }}
                >
                    <ReadingDots color="#d9d9d9" />
                    Reading
                </div>

                <div
                    style={{
                        fontSize: 24,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        color: "#fff",
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontSize: 14,
                        opacity: 0.6,
                        marginTop: 4,
                    }}
                >
                    {author}
                </div>

                {/* rating + meta */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        margin: "14px 0 4px",
                    }}
                >
                    <Stars
                        value={Number(rating) || 0}
                        color={bindingColor}
                        animate={!reduced}
                    />
                    {meta.map((m, i) => (
                        <span
                            key={i}
                            style={{
                                fontSize: 11,
                                padding: "3px 9px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.06)",
                                color: "#c8c8c8",
                            }}
                        >
                            {m}
                        </span>
                    ))}
                </div>

                <div
                    style={{
                        height: 1,
                        background: "rgba(255,255,255,0.08)",
                        margin: "16px 0",
                    }}
                />

                {/* excerpt with drop cap + bottom fade to hint scroll */}
                <p
                    className="cc-book-excerpt"
                    style={{
                        fontFamily: SERIF,
                        fontSize: 16,
                        lineHeight: 1.65,
                        color: "#cfcfcf",
                        margin: 0,
                        maxHeight: 260,
                        overflowY: "auto",
                        paddingBottom: 12,
                        maskImage:
                            "linear-gradient(to bottom, black calc(100% - 24px), transparent)",
                        WebkitMaskImage:
                            "linear-gradient(to bottom, black calc(100% - 24px), transparent)",
                    }}
                >
                    <span
                        style={{
                            float: "left",
                            fontFamily: SERIF,
                            fontSize: 52,
                            lineHeight: 0.82,
                            fontWeight: 500,
                            color: bindingColor,
                            paddingRight: 8,
                            marginTop: 4,
                        }}
                    >
                        {(description || "").trim().charAt(0) || "—"}
                    </span>
                    {(description || "").trim().slice(1)}
                </p>

                {readMoreUrl && (
                    <a
                        href={readMoreUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            marginTop: 16,
                            alignSelf: "flex-start",
                            fontSize: 13,
                            fontWeight: 600,
                            color: bindingColor,
                            textDecoration: "none",
                        }}
                    >
                        Read more →
                    </a>
                )}
            </div>
        </motion.div>
    )
}

// ───────────────────────────────────────────────────────────
//  Stars — clipped-overlay fill. No SVG ids, no gradients,
//  no url() references: safe with hex colors, multiple
//  instances, and <base href> pages. The fill sweeps in.
// ───────────────────────────────────────────────────────────
const STAR_SIZE = 15
const STAR_GAP = 2
const STAR_PATH =
    "M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"

function StarRow({ fill }: { fill: string }) {
    return (
        <span
            style={{
                display: "inline-flex",
                gap: STAR_GAP,
                flex: "0 0 auto",
            }}
        >
            {[0, 1, 2, 3, 4].map((i) => (
                <svg
                    key={i}
                    width={STAR_SIZE}
                    height={STAR_SIZE}
                    viewBox="0 0 24 24"
                    style={{ display: "block", flex: "0 0 auto" }}
                >
                    <path d={STAR_PATH} fill={fill} />
                </svg>
            ))}
        </span>
    )
}

function Stars({
    value,
    color,
    animate = true,
}: {
    value: number
    color: string
    animate?: boolean
}) {
    const v = Math.max(0, Math.min(5, value))
    const full = Math.floor(v)
    const frac = v - full
    // Exact pixel width so partial stars line up despite the gaps.
    const clipWidth =
        full * (STAR_SIZE + STAR_GAP) +
        frac * STAR_SIZE -
        (frac === 0 && full > 0 ? STAR_GAP : 0)

    return (
        <span
            role="img"
            aria-label={`Rated ${v} out of 5`}
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
            }}
        >
            <span style={{ position: "relative", display: "inline-flex" }}>
                {/* base layer: empty stars */}
                <StarRow fill="rgba(255,255,255,0.18)" />
                {/* fill layer: clipped to the rating, sweeping in */}
                <motion.span
                    initial={{ width: animate ? 0 : clipWidth }}
                    animate={{ width: clipWidth }}
                    transition={{
                        delay: animate ? 0.3 : 0,
                        duration: animate ? 0.55 : 0,
                        ease: [0.23, 1, 0.32, 1],
                    }}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        overflow: "hidden",
                        display: "inline-flex",
                    }}
                >
                    <StarRow fill={color} />
                </motion.span>
            </span>
            <motion.span
                initial={{ opacity: animate ? 0 : 1 }}
                animate={{ opacity: 1 }}
                transition={{ delay: animate ? 0.65 : 0, duration: 0.3 }}
                style={{ fontSize: 12, fontWeight: 600, color: "#c8c8c8" }}
            >
                {v.toFixed(1)}
            </motion.span>
        </span>
    )
}

function ReadingDots({ color }: { color: string }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "flex-end",
                gap: 1.5,
                height: 9,
            }}
        >
            {[0, 0.2, 0.4].map((delay, i) => (
                <span
                    key={i}
                    style={{
                        width: 2,
                        height: "100%",
                        background: color,
                        borderRadius: 1,
                        transformOrigin: "bottom",
                        animation: `ccPulse 1s ease-in-out ${delay}s infinite`,
                    }}
                />
            ))}
        </span>
    )
}

addPropertyControls(BookComponent, {
    coverImage: { type: ControlType.ResponsiveImage, title: "Cover" },
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "Book Title",
        placeholder: "Enter book title",
    },
    author: {
        type: ControlType.String,
        title: "Author",
        defaultValue: "Author Name",
        placeholder: "Enter author name",
    },
    description: {
        type: ControlType.String,
        title: "Excerpt",
        displayTextArea: true,
        defaultValue:
            "An opening passage waiting to be written. Drop in a short excerpt or blurb here, and it will appear on the reading page when the book is opened.",
    },
    rating: {
        type: ControlType.Number,
        title: "Rating",
        min: 0,
        max: 5,
        step: 0.5,
        defaultValue: 4.5,
        displayStepper: true,
    },
    year: { type: ControlType.String, title: "Year", defaultValue: "2024" },
    pages: {
        type: ControlType.Number,
        title: "Pages",
        min: 0,
        max: 5000,
        step: 1,
        defaultValue: 320,
    },
    genre: {
        type: ControlType.String,
        title: "Genre",
        defaultValue: "Fiction",
    },
    readMoreUrl: {
        type: ControlType.Link,
        title: "Read more",
    },
    showRibbon: {
        type: ControlType.Boolean,
        title: "Ribbon",
        defaultValue: true,
    },
    bindingColor: {
        type: ControlType.Color,
        title: "Binding",
        defaultValue: "#E07A3A",
    },
    backCoverColor: {
        type: ControlType.Color,
        title: "Back Cover",
        defaultValue: "#C0392B",
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 4,
    },
    cornerSmoothing: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.6,
    },
})
