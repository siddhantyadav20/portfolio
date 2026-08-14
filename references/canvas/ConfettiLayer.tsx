import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef } from "react"

// ConfettiLayer
// Hand-rolled, physics-based confetti that frames the page from all four
// edges. Fires when the "canvas:confetti" event is dispatched (the C key,
// via CanvasController) or when window.dropConfetti() is called.
// Place once on the Home page. Renders a full-screen, click-through canvas.

type P = {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    color: string
    rot: number
    vrot: number
    tilt: number
    vtilt: number
    rect: boolean
    life: number
    max: number
}

export default function ConfettiLayer(props) {
    const { density } = props
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const W = window

        // Restrained, soft-vivid palette that reads well on dark (#292D32).
        const COLORS = [
            "#6E78FF",
            "#B692FF",
            "#34D7E6",
            "#FF7A9C",
            "#FFC75A",
            "#57E0A8",
        ]
        const RM =
            W.matchMedia &&
            W.matchMedia("(prefers-reduced-motion:reduce)").matches

        let dpr = Math.min(W.devicePixelRatio || 1, 2)
        let particles: P[] = []
        let raf = 0
        let running = false

        const resize = () => {
            dpr = Math.min(W.devicePixelRatio || 1, 2)
            canvas.width = W.innerWidth * dpr
            canvas.height = W.innerHeight * dpr
            canvas.style.width = W.innerWidth + "px"
            canvas.style.height = W.innerHeight + "px"
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        W.addEventListener("resize", resize)

        const rand = (a: number, b: number) => a + Math.random() * (b - a)

        const spawnEdge = (edge: number, n: number) => {
            const w = W.innerWidth,
                h = W.innerHeight
            for (let i = 0; i < n; i++) {
                let x = 0,
                    y = 0,
                    vx = 0,
                    vy = 0
                const speed = rand(7, 15)
                if (edge === 0) {
                    // top
                    x = rand(0, w)
                    y = -10
                    vx = rand(-3, 3)
                    vy = speed * 0.7
                } else if (edge === 1) {
                    // right
                    x = w + 10
                    y = rand(0, h)
                    vx = -speed
                    vy = rand(-5, 2)
                } else if (edge === 2) {
                    // bottom
                    x = rand(0, w)
                    y = h + 10
                    vx = rand(-3, 3)
                    vy = -speed
                } else {
                    // left
                    x = -10
                    y = rand(0, h)
                    vx = speed
                    vy = rand(-5, 2)
                }
                const max = rand(90, 150)
                particles.push({
                    x,
                    y,
                    vx,
                    vy,
                    size: rand(6, 11),
                    color: COLORS[(Math.random() * COLORS.length) | 0],
                    rot: rand(0, Math.PI * 2),
                    vrot: rand(-0.2, 0.2),
                    tilt: rand(0, Math.PI * 2),
                    vtilt: rand(0.08, 0.18),
                    rect: Math.random() > 0.25,
                    life: 0,
                    max,
                })
            }
        }

        const burst = () => {
            if (RM) return
            const base = density || 26
            spawnEdge(0, base)
            spawnEdge(1, base)
            spawnEdge(2, base)
            spawnEdge(3, base)
            if (!running) {
                running = true
                raf = requestAnimationFrame(tick)
            }
        }

        const tick = () => {
            ctx.clearRect(0, 0, W.innerWidth, W.innerHeight)
            const gravity = 0.16,
                dragF = 0.985
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]
                p.life++
                p.vy += gravity
                p.vx *= dragF
                p.vy *= dragF
                p.x += p.vx
                p.y += p.vy
                p.rot += p.vrot
                p.tilt += p.vtilt
                const fadeIn = Math.min(1, p.life / 8)
                const fadeOut = Math.max(0, 1 - (p.life - p.max) / 30)
                const alpha = Math.min(fadeIn, fadeOut)
                if (
                    p.life > p.max + 30 ||
                    p.y > W.innerHeight + 40 ||
                    alpha <= 0
                ) {
                    particles.splice(i, 1)
                    continue
                }
                ctx.save()
                ctx.globalAlpha = alpha
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rot)
                const flutter = Math.cos(p.tilt)
                ctx.fillStyle = p.color
                if (p.rect) {
                    ctx.scale(flutter, 1)
                    ctx.fillRect(
                        -p.size / 2,
                        -p.size / 3,
                        p.size,
                        p.size * 0.66
                    )
                } else {
                    ctx.beginPath()
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
                    ctx.fill()
                }
                ctx.restore()
            }
            if (particles.length > 0) {
                raf = requestAnimationFrame(tick)
            } else {
                running = false
                ctx.clearRect(0, 0, W.innerWidth, W.innerHeight)
            }
        }

        const onEvt = () => burst()
        W.addEventListener("canvas:confetti", onEvt)
        ;(W as any).dropConfetti = burst

        return () => {
            W.removeEventListener("resize", resize)
            W.removeEventListener("canvas:confetti", onEvt)
            cancelAnimationFrame(raf)
            particles = []
            try {
                delete (W as any).dropConfetti
            } catch (e) {}
        }
    }, [density])

    return (
        <canvas
            ref={canvasRef}
            data-framer-name="ConfettiLayer"
            style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 9500,
            }}
        />
    )
}

ConfettiLayer.defaultProps = { density: 26 }

addPropertyControls(ConfettiLayer, {
    density: {
        type: ControlType.Number,
        title: "Per Edge",
        defaultValue: 26,
        min: 8,
        max: 60,
        step: 2,
    },
})
