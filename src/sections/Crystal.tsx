import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

/**
 * 10 — Crystal. Another film, also on its own clock: fifteen seconds, looping, no scroll.
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
      // the light travels: each pool swings wide across the frame, out of step with the others
      gsap.utils.toArray<HTMLElement>('.cry__pool', el).forEach((pool, i) => {
        const dx = [58, -64, 46, -52][i % 4]
        const dy = [-34, 30, 40, -44][i % 4]
        ambient.add(
          gsap.fromTo(pool, { xPercent: -dx, yPercent: -dy, scale: 0.8 }, { xPercent: dx, yPercent: dy, scale: 1.3, duration: 4.2 + i * 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true }),
          0,
        )
      })
      // the crystals tumble: they turn in depth as well as bob, so their facets keep re-lighting
      gsap.utils.toArray<HTMLElement>('.cry__gem', el).forEach((gem, i) => {
        const dir = i % 2 ? -1 : 1
        ambient.add(gsap.fromTo(gem, { y: -30 * dir, x: -18 * dir }, { y: 30 * dir, x: 18 * dir, duration: 3.6 + i * 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true }), 0)
        ambient.add(gsap.fromTo(gem, { rotateY: -42 * dir, rotate: -14 * dir }, { rotateY: 42 * dir, rotate: 14 * dir, duration: 5.2 + i * 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true }), 0)
      })
      // the word behind the glass never stops passing
      ambient.add(gsap.fromTo('.cry__word > span', { xPercent: 0 }, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 }), 0)
      // two lenses cross the frame, bending whatever they pass over
      ambient.add(gsap.fromTo('.cry__lens--a', { x: '-20vw', y: '8vh' }, { x: '120vw', y: '-10vh', duration: 11, ease: 'none', repeat: -1 }), 0)
      ambient.add(gsap.fromTo('.cry__lens--b', { x: '118vw', y: '-6vh' }, { x: '-18vw', y: '12vh', duration: 15, ease: 'none', repeat: -1 }), 0)
      // and the slab itself floats
      ambient.add(gsap.fromTo('.cry__float', { y: -12, rotate: -0.7 }, { y: 12, rotate: 0.7, duration: 4.4, ease: 'sine.inOut', repeat: -1, yoyo: true }), 0)

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
        <p className="cry__word">
          <span>CLARITY — CLARITY — CLARITY — CLARITY — </span>
        </p>
      </div>

      {/* glass */}
      <div className="cry__stage">
        <span className="cry__gem cry__gem--a" aria-hidden>
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
          <i className="f4" />
        </span>

        <div className="cry__float">
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

        </div>

        <span className="cry__lens cry__lens--a" aria-hidden />
        <span className="cry__lens cry__lens--b" aria-hidden />

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

      <p className="scene-tag caps">N° 10 — Crystal</p>
    </section>
  )
}
