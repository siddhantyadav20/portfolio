import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef, useState } from "react"

// Minimap
// A live overview of the whole canvas with a box showing the current
// viewport. Click anywhere on it to recenter. Reads the "canvas:state"
// event from CanvasController. Place once on the Home page.

export default function Minimap(props) {
    const { size, accent, corner } = props
    const [st, setSt] = useState<any>(null)
    const [hover, setHover] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const W = window as any
        const onState = (e: any) => setSt(e.detail)
        W.addEventListener("canvas:state", onState)
        if (W.CanvasAPI && W.CanvasAPI.getState) setSt(W.CanvasAPI.getState())
        // CanvasAPI may init slightly after mount; grab state once it's ready.
        let tries = 0
        const t = setInterval(() => {
            if (W.CanvasAPI && W.CanvasAPI.getState) {
                setSt(W.CanvasAPI.getState())
                clearInterval(t)
            } else if (tries++ > 40) clearInterval(t)
        }, 120)
        return () => {
            W.removeEventListener("canvas:state", onState)
            clearInterval(t)
        }
    }, [])

    if (!st) return null

    const maxDim = size || 156
    const ratio = st.cw / st.ch
    const mapW = ratio >= 1 ? maxDim : maxDim * ratio
    const mapH = ratio >= 1 ? maxDim / ratio : maxDim

    // Visible region in canvas coordinates.
    const vx = -st.x / st.scale
    const vy = -st.y / st.scale
    const vwc = st.vw / st.scale
    const vhc = st.vh / st.scale

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
    const boxL = clamp01(vx / st.cw)
    const boxT = clamp01(vy / st.ch)
    const boxW = clamp01(vwc / st.cw)
    const boxH = clamp01(vhc / st.ch)

    const jump = (e: React.MouseEvent) => {
        const el = ref.current
        const W = window as any
        if (!el || !W.CanvasAPI) return
        const r = el.getBoundingClientRect()
        const rx = (e.clientX - r.left) / r.width
        const ry = (e.clientY - r.top) / r.height
        W.CanvasAPI.centerOn(rx * st.cw, ry * st.ch)
    }

    const pos: React.CSSProperties =
        corner === "bottom-left"
            ? { left: 20, bottom: 20 }
            : corner === "top-right"
              ? { right: 20, top: 20 }
              : corner === "top-left"
                ? { left: 20, top: 20 }
                : { right: 20, bottom: 20 }

    return (
        <div
            style={{
                position: "fixed",
                zIndex: 9600,
                ...pos,
                opacity: hover ? 1 : 0.62,
                transform: hover ? "scale(1.03)" : "scale(1)",
                transition:
                    "opacity .2s ease, transform .2s cubic-bezier(.22,1,.36,1)",
                fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div
                ref={ref}
                onMouseDown={jump}
                style={{
                    position: "relative",
                    width: mapW,
                    height: mapH,
                    borderRadius: 10,
                    cursor: "pointer",
                    background: "rgba(20,22,26,.66)",
                    border: "1px solid rgba(255,255,255,.1)",
                    boxShadow: "0 8px 28px rgba(0,0,0,.4)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    backgroundImage:
                        "repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 18px),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 18px)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: `${boxL * 100}%`,
                        top: `${boxT * 100}%`,
                        width: `${boxW * 100}%`,
                        height: `${boxH * 100}%`,
                        border: `1.5px solid ${accent}`,
                        borderRadius: 3,
                        background: `${accent}1f`,
                        boxShadow: `0 0 0 1px rgba(0,0,0,.25)`,
                        transition: "all .12s linear",
                    }}
                />
            </div>
        </div>
    )
}

Minimap.defaultProps = {
    size: 156,
    accent: "#6E78FF",
    corner: "bottom-right",
}

addPropertyControls(Minimap, {
    size: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 156,
        min: 90,
        max: 280,
        step: 4,
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#6E78FF",
    },
    corner: {
        type: ControlType.Enum,
        title: "Corner",
        defaultValue: "bottom-right",
        options: [
            "bottom-right",
            "bottom-left",
            "top-right",
            "top-left",
        ],
        optionTitles: [
            "Bottom Right",
            "Bottom Left",
            "Top Right",
            "Top Left",
        ],
    },
})
