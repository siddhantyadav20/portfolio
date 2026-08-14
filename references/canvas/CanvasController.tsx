import { addPropertyControls, ControlType } from "framer"
import { useEffect } from "react"

// CanvasController
// The "camera" for the infinite canvas. Owns pan, zoom, reset and the
// blast-off effect, and exposes window.CanvasAPI + a "canvas:state" event
// so CommandPalette / Minimap / ConfettiLayer can drive it.
// Drop ONE of these anywhere on the Home page (it renders nothing visible).

export default function CanvasController(props) {
    const { minZoom, maxZoom } = props

    useEffect(() => {
        if (typeof window === "undefined") return
        const W = window as any
        const D = document

        let ct: HTMLElement | null = null
        let bg: HTMLElement | null = null
        let stars: HTMLDivElement | null = null
        let on = false
        let booted = false
        let busy = false

        let cw = 4000,
            ch = 4000
        const GRID = 80
        const MIN = minZoom || 0.35
        const MAX = maxZoom || 2.4
        const pos = { x: 0, y: 0 }
        let scale = 1

        let drag = false
        const dS = { x: 0, y: 0 }
        let tM = false,
            tSX = 0,
            tSY = 0,
            tOX = 0,
            tOY = 0,
            tEl: EventTarget | null = null,
            tDist = 0,
            tScale = 1
        let subs: ((s: any) => void)[] = []
        const RM =
            W.matchMedia &&
            W.matchMedia("(prefers-reduced-motion:reduce)").matches

        const vw = () => W.innerWidth
        const vh = () => W.innerHeight
        const cS = (s: number) => Math.max(MIN, Math.min(MAX, s))
        const axis = (v: number, size: number, vp: number) => {
            const cs = size * scale
            if (cs <= vp) return (vp - cs) / 2
            return Math.min(0, Math.max(v, vp - cs))
        }
        const clamp = () => {
            pos.x = axis(pos.x, cw, vw())
            pos.y = axis(pos.y, ch, vh())
        }
        const state = () => ({
            x: pos.x,
            y: pos.y,
            scale,
            cw,
            ch,
            vw: vw(),
            vh: vh(),
        })
        const emit = () => {
            const st = state()
            subs.forEach((f) => f(st))
            W.dispatchEvent(new CustomEvent("canvas:state", { detail: st }))
        }
        const apply = (anim?: boolean) => {
            if (!ct) return
            ct.style.transition =
                anim && !RM
                    ? "transform .55s cubic-bezier(.22,1,.36,1)"
                    : "transform 0s"
            ct.style.transform = `translate(${pos.x}px,${pos.y}px) scale(${scale})`
            if (bg) {
                bg.style.backgroundSize = `${GRID * scale}px ${GRID * scale}px`
                bg.style.backgroundPosition = `${pos.x}px ${pos.y}px`
            }
            emit()
        }
        const center = (s?: number) => {
            scale = s || 1
            pos.x = (vw() - cw * scale) / 2
            pos.y = (vh() - ch * scale) / 2
        }
        const reset = () => {
            if (busy) return
            center(1)
            clamp()
            apply(true)
        }
        const zoomAt = (mx: number, my: number, ns: number) => {
            ns = cS(ns)
            const wx = (mx - pos.x) / scale,
                wy = (my - pos.y) / scale
            scale = ns
            pos.x = mx - wx * scale
            pos.y = my - wy * scale
            clamp()
            apply(false)
        }
        const zoomBy = (f: number) => zoomAt(vw() / 2, vh() / 2, scale * f)

        const launch = () => {
            if (busy || !ct) return
            busy = true
            const sx = pos.x,
                sy = pos.y,
                ss = scale,
                cx = vw() / 2,
                cy = vh() / 2,
                k = 0.4
            const nx = cx - (cx - pos.x) * k
            const ny = cy - (cy - pos.y) * k - vh() * 0.7
            if (RM) {
                busy = false
                return
            }
            if (stars) {
                stars.style.opacity = "1"
                stars.style.transform = "translateY(-14%) scaleY(1.5)"
            }
            ct.style.transition = "transform .8s cubic-bezier(.5,0,.75,0)"
            ct.style.transform = `translate(${nx}px,${ny}px) scale(${ss * k})`
            ct.style.filter = "blur(2px)"
            setTimeout(() => {
                if (!ct) return
                ct.style.transition = "transform .9s cubic-bezier(.22,1,.36,1)"
                ct.style.transform = `translate(${sx}px,${sy}px) scale(${ss})`
                ct.style.filter = ""
                if (stars) {
                    stars.style.opacity = "0"
                    stars.style.transform = "none"
                }
                setTimeout(() => {
                    busy = false
                    apply(false)
                }, 900)
            }, 820)
        }

        const onWheel = (e: WheelEvent) => {
            if (busy) return
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                zoomAt(e.clientX, e.clientY, scale * (1 - e.deltaY * 0.0016))
                return
            }
            e.preventDefault()
            pos.x -= e.deltaX
            pos.y -= e.deltaY
            clamp()
            apply(false)
        }
        const fire = (v: string) => {
            const e = D.querySelectorAll<HTMLElement>(
                "[data-framer-name='ContentLayer'] *"
            )
            e.forEach((n) => (n.style.pointerEvents = v))
        }
        const block = () => {
            const b = (ev: Event) => {
                ev.stopPropagation()
                ev.preventDefault()
                D.removeEventListener("click", b, true)
            }
            D.addEventListener("click", b, true)
            fire("none")
            setTimeout(() => fire(""), 160)
        }
        const cancel = () => {
            if (tEl) {
                try {
                    ;(tEl as HTMLElement).dispatchEvent(
                        new TouchEvent("touchcancel", {
                            bubbles: true,
                            cancelable: true,
                        })
                    )
                } catch (e) {}
                tEl = null
            }
        }

        const onMD = (e: any) => {
            if (busy) return
            if (
                e.sourceCapabilities &&
                e.sourceCapabilities.firesTouchEvents
            )
                return
            drag = true
            dS.x = e.clientX - pos.x
            dS.y = e.clientY - pos.y
            D.body.style.cursor = "grabbing"
        }
        const onMM = (e: any) => {
            if (busy || !drag) return
            if (
                e.sourceCapabilities &&
                e.sourceCapabilities.firesTouchEvents
            )
                return
            pos.x = e.clientX - dS.x
            pos.y = e.clientY - dS.y
            clamp()
            apply(false)
        }
        const onMU = () => {
            drag = false
            D.body.style.cursor = "default"
        }

        const dist = (t: TouchList) => {
            const dx = t[0].clientX - t[1].clientX,
                dy = t[0].clientY - t[1].clientY
            return Math.sqrt(dx * dx + dy * dy)
        }
        const onTS = (e: TouchEvent) => {
            tM = false
            tEl = e.target
            if (e.touches.length === 1) {
                tSX = e.touches[0].clientX
                tSY = e.touches[0].clientY
                tOX = tSX - pos.x
                tOY = tSY - pos.y
            } else if (e.touches.length === 2) {
                tDist = dist(e.touches)
                tScale = scale
            }
        }
        const onTM = (e: TouchEvent) => {
            if (busy) return
            if (e.touches.length === 2) {
                e.preventDefault()
                const d = dist(e.touches)
                const mx =
                    (e.touches[0].clientX + e.touches[1].clientX) / 2
                const my =
                    (e.touches[0].clientY + e.touches[1].clientY) / 2
                zoomAt(mx, my, tScale * (d / tDist))
                return
            }
            if (e.touches.length !== 1) return
            const dx = e.touches[0].clientX - tSX,
                dy = e.touches[0].clientY - tSY
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                if (!tM) {
                    fire("none")
                    cancel()
                }
                tM = true
                e.preventDefault()
                pos.x = e.touches[0].clientX - tOX
                pos.y = e.touches[0].clientY - tOY
                clamp()
                apply(false)
            }
        }
        const onTE = () => {
            if (tM) block()
            else {
                fire("")
                tEl = null
            }
        }

        const editable = () => {
            const a = D.activeElement as any
            return (
                a &&
                (a.tagName === "INPUT" ||
                    a.tagName === "TEXTAREA" ||
                    a.isContentEditable)
            )
        }
        const onKey = (e: KeyboardEvent) => {
            if (!on || editable()) return
            const k = e.key
            if (k === "r" || k === "R") reset()
            else if (k === "c" || k === "C")
                W.dispatchEvent(new CustomEvent("canvas:confetti"))
            else if (k === " ") {
                e.preventDefault()
                launch()
            } else if (k === "+" || k === "=") zoomBy(1.2)
            else if (k === "-" || k === "_") zoomBy(1 / 1.2)
        }

        const enable = () => {
            if (on) return
            on = true
            D.body.style.overflow = "hidden"
            D.documentElement.style.overflow = "hidden"
            W.addEventListener("wheel", onWheel, { passive: false })
            W.addEventListener("mousedown", onMD)
            W.addEventListener("mousemove", onMM)
            W.addEventListener("mouseup", onMU)
            W.addEventListener("touchstart", onTS, { passive: true })
            W.addEventListener("touchmove", onTM, { passive: false })
            W.addEventListener("touchend", onTE, { passive: true })
            W.addEventListener("keydown", onKey)
        }
        const disable = () => {
            on = false
            D.body.style.overflow = ""
            D.documentElement.style.overflow = ""
            D.body.style.cursor = ""
            W.removeEventListener("wheel", onWheel)
            W.removeEventListener("mousedown", onMD)
            W.removeEventListener("mousemove", onMM)
            W.removeEventListener("mouseup", onMU)
            W.removeEventListener("touchstart", onTS)
            W.removeEventListener("touchmove", onTM)
            W.removeEventListener("touchend", onTE)
            W.removeEventListener("keydown", onKey)
        }

        const init = () => {
            const root = D.querySelector(
                "[data-framer-name='InfiniteCanvasRoot']"
            ) as HTMLElement
            const c = D.querySelector(
                "[data-framer-name='ContentLayer']"
            ) as HTMLElement
            if (!root || !c) return false
            ct = c
            bg = root
            cw =
                parseFloat(root.getAttribute("data-canvas-width") || "") ||
                4000
            ch =
                parseFloat(root.getAttribute("data-canvas-height") || "") ||
                4000
            ct.style.cssText =
                "position:fixed;top:0;left:0;width:" +
                cw +
                "px;height:" +
                ch +
                "px;transform-origin:0 0;will-change:transform;pointer-events:none;z-index:5"
            if (!stars) {
                stars = D.createElement("div")
                stars.style.cssText =
                    "position:fixed;inset:-25%;z-index:9000;pointer-events:none;opacity:0;transition:opacity .25s ease,transform .8s cubic-bezier(.5,0,.75,0);mix-blend-mode:screen;background:repeating-linear-gradient(180deg,rgba(255,255,255,0) 0 7px,rgba(255,255,255,.12) 7px 8px)"
                D.body.appendChild(stars)
            }
            center(1)
            clamp()
            apply(false)
            enable()
            if (!RM) {
                try {
                    ct.animate(
                        [
                            { opacity: 0, filter: "blur(8px)" },
                            { opacity: 1, filter: "blur(0)" },
                        ],
                        {
                            duration: 750,
                            easing: "cubic-bezier(.22,1,.36,1)",
                        }
                    )
                } catch (e) {}
            }
            booted = true
            return true
        }

        const styleEl = D.createElement("style")
        styleEl.textContent =
            "*::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important}[data-framer-name='ContentLayer']>*{pointer-events:auto!important}[data-framer-name='InfiniteCanvasRoot']{pointer-events:none!important}"
        D.head.appendChild(styleEl)

        W.CanvasAPI = {
            reset,
            launch,
            zoomIn: () => zoomBy(1.2),
            zoomOut: () => zoomBy(1 / 1.2),
            getState: state,
            centerOn: (px: number, py: number) => {
                if (busy) return
                pos.x = vw() / 2 - px * scale
                pos.y = vh() / 2 - py * scale
                clamp()
                apply(true)
            },
            on: (fn: (s: any) => void) => {
                subs.push(fn)
                return () => {
                    subs = subs.filter((f) => f !== fn)
                }
            },
        }

        // Retry until the Framer-authored ContentLayer is in the DOM.
        let tries = 0
        const tryInit = () => {
            if (booted) return
            if (init()) return
            if (tries++ < 40) setTimeout(tryInit, 100)
        }
        tryInit()

        const onResize = () => {
            if (on) {
                clamp()
                apply(false)
            }
        }
        W.addEventListener("resize", onResize)

        return () => {
            disable()
            W.removeEventListener("resize", onResize)
            try {
                D.head.removeChild(styleEl)
            } catch (e) {}
            if (stars) {
                try {
                    D.body.removeChild(stars)
                } catch (e) {}
                stars = null
            }
            delete W.CanvasAPI
        }
    }, [minZoom, maxZoom])

    return (
        <div
            style={{ width: 0, height: 0, overflow: "hidden" }}
            data-framer-name="CanvasController"
        />
    )
}

CanvasController.defaultProps = { minZoom: 0.35, maxZoom: 2.4 }

addPropertyControls(CanvasController, {
    minZoom: {
        type: ControlType.Number,
        title: "Min Zoom",
        defaultValue: 0.35,
        min: 0.1,
        max: 1,
        step: 0.05,
    },
    maxZoom: {
        type: ControlType.Number,
        title: "Max Zoom",
        defaultValue: 2.4,
        min: 1,
        max: 5,
        step: 0.1,
    },
})
