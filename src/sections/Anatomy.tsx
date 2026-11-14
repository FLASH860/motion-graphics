import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import heroSrc from '@assets/processed/me-front-hero.webp'
import { dwellTrigger } from '@/lib/scene'

/**
 * 04 — Anatomy. Scroll-driven. The landing page you arrived on, as an object: it turns side-on
 * and comes apart into the five standing sheets it is made of, each named in
 * turn, then closes again. Pure CSS 3D (one preserve-3d card, five translateZ sheets).
 */
const SHEETS = [
  { name: 'Light', note: 'A glow sampled from the photograph.' },
  { name: 'Type, behind', note: 'Set to the same measure as the surname.' },
  { name: 'Subject', note: 'Cut out on this machine. No studio.' },
  { name: 'Type, in front', note: 'So the name wraps around him.' },
  { name: 'Motion', note: 'Every sheet moves at its own speed.' },
]

export default function Anatomy() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const rows = gsap.utils.toArray<HTMLElement>('.ana__row', el)
    const sheets = gsap.utils.toArray<HTMLElement>('.ana__sheet', el)
    let active = -2
    const focus = (i: number) => {
      if (i === active) return
      active = i
      el.classList.toggle('is-focusing', i >= 0)
      rows.forEach((r, n) => r.classList.toggle('is-active', n === i))
      sheets.forEach((s, n) => s.classList.toggle('is-active', n === i))
    }

    const ctx = gsap.context(() => {
      const gap = () => el.querySelector<HTMLElement>('.ana__card')!.offsetWidth * 0.2
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          ...dwellTrigger(el),
          onUpdate: (self) => {
            // while it is apart, walk through the sheets one at a time
            const p = (self.progress - 0.36) / (0.8 - 0.36)
            focus(p < 0 || p >= 1 ? -1 : Math.min(SHEETS.length - 1, Math.floor(p * SHEETS.length)))
          },
        },
      })
      tl.fromTo('.ana__card', { rotateX: 0, rotateY: 0, scale: 0.86, xPercent: 0 }, { rotateX: 7, rotateY: 44, scale: 0.84, xPercent: -24, duration: 0.3 }, 0.06)
      sheets.forEach((s, i) => {
        tl.fromTo(s, { z: 0 }, { z: () => i * gap(), duration: 0.3 }, 0.08)
      })
      tl.fromTo('.ana__sheet', { '--edge': 0 }, { '--edge': 1, duration: 0.14, ease: 'none' }, 0.1)
        .fromTo('.ana__tag', { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.02, ease: 'none' }, 0.24)
        .fromTo('.ana__curve', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.2, ease: 'none' }, 0.2)
        // a slow orbit while the sheets are named
        .to('.ana__card', { rotateY: 30, rotateX: 4, xPercent: -19, duration: 0.44, ease: 'none' }, 0.36)
        // and back together
        .to('.ana__tag', { opacity: 0, duration: 0.06, ease: 'none' }, 0.8)
        .to(sheets, { z: 0, duration: 0.18 }, 0.81)
        .to('.ana__sheet', { '--edge': 0, duration: 0.1, ease: 'none' }, 0.88)
        .to('.ana__card', { rotateX: 0, rotateY: 0, scale: 0.86, xPercent: 0, duration: 0.19 }, 0.81)
        .fromTo('.ana__rows', { opacity: 0.0 }, { opacity: 1, duration: 0.1, ease: 'none' }, 0.2)
        .to('.ana__rows', { opacity: 0, duration: 0.08, ease: 'none' }, 0.82)
        .fromTo('.ana__close', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.1 }, 0.88)
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="ana" ref={root} aria-label="Anatomy">
      <div className="ana__text">
        <h2 className="serif ana__title">
          Nothing here is <em>flat.</em>
        </h2>
        <ol className="ana__rows">
          {SHEETS.map((s, i) => (
            <li className="ana__row" key={s.name}>
              <span className="caps ana__num">0{i + 1}</span>
              <span className="ana__name serif">{s.name}</span>
              <span className="ana__note">{s.note}</span>
            </li>
          ))}
        </ol>
        <p className="ana__close serif">
          Then it goes back together, <em>and nobody sees the work.</em>
        </p>
      </div>

      <div className="ana__stage" aria-hidden>
        <div className="ana__card">
          <div className="ana__sheet ana__sheet--light">
            <div className="ana__glow" />
            <span className="ana__tag caps">01 Light</span>
          </div>
          <div className="ana__sheet">
            <span className="ana__word ana__word--back">KANISHQ</span>
            <span className="ana__tag caps">02 Type</span>
          </div>
          <div className="ana__sheet">
            <img className="ana__figure" src={heroSrc} alt="" draggable={false} decoding="async" />
            <span className="ana__tag caps">03 Subject</span>
          </div>
          <div className="ana__sheet">
            <span className="ana__word ana__word--front">SURENDRAN</span>
            <span className="ana__tag caps">04 Type</span>
          </div>
          <div className="ana__sheet">
            <svg className="ana__curve" viewBox="0 0 100 60" preserveAspectRatio="none">
              <path d="M2 58 C 22 58, 14 4, 98 2" />
            </svg>
            <span className="ana__ease caps">expo.out — 2.8s</span>
            <span className="ana__tag caps">05 Motion</span>
          </div>
        </div>
      </div>

      <p className="scene-tag caps">N° 04 — Anatomy</p>
    </section>
  )
}
