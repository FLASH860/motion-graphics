import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import heroSrc from '@assets/processed/me-front-hero.webp'
import { reducedMotion } from '@/lib/scroll'
import { SKIP_INTRO, dwellTrigger } from '@/lib/scene'

const Chars = ({ text }: { text: string }) => (
  <>
    {text.split('').map((c, i) => (
      <span className="char" key={i}>
        <span className="char__in">{c}</span>
      </span>
    ))}
  </>
)

/** Scale a single-line word so it spans `target` px, capped by `maxPx`. */
function fit(el: HTMLElement, target: number, maxPx: number) {
  el.style.fontSize = '100px'
  const w = el.getBoundingClientRect().width
  if (w > 0) el.style.fontSize = `${Math.min((100 * target) / w, maxPx)}px`
}

/**
 * Landing hero. Three depth planes: the first name sits behind the portrait, the surname in
 * front of it, and each plane drifts at its own rate on scroll (and, faintly, with the pointer).
 * Each plane is three nested boxes so scroll, pointer and entrance transforms never fight:
 *   .hero__plane (scroll) > .hero__drift (pointer) > content (entrance)
 */
export default function Hero({ play }: { play: boolean }) {
  const root = useRef<HTMLElement>(null)
  const entrance = useRef<gsap.core.Timeline | null>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const back = el.querySelector<HTMLElement>('.hero__word--back')!
    const front = el.querySelector<HTMLElement>('.hero__word--front')!

    const resize = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const span = Math.min(vw * 0.92, vh * 2.1)
      fit(back, span, vh * 0.5)
      fit(front, span, vh * 0.4)
    }
    resize()
    document.fonts.ready.then(resize)
    window.addEventListener('resize', resize)

    const reduced = reducedMotion()
    const ctx = gsap.context(() => {
      if (reduced) return

      // entrance, held until the preloader curtain starts to lift
      gsap.set('.char__in', { yPercent: 115 })
      gsap.set('.hero__figure', { autoAlpha: 0, yPercent: 7, scale: 1.07 })
      gsap.set('.hero__glow', { autoAlpha: 0, scale: 0.8 })
      gsap.set('.hero__meta > *', { autoAlpha: 0, y: 18 })
      entrance.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .to('.hero__glow', { autoAlpha: 1, scale: 1, duration: 3.2, ease: 'power2.out' }, 0.5)
        .to('.hero__word--back .char__in', { yPercent: 0, duration: 2, stagger: 0.07 }, 0.75)
        .to('.hero__figure', { autoAlpha: 1, duration: 1.8, ease: 'power2.out' }, 1.0)
        .to('.hero__figure', { yPercent: 0, scale: 1, duration: 2.8 }, 1.0)
        .to('.hero__word--front .char__in', { yPercent: 0, duration: 2, stagger: 0.055 }, 1.35)
        .to('.hero__meta > *', { autoAlpha: 1, y: 0, duration: 1.8, stagger: 0.14 }, 2.1)

      // The hero is pinned, so scroll becomes a slow dolly-in: each plane scales by its depth
      // (far barely moves, near rushes past), through the dwell and on under the next rectangle.
      gsap
        .timeline({ defaults: { ease: 'none' }, scrollTrigger: dwellTrigger(el, 100) })
        .to('.hero__plane--back', { scale: 1.05, yPercent: -3 }, 0)
        .to('.hero__plane--glow', { scale: 1.2 }, 0)
        .to('.hero__plane--figure', { scale: 1.13, yPercent: 2 }, 0)
        .to('.hero__plane--front', { scale: 1.1, yPercent: 7 }, 0)
        .to('.hero__meta', { autoAlpha: 0, duration: 0.3 }, 0)

      // pointer drift, fine pointers only
      if (window.matchMedia('(pointer: fine)').matches) {
        const drifts = gsap.utils.toArray<HTMLElement>('.hero__drift').map((d) => {
          const depth = Number(d.dataset.depth)
          return {
            depth,
            x: gsap.quickTo(d, 'x', { duration: 1.6, ease: 'power3.out' }),
            y: gsap.quickTo(d, 'y', { duration: 1.6, ease: 'power3.out' }),
          }
        })
        const onMove = (e: PointerEvent) => {
          // scale the drift with the viewport so narrow windows never push type off the edge
          const k = Math.min(1, window.innerWidth / 1440)
          const nx = (e.clientX / window.innerWidth - 0.5) * k
          const ny = (e.clientY / window.innerHeight - 0.5) * k
          drifts.forEach((d) => {
            d.x(nx * d.depth)
            d.y(ny * d.depth * 0.6)
          })
        }
        window.addEventListener('pointermove', onMove, { passive: true })
        return () => window.removeEventListener('pointermove', onMove)
      }
    }, el)

    return () => {
      window.removeEventListener('resize', resize)
      ctx.revert()
      entrance.current = null
    }
  }, [])

  useEffect(() => {
    if (!play) return
    if (SKIP_INTRO) entrance.current?.progress(1)
    else entrance.current?.play()
    ScrollTrigger.refresh()
  }, [play])

  return (
    <section className="hero" id="top" ref={root}>
      <h1 className="sr-only">Kanishq Surendran</h1>

      <div className="hero__plane hero__plane--glow" aria-hidden>
        <div className="hero__glow" />
      </div>

      <div className="hero__plane hero__plane--back" aria-hidden>
        <div className="hero__drift" data-depth="-14">
          <p className="hero__word hero__word--back">
            <Chars text="KANISHQ" />
          </p>
        </div>
      </div>

      <div className="hero__plane hero__plane--figure">
        <div className="hero__drift" data-depth="10">
          <img
            className="hero__figure"
            src={heroSrc}
            alt="Portrait of Kanishq Surendran, seated, hand resting against his face"
            width={1725}
            height={1068}
            decoding="async"
            draggable={false}
          />
        </div>
      </div>

      <div className="hero__plane hero__plane--front" aria-hidden>
        <div className="hero__drift" data-depth="26">
          <p className="hero__word hero__word--front">
            <Chars text="SURENDRAN" />
          </p>
        </div>
      </div>

      <div className="hero__meta hero__meta--left">
        <p className="hero__line">A study in motion</p>
        <p className="caps">N° 01 — MMXXVI</p>
      </div>
      <div className="hero__meta hero__meta--right">
        <p className="caps hero__scroll">
          Scroll
          <span className="hero__scroll-line" aria-hidden />
        </p>
      </div>
    </section>
  )
}
