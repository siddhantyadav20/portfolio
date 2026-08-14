import { useState, useEffect, useRef, useCallback, useMemo, useId } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, AnimatePresence } from "framer-motion"

/**
 * TURBULENCE CANVAS
 * A dark-mode drawing surface whose ink breathes through an animated
 * feTurbulence + feDisplacementMap filter — the wobble settles when idle and
 * swells while you draw. Squircle frame, hover-revealed glass toolbar, brush
 * sizes, eraser, undo/redo, and clipboard export.
 *
 * No framer-motion layout/layoutId/popLayout (those crash Framer's optimizer).
 *
 * CHANGELOG (this revision):
 * - FIX: parts of the UI rendered black instead of the configured colors.
 *   Every tint went through hexToRgba(), which only understood "#rrggbb" —
 *   but Framer's color controls frequently emit "rgb(…)", "rgba(…)", or a
 *   token like "var(--token-…)" depending on how the swatch was picked.
 *   parseInt on those returns NaN → "rgba(NaN,NaN,NaN,α)" → the browser
 *   drops the invalid declaration and the paint falls back to black.
 *   withAlpha() now parses hex AND rgb/rgba, and resolves anything else
 *   (tokens, named colors, oklch) through a hidden probe element via
 *   getComputedStyle, so every format tints correctly.
 * - FIX (same family): colors are also painted onto the <canvas>, where even
 *   a VALID "var(--token-…)" is not usable — 2D contexts can't resolve CSS
 *   variables, so strokeStyle silently stays black. solidColor() resolves
 *   every color to a concrete rgb before it is stored in a stroke, drawn as
 *   the starter doodle, or used as the export background.
 *
 * CHANGELOG (previous revision):
 * - FIX: ink rendered black on iOS. The displacement filter was applied to the
 *   wrapping <div>; filtering a transparent HTML box trips WebKit's "fill it
 *   black" bug. The filter now lives on the <canvas> raster, and the wobble
 *   auto-disables on iOS (toggle: "Live wobble") so the ink is always correct.
 * - FIX: surface didn't "stick" on mobile — the parent canvas panned under the
 *   finger. React touch listeners are passive, so preventDefault was a no-op.
 *   Added native non-passive touchstart/touchmove listeners that cancel scroll.
 * - NEW: quadratic stroke smoothing + coalesced pointer events (silky strokes,
 *   especially on high-refresh touch screens).
 * - NEW: redo, plus ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z.
 * - NEW: subtle haptics on clear / copy (where supported).
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 320
 * @framerIntrinsicHeight 320
 */

/* -------------------------------------------------------------------------- */
/*  Squircle (verified against figma-squircle, equal corners)                 */
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
/*  Color helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Hidden probe element used to let the BROWSER resolve any CSS color —
 * tokens (var(--…)), named colors, oklch, whatever — into a concrete
 * "rgb(r, g, b)" via getComputedStyle. Created lazily, reused forever.
 */
let colorProbe: HTMLSpanElement | null = null
function probeResolve(c: string): string | null {
    try {
        if (typeof document === "undefined" || !document.body) return null
        if (!colorProbe) {
            colorProbe = document.createElement("span")
            colorProbe.style.display = "none"
            colorProbe.setAttribute("aria-hidden", "true")
            document.body.appendChild(colorProbe)
        }
        colorProbe.style.color = ""
        colorProbe.style.color = c
        // If the browser rejected the value entirely, color stays empty and
        // computed style falls back to inherited — still a usable rgb().
        const computed = getComputedStyle(colorProbe).color
        return computed && computed !== c ? computed : computed || null
    } catch {
        return null
    }
}

/** Parse "#rgb/#rrggbb/#rrggbbaa" or "rgb()/rgba()" into [r, g, b], else null. */
function parseRgb(color: string): [number, number, number] | null {
    const c = (color || "").trim()
    if (!c) return null
    if (c[0] === "#") {
        let h = c.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((ch) => ch + ch)
                .join("")
        if (h.length === 8) h = h.slice(0, 6)
        if (h.length === 6) {
            const v = parseInt(h, 16)
            if (!Number.isNaN(v))
                return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
        }
        return null
    }
    const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
    return null
}

/**
 * Apply an alpha to ANY color Framer can hand us.
 *
 * Framer's color control does not reliably emit hex: depending on how the
 * color was picked (palette token, eyedropper, alpha slider) it can be
 * "#f3f3f3", "rgb(243, 243, 243)", "rgba(…)", or "var(--token-…)". The old
 * hexToRgba() choked on everything but hex — parseInt returned NaN,
 * "rgba(NaN,NaN,NaN,α)" is invalid CSS, the browser dropped the declaration,
 * and the paint fell back to black.
 */
function withAlpha(color: string, alpha: number): string {
    const direct = parseRgb(color)
    if (direct)
        return `rgba(${direct[0]}, ${direct[1]}, ${direct[2]}, ${alpha})`
    const resolved = probeResolve(color)
    if (resolved) {
        const viaProbe = parseRgb(resolved)
        if (viaProbe)
            return `rgba(${viaProbe[0]}, ${viaProbe[1]}, ${viaProbe[2]}, ${alpha})`
    }
    // Last resort (SSR, exotic value): let CSS tint it. Note this branch is
    // fine for DOM styles but NOT for canvas — canvas callers go through
    // solidColor()/withAlpha only after probeResolve has had a chance.
    return `color-mix(in srgb, ${color || "#222222"} ${Math.round(
        alpha * 100
    )}%, transparent)`
}

/**
 * Resolve any CSS color to a CONCRETE value that a 2D canvas can use.
 * Canvas contexts cannot resolve var(--token-…) at all — strokeStyle keeps
 * its previous value (black by default) and fails silently. Every color that
 * touches the canvas (brush strokes, starter doodle, export background) must
 * pass through here first.
 */
function solidColor(color: string): string {
    const direct = parseRgb(color)
    if (direct) return `rgb(${direct[0]}, ${direct[1]}, ${direct[2]})`
    return probeResolve(color) || color || "#f3f3f3"
}

function buzz(ms: number) {
    try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator)
            (navigator as any).vibrate?.(ms)
    } catch {}
}

const SIZES = [4, 9, 16]
const SIZE_LABELS = ["Small", "Medium", "Large"]

function Ico({
    d,
    stroke,
    size = 18,
    fill = "none",
    sw = 1.7,
}: {
    d: string
    stroke: string
    size?: number
    fill?: string
    sw?: number
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "block" }}
        >
            <path d={d} />
        </svg>
    )
}

const PATHS = {
    eraser: "M7 17h11M16.5 6.5 9 14l3.5 3.5L20 10zM9 14 5.5 10.5a1.5 1.5 0 0 1 0-2.1l3-3a1.5 1.5 0 0 1 2.1 0L14 8.5",
    undo: "M9 7 4.5 11.5 9 16M5 11.5h9.5a4.5 4.5 0 0 1 0 9H9",
    redo: "M15 7 19.5 11.5 15 16M19 11.5H9.5a4.5 4.5 0 0 0 0 9H15",
    trash: "M4 7h16M9.5 7V5.2c0-.6.5-1.2 1.2-1.2h2.6c.7 0 1.2.6 1.2 1.2V7M6.5 7l.8 12c0 .8.6 1.4 1.4 1.4h6.6c.8 0 1.4-.6 1.4-1.4l.8-12",
    copy: "M9 9h11v11H9zM5 15H4V4h11v1",
    check: "M5 13l4 4L19 7",
}

/* -------------------------------------------------------------------------- */
/*  Cat doodle — paths + sampler used for the live-drawing intro animation    */
/* -------------------------------------------------------------------------- */

const CAT_PATHS = [
    "M215,158 A55,55 0 1 1 105,158 A55,55 0 1 1 215,158", // face
    "M118,121 L105,83 L138,103", // left ear
    "M202,115 L215,83 L182,103", // right ear
    "M147,151 A7,7 0 1 1 133,151 A7,7 0 1 1 147,151", // left eye
    "M187,151 A7,7 0 1 1 173,151 A7,7 0 1 1 187,151", // right eye
    "M155,171 L160,166 L165,171 Z", // nose
    "M155,171 Q148,181 140,178", // left mouth curl
    "M165,171 Q172,181 180,178", // right mouth curl
]

type Pt = { x: number; y: number }

function sampleCatStrokes(): Pt[][] {
    const svgNS = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(svgNS, "svg")
    svg.style.position = "absolute"
    svg.style.width = "0"
    svg.style.height = "0"
    svg.style.overflow = "hidden"
    svg.setAttribute("aria-hidden", "true")
    document.body.appendChild(svg)
    try {
        return CAT_PATHS.map((d) => {
            const p = document.createElementNS(svgNS, "path")
            p.setAttribute("d", d)
            svg.appendChild(p)
            const len = p.getTotalLength()
            const stepCount = Math.max(6, Math.round(len / 3))
            const pts: Pt[] = []
            for (let i = 0; i <= stepCount; i++) {
                const pt = p.getPointAtLength((len * i) / stepCount)
                pts.push({ x: pt.x, y: pt.y })
            }
            return pts
        })
    } finally {
        document.body.removeChild(svg)
    }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

type Stroke = {
    mode: "draw" | "erase"
    color: string
    size: number
    points: Pt[]
}

interface Props {
    width?: number
    height?: number
    primaryColor: string
    canvasColor: string
    secondaryColor: string
    palette: string[]
    brushColor: string
    brushSize: number
    cornerRadius: number
    cornerSmoothing: number
    wobbleIdle: number
    wobbleActive: number
    wobbleScale: number
    liveWobble: boolean
    starterDoodle: boolean
    showGrid: boolean
    showHints: boolean
    exportTransparent: boolean
}

export default function TurbulenceCanvas(props: Props) {
    const {
        primaryColor = "#222222",
        canvasColor = "#1a1a1a",
        secondaryColor = "#f3f3f3",
        palette = [
            "#F3F3F3",
            "#FF6B6B",
            "#FFD166",
            "#6BCB77",
            "#5B8CFF",
            "#C77DFF",
        ],
        brushColor = "#F3F3F3",
        brushSize = 9,
        cornerRadius = 48,
        cornerSmoothing = 1,
        wobbleIdle = 0.3,
        wobbleActive = 0.85,
        wobbleScale = 6,
        liveWobble = true,
        starterDoodle = true,
        showGrid = true,
        showHints = true,
        exportTransparent = false,
    } = props

    const W =
        typeof props.width === "number" && props.width > 0 ? props.width : 320
    const H =
        typeof props.height === "number" && props.height > 0
            ? props.height
            : 320

    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    const rawId = useId()
    const filterId = `tc-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`

    // iOS renders SVG filters on HTML/canvas as black — keep the ink correct
    // there and treat the wobble as a desktop/Android enhancement.
    const isIOS = useMemo(() => {
        if (typeof navigator === "undefined") return false
        const ua = navigator.userAgent || ""
        return (
            /iP(hone|od|ad)/.test(ua) ||
            (navigator.platform === "MacIntel" &&
                (navigator as any).maxTouchPoints > 1)
        )
    }, [])
    const useWobble = liveWobble && !isIOS

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const surfaceRef = useRef<HTMLDivElement | null>(null)
    const cursorRef = useRef<HTMLDivElement | null>(null)
    const feTurb = useRef<SVGFETurbulenceElement | null>(null)
    const feDisp = useRef<SVGFEDisplacementMapElement | null>(null)

    const history = useRef<Stroke[]>([])
    const redoStack = useRef<Stroke[]>([])
    const current = useRef<Stroke | null>(null)
    const cleared = useRef(false)
    const drawing = useRef(false)
    const last = useRef<Pt>({ x: 0, y: 0 })
    const lastMid = useRef<Pt>({ x: 0, y: 0 })

    // --- live-drawing cat intro state ---
    const catStrokes = useRef<Pt[][] | null>(null)
    const introState = useRef({ strokeIdx: 0, pointIdx: 0, done: false })

    const [color, setColor] = useState(brushColor)
    const [size, setSize] = useState(brushSize)
    const [erasing, setErasing] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [showPicker, setShowPicker] = useState(false)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [copied, setCopied] = useState(false)
    const [hintSeen, setHintSeen] = useState(false)

    useEffect(() => setColor(brushColor), [brushColor])
    useEffect(() => setSize(brushSize), [brushSize])

    const ink = secondaryColor
    const glassBg = withAlpha(primaryColor, 0.46)
    const glassBorder = withAlpha(secondaryColor, 0.16)

    const path = useMemo(
        () => squirclePath(W, H, cornerRadius, cornerSmoothing),
        [W, H, cornerRadius, cornerSmoothing]
    )

    /* ----- drawing primitives ----- */

    const drawDoodle = useCallback(
        (ctx: CanvasRenderingContext2D) => {
            const s = Math.min(W, H) / 320
            ctx.save()
            ctx.translate((W - 320 * s) / 2, (H - 320 * s) / 2)
            ctx.scale(s, s)
            // Canvas can't resolve tokens/color-mix — withAlpha() only after
            // parseRgb/probeResolve guarantees a concrete rgba here.
            ctx.strokeStyle = withAlpha(solidColor(secondaryColor), 0.9)
            ctx.lineWidth = 8
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            const stroke = (fn: () => void) => {
                ctx.beginPath()
                fn()
                ctx.stroke()
            }
            stroke(() => ctx.arc(160, 158, 55, 0, Math.PI * 2))
            stroke(() => {
                ctx.moveTo(118, 121)
                ctx.lineTo(105, 83)
                ctx.lineTo(138, 103)
            })
            stroke(() => {
                ctx.moveTo(202, 115)
                ctx.lineTo(215, 83)
                ctx.lineTo(182, 103)
            })
            stroke(() => ctx.arc(140, 151, 7, 0, Math.PI * 2))
            stroke(() => ctx.arc(180, 151, 7, 0, Math.PI * 2))
            stroke(() => {
                ctx.moveTo(155, 171)
                ctx.lineTo(160, 166)
                ctx.lineTo(165, 171)
                ctx.closePath()
            })
            stroke(() => {
                ctx.moveTo(155, 171)
                ctx.quadraticCurveTo(148, 181, 140, 178)
            })
            stroke(() => {
                ctx.moveTo(165, 171)
                ctx.quadraticCurveTo(172, 181, 180, 178)
            })
            ctx.restore()
        },
        [W, H, secondaryColor]
    )

    const drawDoodleProgress = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            strokes: Pt[][],
            strokeIdx: number,
            pointIdx: number
        ) => {
            const s = Math.min(W, H) / 320
            ctx.save()
            ctx.translate((W - 320 * s) / 2, (H - 320 * s) / 2)
            ctx.scale(s, s)
            ctx.strokeStyle = withAlpha(solidColor(secondaryColor), 0.9)
            ctx.lineWidth = 8
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            for (let i = 0; i < strokes.length; i++) {
                const pts = strokes[i]
                let upto: number
                if (i < strokeIdx) upto = pts.length - 1
                else if (i === strokeIdx) upto = pointIdx
                else break
                if (upto <= 0) continue
                ctx.beginPath()
                ctx.moveTo(pts[0].x, pts[0].y)
                for (let k = 1; k <= upto; k++) ctx.lineTo(pts[k].x, pts[k].y)
                ctx.stroke()
            }
            ctx.restore()
        },
        [W, H, secondaryColor]
    )

    // Quadratic midpoint smoothing for finished strokes.
    const paintStroke = useCallback(
        (ctx: CanvasRenderingContext2D, st: Stroke) => {
            ctx.save()
            ctx.globalCompositeOperation =
                st.mode === "erase" ? "destination-out" : "source-over"
            ctx.strokeStyle = st.color
            ctx.fillStyle = st.color
            ctx.lineWidth = st.size
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            const pts = st.points
            if (pts.length === 1) {
                ctx.beginPath()
                ctx.arc(pts[0].x, pts[0].y, st.size / 2, 0, Math.PI * 2)
                ctx.fill()
            } else if (pts.length === 2) {
                ctx.beginPath()
                ctx.moveTo(pts[0].x, pts[0].y)
                ctx.lineTo(pts[1].x, pts[1].y)
                ctx.stroke()
            } else {
                ctx.beginPath()
                ctx.moveTo(pts[0].x, pts[0].y)
                for (let i = 1; i < pts.length - 1; i++) {
                    const mid = {
                        x: (pts[i].x + pts[i + 1].x) / 2,
                        y: (pts[i].y + pts[i + 1].y) / 2,
                    }
                    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y)
                }
                const n = pts.length
                ctx.lineTo(pts[n - 1].x, pts[n - 1].y)
                ctx.stroke()
            }
            ctx.restore()
        },
        []
    )

    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, W, H)
        if (starterDoodle && !cleared.current) {
            if (introState.current.done) {
                drawDoodle(ctx)
            } else if (catStrokes.current) {
                drawDoodleProgress(
                    ctx,
                    catStrokes.current,
                    introState.current.strokeIdx,
                    introState.current.pointIdx
                )
            }
        }
        for (const st of history.current) paintStroke(ctx, st)
    }, [W, H, starterDoodle, drawDoodle, drawDoodleProgress, paintStroke])

    const redrawRef = useRef(redraw)
    useEffect(() => {
        redrawRef.current = redraw
    }, [redraw])

    /* ----- canvas setup (DPR-crisp) ----- */
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
        const ctx = canvas.getContext("2d")
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        redraw()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [W, H])

    /* ----- make the surface "stick" on touch -----
       React touch listeners are passive, so preventDefault inside the pointer
       handlers can't stop the parent canvas from panning. Attach real,
       non-passive listeners that cancel native scroll/pan over the surface. */
    useEffect(() => {
        const el = surfaceRef.current
        if (!el) return
        const stop = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault()
            e.stopPropagation()
        }
        el.addEventListener("touchstart", stop, { passive: false })
        el.addEventListener("touchmove", stop, { passive: false })
        return () => {
            el.removeEventListener("touchstart", stop as EventListener)
            el.removeEventListener("touchmove", stop as EventListener)
        }
    }, [])

    // re-run when toggles change
    useEffect(() => {
        redraw()
    }, [starterDoodle, redraw])

    /* ----- live-drawing cat intro (runs once on mount) ----- */
    useEffect(() => {
        if (!starterDoodle) {
            introState.current.done = true
            return
        }
        if (onCanvas) {
            introState.current.done = true
            redrawRef.current()
            return
        }

        let strokes: Pt[][]
        try {
            strokes = sampleCatStrokes()
        } catch {
            introState.current.done = true
            redrawRef.current()
            return
        }
        catStrokes.current = strokes
        const lengths = strokes.map((pts) => pts.length - 1)

        let strokeIdx = 0
        let strokeStart = performance.now()
        let pausing = false
        let pauseStart = 0
        const PAUSE = 110
        let frame = 0

        const step = (now: number) => {
            if (strokeIdx >= strokes.length) {
                introState.current.done = true
                redrawRef.current()
                return
            }
            const total = lengths[strokeIdx] || 1
            const duration = Math.max(140, total * 5.2)

            if (pausing) {
                if (now - pauseStart >= PAUSE) {
                    pausing = false
                    strokeIdx += 1
                    strokeStart = now
                    introState.current.strokeIdx = strokeIdx
                    introState.current.pointIdx = 0
                }
                frame = requestAnimationFrame(step)
                redrawRef.current()
                return
            }

            const elapsed = now - strokeStart
            const revealed = Math.min(
                total,
                Math.round((elapsed / duration) * total)
            )
            introState.current.strokeIdx = strokeIdx
            introState.current.pointIdx = revealed
            redrawRef.current()

            if (revealed >= total) {
                pausing = true
                pauseStart = now
            }
            frame = requestAnimationFrame(step)
        }

        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* ----- the living turbulence ----- */
    useEffect(() => {
        if (!useWobble) return
        let frame = 0
        let seed = 0
        let freq = 0
        let scl = 0
        const map = (v: number) => 0.006 + v * 0.05
        const loop = () => {
            const targetFreq = map(
                drawing.current
                    ? wobbleActive
                    : hovered
                      ? (wobbleIdle + wobbleActive) / 2
                      : wobbleIdle
            )
            const targetScl = drawing.current
                ? wobbleScale * 1.6
                : hovered
                  ? wobbleScale
                  : wobbleScale * 0.55
            freq += (targetFreq - freq) * 0.07
            scl += (targetScl - scl) * 0.08
            seed += 0.0016
            if (feTurb.current) {
                feTurb.current.setAttribute(
                    "baseFrequency",
                    `${freq.toFixed(4)} ${(freq * 1.35).toFixed(4)}`
                )
                feTurb.current.setAttribute("seed", (seed * 12).toFixed(2))
            }
            if (feDisp.current)
                feDisp.current.setAttribute("scale", scl.toFixed(2))
            frame = requestAnimationFrame(loop)
        }
        frame = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(frame)
    }, [hovered, wobbleIdle, wobbleActive, wobbleScale, useWobble])

    /* ----- pointer handling ----- */
    const posFromXY = (cx: number, cy: number): Pt => {
        const el = surfaceRef.current
        if (!el) return { x: 0, y: 0 }
        const rect = el.getBoundingClientRect()
        return {
            x: (cx - rect.left) * (W / rect.width),
            y: (cy - rect.top) * (H / rect.height),
        }
    }
    const posFromEvent = (e: React.PointerEvent): Pt =>
        posFromXY(e.clientX, e.clientY)

    const moveCursor = (e: React.PointerEvent) => {
        const ring = cursorRef.current
        const el = surfaceRef.current
        if (!ring || !el) return
        const rect = el.getBoundingClientRect()
        ring.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px) translate(-50%, -50%)`
    }

    const onPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (e.button !== undefined && e.button !== 0) return
        ;(e.target as Element).setPointerCapture?.(e.pointerId)

        if (e.pointerType === "touch") setHovered(true)

        if (!introState.current.done) {
            introState.current.done = true
        }

        const p = posFromEvent(e)
        drawing.current = true
        last.current = p
        lastMid.current = p
        current.current = {
            mode: erasing ? "erase" : "draw",
            // Strokes are replayed on the canvas on every redraw — resolve
            // tokens to a concrete rgb NOW so the ink can never go black.
            color: solidColor(color),
            size,
            points: [p],
        }
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx) paintStroke(ctx, current.current) // dot for taps
        setShowPicker(false)
        if (showHints) setHintSeen(true)
    }

    const onPointerMove = (e: React.PointerEvent) => {
        moveCursor(e)
        if (!drawing.current || !current.current) return
        e.stopPropagation()
        e.preventDefault()
        const ctx = canvasRef.current?.getContext("2d")
        if (!ctx) return
        ctx.save()
        ctx.globalCompositeOperation =
            current.current.mode === "erase" ? "destination-out" : "source-over"
        ctx.strokeStyle = current.current.color
        ctx.lineWidth = current.current.size
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        // Coalesced events recover the sub-frame points the OS batched —
        // far smoother fast strokes, especially on 120Hz touch screens.
        const native = e.nativeEvent as PointerEvent
        const batch = (native.getCoalescedEvents?.() as
            | PointerEvent[]
            | undefined) ?? [native]

        for (const ev of batch) {
            const p = posFromXY(ev.clientX, ev.clientY)
            const mid = {
                x: (last.current.x + p.x) / 2,
                y: (last.current.y + p.y) / 2,
            }
            ctx.beginPath()
            ctx.moveTo(lastMid.current.x, lastMid.current.y)
            ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y)
            ctx.stroke()
            current.current.points.push(p)
            last.current = p
            lastMid.current = mid
        }
        ctx.restore()
    }

    const endStroke = (e: React.PointerEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (current.current) {
            history.current.push(current.current)
            current.current = null
            redoStack.current = [] // a fresh stroke invalidates redo
            setCanUndo(true)
            setCanRedo(false)
        }
        drawing.current = false
    }

    const undo = useCallback(() => {
        const popped = history.current.pop()
        if (popped) {
            redoStack.current.push(popped)
            setCanRedo(true)
        }
        setCanUndo(history.current.length > 0)
        redraw()
    }, [redraw])

    const redo = useCallback(() => {
        const restored = redoStack.current.pop()
        if (restored) {
            history.current.push(restored)
            setCanUndo(true)
        }
        setCanRedo(redoStack.current.length > 0)
        redraw()
    }, [redraw])

    const clearAll = () => {
        history.current = []
        redoStack.current = []
        cleared.current = true
        introState.current.done = true
        setCanUndo(false)
        setCanRedo(false)
        buzz(14)
        redraw()
    }

    /* keyboard: ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z — only while pointer is over us */
    useEffect(() => {
        if (!hovered) return
        const onKey = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey
            if (!mod || e.key.toLowerCase() !== "z") return
            e.preventDefault()
            if (e.shiftKey) {
                if (redoStack.current.length) redo()
            } else if (history.current.length) {
                undo()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [hovered, undo, redo])

    const copyImage = async () => {
        const src = canvasRef.current
        if (!src) return
        const off = document.createElement("canvas")
        off.width = src.width
        off.height = src.height
        const ctx = off.getContext("2d")
        if (!ctx) return
        if (!exportTransparent) {
            // Canvas fillStyle can't resolve tokens — use the concrete rgb.
            ctx.fillStyle = solidColor(canvasColor)
            ctx.fillRect(0, 0, off.width, off.height)
        }
        ctx.drawImage(src, 0, 0)
        const flash = () => {
            setCopied(true)
            buzz(8)
            setTimeout(() => setCopied(false), 1400)
        }
        try {
            off.toBlob(async (blob) => {
                if (!blob) return
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob }),
                    ])
                    flash()
                } catch {
                    const a = document.createElement("a")
                    a.download = "turbulence.png"
                    a.href = off.toDataURL()
                    a.click()
                }
            })
        } catch {
            const a = document.createElement("a")
            a.download = "turbulence.png"
            a.href = off.toDataURL()
            a.click()
        }
    }

    const barVisible = hovered || onCanvas

    /* instant custom tooltip */
    const Tip = ({
        label,
        side = "top",
        children,
    }: {
        label: string
        side?: "top" | "bottom"
        children: React.ReactNode
    }) => {
        const [show, setShow] = useState(false)
        return (
            <span
                style={{ position: "relative", display: "inline-flex" }}
                onPointerEnter={() => setShow(true)}
                onPointerLeave={() => setShow(false)}
            >
                {children}
                <AnimatePresence>
                    {show && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            style={{
                                position: "absolute",
                                [side === "top" ? "bottom" : "top"]:
                                    "calc(100% + 8px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                padding: "4px 9px",
                                borderRadius: 6,
                                background: ink,
                                color: primaryColor,
                                fontSize: 11,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                                zIndex: 40,
                            }}
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        )
    }

    const GButton = ({
        onClick,
        active,
        title,
        children,
    }: {
        onClick: () => void
        active?: boolean
        title: string
        children: React.ReactNode
    }) => (
        <Tip label={title}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onClick()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={title}
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    background: active ? ink : "transparent",
                    transition: "background 0.18s ease, opacity 0.18s ease",
                    opacity: active ? 1 : 0.78,
                }}
            >
                {children}
            </button>
        </Tip>
    )

    const ghostBtn = (enabled: boolean): React.CSSProperties => ({
        width: 34,
        height: 34,
        borderRadius: 999,
        border: "none",
        cursor: enabled ? "pointer" : "default",
        display: "grid",
        placeItems: "center",
        background: "transparent",
        padding: 0,
        opacity: enabled ? 0.78 : 0.3,
        transition: "opacity 0.18s ease",
    })

    return (
        <div
            style={{
                width: W,
                height: H,
                position: "relative",
                fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                filter: `drop-shadow(0 18px 40px ${withAlpha("#000000", 0.5)})`,
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                overscrollBehavior: "contain",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
                setHovered(false)
                setShowPicker(false)
            }}
        >
            {/* drawing surface */}
            <div
                ref={surfaceRef}
                data-no-pan="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: `path('${path}')`,
                    background: showGrid
                        ? `radial-gradient(${withAlpha(secondaryColor, 0.06)} 1px, transparent 1px) 0 0 / 22px 22px, ${canvasColor}`
                        : canvasColor,
                    boxShadow: `inset 0 0 0 1px ${withAlpha(secondaryColor, 0.06)}, inset 0 1px 0 ${withAlpha(secondaryColor, 0.1)}`,
                    overflow: "hidden",
                    cursor: "none",
                    touchAction: "none",
                }}
            >
                {/* filter def (only when the wobble is active) */}
                {useWobble && (
                    <svg
                        width={0}
                        height={0}
                        style={{ position: "absolute" }}
                        aria-hidden
                    >
                        <defs>
                            <filter
                                id={filterId}
                                x="-20%"
                                y="-20%"
                                width="140%"
                                height="140%"
                                colorInterpolationFilters="sRGB"
                            >
                                <feTurbulence
                                    ref={feTurb}
                                    type="turbulence"
                                    baseFrequency="0.02 0.027"
                                    numOctaves="2"
                                    seed="2"
                                    result="noise"
                                />
                                <feDisplacementMap
                                    ref={feDisp}
                                    in="SourceGraphic"
                                    in2="noise"
                                    scale={wobbleScale}
                                    xChannelSelector="R"
                                    yChannelSelector="G"
                                />
                            </filter>
                        </defs>
                    </svg>
                )}

                {/* the ink — filter applied to the canvas raster itself, never
                    to a wrapping <div> (that triggers iOS's black-fill bug) */}
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        display: "block",
                        filter: useWobble ? `url(#${filterId})` : undefined,
                        WebkitFilter: useWobble
                            ? `url(#${filterId})`
                            : undefined,
                    }}
                />

                {/* interaction overlay */}
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endStroke}
                    onPointerCancel={endStroke}
                    onPointerEnter={() => {
                        if (cursorRef.current)
                            cursorRef.current.style.opacity = "1"
                    }}
                    onPointerLeave={() => {
                        if (cursorRef.current)
                            cursorRef.current.style.opacity = "0"
                    }}
                    style={{
                        position: "absolute",
                        inset: 0,
                        touchAction: "none",
                    }}
                />

                {/* brush cursor */}
                <div
                    ref={cursorRef}
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: Math.max(size, 6),
                        height: Math.max(size, 6),
                        borderRadius: "50%",
                        border: `1.5px solid ${erasing ? withAlpha(secondaryColor, 0.9) : color}`,
                        background: erasing
                            ? withAlpha(secondaryColor, 0.08)
                            : withAlpha(color, 0.18),
                        pointerEvents: "none",
                        opacity: 0,
                        transition:
                            "opacity 0.15s ease, width 0.12s ease, height 0.12s ease, border-color 0.15s ease",
                        willChange: "transform",
                    }}
                />
            </div>

            {/* Copy / export — top right */}
            <div
                style={{ position: "absolute", top: 14, right: 14, zIndex: 20 }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <Tip label={copied ? "Copied!" : "Copy image"} side="bottom">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            copyImage()
                        }}
                        aria-label="Copy image"
                        style={{
                            height: 34,
                            width: 34,
                            borderRadius: 999,
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            background: glassBg,
                            border: `1px solid ${glassBorder}`,
                            backdropFilter: "blur(14px)",
                            WebkitBackdropFilter: "blur(14px)",
                        }}
                    >
                        {copied ? (
                            <Ico
                                d={PATHS.check}
                                stroke="#6BCB77"
                                sw={2.4}
                                size={17}
                            />
                        ) : (
                            <Ico
                                d={PATHS.copy}
                                stroke={ink}
                                sw={1.9}
                                size={16}
                            />
                        )}
                    </button>
                </Tip>
            </div>

            {/* First-draw hint */}
            <AnimatePresence>
                {showHints && hovered && !hintSeen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: "absolute",
                            left: "50%",
                            x: "-50%",
                            top: 14,
                            height: 30,
                            paddingInline: 12,
                            display: "flex",
                            alignItems: "center",
                            borderRadius: 999,
                            background: ink,
                            color: primaryColor,
                            fontSize: 11.5,
                            fontWeight: 600,
                            pointerEvents: "none",
                            zIndex: 15,
                            boxShadow: `0 8px 24px ${withAlpha("#000000", 0.35)}`,
                        }}
                    >
                        Drag to draw
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating toolbar */}
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
                        style={{
                            position: "absolute",
                            left: "50%",
                            bottom: 14,
                            x: "-50%",
                            zIndex: 20,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        {/* colour popover */}
                        <AnimatePresence>
                            {showPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        display: "flex",
                                        gap: 7,
                                        padding: 8,
                                        borderRadius: 16,
                                        background: glassBg,
                                        border: `1px solid ${glassBorder}`,
                                        backdropFilter: "blur(20px)",
                                        WebkitBackdropFilter: "blur(20px)",
                                        boxShadow: `0 10px 30px ${withAlpha("#000000", 0.34)}`,
                                    }}
                                >
                                    {palette.map((c) => {
                                        const on = c === color && !erasing
                                        return (
                                            <button
                                                key={c}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setColor(c)
                                                    setErasing(false)
                                                    setShowPicker(false)
                                                }}
                                                aria-label={`Colour ${c}`}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: "50%",
                                                    cursor: "pointer",
                                                    background: c,
                                                    border: "none",
                                                    padding: 0,
                                                    boxShadow: on
                                                        ? `0 0 0 2px ${primaryColor}, 0 0 0 4px ${ink}`
                                                        : `0 0 0 1px ${withAlpha("#000000", 0.25)}`,
                                                    transition:
                                                        "box-shadow 0.15s ease",
                                                }}
                                            />
                                        )
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* main bar */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: 5,
                                borderRadius: 999,
                                background: glassBg,
                                border: `1px solid ${glassBorder}`,
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                boxShadow: `0 12px 32px ${withAlpha("#000000", 0.36)}, inset 0 1px 0 ${withAlpha(secondaryColor, 0.1)}`,
                            }}
                        >
                            {/* current colour → opens popover */}
                            <Tip label="Brush colour">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setShowPicker((v) => !v)
                                    }}
                                    aria-label="Brush colour"
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 999,
                                        border: "none",
                                        cursor: "pointer",
                                        display: "grid",
                                        placeItems: "center",
                                        background: "transparent",
                                        padding: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: "50%",
                                            background: color,
                                            boxShadow: `0 0 0 2px ${withAlpha(secondaryColor, erasing ? 0.12 : 0.35)}`,
                                            opacity: erasing ? 0.4 : 1,
                                        }}
                                    />
                                </button>
                            </Tip>

                            {/* brush sizes */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                }}
                            >
                                {SIZES.map((sz, i) => {
                                    const on = sz === size && !erasing
                                    return (
                                        <Tip key={sz} label={SIZE_LABELS[i]}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSize(sz)
                                                    setErasing(false)
                                                }}
                                                aria-label={`Brush ${SIZE_LABELS[i]}`}
                                                style={{
                                                    width: 28,
                                                    height: 34,
                                                    borderRadius: 999,
                                                    border: "none",
                                                    cursor: "pointer",
                                                    background: "transparent",
                                                    display: "grid",
                                                    placeItems: "center",
                                                    padding: 0,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: sz * 0.7 + 4,
                                                        height: sz * 0.7 + 4,
                                                        borderRadius: "50%",
                                                        background: on
                                                            ? ink
                                                            : withAlpha(
                                                                  ink,
                                                                  0.4
                                                              ),
                                                        transition:
                                                            "background 0.15s ease",
                                                    }}
                                                />
                                            </button>
                                        </Tip>
                                    )
                                })}
                            </div>

                            <span
                                style={{
                                    width: 1,
                                    height: 20,
                                    background: withAlpha(ink, 0.16),
                                    margin: "0 2px",
                                }}
                            />

                            <GButton
                                title="Eraser"
                                active={erasing}
                                onClick={() => setErasing((v) => !v)}
                            >
                                <Ico
                                    d={PATHS.eraser}
                                    stroke={erasing ? primaryColor : ink}
                                    size={17}
                                />
                            </GButton>

                            <Tip label="Undo">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (canUndo) undo()
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    aria-label="Undo"
                                    disabled={!canUndo}
                                    style={ghostBtn(canUndo)}
                                >
                                    <Ico
                                        d={PATHS.undo}
                                        stroke={ink}
                                        size={17}
                                    />
                                </button>
                            </Tip>

                            <Tip label="Redo">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (canRedo) redo()
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    aria-label="Redo"
                                    disabled={!canRedo}
                                    style={ghostBtn(canRedo)}
                                >
                                    <Ico
                                        d={PATHS.redo}
                                        stroke={ink}
                                        size={17}
                                    />
                                </button>
                            </Tip>

                            <GButton title="Clear" onClick={clearAll}>
                                <Ico d={PATHS.trash} stroke={ink} size={17} />
                            </GButton>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Property controls                                                           */
/* -------------------------------------------------------------------------- */

TurbulenceCanvas.displayName = "Turbulence Canvas"

addPropertyControls(TurbulenceCanvas, {
    primaryColor: {
        type: ControlType.Color,
        title: "Primary",
        defaultValue: "#222222",
    },
    canvasColor: {
        type: ControlType.Color,
        title: "Canvas",
        defaultValue: "#1a1a1a",
    },
    secondaryColor: {
        type: ControlType.Color,
        title: "Secondary",
        defaultValue: "#f3f3f3",
    },
    palette: {
        type: ControlType.Array,
        title: "Palette",
        maxCount: 8,
        control: { type: ControlType.Color },
        defaultValue: [
            "#F3F3F3",
            "#FF6B6B",
            "#FFD166",
            "#6BCB77",
            "#5B8CFF",
            "#C77DFF",
        ],
    },
    brushColor: {
        type: ControlType.Color,
        title: "Brush",
        defaultValue: "#F3F3F3",
    },
    brushSize: {
        type: ControlType.Enum,
        title: "Size",
        options: [4, 9, 16],
        optionTitles: ["Small", "Medium", "Large"],
        defaultValue: 9,
        displaySegmentedControl: true,
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 160,
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
    wobbleIdle: {
        type: ControlType.Number,
        title: "Wobble idle",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.3,
    },
    wobbleActive: {
        type: ControlType.Number,
        title: "Wobble draw",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.85,
    },
    wobbleScale: {
        type: ControlType.Number,
        title: "Distortion",
        min: 0,
        max: 16,
        step: 0.5,
        defaultValue: 6,
    },
    liveWobble: {
        type: ControlType.Boolean,
        title: "Live wobble",
        defaultValue: true,
    },
    starterDoodle: {
        type: ControlType.Boolean,
        title: "Starter art",
        defaultValue: true,
    },
    showGrid: {
        type: ControlType.Boolean,
        title: "Dot grid",
        defaultValue: true,
    },
    showHints: {
        type: ControlType.Boolean,
        title: "Hints",
        defaultValue: true,
    },
    exportTransparent: {
        type: ControlType.Boolean,
        title: "Export PNG transparent",
        defaultValue: false,
    },
})
