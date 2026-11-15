import { useEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import heroSrc from '@assets/processed/me-front-hero.webp'
import { reducedMotion } from '@/lib/scroll'
import { prewarmScenes } from '@/lib/scene'

type Props = { onReveal: () => void; onDone: () => void }

const MIN_SECONDS = 2.8 // the count never runs faster than this, however quick the network
const FAILSAFE_MS = 9000
const TICKS = 60
const HOLE_POINTS = 56

/**
 * The loader is a watch dial. Sixty ticks light one by one as real loading progresses (fonts,
 * hero portrait, and a pre-warm pass over every scene), a hand sweeps with them, and the count sits in the centre. At 100 the dial
 * becomes an aperture: a circular hole opens from its centre and the tick ring rides the edge
 * of that hole outward until it has left the screen, revealing the page underneath.
 *
 * The hole is a clip-path polygon with an even-odd fill (outer rectangle + inner circle),
 * rebuilt per frame, so it stays within transform / opacity / clip-path.
 */
export default function Preloader({ onReveal, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const num = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = root.current!
    const panel = el.querySelector<HTMLElement>('.pre__panel')!
    const dial = el.querySelector<HTMLElement>('.pre__dial')!
    const hand = el.querySelector<HTMLElement>('.pre__hand')!
    const ticks = Array.from(el.querySelectorAll<HTMLElement>('.pre__tick'))
    const reduced = reducedMotion()
    let loaded = 0
    const total = 3
    const mark = () => (loaded = Math.min(total, loaded + 1))
    // third thing the count waits for: every scene drawn once, unseen, so none stalls later
    document.fonts.ready.then(prewarmScenes).then(mark, mark)

    document.fonts.ready.then(mark, mark)
    const img = new Image()
    img.src = heroSrc
    img.decode().then(mark, mark)
    const failsafe = window.setTimeout(() => (loaded = total), FAILSAFE_MS)

    let value = 0
    let shown = -1
    let lit = 0
    let finished = false

    const hole = (r: number) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      let pts = '0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px'
      for (let i = 0; i <= HOLE_POINTS; i++) {
        const a = (i / HOLE_POINTS) * Math.PI * 2
        pts += `, ${(cx + Math.cos(a) * r).toFixed(1)}px ${(cy + Math.sin(a) * r).toFixed(1)}px`
      }
      panel.style.clipPath = `polygon(evenodd, ${pts})`
    }

    const exit = () => {
      if (reduced) {
        onReveal()
        gsap.to(el, { autoAlpha: 0, duration: 0.4, onComplete: onDone })
        return
      }
      const dialR = dial.offsetWidth / 2 || Math.min(window.innerWidth, window.innerHeight) * 0.3
      const reach = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40
      const lens = { r: 0 }
      gsap
        .timeline({ onComplete: onDone })
        .to('.pre__num-inner', { yPercent: -110, duration: 1.0, ease: 'power4.inOut' }, 0.3)
        .to('.pre__meta', { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 0.4)
        .to(hand, { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0.5)
        // a breath in before it opens
        .to(dial, { scale: 0.94, duration: 0.7, ease: 'power2.inOut' }, 0.45)
        .add(onReveal, 1.05)
        .to(
          lens,
          {
            r: reach,
            duration: 2.0,
            ease: 'expo.inOut',
            onUpdate: () => {
              hole(lens.r)
              // once the hole reaches the ticks, they ride its edge outward
              gsap.set(dial, { scale: Math.max(0.94, (lens.r / dialR) * 1.06) })
            },
          },
          1.05,
        )
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
        if (num.current) num.current.textContent = String(n).padStart(2, '0')
        const want = Math.round((n / 100) * TICKS)
        for (; lit < want; lit++) ticks[lit].classList.add('is-on')
      }
      hand.style.transform = `rotate(${(value * 3.6).toFixed(2)}deg)`
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
      <div className="pre__panel">
        <div className="pre__meta caps">
          <span>Kanishq Surendran</span>
          <span>MMXXVI</span>
        </div>

        <div className="pre__dial" aria-hidden>
          {Array.from({ length: TICKS }, (_, i) => (
            <i className={`pre__tick${i % 5 ? '' : ' is-major'}`} key={i} style={{ '--a': `${i * 6}deg` } as CSSProperties} />
          ))}
          <span className="pre__hand" />
        </div>

        <div className="pre__num" aria-hidden>
          <span className="pre__num-inner">
            <span ref={num}>00</span>
          </span>
        </div>
      </div>
    </div>
  )
}
