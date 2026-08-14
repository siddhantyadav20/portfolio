import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { addPropertyControls, ControlType } from "framer"
import { motion, AnimatePresence, useAnimationControls } from "framer-motion"

/**
 * HOLO ROCKET STICKER
 *
 * Everything the original HoloSticker did — foil masked to the die-cut
 * silhouette, cursor tilt, tracking glare, dark tooltip — plus a flight.
 *
 * On hover the sticker crouches, pitches its nose to the left, climbs a
 * parabolic arc, rolls through one full loop and settles back on the exact
 * pixel it left from. The nose always leads the path (the heading is the
 * tangent of the curve), it shrinks at the apex so the loop reads as
 * distance, a ground shadow shrinks and fades underneath it, and a thruster
 * plume burns off the tail the whole way round.
 *
 * The artwork is assumed to point RIGHT (nose to +x), like the rocket-kid PNG.
 * If yours points elsewhere, dial "Nose Offset".
 *
 * NOTE: give the parent frame in Framer `overflow: visible`, or the arc gets
 * clipped mid-flight.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 160
 * @framerIntrinsicHeight 160
 */

const FONT = "'Outfit', system-ui, -apple-system, sans-serif"
const TAU = Math.PI * 2

const FOILS: Record<string, { stripes: string; sheen: string }> = {
    prism: {
        stripes:
            "repeating-linear-gradient(110deg, hsla(330,100%,60%,.55) 0%, hsla(45,100%,55%,.5) 9%, hsla(160,100%,50%,.5) 18%, hsla(200,100%,55%,.55) 27%, hsla(275,100%,60%,.5) 36%, hsla(330,100%,60%,.55) 45%)",
        sheen: "conic-gradient(from 130deg, #ff3d9a, #ffd24a, #3dffb0, #3da8ff, #b35cff, #ff3d9a)",
    },
    gold: {
        stripes:
            "repeating-linear-gradient(110deg, hsla(45,90%,62%,.6) 0%, hsla(40,100%,75%,.55) 8%, hsla(30,90%,55%,.5) 16%, hsla(48,100%,85%,.6) 24%, hsla(38,95%,60%,.55) 32%, hsla(45,90%,62%,.6) 40%)",
        sheen: "conic-gradient(from 120deg, #ffd76a, #fff1c2, #d99a3c, #ffe9a8, #c87f2e, #ffd76a)",
    },
    aurora: {
        stripes:
            "repeating-linear-gradient(110deg, hsla(170,100%,55%,.55) 0%, hsla(190,100%,55%,.5) 9%, hsla(150,100%,50%,.5) 18%, hsla(265,100%,65%,.55) 27%, hsla(210,100%,60%,.5) 36%, hsla(170,100%,55%,.55) 45%)",
        sheen: "conic-gradient(from 140deg, #2effc7, #38b6ff, #6f6bff, #2effc7, #46e0ff, #2effc7)",
    },
}

function useGlobalAssets() {
    useEffect(() => {
        if (typeof document === "undefined") return
        if (!document.getElementById("cc-sticker-font")) {
            const l = document.createElement("link")
            l.id = "cc-sticker-font"
            l.rel = "stylesheet"
            l.href =
                "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap"
            document.head.appendChild(l)
        }
        if (!document.getElementById("cc-sticker-flame")) {
            const s = document.createElement("style")
            s.id = "cc-sticker-flame"
            s.textContent =
                "@keyframes cc-flame{from{transform:scaleX(.84) scaleY(1.06);opacity:.72}to{transform:scaleX(1.14) scaleY(.9);opacity:1}}"
            document.head.appendChild(s)
        }
    }, [])
}

const smoothstep = (v: number) =>
    v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v)

/**
 * The flight path.
 *
 * Position is a circle-through-origin, stretched into an ellipse:
 *   x(t) = dir · W · sin(2πt)      y(t) = −H · (1 − cos 2πt) / 2
 * so t=0 and t=1 are both the resting spot, t=.25 is the far side of the
 * climb and t=.5 is the apex. The parameter is then re-timed so the rocket
 * leaves fast, hangs at the top and comes down fast — the ballistic feel.
 * Rotation is the tangent of that curve, blended in and out at the ends so
 * the nose swings over instead of snapping.
 */
function buildLaunch(opts: {
    dir: number
    arcW: number
    arcH: number
    baseRotation: number
    noseOffset: number
    samples: number
    shrink: number
    shadowOpacity: number
}) {
    const {
        dir,
        arcW,
        arcH,
        baseRotation,
        noseOffset,
        samples,
        shrink,
        shadowOpacity,
    } = opts

    const posX = (t: number) => dir * arcW * Math.sin(TAU * t)
    const posY = (t: number) => (-arcH * (1 - Math.cos(TAU * t))) / 2
    const rawHeading = (t: number) => {
        const dx = dir * arcW * Math.cos(TAU * t)
        const dy = (-arcH / 2) * Math.sin(TAU * t)
        return (Math.atan2(dy, dx) * 180) / Math.PI
    }

    // re-timed samples: dt/du = 1 + .6·cos(2πu) → quick launch, slow apex
    const ts: number[] = []
    for (let i = 0; i <= samples; i++) {
        const u = i / samples
        ts.push(u + (0.6 * Math.sin(TAU * u)) / TAU)
    }

    // unwrap so the heading turns continuously through one revolution
    const heads: number[] = []
    let prev = rawHeading(0)
    heads.push(prev)
    for (let i = 1; i < ts.length; i++) {
        let h = rawHeading(ts[i])
        while (h - prev > 180) h -= 360
        while (h - prev < -180) h += 360
        heads.push(h)
        prev = h
    }
    const turn = Math.sign(heads[heads.length - 1] - heads[0]) || 1

    // 1. crouch
    const times: number[] = [0, 0.07]
    const x: number[] = [0, dir * -arcW * 0.035]
    const y: number[] = [0, 7]
    const rotate: number[] = [0, dir * -3]
    const scale: number[] = [1, 0.93]
    const shX: number[] = [0, 0]
    const shScale: number[] = [1, 1.07]
    const shOpacity: number[] = [shadowOpacity, shadowOpacity]
    const ease: string[] = ["easeInOut"]

    // 2. the arc + loop
    const A = 0.1
    const B = 0.93
    for (let i = 0; i < ts.length; i++) {
        const t = ts[i]
        const blend = Math.min(smoothstep(t / 0.16), smoothstep((1 - t) / 0.16))
        const spin = turn * 360 * t
        const aimed = heads[i] - baseRotation + noseOffset
        times.push(A + (B - A) * (i / samples))
        x.push(posX(t))
        y.push(posY(t))
        rotate.push(spin + blend * (aimed - spin))
        scale.push(1 - shrink * Math.sin(Math.PI * t))
        shX.push(posX(t) * 0.12)
        shScale.push(1 - 0.5 * Math.sin(Math.PI * t))
        shOpacity.push(shadowOpacity * (1 - 0.78 * Math.sin(Math.PI * t)))
        ease.push(i === 0 ? "easeOut" : "linear")
    }

    // 3. touchdown + settle
    times.push(0.965, 1)
    x.push(0, 0)
    y.push(6, 0)
    rotate.push(turn * 360, turn * 360)
    scale.push(0.95, 1)
    shX.push(0, 0)
    shScale.push(1.1, 1)
    shOpacity.push(shadowOpacity * 1.15, shadowOpacity)
    ease.push("easeIn", "easeOut")

    return { times, x, y, rotate, scale, shX, shScale, shOpacity, ease }
}

interface Props {
    image?: { src?: string } | string
    label?: string
    sublabel?: string
    foil?: "prism" | "gold" | "aurora"
    holoIntensity?: number
    tiltAmount?: number
    dieCut?: boolean
    dieCutColor?: string
    sway?: boolean
    baseRotation?: number
    launch?: boolean
    direction?: "left" | "right"
    arcWidth?: number
    arcHeight?: number
    flightDuration?: number
    apexShrink?: number
    noseOffset?: number
    exhaust?: boolean
    plumeX?: number
    plumeY?: number
    groundShadow?: boolean
    style?: React.CSSProperties
}

export default function HoloRocketSticker(props: Props) {
    const {
        image,
        label = "",
        sublabel = "",
        foil = "prism",
        holoIntensity = 0.75,
        tiltAmount = 16,
        dieCut = false,
        dieCutColor = "#ffffff",
        sway = true,
        baseRotation = 0,
        launch = true,
        direction = "left",
        arcWidth = 150,
        arcHeight = 180,
        flightDuration = 1.75,
        apexShrink = 0.22,
        noseOffset = 0,
        exhaust = true,
        plumeX = 6,
        plumeY = 78,
        groundShadow = true,
        style,
    } = props

    useGlobalAssets()

    const [hovered, setHovered] = useState(false)
    const [canHover, setCanHover] = useState(false)
    const [reduced, setReduced] = useState(false)
    const [flying, setFlying] = useState(false)
    const [tilt, setTilt] = useState({ x: 0, y: 0 })
    const [glare, setGlare] = useState({ x: 50, y: 50 })

    const rootRef = useRef<HTMLDivElement | null>(null)
    const flyingRef = useRef(false)
    const armedRef = useRef(true)
    const aliveRef = useRef(true)

    const flightCtl = useAnimationControls()
    const shadowCtl = useAnimationControls()

    const src = typeof image === "string" ? image : image?.src || ""
    const palette = FOILS[foil] || FOILS.prism
    const shadowBase = 0.42

    const path = useMemo(
        () =>
            buildLaunch({
                dir: direction === "right" ? 1 : -1,
                arcW: arcWidth,
                arcH: arcHeight,
                baseRotation,
                noseOffset,
                samples: 36,
                shrink: apexShrink,
                shadowOpacity: shadowBase,
            }),
        [direction, arcWidth, arcHeight, baseRotation, noseOffset, apexShrink]
    )

    useEffect(() => {
        aliveRef.current = true
        return () => {
            aliveRef.current = false
        }
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const hov = window.matchMedia("(hover: hover) and (pointer: fine)")
        const rm = window.matchMedia("(prefers-reduced-motion: reduce)")
        setCanHover(hov.matches)
        setReduced(rm.matches)
        const a = (e: MediaQueryListEvent) => setCanHover(e.matches)
        const b = (e: MediaQueryListEvent) => setReduced(e.matches)
        hov.addEventListener?.("change", a)
        rm.addEventListener?.("change", b)
        return () => {
            hov.removeEventListener?.("change", a)
            rm.removeEventListener?.("change", b)
        }
    }, [])

    const reset = () => {
        setTilt({ x: 0, y: 0 })
        setGlare({ x: 50, y: 50 })
    }

    const fly = useCallback(async () => {
        if (!launch || reduced || flyingRef.current || !src) return
        flyingRef.current = true
        armedRef.current = false
        setFlying(true)
        reset()

        const t = {
            duration: flightDuration,
            times: path.times,
            ease: path.ease as any,
        }
        try {
            await Promise.all([
                flightCtl.start(
                    {
                        x: path.x,
                        y: path.y,
                        rotate: path.rotate,
                        scale: path.scale,
                    },
                    t
                ),
                groundShadow
                    ? shadowCtl.start(
                          {
                              x: path.shX,
                              scale: path.shScale,
                              opacity: path.shOpacity,
                          },
                          t
                      )
                    : Promise.resolve(),
            ])
        } catch (e) {
            /* interrupted — fall through and reset */
        }
        if (!aliveRef.current) return
        // rotate ends on a full turn; snap the value back with no visible change
        flightCtl.set({ x: 0, y: 0, rotate: 0, scale: 1 })
        shadowCtl.set({ x: 0, scale: 1, opacity: shadowBase })
        flyingRef.current = false
        setFlying(false)
    }, [launch, reduced, src, flightDuration, path, groundShadow])

    const onMove = (e: React.MouseEvent) => {
        if (!canHover || flying || !rootRef.current) return
        const r = rootRef.current.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        setTilt({ x: -py * tiltAmount, y: px * tiltAmount })
        setGlare({ x: (px + 0.5) * 100, y: (py + 0.5) * 100 })
    }

    const lit = hovered && canHover
    const foilOn = Math.min(1, Math.max(0, holoIntensity))
    const stripeOpacity = (lit ? 0.65 : 0.28) * foilOn
    const sheenOpacity = (lit ? 0.45 : 0.18) * foilOn
    const glareOpacity = lit && !flying ? 0.55 : flying ? 0.3 : 0

    const maskStyle: React.CSSProperties = src
        ? {
              WebkitMaskImage: `url("${src}")`,
              maskImage: `url("${src}")`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
          }
        : { borderRadius: 18 }

    const outline = dieCut
        ? `drop-shadow(2px 0 0 ${dieCutColor}) drop-shadow(-2px 0 0 ${dieCutColor}) drop-shadow(0 2px 0 ${dieCutColor}) drop-shadow(0 -2px 0 ${dieCutColor})`
        : ""
    const liftShadow = flying
        ? "drop-shadow(0 26px 34px rgba(0,0,0,0.35))"
        : lit
          ? "drop-shadow(0 18px 26px rgba(0,0,0,0.5))"
          : "drop-shadow(0 9px 16px rgba(0,0,0,0.38))"

    return (
        <div
            ref={rootRef}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                position: "relative",
                perspective: 700,
                cursor: "pointer",
                fontFamily: FONT,
                userSelect: "none",
                WebkitUserSelect: "none",
                zIndex: flying ? 60 : (style as any)?.zIndex,
            }}
            onMouseEnter={() => {
                if (!canHover) return
                setHovered(true)
                if (armedRef.current) fly()
            }}
            onMouseLeave={() => {
                setHovered(false)
                armedRef.current = true
                reset()
            }}
            onMouseMove={onMove}
            onPointerDown={() => {
                if (!canHover) fly()
            }}
            onClick={() => {
                if (canHover) fly()
            }}
            role="img"
            aria-label={label || "Sticker"}
        >
            {/* ground shadow — shrinks and fades as it climbs */}
            {groundShadow && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "92%",
                        width: "62%",
                        height: "9%",
                        transform: "translate(-50%,-50%)",
                        pointerEvents: "none",
                    }}
                >
                    <motion.div
                        initial={{ x: 0, scale: 1, opacity: shadowBase }}
                        animate={shadowCtl}
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            background:
                                "radial-gradient(ellipse at center, rgba(0,0,0,0.5), rgba(0,0,0,0) 72%)",
                            filter: "blur(4px)",
                        }}
                    />
                </div>
            )}

            {/* launch puff, left behind on the pad */}
            {flying && exhaust && (
                <motion.div
                    initial={{ scale: 0.35, opacity: 0.5 }}
                    animate={{ scale: 2.1, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "86%",
                        width: "46%",
                        height: "18%",
                        x: "-50%",
                        y: "-50%",
                        borderRadius: 999,
                        background:
                            "radial-gradient(ellipse at center, rgba(255,244,224,0.5), rgba(255,244,224,0) 70%)",
                        filter: "blur(6px)",
                        pointerEvents: "none",
                    }}
                />
            )}

            {/* tooltip — stays home while the sticker is out flying */}
            <AnimatePresence>
                {lit && label && !flying && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        style={{
                            position: "absolute",
                            bottom: "calc(100% + 12px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 50,
                            background: "#222222",
                            color: "#d9d9d9",
                            padding: "7px 11px",
                            borderRadius: 11,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                            {label}
                        </div>
                        {sublabel && (
                            <div
                                style={{
                                    fontSize: 11,
                                    opacity: 0.6,
                                    marginTop: 1,
                                }}
                            >
                                {sublabel}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FLIGHT layer — arc, loop, altitude */}
            <motion.div
                initial={{ x: 0, y: 0, rotate: 0, scale: 1 }}
                animate={flightCtl}
                style={{ width: "100%", height: "100%" }}
            >
                {/* sway / hover-lift layer */}
                <motion.div
                    animate={
                        sway && !reduced && !flying
                            ? {
                                  rotate: [
                                      baseRotation - 1.4,
                                      baseRotation + 1.4,
                                  ],
                              }
                            : { rotate: baseRotation }
                    }
                    transition={
                        sway && !reduced && !flying
                            ? {
                                  duration: 6,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  ease: "easeInOut",
                              }
                            : { duration: 0.3 }
                    }
                    whileHover={
                        canHover && !flying
                            ? { scale: reduced ? 1.04 : 1.07 }
                            : undefined
                    }
                    whileTap={flying ? undefined : { scale: 0.9 }}
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        transformStyle: "preserve-3d",
                    }}
                >
                    {/* thruster — sits behind the art, burns off the tail */}
                    <AnimatePresence>
                        {flying && exhaust && (
                            <motion.div
                                initial={{ opacity: 0, scaleX: 0.2 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                exit={{ opacity: 0, scaleX: 0.2 }}
                                transition={{ duration: 0.18 }}
                                style={{
                                    position: "absolute",
                                    left: `${plumeX}%`,
                                    top: `${plumeY}%`,
                                    width: "44%",
                                    height: "12%",
                                    x: "-100%",
                                    y: "-50%",
                                    transformOrigin: "100% 50%",
                                    pointerEvents: "none",
                                }}
                            >
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        borderRadius: 999,
                                        background:
                                            "linear-gradient(to left, rgba(255,196,92,0.95), rgba(255,124,40,0.55) 42%, rgba(255,90,20,0) 100%)",
                                        filter: "blur(6px)",
                                        mixBlendMode: "screen",
                                        animation:
                                            "cc-flame .16s ease-in-out infinite alternate",
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "26%",
                                        bottom: "26%",
                                        left: "36%",
                                        right: 0,
                                        borderRadius: 999,
                                        background:
                                            "linear-gradient(to left, rgba(255,255,236,0.95), rgba(255,214,140,0.45) 62%, rgba(255,214,140,0) 100%)",
                                        filter: "blur(2px)",
                                        mixBlendMode: "screen",
                                        animation:
                                            "cc-flame .12s ease-in-out infinite alternate-reverse",
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* tilt layer */}
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            position: "relative",
                            transformStyle: "preserve-3d",
                            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                            transition:
                                lit && !flying
                                    ? "transform 0.1s ease-out"
                                    : "transform 0.5s cubic-bezier(0.23,1,0.32,1)",
                            isolation: "isolate",
                        }}
                    >
                        {src ? (
                            <img
                                src={src}
                                alt={label}
                                draggable={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                    display: "block",
                                    filter: `${outline} ${liftShadow}`.trim(),
                                    transition: "filter 0.3s ease",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: 18,
                                    display: "grid",
                                    placeItems: "center",
                                    background:
                                        "linear-gradient(135deg,#3a3a3a,#1c1c1c)",
                                    color: "#bdbdbd",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    textAlign: "center",
                                    padding: 12,
                                    boxSizing: "border-box",
                                    filter: liftShadow,
                                }}
                            >
                                Add a sticker
                            </div>
                        )}

                        {/* foil */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                ...maskStyle,
                                backgroundImage: palette.stripes,
                                backgroundSize: "300% 300%",
                                backgroundPosition: `${
                                    50 + (glare.x - 50) * 0.8
                                }% ${50 + (glare.y - 50) * 0.8}%`,
                                mixBlendMode: "color-dodge",
                                opacity: stripeOpacity,
                                transition: "opacity 0.25s ease",
                                pointerEvents: "none",
                            }}
                        />

                        {/* oil-slick sheen */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                ...maskStyle,
                                backgroundImage: palette.sheen,
                                mixBlendMode: "overlay",
                                opacity: sheenOpacity,
                                transform: `rotate(${(glare.x - 50) * 0.4}deg)`,
                                transition: "opacity 0.25s ease",
                                pointerEvents: "none",
                            }}
                        />

                        {/* specular glare */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                ...maskStyle,
                                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 38%)`,
                                mixBlendMode: "soft-light",
                                opacity: glareOpacity,
                                transition: "opacity 0.2s ease",
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </div>
    )
}

addPropertyControls(HoloRocketSticker, {
    image: { type: ControlType.ResponsiveImage, title: "Sticker" },
    label: {
        type: ControlType.String,
        title: "Label",
        placeholder: "e.g. Launch",
    },
    sublabel: {
        type: ControlType.String,
        title: "Sublabel",
        placeholder: "e.g. Ship it",
    },
    foil: {
        type: ControlType.Enum,
        title: "Foil",
        options: ["prism", "gold", "aurora"],
        optionTitles: ["Prism", "Gold", "Aurora"],
        defaultValue: "prism",
        displaySegmentedControl: true,
    },
    holoIntensity: {
        type: ControlType.Number,
        title: "Holo",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.75,
        displayStepper: true,
    },
    tiltAmount: {
        type: ControlType.Number,
        title: "Tilt",
        min: 0,
        max: 30,
        step: 1,
        defaultValue: 16,
    },
    sway: { type: ControlType.Boolean, title: "Idle Sway", defaultValue: true },
    baseRotation: {
        type: ControlType.Number,
        title: "Rotation",
        min: -45,
        max: 45,
        step: 1,
        defaultValue: 0,
    },
    launch: {
        type: ControlType.Boolean,
        title: "Launch",
        defaultValue: true,
    },
    direction: {
        type: ControlType.Enum,
        title: "Fly",
        options: ["left", "right"],
        optionTitles: ["Left", "Right"],
        defaultValue: "left",
        displaySegmentedControl: true,
        hidden: (p) => !p.launch,
    },
    arcWidth: {
        type: ControlType.Number,
        title: "Arc Width",
        min: 40,
        max: 500,
        step: 5,
        defaultValue: 150,
        hidden: (p) => !p.launch,
    },
    arcHeight: {
        type: ControlType.Number,
        title: "Arc Height",
        min: 40,
        max: 500,
        step: 5,
        defaultValue: 180,
        hidden: (p) => !p.launch,
    },
    flightDuration: {
        type: ControlType.Number,
        title: "Duration",
        min: 0.8,
        max: 4,
        step: 0.05,
        defaultValue: 1.75,
        hidden: (p) => !p.launch,
    },
    apexShrink: {
        type: ControlType.Number,
        title: "Apex Shrink",
        min: 0,
        max: 0.5,
        step: 0.02,
        defaultValue: 0.22,
        hidden: (p) => !p.launch,
    },
    noseOffset: {
        type: ControlType.Number,
        title: "Nose Offset",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: 0,
        description: "0 if the art points right",
        hidden: (p) => !p.launch,
    },
    groundShadow: {
        type: ControlType.Boolean,
        title: "Ground Shadow",
        defaultValue: true,
        hidden: (p) => !p.launch,
    },
    exhaust: {
        type: ControlType.Boolean,
        title: "Thruster",
        defaultValue: true,
        hidden: (p) => !p.launch,
    },
    plumeX: {
        type: ControlType.Number,
        title: "Plume X",
        min: -20,
        max: 100,
        step: 1,
        defaultValue: 6,
        hidden: (p) => !p.launch || !p.exhaust,
    },
    plumeY: {
        type: ControlType.Number,
        title: "Plume Y",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 78,
        hidden: (p) => !p.launch || !p.exhaust,
    },
    dieCut: {
        type: ControlType.Boolean,
        title: "Add Outline",
        defaultValue: false,
    },
    dieCutColor: {
        type: ControlType.Color,
        title: "Outline",
        defaultValue: "#ffffff",
        hidden: (p) => !p.dieCut,
    },
})
