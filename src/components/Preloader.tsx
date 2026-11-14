import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import heroSrc from '@assets/processed/me-front-hero.webp'
import { reducedMotion } from '@/lib/scroll'

type Props = { onReveal: () => void; onDone: () => void }

const MIN_SECONDS = 2.4 // the count never runs faster than this, however quick the network
const FAILSAFE_MS = 9000

/**
 * 0–100 counter tied to real loading (fonts + hero portrait), then a two-layer curtain lift.
 * `onReveal` fires as the curtain starts moving so the hero entrance plays underneath it.
 */
export default function Preloader({ onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = root.current!
    const reduced = reducedMotion()
    let loaded = 0
    const total = 2
    const mark = () => (loaded = Math.min(total, loaded + 1))

    document.fonts.ready.then(mark, mark)
    const img = new Image()
    img.src = heroSrc
    img.decode().then(mark, mark)
    const failsafe = window.setTimeout(() => (loaded = total), FAILSAFE_MS)

    let value = 0
    let shown = -1
    let finished = false

    const exit = () => {
      if (reduced) {
        onReveal()
        gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: onDone })
        return
      }
      gsap
        .timeline({ defaults: { ease: 'expo.inOut' }, onComplete: onDone })
        .to('.pre__num-inner', { yPercent: -105, duration: 1.1, ease: 'power4.inOut' }, 0.35)
        .to('.pre__meta, .pre__bar', { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 0.45)
        .add(onReveal, 1.0)
        .to('.pre__panel', { yPercent: -100, duration: 1.6 }, 1.0)
        .to('.pre__veil', { yPercent: -100, duration: 1.6 }, 1.16)
    }

    const tick = (_t: number, deltaMs: number) => {
      if (finished) return
      // real progress sets the ceiling; the count glides toward it at a capped, even pace
      const ceiling = loaded >= total ? 100 : 28 + (loaded / total) * 50
      const step = (Math.min(deltaMs, 64) / 1000) * (100 / MIN_SECONDS)
      value = Math.min(ceiling, value + step)
      const n = Math.floor(value)
      if (n !== shown) {
        shown = n
        if (num.current) num.current.textContent = String(n)
        if (bar.current) bar.current.style.transform = `scaleX(${n / 100})`
      }
      if (value >= 100) {
        finished = true
        gsap.ticker.remove(tick)
        exit()
      }
    }
    gsap.ticker.add(tick)

    return () => {
      finished = true
      gsap.ticker.remove(tick)
      window.clearTimeout(failsafe)
    }
    // run once: the callbacks are stable for the lifetime of the preloader
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pre" ref={root} role="status" aria-label="Loading">
      <div className="pre__veil" />
      <div className="pre__panel">
        <div className="pre__meta caps">
          <span>Kanishq Surendran</span>
          <span>MMXXVI</span>
        </div>
        <div className="pre__num" aria-hidden>
          <span className="pre__num-inner">
            <span ref={num}>0</span>
          </span>
        </div>
        <span className="pre__bar" ref={bar} />
      </div>
    </div>
  )
}
