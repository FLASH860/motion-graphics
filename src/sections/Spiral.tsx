import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { dwellTrigger } from '@/lib/scene'

/**
 * 07 — Spiral. Scroll-driven. Eight cards stand on a helix around a column of light, like the
 * treads of a spiral stair. Scroll turns the stair and lifts it, so each card in turn comes
 * round to the front at eye level while the others wait above and below, dimmed behind the core.
 *
 * CSS 3D only: every card is rotateY(angle) translateZ(radius) at its own height inside one
 * preserve-3d group; scroll animates that group's rotateY and y. A page-coloured veil on the
 * axis is what fades the far side. The core is a few gradients and dashed rings on CSS loops.
 */
const CARDS = [
  { name: 'Interface', text: 'Screens that explain themselves. Nothing to learn, nothing in the way.' },
  { name: 'Motion', text: 'Easing, timing, weight. Movement that tells you where things went.' },
  { name: 'Typography', text: 'Type set like it matters, because it is most of what anyone reads.' },
  { name: 'Systems', text: 'Tokens, grids and rules, so the hundredth screen looks like the first.' },
  { name: 'Detail', text: 'The last five percent. Where most of the work is and all of the feel.' },
  { name: 'Performance', text: 'Sixty frames a second, or it does not ship.' },
  { name: 'Craft', text: 'Built by hand, line by line. No templates underneath.' },
  { name: 'Curiosity', text: 'Take it apart. Understand it. Put it back better.' },
]
const ANGLE = 52 // degrees between neighbouring cards
const N = CARDS.length

export default function Spiral() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const cards = gsap.utils.toArray<HTMLElement>('.spi__card', el)
    const count = el.querySelector<HTMLElement>('.spi__count b')!
    const helix = el.querySelector<HTMLElement>('.spi__helix')!
    let active = -1
    const focus = (i: number) => {
      if (i === active) return
      active = i
      cards.forEach((c, n) => c.classList.toggle('is-active', n === i))
      count.textContent = String(i + 1).padStart(2, '0')
    }
    focus(0)

    const ctx = gsap.context(() => {
      // vertical distance between treads, read from CSS so it follows the breakpoint
      const rise = () => parseFloat(getComputedStyle(el).getPropertyValue('--rise')) || 150
      gsap.fromTo(
        helix,
        { rotateY: 30, y: 0 },
        {
          rotateY: 30 - (N - 1) * ANGLE,
          y: () => -(N - 1) * rise(),
          ease: 'none',
          scrollTrigger: {
            ...dwellTrigger(el),
            onUpdate: (self) => focus(Math.round(self.progress * (N - 1))),
          },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="spi" ref={root} aria-label="Spiral">
      <div className="spi__copy">
        <h2 className="serif spi__title">
          Eight things
          <br />I <em>bring.</em>
        </h2>
        <p className="caps spi__hint">Scroll to climb</p>
      </div>

      <div className="spi__stage">
        <div className="spi__tilt">
          <div className="spi__veil" aria-hidden />

          <div className="spi__core" aria-hidden>
            <span className="spi__halo" />
            <span className="spi__beam" />
            <span className="spi__spark spi__spark--a" />
            <span className="spi__spark spi__spark--b" />
            <span className="spi__spark spi__spark--c" />
            {[0, 1, 2, 3, 4].map((i) => (
              <span className={`spi__ring spi__ring--${i}`} key={i}>
                <i />
              </span>
            ))}
          </div>

          <ol className="spi__helix">
            {CARDS.map((c, i) => (
              <li className="spi__tread" key={c.name} style={{ '--i': i, '--a': `${i * ANGLE}deg` } as CSSProperties}>
                <article className="spi__card">
                  <p className="caps spi__n">
                    {String(i + 1).padStart(2, '0')} <span>/ 08</span>
                  </p>
                  <h3 className="serif spi__name">{c.name}</h3>
                  <span className="spi__rule" aria-hidden />
                  <p className="spi__text">{c.text}</p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="scene-tag caps">N° 07 — Spiral</p>
      <p className="spi__count caps" aria-hidden>
        <b>01</b> / 08
      </p>
    </section>
  )
}
