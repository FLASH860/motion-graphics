import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

/**
 * 08 — Crystal. A second film, also on its own clock: fifteen seconds, looping, no scroll.
 * Slow pools of coloured light drift behind a slab of glass and three cut crystals. All the
 * interest comes from what the glass does to the light passing behind it.
 *
 * How the glass is made (no images, no WebGL):
 *   refraction  backdrop-filter: blur + saturate on the slab and on each crystal's outline
 *   bevel       stacked inset shadows: a bright top edge, a dark bottom edge, an inner glow
 *   facets      plain gradient polygons (clip-path) laid over each crystal, lit from one side
 *   specular    one soft band of light that crosses the slab at each change of line
 * Only four elements carry a backdrop-filter, which is what keeps it cheap.
 */
const LINES = [
  ['Clarity is a', 'material.'],
  ['Light does the', 'decorating.'],
  ['Nothing to hide', 'behind.'],
]
const BEAT = 5 // seconds per line → a 15s loop

export default function Crystal() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const reduced = reducedMotion()
    let removeMove = () => {}

    const ctx = gsap.context(() => {
      // ── ambient: pools of light and floating crystals, each on its own slow orbit ──
      const ambient = gsap.timeline({ paused: true })
      gsap.utils.toArray<HTMLElement>('.cry__pool', el).forEach((pool, i) => {
        const dx = [22, -26, 18, -16][i % 4]
        const dy = [-16, 14, 20, -22][i % 4]
        ambient.add(
          gsap.fromTo(pool, { xPercent: -dx, yPercent: -dy, scale: 0.9 }, { xPercent: dx, yPercent: dy, scale: 1.15, duration: 7.5 + i * 1.25, ease: 'sine.inOut', repeat: -1, yoyo: true }),
          0,
        )
      })
      gsap.utils.toArray<HTMLElement>('.cry__gem', el).forEach((gem, i) => {
        ambient.add(
          gsap.fromTo(gem, { y: -14, rotate: -5 + i * 2 }, { y: 14, rotate: 5 - i * 3, duration: 5 + i * 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true }),
          0,
        )
      })

      // ── the 15s line cycle ──
      const cycle = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'expo.out' } })
      gsap.utils.toArray<HTMLElement>('.cry__line', el).forEach((line, i) => {
        const t = i * BEAT
        const spans = line.querySelectorAll('.mask > span')
        cycle
          .set(line, { autoAlpha: 1 }, t)
          .fromTo(spans, { yPercent: 118 }, { yPercent: 0, duration: 1.7, stagger: 0.12 }, t + 0.15)
          .fromTo('.cry__glint', { xPercent: -160 }, { xPercent: 420, duration: 2.6, ease: 'power2.inOut' }, t)
          .to(spans, { yPercent: -118, duration: 0.9, ease: 'expo.in', stagger: 0.07 }, t + BEAT - 1.0)
          .set(line, { autoAlpha: 0 }, t + BEAT)
      })
      cycle.fromTo('.cry__dot', { scaleX: 0 }, { scaleX: 1, duration: BEAT, ease: 'none', stagger: BEAT }, 0)

      if (reduced) {
        cycle.time(2.2)
        return
      }
      const play = () => {
        ambient.play()
        cycle.play()
      }
      const pause = () => {
        ambient.pause()
        cycle.pause()
      }
      onSceneShown(el, play, pause, 0.4)
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? cycle.progress() > 0 && play() : pause()))
      io.observe(el)

      // the slab leans toward the pointer; its contents sit on a nearer plane
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const slab = el.querySelector<HTMLElement>('.cry__slab')!
        const rx = gsap.quickTo(slab, 'rotateX', { duration: 1.6, ease: 'power3.out' })
        const ry = gsap.quickTo(slab, 'rotateY', { duration: 1.6, ease: 'power3.out' })
        const onMove = (e: PointerEvent) => {
          ry((e.clientX / window.innerWidth - 0.5) * 9)
          rx(-(e.clientY / window.innerHeight - 0.5) * 7)
        }
        window.addEventListener('pointermove', onMove, { passive: true })
        removeMove = () => window.removeEventListener('pointermove', onMove)
      }
      return () => io.disconnect()
    }, el)

    return () => {
      removeMove()
      ctx.revert()
    }
  }, [])

  return (
    <section className="cry" ref={root} aria-label="Crystal">
      {/* light */}
      <div className="cry__field" aria-hidden>
        <span className="cry__pool cry__pool--a" />
        <span className="cry__pool cry__pool--b" />
        <span className="cry__pool cry__pool--c" />
        <span className="cry__pool cry__pool--d" />
        <p className="cry__word">CLARITY</p>
      </div>

      {/* glass */}
      <div className="cry__stage">
        <span className="cry__gem cry__gem--a" aria-hidden>
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
          <i className="f4" />
        </span>

        <div className="cry__slab">
          <span className="cry__glint" aria-hidden />
          <p className="caps cry__label">Glass — nothing but light and blur</p>
          <div className="cry__lines serif">
            {LINES.map(([a, b], i) => (
              <p className="cry__line" key={i} aria-hidden={i > 0}>
                <span className="mask">
                  <span>{a}</span>
                </span>
                <span className="mask">
                  <span>
                    <em>{b}</em>
                  </span>
                </span>
              </p>
            ))}
          </div>
          <div className="cry__foot">
            <div className="cry__chips">
              <span className="cry__chip caps">Refraction</span>
              <span className="cry__chip caps">Bevel</span>
              <span className="cry__chip caps">Specular</span>
            </div>
            <div className="cry__dots" aria-hidden>
              <i>
                <b className="cry__dot" />
              </i>
              <i>
                <b className="cry__dot" />
              </i>
              <i>
                <b className="cry__dot" />
              </i>
            </div>
          </div>
        </div>

        <span className="cry__gem cry__gem--b" aria-hidden>
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
          <i className="f4" />
        </span>
        <span className="cry__gem cry__gem--c" aria-hidden>
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
          <i className="f4" />
        </span>
      </div>

      <p className="scene-tag caps">N° 08 — Crystal</p>
    </section>
  )
}
