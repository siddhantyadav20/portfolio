import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

/**
 * PHOTO STACK — v2
 * Dark-mode photo widget: hover-revealed glass bar, categories, tap-to-advance
 * (rolls to the next category after the last photo), true squircle corners,
 * and considered loading UX.
 *
 * FIXED IN v2:
 * • BLACK COUNT BUG — every tint in the widget went through hexToRgba(),
 *   which only understood "#rrggbb". Framer color controls frequently hand
 *   over "rgb(...)", "rgba(...)", or a token like "var(--token-…)" instead
 *   (which is why preview and canvas disagreed): parseInt on those returns
 *   NaN → "rgba(NaN,NaN,NaN,α)" → the browser drops the invalid declaration
 *   and the text inherits black. withAlpha() now parses hex AND rgb/rgba,
 *   and falls back to CSS color-mix() for tokens/named colors, so every
 *   format Framer can emit tints correctly.
 * • RESPONSIVENESS — the component only honored numeric width/height props
 *   and silently fell back to 280×280 under fill/relative sizing. It now
 *   stretches to 100% of whatever Framer gives it and measures its real
 *   pixel size with a ResizeObserver (the squircle path and text clamps
 *   need actual pixels), so it tracks fill, fit-content, and breakpoints.
 *
 * NEW IN v2 (UX):
 * • SWIPE — drag left/right anywhere on the photo to advance/go back.
 *   Vertical scrolling is preserved (touchAction: pan-y); a real swipe
 *   suppresses the tap so you never double-advance.
 * • STORY-STYLE TAP ZONES — tapping the left edge (28%) steps back, the
 *   rest advances; going back from the first photo rolls to the previous
 *   category's last photo, mirroring the forward roll.
 * • BACK AFFORDANCE — a mirrored, quieter chevron appears on the left on
 *   hover so the back zone is discoverable.
 * • COUNTER shows "2/4" instead of a bare number, so progress through the
 *   set is legible at a glance.
 * • OPTIONAL AUTOPLAY — off by default. When on, photos advance on a timer;
 *   the active progress dot fills linearly as the timer runs, and it all
 *   pauses while hovering or while an image is still loading.
 * • Keyboard: ←/→ step photos (rolling across categories), ↑/↓ switch
 *   categories, Enter/Space advances.
 *
 * No framer-motion layout/layoutId/popLayout is used — those trigger the
 * projection pass that crashes Framer's optimizer.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 280
 * @framerIntrinsicHeight 280
 */

/* -------------------------------------------------------------------------- */
/*  Squircle path (verified against figma-squircle, equal corners)            */
/* -------------------------------------------------------------------------- */

function squirclePath(
    width: number,
    height: number,
    radius: number,
    smoothing: number
): string {
    const budget = Math.min(width, height) / 2
    radius = Math.min(radius, budget)
    if (radius <= 0) return `M 0 0 H ${width} V ${height} H 0 Z`
    const toRad = (d: number) => (d * Math.PI) / 180
    const maxSmoothing = budget / radius - 1
    const s = Math.max(0, Math.min(smoothing, maxSmoothing))
    const p = Math.min((1 + s) * radius, budget)
    const arcMeasure = 90 * (1 - s)
    const arc = Math.sin(toRad(arcMeasure / 2)) * radius * Math.SQRT2
    const angleAlpha = (90 - arcMeasure) / 2
    const p3p4 = radius * Math.tan(toRad(angleAlpha / 2))
    const angleBeta = 45 * s
    const c = p3p4 * Math.cos(toRad(angleBeta))
    const d = c * Math.tan(toRad(angleBeta))
    const b = (p - arc - c - d) / 3
    const a = 2 * b
    const r = radius
    const n = (x: number) => Number(x.toFixed(4))
    return [
        `M ${n(width - p)} 0`,
        `c ${n(a)} 0 ${n(a + b)} 0 ${n(a + b + c)} ${n(d)}`,
        `a ${n(r)} ${n(r)} 0 0 1 ${n(arc)} ${n(arc)}`,
        `c ${n(d)} ${n(c)} ${n(d)} ${n(b + c)} ${n(d)} ${n(a + b + c)}`,
        `L ${n(width)} ${n(height - p)}`,
        `c 0 ${n(a)} 0 ${n(a + b)} ${n(-d)} ${n(a + b + c)}`,
        `a ${n(r)} ${n(r)} 0 0 1 ${n(-arc)} ${n(arc)}`,
        `c ${n(-c)} ${n(d)} ${n(-(b + c))} ${n(d)} ${n(-(a + b + c))} ${n(d)}`,
        `L ${n(p)} ${n(height)}`,
        `c ${n(-a)} 0 ${n(-(a + b))} 0 ${n(-(a + b + c))} ${n(-d)}`,
        `a ${n(r)} ${n(r)} 0 0 1 ${n(-arc)} ${n(-arc)}`,
        `c ${n(-d)} ${n(-c)} ${n(-d)} ${n(-(b + c))} ${n(-d)} ${n(-(a + b + c))}`,
        `L 0 ${n(p)}`,
        `c 0 ${n(-a)} 0 ${n(-(a + b))} ${n(d)} ${n(-(a + b + c))}`,
        `a ${n(r)} ${n(r)} 0 0 1 ${n(arc)} ${n(-arc)}`,
        `c ${n(c)} ${n(-d)} ${n(b + c)} ${n(-d)} ${n(a + b + c)} ${n(-d)}`,
        `Z`,
    ].join(" ")
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                      */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, React.ReactNode> = {
    person: (
        <>
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        </>
    ),
    paw: (
        <>
            <circle cx="6.5" cy="11" r="1.7" />
            <circle cx="10" cy="7.5" r="1.7" />
            <circle cx="14" cy="7.5" r="1.7" />
            <circle cx="17.5" cy="11" r="1.7" />
            <path d="M8.5 15.5c0-2 1.6-3.2 3.5-3.2s3.5 1.2 3.5 3.2c0 2-1.6 3-3.5 3s-3.5-1-3.5-3z" />
        </>
    ),
    pin: (
        <>
            <path d="M12 21c3.6-4 5.5-6.8 5.5-9.6A5.5 5.5 0 0 0 12 6a5.5 5.5 0 0 0-5.5 5.4C6.5 14.2 8.4 17 12 21z" />
            <circle cx="12" cy="11" r="1.9" />
        </>
    ),
    sparkle: (
        <path d="M12 3.5c.7 4.4 1.6 5.3 6 6-4.4.7-5.3 1.6-6 6-.7-4.4-1.6-5.3-6-6 4.4-.7 5.3-1.6 6-6z" />
    ),
    heart: (
        <path d="M12 19.5C6.8 16 4 12.9 4 9.8 4 7.4 5.9 5.7 8.1 5.7c1.5 0 2.9.8 3.9 2.2 1-1.4 2.4-2.2 3.9-2.2 2.2 0 4.1 1.7 4.1 4.1 0 3.1-2.8 6.2-8 9.7z" />
    ),
    star: (
        <path d="M12 4l2.3 4.9 5.2.6-3.9 3.6 1 5.2L12 16.3 7.4 18.9l1-5.2L4.5 10l5.2-.6L12 4z" />
    ),
    globe: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M4 12h16M12 4c2.4 2.2 3.6 5 3.6 8s-1.2 5.8-3.6 8c-2.4-2.2-3.6-5-3.6-8S9.6 6.2 12 4z" />
        </>
    ),
    camera: (
        <>
            <path d="M4 8.5h3l1.4-2h7.2L17 8.5h3v9H4z" />
            <circle cx="12" cy="13" r="3" />
        </>
    ),
    grid: (
        <>
            <rect x="4.5" y="4.5" width="6" height="6" rx="1.6" />
            <rect x="13.5" y="4.5" width="6" height="6" rx="1.6" />
            <rect x="4.5" y="13.5" width="6" height="6" rx="1.6" />
            <rect x="13.5" y="13.5" width="6" height="6" rx="1.6" />
        </>
    ),
    bolt: <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8z" />,
    moon: <path d="M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z" />,
}

const ICON_KEYS = Object.keys(ICONS)

function Icon({
    name,
    size = 18,
    stroke,
}: {
    name: string
    size?: number
    stroke: string
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={stroke}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block" }}
        >
            {ICONS[name] ?? ICONS.grid}
        </svg>
    )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type ImgLike = string | { src?: string; alt?: string } | null | undefined

function getSrc(img: ImgLike): string | null {
    if (!img) return null
    if (typeof img === "string") return img || null
    return img.src || null
}
function getAlt(img: ImgLike): string {
    if (img && typeof img === "object" && img.alt) return img.alt
    return ""
}

/**
 * Apply an alpha to ANY color Framer can hand us.
 *
 * Framer's color control does not reliably emit hex: depending on how the
 * color was picked (palette token, eyedropper, alpha slider) it can be
 * "#f3f3f3", "rgb(243, 243, 243)", "rgba(243,243,243,1)", or
 * "var(--token-…, rgb(…))". The old hexToRgba() choked on everything but
 * hex — parseInt returned NaN, "rgba(NaN,NaN,NaN,α)" is invalid CSS, the
 * browser dropped the declaration, and text fell back to inherited black.
 * That is exactly the preview-vs-render mismatch: the two surfaces emit
 * different formats for the same swatch.
 */
function withAlpha(color: string, alpha: number): string {
    const c = (color || "").trim()
    if (!c) return `rgba(34,34,34,${alpha})`

    // #rgb / #rgba / #rrggbb / #rrggbbaa
    if (c[0] === "#") {
        let h = c.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        if (h.length === 8) h = h.slice(0, 6) // ignore embedded alpha; ours wins
        const v = parseInt(h, 16)
        if (!Number.isNaN(v) && h.length === 6) {
            const r = (v >> 16) & 255
            const g = (v >> 8) & 255
            const b = v & 255
            return `rgba(${r}, ${g}, ${b}, ${alpha})`
        }
    }

    // rgb(…) / rgba(…) — pull the first three numbers
    const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
    if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`

    // Tokens (var(--…)), named colors, oklch, anything else: let the
    // browser do the tinting. color-mix ships in all evergreen browsers.
    return `color-mix(in srgb, ${c} ${Math.round(alpha * 100)}%, transparent)`
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

interface Category {
    name?: string
    icon?: string
    photos?: ImgLike[]
}

interface Props {
    width?: number | string
    height?: number | string
    categories: Category[]
    primaryColor: string
    secondaryColor: string
    cornerRadius: number
    cornerSmoothing: number
    minLoaderMs: number
    kenBurns: boolean
    showHints: boolean
    autoPlay: boolean
    autoPlaySeconds: number
}

const SWIPE_PX = 42 // horizontal travel that counts as a swipe
const BACK_ZONE = 0.28 // left fraction of the card that steps back on tap

export default function PhotoStack(props: Props) {
    const {
        categories = [],
        primaryColor = "#222222",
        secondaryColor = "#f3f3f3",
        cornerRadius = 48,
        cornerSmoothing = 1,
        minLoaderMs = 280,
        kenBurns = true,
        showHints = true,
        autoPlay = false,
        autoPlaySeconds = 4,
    } = props

    const reduceMotion = useReducedMotion()
    const onCanvas = RenderTarget.current() === RenderTarget.canvas

    /* ── Responsive sizing ──
       The wrapper stretches to whatever Framer gives it (numbers pass
       through; "fill"/percent strings become 100%), and a ResizeObserver
       reports the true pixel box — the squircle path and the text clamps
       are geometry and need real pixels. */
    const rootRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState(() => ({
        w:
            typeof props.width === "number" && props.width > 0
                ? props.width
                : 280,
        h:
            typeof props.height === "number" && props.height > 0
                ? props.height
                : 280,
    }))
    const W = Math.max(1, size.w)
    const H = Math.max(1, size.h)

    useEffect(() => {
        const el = rootRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect
            if (!r || r.width < 1 || r.height < 1) return
            setSize((prev) =>
                Math.abs(prev.w - r.width) < 0.5 &&
                Math.abs(prev.h - r.height) < 0.5
                    ? prev
                    : { w: r.width, h: r.height }
            )
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const cats = useMemo(() => {
        const list = (categories || []).map((c, i) => ({
            name: c?.name || `Set ${i + 1}`,
            icon: c?.icon || ICON_KEYS[i % ICON_KEYS.length],
            photos: (c?.photos || [])
                .map((p) => ({ src: getSrc(p), alt: getAlt(p) }))
                .filter((p) => !!p.src) as { src: string; alt: string }[],
        }))
        return list.filter((c) => c.photos.length > 0)
    }, [categories])

    const [catIndex, setCatIndex] = useState(0)
    const [positions, setPositions] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [loadedSrcs, setLoadedSrcs] = useState<Set<string>>(new Set())
    const [hovered, setHovered] = useState(false)
    const [hintSeen, setHintSeen] = useState(false)
    const [dir, setDir] = useState(1)
    const loadStart = useRef(0)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const safeCat = cats.length ? catIndex % cats.length : 0
    const category = cats[safeCat]
    const photoCount = category ? category.photos.length : 0
    const photoIndex = photoCount ? (positions[safeCat] ?? 0) % photoCount : 0
    const current = category ? category.photos[photoIndex] : null
    const currentSrc = current?.src ?? null

    useEffect(() => {
        setPositions((prev) =>
            prev.length === cats.length
                ? prev
                : cats.map((_, i) => prev[i] ?? 0)
        )
    }, [cats.length])

    useEffect(() => {
        if (catIndex >= cats.length && cats.length) setCatIndex(0)
    }, [cats.length, catIndex])

    /* Loading: hold the loader until the active src is ready, with a minimum
       on-screen time so it can't flicker. */
    useEffect(() => {
        if (!currentSrc) {
            setLoading(false)
            return
        }
        if (loadedSrcs.has(currentSrc)) {
            setLoading(false)
            return
        }
        setLoading(true)
        loadStart.current = Date.now()
        let cancelled = false
        const img = new Image()
        const done = () => {
            if (cancelled) return
            const wait = Math.max(
                0,
                minLoaderMs - (Date.now() - loadStart.current)
            )
            if (hideTimer.current) clearTimeout(hideTimer.current)
            hideTimer.current = setTimeout(() => {
                if (cancelled) return
                setLoadedSrcs((s) => new Set(s).add(currentSrc))
                setLoading(false)
            }, wait)
        }
        img.onload = done
        img.onerror = done
        img.src = currentSrc
        if (img.complete) done()
        return () => {
            cancelled = true
            if (hideTimer.current) clearTimeout(hideTimer.current)
        }
    }, [currentSrc, minLoaderMs])

    /* Warm the neighbors (next photo AND previous photo — swiping goes both
       ways now — plus the first of the next category) for snappy taps. */
    useEffect(() => {
        if (!cats.length) return
        const warm = (src: string | null | undefined) => {
            if (src && !loadedSrcs.has(src)) {
                const img = new Image()
                img.src = src
            }
        }
        if (photoCount > 1 && photoIndex < photoCount - 1)
            warm(category!.photos[photoIndex + 1]?.src)
        else warm(cats[(safeCat + 1) % cats.length]?.photos[0]?.src)
        if (photoIndex > 0) warm(category!.photos[photoIndex - 1]?.src)
        else {
            const prevCat = cats[(safeCat - 1 + cats.length) % cats.length]
            warm(prevCat?.photos[prevCat.photos.length - 1]?.src)
        }
    }, [cats, category, safeCat, photoIndex, photoCount, loadedSrcs])

    /* Tap photo → next photo; after the last photo, roll to the next category. */
    const advance = useCallback(() => {
        if (!cats.length) return
        if (showHints) setHintSeen(true)
        setDir(1)
        if (photoIndex >= photoCount - 1) {
            const nextCat = (safeCat + 1) % cats.length
            setCatIndex(nextCat)
            setPositions((prev) => {
                const n = [...prev]
                n[nextCat] = 0
                return n
            })
        } else {
            setPositions((prev) => {
                const n = [...prev]
                n[safeCat] = (n[safeCat] ?? 0) + 1
                return n
            })
        }
    }, [cats.length, photoIndex, photoCount, safeCat, showHints])

    /* Mirror of advance: step back; before the first photo, roll to the
       previous category's LAST photo. */
    const retreat = useCallback(() => {
        if (!cats.length) return
        if (showHints) setHintSeen(true)
        setDir(-1)
        if (photoIndex <= 0) {
            const prevCat = (safeCat - 1 + cats.length) % cats.length
            setCatIndex(prevCat)
            setPositions((prev) => {
                const n = [...prev]
                n[prevCat] = Math.max(0, cats[prevCat].photos.length - 1)
                return n
            })
        } else {
            setPositions((prev) => {
                const n = [...prev]
                n[safeCat] = (n[safeCat] ?? 0) - 1
                return n
            })
        }
    }, [cats, photoIndex, safeCat, showHints])

    const goToPhoto = useCallback(
        (i: number) => {
            setDir(i >= photoIndex ? 1 : -1)
            setPositions((prev) => {
                const n = [...prev]
                n[safeCat] = i
                return n
            })
        },
        [photoIndex, safeCat]
    )

    const selectCategory = useCallback(
        (i: number) => {
            setDir(i >= safeCat ? 1 : -1)
            setCatIndex(i)
            setHintSeen(true)
        },
        [safeCat]
    )

    /* ── Swipe gestures ──
       Pointer-based so mouse-drag works too. Vertical scrolling stays free
       (touchAction: pan-y); a completed swipe raises a flag that the click
       handler consumes, so a swipe never also counts as a tap. */
    const swipe = useRef({ x: 0, y: 0, active: false })
    const swipedRef = useRef(false)

    const onPointerDown = (e: React.PointerEvent) => {
        swipe.current = { x: e.clientX, y: e.clientY, active: true }
    }
    const onPointerUp = (e: React.PointerEvent) => {
        if (!swipe.current.active) return
        swipe.current.active = false
        const dx = e.clientX - swipe.current.x
        const dy = e.clientY - swipe.current.y
        if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.4) {
            swipedRef.current = true
            if (dx < 0) advance()
            else retreat()
        }
    }

    /* Story-style tap zones: left edge steps back, everything else advances. */
    const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
        if (swipedRef.current) {
            swipedRef.current = false
            return
        }
        const rect = e.currentTarget.getBoundingClientRect()
        const fx = (e.clientX - rect.left) / Math.max(1, rect.width)
        if (fx < BACK_ZONE) retreat()
        else advance()
    }

    /* ── Autoplay ──
       Off by default. Advances on a timer that pauses while hovering, while
       an image is loading, and never runs on the Framer canvas. The timer
       naturally restarts whenever the photo changes (currentSrc dep). */
    const playing =
        autoPlay && !onCanvas && !hovered && !loading && cats.length > 0
    useEffect(() => {
        if (!playing) return
        const secs = Math.max(1.5, autoPlaySeconds || 4)
        const t = setTimeout(advance, secs * 1000)
        return () => clearTimeout(t)
    }, [playing, autoPlaySeconds, advance, currentSrc])

    const path = useMemo(
        () => squirclePath(W, H, cornerRadius, cornerSmoothing),
        [W, H, cornerRadius, cornerSmoothing]
    )

    const ink = secondaryColor
    const glassBg = withAlpha(primaryColor, 0.4)
    const glassBorder = withAlpha(secondaryColor, 0.16)
    const dur = reduceMotion ? 0.001 : 0.46

    /* Root sizing: numbers pass through, anything else fills the parent. */
    const rootW = typeof props.width === "number" ? props.width : "100%"
    const rootH = typeof props.height === "number" ? props.height : "100%"

    /* ---------------------------- Empty state ---------------------------- */
    if (!cats.length) {
        return (
            <div
                ref={rootRef}
                style={{
                    width: rootW,
                    height: rootH,
                    clipPath: `path('${path}')`,
                    background: primaryColor,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    fontFamily:
                        "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                    textAlign: "center",
                    padding: 28,
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        border: `1.5px dashed ${withAlpha(secondaryColor, 0.35)}`,
                    }}
                >
                    <Icon
                        name="camera"
                        size={22}
                        stroke={withAlpha(ink, 0.7)}
                    />
                </div>
                <div style={{ color: ink, fontSize: 14, fontWeight: 600 }}>
                    Add your photos
                </div>
                <div
                    style={{
                        color: withAlpha(ink, 0.55),
                        fontSize: 12,
                        lineHeight: 1.45,
                        maxWidth: 184,
                    }}
                >
                    Open the right panel, drop images into a category, and they
                    appear here.
                </div>
            </div>
        )
    }

    const barVisible = hovered || onCanvas
    // active highlight offset inside the category pill (no layout projection)
    const TAB = 36
    const GAP = 2
    const PAD = 5
    const indicatorX = PAD + safeCat * (TAB + GAP)

    return (
        <div
            ref={rootRef}
            style={{
                width: rootW,
                height: rootH,
                position: "relative",
                fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                filter: `drop-shadow(0 18px 38px ${withAlpha("#000000", 0.5)})`,
            }}
        >
            <motion.div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleTap}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (swipe.current.active = false)}
                tabIndex={0}
                role="button"
                aria-label={`${category!.name}, photo ${photoIndex + 1} of ${photoCount}. Activate for the next photo; the left edge or a right swipe goes back.`}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        advance()
                    } else if (e.key === "ArrowRight") {
                        advance()
                    } else if (e.key === "ArrowLeft") {
                        retreat()
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault()
                        selectCategory((safeCat + 1) % cats.length)
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault()
                        selectCategory(
                            (safeCat - 1 + cats.length) % cats.length
                        )
                    }
                }}
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    clipPath: `path('${path}')`,
                    background: primaryColor,
                    cursor: "pointer",
                    overflow: "hidden",
                    userSelect: "none",
                    outline: "none",
                    boxShadow: `inset 0 0 0 1px ${withAlpha(secondaryColor, 0.06)}, inset 0 1px 0 ${withAlpha(secondaryColor, 0.1)}`,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "pan-y",
                }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
                {/* Photo layers */}
                <AnimatePresence initial={false} custom={dir}>
                    <motion.div
                        key={currentSrc || "none"}
                        custom={dir}
                        initial={
                            reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, scale: 1.08, x: dir * 26 }
                        }
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={
                            reduceMotion
                                ? { opacity: 0 }
                                : {
                                      opacity: 0,
                                      scale: 1.02,
                                      x: dir * -20,
                                      filter: "blur(3px)",
                                  }
                        }
                        transition={{ duration: dur, ease: [0.22, 1, 0.36, 1] }}
                        style={{ position: "absolute", inset: 0 }}
                    >
                        {currentSrc && (
                            <motion.img
                                src={currentSrc}
                                alt={current?.alt || ""}
                                draggable={false}
                                decoding="async"
                                initial={
                                    kenBurns && !reduceMotion
                                        ? { scale: 1 }
                                        : undefined
                                }
                                animate={
                                    kenBurns && !reduceMotion
                                        ? { scale: 1.08 }
                                        : undefined
                                }
                                transition={{ duration: 9, ease: "easeOut" }}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                }}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Scrims: top for the label, bottom for the bar */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `linear-gradient(to bottom, ${withAlpha(
                            primaryColor,
                            0.5
                        )} 0%, transparent 24%, transparent 56%, ${withAlpha(
                            primaryColor,
                            0.62
                        )} 100%)`,
                        opacity: barVisible ? 1 : 0.7,
                        transition: "opacity 0.3s ease",
                    }}
                />

                {/* Indeterminate top load bar */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                overflow: "hidden",
                                pointerEvents: "none",
                            }}
                        >
                            <motion.div
                                initial={{ x: "-45%" }}
                                animate={{ x: "150%" }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 1.1,
                                    ease: "easeInOut",
                                }}
                                style={{
                                    width: "40%",
                                    height: "100%",
                                    background: ink,
                                    borderRadius: 99,
                                    opacity: 0.9,
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loader overlay */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "grid",
                                placeItems: "center",
                                background: withAlpha(primaryColor, 0.5),
                                backdropFilter: "blur(7px)",
                                WebkitBackdropFilter: "blur(7px)",
                                pointerEvents: "none",
                            }}
                        >
                            <motion.div
                                initial={{ x: "-120%" }}
                                animate={{ x: "120%" }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 1.3,
                                    ease: "easeInOut",
                                }}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: `linear-gradient(105deg, transparent 35%, ${withAlpha(
                                        secondaryColor,
                                        0.08
                                    )} 50%, transparent 65%)`,
                                }}
                            />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 0.85,
                                    ease: "linear",
                                }}
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: "50%",
                                    border: `2.5px solid ${withAlpha(
                                        secondaryColor,
                                        0.18
                                    )}`,
                                    borderTopColor: ink,
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top-left label — "People · 2/4" */}
                <div
                    style={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        height: 32,
                        paddingInline: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        borderRadius: 999,
                        background: glassBg,
                        border: `1px solid ${glassBorder}`,
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        pointerEvents: "none",
                        maxWidth: W - 32,
                    }}
                >
                    <Icon name={category!.icon!} size={14} stroke={ink} />
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={`${safeCat}-${photoIndex}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.22 }}
                            style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: 5,
                                whiteSpace: "nowrap",
                            }}
                        >
                            <span
                                style={{
                                    color: ink,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    letterSpacing: -0.1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: W - 110,
                                }}
                            >
                                {category!.name}
                            </span>
                            <span
                                style={{
                                    color: withAlpha(ink, 0.6),
                                    fontSize: 12,
                                    fontWeight: 600,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {photoIndex + 1}
                                <span style={{ color: withAlpha(ink, 0.35) }}>
                                    /{photoCount}
                                </span>
                            </span>
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Back affordance — mirrored, quieter, marks the back zone */}
                <AnimatePresence>
                    {barVisible && (
                        <motion.div
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 0.65, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.25 }}
                            style={{
                                position: "absolute",
                                left: 12,
                                top: "50%",
                                y: "-50%",
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                display: "grid",
                                placeItems: "center",
                                background: glassBg,
                                border: `1px solid ${glassBorder}`,
                                backdropFilter: "blur(12px)",
                                WebkitBackdropFilter: "blur(12px)",
                                pointerEvents: "none",
                            }}
                        >
                            <svg
                                width={13}
                                height={13}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={ink}
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M15 6l-6 6 6 6" />
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Next-affordance chevron */}
                <AnimatePresence>
                    {barVisible && (
                        <motion.div
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 6 }}
                            transition={{ duration: 0.25 }}
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                y: "-50%",
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                display: "grid",
                                placeItems: "center",
                                background: glassBg,
                                border: `1px solid ${glassBorder}`,
                                backdropFilter: "blur(12px)",
                                WebkitBackdropFilter: "blur(12px)",
                                pointerEvents: "none",
                            }}
                        >
                            <motion.svg
                                width={15}
                                height={15}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={ink}
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                animate={
                                    reduceMotion
                                        ? undefined
                                        : { x: [0, 2.5, 0] }
                                }
                                transition={{ repeat: Infinity, duration: 1.4 }}
                            >
                                <path d="M9 6l6 6-6 6" />
                            </motion.svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* First-hover hint */}
                <AnimatePresence>
                    {showHints && hovered && !hintSeen && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                position: "absolute",
                                left: "50%",
                                x: "-50%",
                                top: 56,
                                paddingInline: 12,
                                height: 30,
                                display: "flex",
                                alignItems: "center",
                                whiteSpace: "nowrap",
                                borderRadius: 999,
                                background: ink,
                                color: primaryColor,
                                fontSize: 11.5,
                                fontWeight: 600,
                                pointerEvents: "none",
                                boxShadow: `0 8px 24px ${withAlpha("#000000", 0.35)}`,
                            }}
                        >
                            Tap or swipe to flip
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating control bar */}
                <AnimatePresence>
                    {barVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            transition={{
                                duration: 0.32,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            style={{
                                position: "absolute",
                                left: "50%",
                                bottom: 14,
                                x: "-50%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 9,
                                pointerEvents: "auto",
                            }}
                        >
                            {/* progress dots for the current category — the
                                active dot doubles as the autoplay timer */}
                            {photoCount > 1 && (
                                <div style={{ display: "flex", gap: 5 }}>
                                    {Array.from({ length: photoCount }).map(
                                        (_, i) => {
                                            const active = i === photoIndex
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        goToPhoto(i)
                                                    }}
                                                    aria-label={`Photo ${i + 1}`}
                                                    style={{
                                                        position: "relative",
                                                        overflow: "hidden",
                                                        width: active ? 18 : 6,
                                                        height: 6,
                                                        padding: 0,
                                                        border: "none",
                                                        cursor: "pointer",
                                                        borderRadius: 99,
                                                        background: active
                                                            ? autoPlay &&
                                                              !onCanvas
                                                                ? withAlpha(
                                                                      ink,
                                                                      0.35
                                                                  )
                                                                : ink
                                                            : withAlpha(
                                                                  ink,
                                                                  0.35
                                                              ),
                                                        transition:
                                                            "width 0.3s ease, background 0.3s ease",
                                                    }}
                                                >
                                                    {active &&
                                                        autoPlay &&
                                                        !onCanvas && (
                                                            <motion.span
                                                                key={`${safeCat}-${photoIndex}-${playing ? "run" : "hold"}`}
                                                                initial={{
                                                                    scaleX: 0,
                                                                }}
                                                                animate={{
                                                                    scaleX: playing
                                                                        ? 1
                                                                        : 0,
                                                                }}
                                                                transition={{
                                                                    duration:
                                                                        playing
                                                                            ? Math.max(
                                                                                  1.5,
                                                                                  autoPlaySeconds ||
                                                                                      4
                                                                              )
                                                                            : 0.001,
                                                                    ease: "linear",
                                                                }}
                                                                style={{
                                                                    position:
                                                                        "absolute",
                                                                    inset: 0,
                                                                    borderRadius: 99,
                                                                    background:
                                                                        ink,
                                                                    transformOrigin:
                                                                        "left",
                                                                    display:
                                                                        "block",
                                                                }}
                                                            />
                                                        )}
                                                </button>
                                            )
                                        }
                                    )}
                                </div>
                            )}

                            {/* category pill with sliding highlight (transform only) */}
                            <div
                                style={{
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: GAP,
                                    padding: PAD,
                                    borderRadius: 999,
                                    background: glassBg,
                                    border: `1px solid ${glassBorder}`,
                                    backdropFilter: "blur(20px)",
                                    WebkitBackdropFilter: "blur(20px)",
                                    boxShadow: `0 10px 30px ${withAlpha(
                                        "#000000",
                                        0.34
                                    )}, inset 0 1px 0 ${withAlpha(
                                        secondaryColor,
                                        0.1
                                    )}`,
                                }}
                            >
                                <motion.div
                                    animate={{ x: indicatorX }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 520,
                                        damping: 36,
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: PAD,
                                        width: TAB,
                                        height: TAB,
                                        borderRadius: 999,
                                        background: ink,
                                    }}
                                />
                                {cats.map((c, i) => {
                                    const active = i === safeCat
                                    return (
                                        <button
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                selectCategory(i)
                                            }}
                                            aria-label={c.name}
                                            aria-pressed={active}
                                            style={{
                                                position: "relative",
                                                zIndex: 1,
                                                width: TAB,
                                                height: TAB,
                                                border: "none",
                                                background: "transparent",
                                                cursor: "pointer",
                                                borderRadius: 999,
                                                display: "grid",
                                                placeItems: "center",
                                                padding: 0,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: "grid",
                                                    placeItems: "center",
                                                    opacity: active ? 1 : 0.6,
                                                    transition:
                                                        "opacity 0.2s ease",
                                                }}
                                            >
                                                <Icon
                                                    name={c.icon}
                                                    size={18}
                                                    stroke={
                                                        active
                                                            ? primaryColor
                                                            : ink
                                                    }
                                                />
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Property controls                                                           */
/* -------------------------------------------------------------------------- */

PhotoStack.displayName = "Photo Stack"

const defaultCat = (name: string, icon: string) => ({ name, icon, photos: [] })

addPropertyControls(PhotoStack, {
    categories: {
        type: ControlType.Array,
        title: "Categories",
        maxCount: 6,
        control: {
            type: ControlType.Object,
            controls: {
                name: {
                    type: ControlType.String,
                    title: "Name",
                    defaultValue: "Set",
                },
                icon: {
                    type: ControlType.Enum,
                    title: "Icon",
                    options: ICON_KEYS,
                    optionTitles: ICON_KEYS.map(
                        (k) => k[0].toUpperCase() + k.slice(1)
                    ),
                    defaultValue: "grid",
                },
                photos: {
                    type: ControlType.Array,
                    title: "Photos",
                    maxCount: 4,
                    control: { type: ControlType.ResponsiveImage },
                },
            },
        },
        defaultValue: [
            defaultCat("People", "person"),
            defaultCat("Pets", "paw"),
            defaultCat("Places", "pin"),
            defaultCat("Moments", "sparkle"),
        ],
    },
    primaryColor: {
        type: ControlType.Color,
        title: "Primary",
        defaultValue: "#222222",
    },
    secondaryColor: {
        type: ControlType.Color,
        title: "Secondary",
        defaultValue: "#f3f3f3",
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 140,
        step: 1,
        defaultValue: 48,
        displayStepper: true,
    },
    cornerSmoothing: {
        type: ControlType.Number,
        title: "Squircle",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
    },
    minLoaderMs: {
        type: ControlType.Number,
        title: "Min loader",
        min: 0,
        max: 1500,
        step: 20,
        unit: "ms",
        defaultValue: 280,
    },
    kenBurns: {
        type: ControlType.Boolean,
        title: "Slow zoom",
        defaultValue: true,
    },
    showHints: {
        type: ControlType.Boolean,
        title: "Hints",
        defaultValue: true,
    },
    autoPlay: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: false,
    },
    autoPlaySeconds: {
        type: ControlType.Number,
        title: "Every",
        min: 1.5,
        max: 15,
        step: 0.5,
        unit: "s",
        defaultValue: 4,
        hidden: (p: any) => !p.autoPlay,
    },
})
