import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { sceneOf } from '@/lib/scene'

/**
 * 02 — Passage. A corridor built from nothing but CSS 3D: hairline ribs receding along Z inside
 * one perspective container. Scroll flies the camera down it; statements hang in the air at
 * intervals, out of focus in the distance, sharp as you reach them, gone as you pass.
 * The light at the far end is where the next scene's rectangle opens.
 */
const PERSPECTIVE = 1000
const GAP = 1500 // distance between statements
const FIRST = 900 // distance of the first statement
const RIB = 500 // distance between ribs
const APPROACH = 650 // how far back the camera starts while the scene is still opening
const HOLD = 420 // the last statement stops this far ahead of the camera

type Line = { text: ReactNode; x: number; y: number; align: 'left' | 'right' | 'center' }
const LINES: Line[] = [
  { text: <>I’m a <em>developer.</em></>, x: -17, y: -12, align: 'left' },
  { text: <>But I think in <em>frames.</em></>, x: 17, y: 13, align: 'right' },
  { text: <>Sixty a second. Each one <em>considered.</em></>, x: -15, y: 14, align: 'left' },
  { text: <>Design is what you <em>see.</em></>, x: 17, y: -13, align: 'right' },
  { text: <>Motion is what you <em>feel.</em></>, x: -16, y: 4, align: 'left' },
  { text: <>I build <em>both.</em></>, x: 0, y: 0, align: 'center' },
]
const LAST = FIRST + (LINES.length - 1) * GAP
const CAM_END = LAST - HOLD
const RIBS = Math.ceil((LAST + 2600) / RIB)

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a))

export default function Passage() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const s = sceneOf(el)
    const world = el.querySelector<HTMLElement>('.pass__world')!
    const light = el.querySelector<HTMLElement>('.pass__light')!
    const count = el.querySelector<HTMLElement>('.pass__count')!
    const ribs = gsap.utils.toArray<HTMLElement>('.pass__rib', el).map((node, i) => ({ node, d: i * RIB, o: -1 }))
    const lines = gsap.utils
      .toArray<HTMLElement>('.pass__line', el)
      .map((node, i) => ({ node, d: FIRST + i * GAP, o: -1, b: -1, last: i === LINES.length - 1 }))
    let shown = -1

    const render = (cam: number) => {
      world.style.transform = `translate3d(0,0,${cam.toFixed(1)}px)`
      for (const r of ribs) {
        const dz = r.d - cam
        // fade in out of the distance, fade out just before the rib crosses the lens
        const o = Math.round((1 - ramp(dz, 1300, 2700)) * ramp(dz, -900, -500) * 100) / 100
        if (o !== r.o) {
          r.o = o
          r.node.style.opacity = String(o)
        }
      }
      let nearest = 0
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        const dz = l.d - cam
        if (dz < GAP * 0.55) nearest = i
        const far = 1 - ramp(dz, 900, 1750) // 1 in focus → 0 far away
        const passing = l.last ? 1 : ramp(dz, -40, 430)
        const o = Math.round((0.28 + 0.72 * far) * (1 - ramp(dz, 2500, 3300)) * passing * 100) / 100
        const b = Math.round((1 - far) * 7 * 2) / 2
        if (o !== l.o) {
          l.o = o
          l.node.style.opacity = String(o)
          l.node.style.visibility = o === 0 ? 'hidden' : 'visible'
        }
        if (b !== l.b) {
          l.b = b
          l.node.style.filter = b ? `blur(${b}px)` : 'none'
        }
      }
      if (nearest !== shown) {
        shown = nearest
        count.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}`
      }
      // the light at the end grows as you close in on it
      light.style.transform = `scale(${(0.55 + 0.75 * clamp01(cam / CAM_END)).toFixed(3)})`
    }

    render(-APPROACH)
    const st = ScrollTrigger.create({
      trigger: s.track,
      start: 'top top',
      end: () => `+=${(s.tin + s.dwell) * s.unit()}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // two legs: a slow approach while the rectangle opens, then the walk itself
        const split = s.tin / (s.tin + s.dwell)
        const p = self.progress
        const cam =
          p < split
            ? -APPROACH + APPROACH * gsap.parseEase('power1.out')(p / split)
            : CAM_END * gsap.parseEase('sine.inOut')((p - split) / (1 - split))
        render(cam)
      },
    })
    return () => st.kill()
  }, [])

  return (
    <section className="pass" ref={root} aria-label="Passage">
      <div className="pass__light" aria-hidden />
      <svg className="pass__rails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 L50 50 M100 0 L50 50 M0 100 L50 50 M100 100 L50 50" />
      </svg>

      <div className="pass__stage" style={{ perspective: `${PERSPECTIVE}px` }}>
        <div className="pass__world">
          {Array.from({ length: RIBS }, (_, i) => (
            <div className="pass__rib" key={i} style={{ transform: `translateZ(${-i * RIB}px)` }} aria-hidden />
          ))}
          {LINES.map((l, i) => (
            <div className="pass__gate" key={i} style={{ transform: `translateZ(${-(FIRST + i * GAP)}px)` }}>
              <p
                className={`pass__line serif pass__line--${l.align}`}
                style={{ '--x': l.x, '--y': l.y } as CSSProperties}
              >
                {l.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="scene-tag caps">N° 02 — Passage</p>
      <p className="pass__count caps" aria-hidden>
        01 / 06
      </p>
    </section>
  )
}
