import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createSequence } from '@/lib/frames'
import { dwellTrigger, sceneOf } from '@/lib/scene'

/**
 * 06 — Movement. The watch film, scrubbed by scroll. 240 frames are drawn to one canvas
 * (an image sequence scrubs cleaner than seeking a video, and equally well backwards); the
 * drawn frame eases toward the scroll position, which is what makes it feel weighted.
 *
 * The footage sits on pure black and keeps its own colours in both themes: it is blended
 * `lighten` into a dark page, and in the light theme this one scene stays a dark room.
 */
const FRAMES = 240
const W = 1280
const H = 720
const sequence = createSequence(FRAMES, (i) => `/watch/${String(i + 1).padStart(4, '0')}.webp`)

/** Called once the intro is over, so the frames arrive long before the scene is reached. */
export const preloadWatch = () => sequence.start()

type Part = { n: string; name: string; text: string; side: 'left' | 'right'; from: number; to: number }
const PARTS: Part[] = [
  { n: '01', name: 'Case', text: 'Forged carbon, in two halves. The first thing you touch, the last thing made.', side: 'left', from: 0.13, to: 0.33 },
  { n: '02', name: 'Crystal', text: 'A dome of sapphire. Its only job is to disappear.', side: 'right', from: 0.25, to: 0.45 },
  { n: '03', name: 'Indicators', text: 'Two crowns in red. Colour used once, exactly where the hand needs to go.', side: 'left', from: 0.4, to: 0.6 },
  { n: '04', name: 'Barrels', text: 'Twin mainsprings. Power stored, then released evenly. Easing, in steel.', side: 'right', from: 0.55, to: 0.76 },
  { n: '05', name: 'Tourbillon', text: 'The heart, turning once a minute to cancel out gravity. Motion with a reason.', side: 'left', from: 0.74, to: 1.2 },
]

export default function Movement() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const ctx2d = canvas.current!.getContext('2d', { alpha: false })!
    const counter = el.querySelector<HTMLElement>('.mov__frame')!
    const bar = el.querySelector<HTMLElement>('.mov__bar > span')!
    const s = sceneOf(el)
    let target = 0
    let current = 0
    let drawn = -1
    let running = false
    let onScreen = false

    ctx2d.fillStyle = '#000'
    ctx2d.fillRect(0, 0, W, H)

    const draw = (force = false) => {
      const want = Math.round(current)
      const have = sequence.nearest(want)
      if (have < 0 || (have === drawn && !force)) return
      ctx2d.drawImage(sequence.images[have]!, 0, 0, W, H)
      drawn = have
      counter.textContent = String(want + 1).padStart(3, '0')
      bar.style.transform = `scaleX(${(want / (FRAMES - 1)).toFixed(4)})`
    }
    const tick = (_t: number, deltaMs: number) => {
      const d = target - current
      if (Math.abs(d) < 0.01) current = target
      else current += d * Math.min(1, (Math.min(deltaMs, 64) / 1000) * 9)
      draw()
      // off screen and settled: stop costing frames
      if (!onScreen && current === target) run(false)
    }
    const run = (on: boolean) => {
      if (on === running) return
      running = on
      if (on) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    }
    // a sharper frame may arrive for the position we are parked on
    const off = sequence.onFrame((i) => {
      if (Math.abs(i - current) < Math.abs(drawn - current) || drawn < 0) draw(true)
    })
    draw(true)

    const ctx = gsap.context(() => {
      // only tick while the scene is on screen
      ScrollTrigger.create({
        trigger: s.track,
        start: 'top top',
        end: () => `+=${(s.tin + s.dwell + s.tout) * s.unit()}`,
        onToggle: (self) => {
          onScreen = self.isActive
          if (onScreen) run(true) // (the tick stops itself once the scene has left and the film has settled)
        },
      })

      const narrow = window.matchMedia('(max-width: 760px)').matches
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { ...dwellTrigger(el), onUpdate: (self) => (target = self.progress * (FRAMES - 1)) },
      })
      // start close on the whole watch, pull back as it comes apart and needs the width
      tl.fromTo('.mov__canvas', { scale: narrow ? 2.5 : 1.42 }, { scale: 1, duration: 0.62, ease: 'power2.inOut' }, 0.1)
        .to('.mov__title', { autoAlpha: 0, yPercent: -30, duration: 0.1 }, 0.08)
        .fromTo('.mov__hud', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.06)

      gsap.utils.toArray<HTMLElement>('.mov__card', el).forEach((card, i) => {
        const p = PARTS[i]
        const dir = p.side === 'left' ? -1 : 1
        tl.fromTo(card, { xPercent: 130 * dir, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.09, ease: 'power3.out' }, p.from)
        tl.fromTo(card.querySelector('.mov__rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.09, ease: 'power2.out' }, p.from + 0.03)
        if (p.to < 1) tl.to(card, { xPercent: 130 * dir, autoAlpha: 0, duration: 0.08, ease: 'power2.in' }, p.to)
      })
    }, el)

    return () => {
      run(false)
      off()
      ctx.revert()
    }
  }, [])

  // safety net: if the idle preload never ran, start loading when this mounts on screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && sequence.start(), { rootMargin: '200% 0px' })
    io.observe(root.current!)
    return () => io.disconnect()
  }, [])

  return (
    <section className="mov" ref={root} aria-label="Movement">
      <canvas
        className="mov__canvas"
        ref={canvas}
        width={W}
        height={H}
        role="img"
        aria-label="A mechanical watch coming apart into its components as you scroll"
      />

      <h2 className="mov__title serif">
        Take it <em>apart.</em>
      </h2>

      <div className="mov__cards">
        {PARTS.map((p) => (
          <article className={`mov__card mov__card--${p.side}`} key={p.n}>
            <p className="caps mov__n">
              {p.n} <span>/ 05</span>
            </p>
            <h3 className="serif mov__name">{p.name}</h3>
            <span className="mov__rule" aria-hidden />
            <p className="mov__text">{p.text}</p>
          </article>
        ))}
      </div>

      <div className="mov__hud caps" aria-hidden>
        <span>
          Frame <b className="mov__frame">001</b> / {FRAMES}
        </span>
        <span className="mov__bar">
          <span />
        </span>
      </div>
      <p className="scene-tag caps">N° 06 — Movement</p>
    </section>
  )
}
