import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin, MotionPathPlugin)

/**
 * 10 — Loop. A self-playing 2D short, about 36 seconds, drawn in SVG and driven by one GSAP
 * timeline that repeats without a seam. Not tied to scroll. Two colours: ink and one accent.
 *
 * One dot goes the whole way round, and every scene hands its shape to the next:
 *    1 the dot bounces down a staircase, the camera panning with it
 *    2 the last impact sends out ripples; the staircase relaxes into a sine wave, the dot rides it
 *    3 the wave curls into a hoop; the dot drops in and rolls round it while a planet grows inside
 *    4 hoop becomes iris, planet becomes pupil, the dot its highlight; it flattens to a closed
 *      lid and blinks open
 *    5 the camera dives through the pupil into darkness, which turns out to be a closed shutter
 *    6 the shutter snaps open on the dot; it shoots off as a pen nib, sketching one line
 *    7 the sketch snaps into a square, which multiplies into a grid that does a stadium wave
 *    8 the grid is pulled into a spiral of dominoes; the dot tips the first and the chain runs in
 *    9 the fallen dominoes fly out as the teeth of three gears, which lock and turn
 *   10 the gears spin up and collapse into the dot; it hops once, the staircase draws itself
 *      underneath, and it lands exactly where scene 1 begins
 *
 * The camera is one object (x, y, zoom) applied to the world group on every tick.
 */
const R = 22 // the dot's radius
const OX = 800 // world position of the first step (the view is 1600 × 900, centred on 800, 450)
const OY = 490
const STEP_W = 180
const STEP_H = 90
const BOUNCES = 4

// ── geometry ──
const land = (i: number) => ({ x: OX + i * STEP_W, y: OY + i * STEP_H - R - 1.5 }) // resting on top of the 3px line
const STAIRS = (() => {
  let d = `M${OX - 6 * STEP_W - 90} ${OY - 6 * STEP_H}`
  for (let i = -6; i <= 11; i++) d += ` H${OX + i * STEP_W + 90} V${OY + (i + 1) * STEP_H}`
  return d
})()
const P = { x: OX + BOUNCES * STEP_W, y: OY + BOUNCES * STEP_H } // where the last bounce lands (surface)
const WAVE_A = 70
const WAVE_L = 360
const waveY = (x: number) => P.y - WAVE_A * Math.sin(((x - P.x) * Math.PI * 2) / WAVE_L)
const WAVE = (() => {
  let d = ''
  for (let x = P.x - 1500; x <= P.x + 2300; x += 20) d += `${d ? ' L' : 'M'}${x} ${waveY(x).toFixed(1)}`
  return d
})()
const RIDE = WAVE_L * 3 // the dot rides three full waves
const C = { x: P.x + RIDE, y: P.y + 260 } // centre of the hoop / planet / eye
const HOOP = 200
const circle = (cx: number, cy: number, r: number) => `M${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r}`
const RING = circle(C.x, C.y, HOOP)
const ORBIT = circle(C.x, C.y, HOOP - R) + ' ' + circle(C.x, C.y, HOOP - R).replace('M', 'L') // twice round, rolling inside the hoop
const LID_SHUT = `M${C.x - 330} ${C.y} Q${C.x} ${C.y} ${C.x + 330} ${C.y} Q${C.x} ${C.y} ${C.x - 330} ${C.y}`
const LID_OPEN = `M${C.x - 330} ${C.y} Q${C.x} ${C.y - 270} ${C.x + 330} ${C.y} Q${C.x} ${C.y + 270} ${C.x - 330} ${C.y}`
const SCRIBBLE =
  'M800 450 C960 240 1270 250 1210 450 C1150 660 850 630 900 450 C950 270 700 170 560 300 C400 440 520 710 700 640 C880 580 760 380 620 420 C480 460 400 610 300 520'
const SQUARE = 'M765 415 H835 V485 H765 Z'

// grid
const COLS = 9
const ROWS = 5
const GAP = 150
const cellPos = (c: number, r: number) => ({ x: 800 + (c - (COLS - 1) / 2) * GAP, y: 450 + (r - (ROWS - 1) / 2) * GAP })
const CELLS = (() => {
  const list: { c: number; r: number; kind: number; solid: boolean }[] = []
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      if (c === 0 && r === 2) continue // the dot takes this seat
      list.push({ c, r, kind: (c + r) % 3, solid: (c + r) % 2 === 0 })
    }
  return list
})()
const N = CELLS.length // 44

// spiral of dominoes, outside in, starting on the left where the dot is waiting
const SPIRAL = (() => {
  const pts: { x: number; y: number; deg: number }[] = []
  let theta = Math.PI
  for (let i = 0; i < N; i++) {
    const r = 380 - (300 * i) / (N - 1)
    pts.push({ x: 800 + Math.cos(theta) * r, y: 450 + Math.sin(theta) * r, deg: (theta * 180) / Math.PI + 90 })
    theta += 44 / r
  }
  return pts
})()

// three gears; between them they have exactly as many teeth as there are dominoes
const GEARS = [
  { cx: 600, cy: 500, teeth: 20, r: 180, dir: 1 },
  { cx: 906, cy: 500, teeth: 14, r: 126, dir: -1 },
  { cx: 1030, cy: 323, teeth: 10, r: 90, dir: 1 },
]
const TEETH = GEARS.flatMap((g, gi) =>
  Array.from({ length: g.teeth }, (_, k) => {
    const a = (k / g.teeth) * 360 + (gi === 1 ? 180 / g.teeth : 0)
    const rad = (a * Math.PI) / 180
    return { gi, a, x: g.cx + Math.sin(rad) * g.r, y: g.cy - Math.cos(rad) * g.r }
  }),
)
const TOOTH = 0.6 // a tooth is a domino at 60% length

const CHAPTERS = ['Fall', 'Wave', 'Orbit', 'See', 'Dark', 'Draw', 'Order', 'Chain', 'Engine', 'Again']

export default function Loop() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const q = <T extends Element = SVGElement>(s: string) => el.querySelector<T>(s)!
    const qa = <T extends Element = SVGElement>(s: string) => Array.from(el.querySelectorAll<T>(s))
    const world = q('.lp__world')
    const dot = q('.lp__dot')
    const m = q('.lp__m')
    const planet = q('.lp__planet')
    const lid = q('.lp__lid')
    const cover = q('.lp__cover')
    const shutter = q('.lp__shutter')
    const blades = qa('.lp__blade')
    const scribble = q('.lp__scribble')
    const cells = qa('.lp__cell')
    const dominoes = qa('.lp__domino')
    const gears = qa('.lp__gear')
    const rings = qa('.lp__gear-ring')
    const ripples = qa('.lp__ripple')
    const chapter = q<HTMLElement>('.lp__chapter span')
    const count = q<HTMLElement>('.lp__chapter b')
    const reduced = reducedMotion()

    const cam = { x: 800, y: 450, z: 1 }
    // The view is cropped to fill the screen, so a tall phone would only see the middle 400 or so
    // units of a 1600-wide stage. `fit` pulls the camera back until about 1450 units are in view.
    let fit = 1
    const measure = () => {
      fit = Math.min(1, ((el.clientWidth / Math.max(1, el.clientHeight)) * 900) / 1450)
    }
    measure()
    const applyCam = () => world.setAttribute('transform', `translate(800 450) scale(${cam.z * fit}) translate(${-cam.x} ${-cam.y})`)
    const onResize = () => {
      measure()
      applyCam()
    }
    window.addEventListener('resize', onResize)
    const setChapter = (i: number) => {
      chapter.textContent = CHAPTERS[i]
      count.textContent = String(i + 1).padStart(2, '0')
      if (!reduced) gsap.fromTo(chapter, { yPercent: 115 }, { yPercent: 0, duration: 0.8, ease: 'expo.out', overwrite: true })
    }

    const ctx = gsap.context(() => {
      // everything drawn around its own origin turns and scales about that origin
      gsap.set([dot, ...cells, ...dominoes, ...ripples], { svgOrigin: '0 0' })
      gsap.set([m, planet, lid], { svgOrigin: `${C.x} ${C.y}` })
      gsap.set(shutter, { svgOrigin: '800 450' })
      gears.forEach((g, i) => gsap.set(g, { svgOrigin: `${GEARS[i].cx} ${GEARS[i].cy}` }))

      const tl = gsap.timeline({ paused: true, repeat: -1, onUpdate: applyCam, defaults: { ease: 'power2.inOut' } })
      const L0 = land(0)

      /* ── the state every loop starts from: the dot resting on the first step ── */
      tl.set(cam, { x: 800, y: 450, z: 1 }, 0)
        .set(dot, { x: L0.x, y: L0.y, scaleX: 1, scaleY: 1, autoAlpha: 1 }, 0)
        .set(m, { morphSVG: STAIRS, drawSVG: '0% 100%', scale: 1, scaleY: 1, autoAlpha: 1 }, 0)
        .set(ripples, { x: P.x, y: P.y, scale: 0, autoAlpha: 0 }, 0)
        .set(planet, { scale: 0, scaleY: 0, autoAlpha: 1 }, 0)
        .set(lid, { morphSVG: LID_SHUT, drawSVG: '50% 50%', autoAlpha: 1 }, 0)
        .set([cover, shutter], { autoAlpha: 0 }, 0)
        .set(scribble, { morphSVG: SCRIBBLE, drawSVG: '0% 0%', autoAlpha: 1 }, 0)
        .set(cells, { x: 800, y: 450, scale: 0, rotation: 0, autoAlpha: 1 }, 0)
        .set(dominoes, { x: (i: number) => SPIRAL[i].x, y: (i: number) => SPIRAL[i].y, rotation: (i: number) => SPIRAL[i].deg, scaleX: 1, scaleY: 0, autoAlpha: 1 }, 0)
        .set(gears, { autoAlpha: 0, rotation: 0, scale: 1, x: 0, y: 0 }, 0)
        .call(setChapter, [0], 0)

      // squash on landing, then spring back (scaling about the centre, so y drops to keep the base planted)
      const impact = (t: number, y: number, amount: number) => {
        tl.to(dot, { scaleX: 1 + amount, scaleY: 1 - amount, y: y + R * amount, duration: 0.07, ease: 'power2.out' }, t)
          .to(dot, { scaleX: 1, scaleY: 1, y, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, t + 0.07)
      }

      /* 1 ── FALL ─────────────────────────────────────────────── 0.0 → 3.3 */
      // Each bounce is one unbroken chain of keyframes: launch, rise, hang, fall, squash. Nothing
      // overlaps, so no two tweens ever pull the dot in different directions.
      const SQ = 0.34 // how hard it squashes on a step
      const LAUNCH = 0.08
      const FLIGHT = 0.56
      const SQUASH = 0.06
      const HOP = LAUNCH + FLIGHT + SQUASH
      // anticipation: it sinks into the first step before it goes
      tl.to(dot, { scaleX: 1 + SQ, scaleY: 1 - SQ, y: L0.y + R * SQ, duration: 0.3, ease: 'power2.in' }, 0.2)
      for (let i = 0; i < BOUNCES; i++) {
        const t = 0.5 + i * HOP
        const a = land(i)
        const b = land(i + 1)
        const last = i === BOUNCES - 1
        const hit = last ? 0.5 : SQ
        tl.to(dot, { x: b.x, duration: HOP, ease: 'none' }, t)
          // launch: the squash releases into a stretch
          .to(dot, { y: a.y, scaleX: 0.86, scaleY: 1.18, duration: LAUNCH, ease: 'power2.out' }, t)
          // rise, rounding off toward the top
          .to(dot, { y: a.y - 150, scaleX: 1, scaleY: 1, duration: FLIGHT * 0.46, ease: 'power2.out' }, t + LAUNCH)
          // fall, stretching as it speeds up
          .to(dot, { y: b.y, scaleX: 0.86, scaleY: 1.18, duration: FLIGHT * 0.54, ease: 'power2.in' }, t + LAUNCH + FLIGHT * 0.46)
          // contact
          .to(dot, { y: b.y + R * hit, scaleX: 1 + hit, scaleY: 1 - hit, duration: SQUASH, ease: 'power2.out' }, t + LAUNCH + FLIGHT)
      }
      const T2 = 0.5 + BOUNCES * HOP // the last and hardest landing
      tl.to(cam, { x: P.x, duration: T2 - 0.5, ease: 'none' }, 0.5).to(cam, { y: P.y - 40, duration: T2 - 0.5, ease: 'sine.inOut' }, 0.5)

      /* 2 ── WAVE ─────────────────────────────────────────────── 3.3 → 7.2 */
      // where the dot sits when it is on the wave: pushed out along the slope's normal, so it
      // rests on the line instead of cutting into it. It also runs faster through the troughs
      // and slower over the crests, like something with weight.
      const TOUCH = R + 1.5 // radius plus half the line's thickness
      const onWave = (u: number) => {
        const phi = u * Math.PI * 6 // three full waves
        const x = P.x + (WAVE_L / (Math.PI * 2)) * (phi + 0.32 * (Math.cos(phi) - 1))
        const k = (Math.PI * 2) / WAVE_L
        const slope = -WAVE_A * k * Math.cos(k * (x - P.x))
        const len = Math.hypot(1, slope)
        return { x: x + (TOUCH * slope) / len, y: waveY(x) - TOUCH / len }
      }
      const W0 = onWave(0)
      const BIG = 1.05 // the big bounce that covers the change from stairs to wave
      const T3 = T2 + LAUNCH + BIG // touchdown on the wave
      tl.call(setChapter, [1], T2)
        .set(ripples, { autoAlpha: 1 }, T2)
        .to(ripples, { scale: 1, duration: 1.5, ease: 'power2.out', stagger: 0.16 }, T2)
        .to(ripples, { autoAlpha: 0, duration: 0.9, ease: 'power1.in', stagger: 0.16 }, T2 + 0.5)
        // the shock runs out along the stairs and they go slack, while the dot is in the air
        .to(m, { morphSVG: WAVE, duration: 0.85, ease: 'power3.inOut' }, T2 + 0.05)
        .to(dot, { y: P.y - R, scaleX: 0.84, scaleY: 1.2, duration: LAUNCH, ease: 'power2.out' }, T2)
        .to(dot, { y: P.y - R - 230, scaleX: 1, scaleY: 1, duration: BIG * 0.48, ease: 'power2.out' }, T2 + LAUNCH)
        .to(dot, { x: W0.x, y: W0.y, scaleX: 0.9, scaleY: 1.12, duration: BIG * 0.52, ease: 'power2.in' }, T2 + LAUNCH + BIG * 0.48)
        .to(dot, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'power2.out' }, T3)
      const ride = { u: 0 }
      const RIDE_T = 3.1
      tl.to(
        ride,
        {
          u: 1,
          duration: RIDE_T,
          ease: 'power1.inOut',
          onUpdate: () => {
            const p = onWave(ride.u)
            gsap.set(dot, { x: p.x, y: p.y })
          },
        },
        T3,
      )
        .to(cam, { x: P.x + RIDE, duration: RIDE_T, ease: 'power1.inOut' }, T3)
        .set(ride, { u: 0 }, T3 + RIDE_T + 0.02)
      // the rest of the film is timed from the end of the ride
      const S = T3 + RIDE_T - 7.0

      /* 3 ── ORBIT ────────────────────────────────────────────── 7.0 → 11.6 */
      tl.call(setChapter, [2], 7.0 + S)
        .to(m, { morphSVG: RING, duration: 1.3, ease: 'power3.inOut' }, 7.0 + S)
        .to(cam, { x: C.x, y: C.y, z: 1.35, duration: 2.0 }, 7.0 + S)
        // a hop, a hang, then down through the top of the hoop
        .to(dot, { x: C.x, y: P.y - R - 110, scaleX: 0.9, scaleY: 1.12, duration: 0.5, ease: 'power2.out' }, 7.0 + S)
        .to(dot, { y: C.y + HOOP - R * 2, scaleX: 0.86, scaleY: 1.2, duration: 0.8, ease: 'power2.in' }, 7.55 + S)
      impact(8.35 + S, C.y + HOOP - R * 2, 0.45)
      tl.fromTo(planet, { scale: 0, scaleY: 0 }, { scale: 1, scaleY: 1, duration: 0.9, ease: 'back.out(1.7)' }, 8.45 + S)
        .to(dot, { motionPath: { path: ORBIT }, duration: 2.7, ease: 'power2.inOut' }, 8.9 + S)

      /* 4 ── SEE ──────────────────────────────────────────────── 11.6 → 15.4 */
      tl.call(setChapter, [3], 11.6 + S)
        .to(m, { scale: 0.52, duration: 0.7, ease: 'power3.inOut' }, 11.6 + S)
        .to(planet, { scale: 0.6, scaleY: 0.6, duration: 0.7, ease: 'power3.inOut' }, 11.6 + S)
        // the moon drops onto the planet and becomes the light in the eye
        .to(dot, { x: C.x + 20, y: C.y - 20, scaleX: 0.42, scaleY: 0.42, duration: 0.6, ease: 'back.out(1.8)' }, 11.65 + S)
        // everything flattens into a closed lid
        .to(m, { scaleY: 0.01, duration: 0.22, ease: 'power3.in' }, 12.35 + S)
        .to(planet, { scaleY: 0.01, duration: 0.22, ease: 'power3.in' }, 12.35 + S)
        .to(dot, { y: C.y, scaleY: 0.01, duration: 0.22, ease: 'power3.in' }, 12.35 + S)
        .to(lid, { drawSVG: '0% 100%', duration: 0.3, ease: 'power3.out' }, 12.45 + S)
      const open = (t: number, d: number, ease: string) =>
        tl
          .to(lid, { morphSVG: LID_OPEN, duration: d, ease }, t)
          .to(m, { scaleY: 0.52, duration: d, ease }, t)
          .to(planet, { scaleY: 0.6, duration: d, ease }, t)
          .to(dot, { y: C.y - 20, scaleY: 0.42, duration: d, ease }, t)
      const shut = (t: number, d: number) =>
        tl
          .to(lid, { morphSVG: LID_SHUT, duration: d, ease: 'power2.in' }, t)
          .to(m, { scaleY: 0.01, duration: d, ease: 'power2.in' }, t)
          .to(planet, { scaleY: 0.01, duration: d, ease: 'power2.in' }, t)
          .to(dot, { y: C.y, scaleY: 0.01, duration: d, ease: 'power2.in' }, t)
      open(13.0 + S, 0.55, 'back.out(1.6)')
      shut(14.05 + S, 0.1)
      open(14.17 + S, 0.3, 'power3.out')
      // the pupil tightens before the plunge
      tl.to(planet, { scale: 0.44, scaleY: 0.44, duration: 0.5, ease: 'power2.inOut' }, 14.75 + S)

      /* 5 ── DARK ─────────────────────────────────────────────── 15.4 → 18.3 */
      tl.call(setChapter, [4], 15.4 + S)
        .to(dot, { scaleX: 0, scaleY: 0, duration: 0.25, ease: 'power2.in' }, 15.35 + S)
        .to(planet, { scale: 0.9, scaleY: 0.9, duration: 1.0, ease: 'power2.in' }, 15.4 + S)
        .to(cam, { z: 70, duration: 1.0, ease: 'power3.in' }, 15.4 + S)
        // black. The world is re-set behind it.
        .set(cover, { autoAlpha: 1 }, 16.38 + S)
        .set([m, planet, lid], { autoAlpha: 0 }, 16.4 + S)
        .set(cam, { x: 800, y: 450, z: 1 }, 16.42 + S)
        .set(m, { morphSVG: STAIRS, drawSVG: '0% 0%', scale: 1, scaleY: 1 }, 16.44 + S)
        .set(dot, { x: 800, y: 450 }, 16.44 + S)
        // …and the black was a shutter all along
        .set(blades, { y: 0 }, 16.6 + S)
        .set(shutter, { autoAlpha: 1, rotation: 0 }, 16.6 + S)
        .set(cover, { autoAlpha: 0 }, 16.62 + S)
        .to(blades, { y: 150, duration: 0.42, ease: 'expo.out' }, 16.85 + S)
        .to(shutter, { rotation: 32, duration: 0.42, ease: 'expo.out' }, 16.85 + S)
        .to(dot, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, 16.95 + S)
        // a breath in, then all the way open
        .to(blades, { y: 118, duration: 0.3, ease: 'power2.inOut' }, 17.5 + S)
        .to(blades, { y: 1150, duration: 0.6, ease: 'power3.in' }, 17.8 + S)
        .to(shutter, { rotation: 78, duration: 0.6, ease: 'power3.in' }, 17.8 + S)
        .set(shutter, { autoAlpha: 0 }, 18.42 + S)

      /* 6 ── DRAW ─────────────────────────────────────────────── 18.3 → 21.9 */
      tl.call(setChapter, [5], 18.3 + S)
        // wind up, then go: the dot is a nib and the line pours out behind it
        .to(dot, { x: 772, scaleX: 0.8, scaleY: 1.2, duration: 0.28, ease: 'power2.in' }, 18.3 + S)
        .to(dot, { motionPath: { path: SCRIBBLE }, scaleX: 0.7, scaleY: 0.7, duration: 3.1, ease: 'power2.inOut' }, 18.6 + S)
        .to(scribble, { drawSVG: '0% 100%', duration: 3.1, ease: 'power2.inOut' }, 18.6 + S)
        .to(dot, { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'back.out(2)' }, 21.7 + S)

      /* 7 ── ORDER ────────────────────────────────────────────── 21.9 → 25.2 */
      const seat = cellPos(0, 2)
      tl.call(setChapter, [6], 21.9 + S)
        // the loose line is pulled tight into one square…
        .to(scribble, { morphSVG: SQUARE, duration: 0.55, ease: 'expo.inOut' }, 21.9 + S)
        // …which multiplies
        .to(cells, { x: (i: number) => cellPos(CELLS[i].c, CELLS[i].r).x, y: (i: number) => cellPos(CELLS[i].c, CELLS[i].r).y, scale: 1, duration: 0.9, ease: 'back.out(1.5)', stagger: { amount: 0.5, from: 'center' } }, 22.4 + S)
        .to(scribble, { autoAlpha: 0, duration: 0.2 }, 22.45 + S)
        // the dot hops into the one empty seat
        .to(dot, { x: seat.x, duration: 0.7, ease: 'none' }, 22.5 + S)
        .to(dot, { y: 330, duration: 0.33, ease: 'power2.out' }, 22.5 + S)
        .to(dot, { y: seat.y, duration: 0.37, ease: 'power2.in' }, 22.83 + S)
      impact(23.2 + S, seat.y, 0.35)
      // stadium wave, twice, left to right; the dot leads
      for (const t of [23.6 + S, 24.35 + S]) {
        tl.to(dot, { y: seat.y - 46, duration: 0.24, ease: 'sine.out' }, t)
          .to(dot, { y: seat.y, duration: 0.3, ease: 'sine.in' }, t + 0.24)
          .to(cells, { y: (i: number) => cellPos(CELLS[i].c, CELLS[i].r).y - 46, rotation: 90, duration: 0.24, ease: 'sine.out', stagger: (i: number) => CELLS[i].c * 0.075 }, t)
          .to(cells, { y: (i: number) => cellPos(CELLS[i].c, CELLS[i].r).y, duration: 0.3, ease: 'sine.in', stagger: (i: number) => CELLS[i].c * 0.075 }, t + 0.24)
          .set(cells, { rotation: 0 }, t + 0.24 + 0.3 + 8 * 0.075 + 0.02)
      }

      /* 8 ── CHAIN ────────────────────────────────────────────── 25.2 → 29.2 */
      tl.call(setChapter, [7], 25.2 + S)
        // the grid is drawn into a spiral and stands up as dominoes
        .to(cells, { x: (i: number) => SPIRAL[i].x, y: (i: number) => SPIRAL[i].y, scale: 0, rotation: 180, duration: 0.8, ease: 'power3.inOut', stagger: 0.012 }, 25.2 + S)
        .to(dominoes, { scaleY: 1, duration: 0.5, ease: 'back.out(2.4)', stagger: 0.012 }, 25.7 + S)
        // the dot rolls back, then in
        .to(dot, { x: seat.x - 34, duration: 0.3, ease: 'power2.out' }, 26.3 + S)
        .to(dot, { x: SPIRAL[0].x - R - 6, duration: 0.3, ease: 'power3.in' }, 26.6 + S)
        .to(dot, { x: SPIRAL[0].x - R - 40, duration: 0.5, ease: 'power2.out' }, 26.9 + S)
        .to(dominoes, { rotation: (i: number) => SPIRAL[i].deg + 64, duration: 0.2, ease: 'power2.in', stagger: 0.047 }, 26.9 + S)
        .to(cam, { z: 1.22, duration: 2.2, ease: 'sine.inOut' }, 26.9 + S)
        // …and is drawn after the chain into the middle
        .to(dot, { x: 800, y: 450, duration: 1.5, ease: 'power2.inOut' }, 27.6 + S)

      /* 9 ── ENGINE ───────────────────────────────────────────── 29.2 → 32.6 */
      tl.call(setChapter, [8], 29.2 + S)
        // the fallen dominoes fly out and seat themselves as teeth
        .to(dominoes, { x: (i: number) => TEETH[i].x, y: (i: number) => TEETH[i].y, rotation: (i: number) => TEETH[i].a, scaleY: TOOTH, duration: 0.85, ease: 'power3.inOut', stagger: 0.01 }, 29.2 + S)
        .to(cam, { z: 1, duration: 1.1 }, 29.2 + S)
        .to(dot, { x: GEARS[0].cx, y: GEARS[0].cy, duration: 0.8, ease: 'power3.inOut' }, 29.4 + S)
        // the real gears take over from the dominoes on the same frame
        .set(gears, { autoAlpha: 1 }, 30.5 + S)
        .set(dominoes, { autoAlpha: 0 }, 30.52 + S)
        .fromTo(rings, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.5, ease: 'power2.out', stagger: 0.08 }, 30.5 + S)
        // lock…
        .fromTo(gears, { scale: 1.06 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, 30.55 + S)
      // …and turn. Speeds follow the tooth counts, so they mesh.
      const turn = (t: number, deg: number, d: number, ease: string) =>
        gears.forEach((g, i) => tl.to(g, { rotation: `+=${(deg * GEARS[i].dir * GEARS[0].teeth) / GEARS[i].teeth}`, duration: d, ease }, t))
      turn(31.0 + S, 150, 1.7, 'power1.inOut')

      /* 10 ── AGAIN ───────────────────────────────────────────── 32.6 → 36.4 */
      tl.call(setChapter, [9], 32.7 + S)
      turn(32.7 + S, 900, 1.5, 'power3.in')
      // the machine is swallowed by its own axle
      tl.to(gears, { x: (i: number) => GEARS[0].cx - GEARS[i].cx, y: (i: number) => GEARS[0].cy - GEARS[i].cy, scale: 0, duration: 0.55, ease: 'power3.in' }, 33.65 + S)
        .to(dot, { scaleX: 1.7, scaleY: 1.7, duration: 0.14, ease: 'power2.out' }, 34.15 + S)
        .to(dot, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, 34.29 + S)
        // one hop; the staircase draws itself underneath just in time
        .to(dot, { scaleX: 1.25, scaleY: 0.75, duration: 0.2, ease: 'power2.in' }, 34.75 + S)
        .to(dot, { x: L0.x, duration: 0.8, ease: 'none' }, 34.95 + S)
        .to(dot, { y: 250, scaleX: 0.9, scaleY: 1.14, duration: 0.38, ease: 'power2.out' }, 34.95 + S)
        .to(dot, { y: L0.y, scaleX: 0.88, scaleY: 1.16, duration: 0.42, ease: 'power2.in' }, 35.33 + S)
        .set(m, { autoAlpha: 1 }, 34.9 + S)
        .to(m, { drawSVG: '0% 100%', duration: 0.8, ease: 'power3.out' }, 34.95 + S)
      impact(35.75 + S, L0.y, 0.4)
      tl.set({}, {}, 36.4 + S)

      applyCam()
      if (reduced) {
        tl.time(9.6 + 1.5) // a composed still: the dot rolling inside the hoop, the planet risen
        applyCam()
        return
      }
      onSceneShown(el, () => tl.play(), () => tl.pause(), 0.4)
      // nothing off screen should cost a frame
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.progress() > 0 && tl.play() : tl.pause()))
      io.observe(el)
      return () => io.disconnect()
    }, el)
    return () => {
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [])

  return (
    <section className="lp" ref={root} aria-label="Loop: a short animated film that plays on its own">
      <svg className="lp__svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g className="lp__world">
          {/* the one line that is a staircase, then a wave, then a hoop, then an iris */}
          <path className="lp__m lp__stroke" d={STAIRS} />
          {[0, 1, 2].map((i) => (
            <circle className="lp__ripple lp__stroke lp__stroke--thin" key={i} r={260 + i * 70} />
          ))}
          <circle className="lp__planet lp__fill" cx={C.x} cy={C.y} r={80} />
          <path className="lp__lid lp__stroke" d={LID_SHUT} />

          <path className="lp__scribble lp__stroke" d={SCRIBBLE} />
          {CELLS.map((c, i) => (
            <g className="lp__cell" key={i}>
              {c.kind === 0 && <rect className={c.solid ? 'lp__fill' : 'lp__stroke'} x={-35} y={-35} width={70} height={70} />}
              {c.kind === 1 && <circle className={c.solid ? 'lp__fill' : 'lp__stroke'} r={36} />}
              {c.kind === 2 && <path className={c.solid ? 'lp__fill' : 'lp__stroke'} d="M0 -40 L40 32 L-40 32 Z" />}
            </g>
          ))}
          {SPIRAL.map((_, i) => (
            <rect className="lp__domino lp__fill" key={i} x={-5} y={-23} width={10} height={46} rx={2} />
          ))}
          {GEARS.map((g, gi) => (
            <g className="lp__gear" key={gi}>
              <circle className="lp__gear-ring lp__stroke" cx={g.cx} cy={g.cy} r={g.r - 46 * TOOTH * 0.5} />
              <circle className="lp__stroke lp__stroke--thin" cx={g.cx} cy={g.cy} r={g.r * 0.34} />
              {[0, 60, 120].map((a) => (
                <path className="lp__stroke lp__stroke--thin" key={a} d={`M${g.cx - g.r * 0.72} ${g.cy} H${g.cx + g.r * 0.72}`} transform={`rotate(${a} ${g.cx} ${g.cy})`} />
              ))}
              {TEETH.filter((t) => t.gi === gi).map((t, k) => (
                <rect className="lp__fill" key={k} x={-5} y={-23 * TOOTH} width={10} height={46 * TOOTH} rx={2} transform={`translate(${t.x} ${t.y}) rotate(${t.a})`} />
              ))}
            </g>
          ))}

          <circle className="lp__dot" r={R} />
        </g>

        {/* screen space: the dark, and the shutter it turns out to be */}
        <rect className="lp__cover lp__fill" x={-200} y={-200} width={2000} height={1300} />
        <g className="lp__shutter">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i} transform={`translate(800 450) rotate(${i * 60})`}>
              <rect className="lp__blade" x={-2400} y={0} width={4800} height={2400} />
            </g>
          ))}
        </g>
      </svg>

      <p className="lp__chapter caps" aria-hidden>
        <b>01</b>
        <i>
          <span>Fall</span>
        </i>
      </p>
      <p className="scene-tag caps">N° 10 — Loop</p>
    </section>
  )
}
