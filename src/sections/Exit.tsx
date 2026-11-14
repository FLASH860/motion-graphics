import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import plateSrc from '@assets/processed/me-away-plate.webp'
import figureSrc from '@assets/processed/me-away-figure.webp'
import { dwellTrigger, onSceneShown, SKIP_INTRO } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

/**
 * 07 — Exit. The sign-off. The photograph sits in a doorway that opens from a slit; inside it
 * the set and the figure are separate layers (the figure is a local cutout of the same frame),
 * so he walks away from the background as you scroll and as the pointer moves.
 */
const LINKS = [
  { label: 'GitHub', href: 'https://github.com/FLASH860' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kanishq-surendran-058010333' },
]

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export default function Exit() {
  const root = useRef<HTMLElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  // live IST clock, ticking on the second boundary
  useEffect(() => {
    let timer = 0
    const tick = () => {
      if (time.current) time.current.textContent = clock.format(new Date())
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [])

  useLayoutEffect(() => {
    const el = root.current!
    const reduced = reducedMotion()
    let removeMove = () => {}

    const ctx = gsap.context(() => {
      const intro = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .fromTo('.exit__door', { clipPath: 'inset(0% 49.5% 0% 49.5%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2.8, ease: 'expo.inOut' }, 0)
        .fromTo('.exit__zoom', { scale: 1.3 }, { scale: 1, duration: 3.6, ease: 'expo.out' }, 0.3)
        .fromTo('.exit .mask > span', { yPercent: 118 }, { yPercent: 0, duration: 2, stagger: 0.11 }, 1.3)
        .fromTo('.exit__fade', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.8, stagger: 0.1 }, 2.0)

      if (reduced || SKIP_INTRO) intro.progress(1)
      else onSceneShown(el, () => intro.play(0), () => intro.pause(0), 0.7)

      if (reduced) return
      // scroll: the set drifts up and closer, the figure gets smaller. He is leaving.
      gsap
        .timeline({ defaults: { ease: 'none' }, scrollTrigger: dwellTrigger(el) })
        .fromTo('.exit__plate', { scale: 1.06, yPercent: 0 }, { scale: 1.2, yPercent: -2 }, 0)
        .fromTo('.exit__figure', { scale: 1.1, yPercent: 1 }, { scale: 0.97, yPercent: -1.5 }, 0)

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const layers = [
          { node: el.querySelector('.exit__drift--plate'), k: -14 },
          { node: el.querySelector('.exit__drift--figure'), k: 18 },
        ].map((l) => ({
          k: l.k,
          x: gsap.quickTo(l.node, 'x', { duration: 1.6, ease: 'power3.out' }),
          y: gsap.quickTo(l.node, 'y', { duration: 1.6, ease: 'power3.out' }),
        }))
        const onMove = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5
          const ny = e.clientY / window.innerHeight - 0.5
          layers.forEach((l) => {
            l.x(nx * l.k)
            l.y(ny * l.k * 0.6)
          })
        }
        window.addEventListener('pointermove', onMove, { passive: true })
        removeMove = () => window.removeEventListener('pointermove', onMove)
      }
    }, el)

    return () => {
      removeMove()
      ctx.revert()
    }
  }, [])

  return (
    <section className="exit" ref={root} aria-label="Exit">
      <div className="exit__door">
        <div className="exit__zoom">
          <div className="exit__drift exit__drift--plate">
            <img className="exit__plate" src={plateSrc} alt="" draggable={false} loading="lazy" decoding="async" />
          </div>
          <div className="exit__drift exit__drift--figure">
            <img
              className="exit__figure"
              src={figureSrc}
              alt="Kanishq Surendran, seen from behind, walking away into warm haze"
              draggable={false}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div className="exit__left">
        <p className="exit__line serif">
          <span className="mask">
            <span>Until the</span>
          </span>
          <span className="mask">
            <span>
              <em>next frame.</em>
            </span>
          </span>
        </p>
        <p className="exit__name exit__fade">
          Kanishq Surendran
          <span>Developer. Design and motion, obsessively.</span>
        </p>
      </div>

      <div className="exit__right">
        <ul className="exit__links">
          {LINKS.map((l) => (
            <li key={l.label} className="mask">
              <span>
                <a className="exit__link serif" href={l.href} target="_blank" rel="noopener noreferrer" data-cursor="Open">
                  {l.label}
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </span>
            </li>
          ))}
        </ul>
        <p className="exit__clock exit__fade">
          <span className="caps">Local time — IST</span>
          <span className="exit__time serif" ref={time} aria-live="off">
            00:00:00
          </span>
        </p>
      </div>

      <p className="scene-tag caps">N° 07 — Exit</p>
      <p className="exit__legal caps exit__fade">© MMXXVI — Made by hand</p>
    </section>
  )
}
