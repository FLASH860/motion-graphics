import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { dwellTrigger, onSceneShown, SKIP_INTRO } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

/**
 * 06 — Principles. Self-playing. Three panels stand in a shallow room like a folding screen
 * (the outer two angled in with rotateY). Each carries a small motion study that demonstrates
 * its own rule, on a loop. Panels lift and tilt toward the pointer, with their contents on
 * separate depths, so the parallax is inside the card as well as between them.
 */
const EASE_FN = gsap.parseEase('power3.inOut')
// the curve drawn on the first panel is the real easing function, sampled
const CURVE = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40
  return `${i ? 'L' : 'M'}${(t * 100).toFixed(2)} ${(100 - EASE_FN(t) * 100).toFixed(2)}`
}).join(' ')

const RULES = [
  { n: 'I', name: 'Ease', text: 'Nothing in the world starts or stops in an instant. Neither should an interface.' },
  { n: 'II', name: 'Rhythm', text: 'Stagger, hold, release. Timing is what turns movement into choreography.' },
  { n: 'III', name: 'Restraint', text: 'One idea per screen. If it does not earn its place, it goes.' },
]

export default function Principles() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const reduced = reducedMotion()
    const cleanups: (() => void)[] = []

    const ctx = gsap.context(() => {
      // ── the three studies, looping ──
      const loops = gsap.timeline({ paused: true })
      // I. Ease: the dot rides the curve (x is linear time, y is the eased value); the block
      //    underneath makes the same move in one dimension
      const ease = gsap.timeline({ repeat: -1, repeatDelay: 0.7, yoyo: true })
      ease
        .fromTo('.study-ease__x', { xPercent: 0 }, { xPercent: 100, duration: 2.6, ease: 'none' }, 0)
        .fromTo('.study-ease__y', { yPercent: 0 }, { yPercent: -100, duration: 2.6, ease: 'power3.inOut' }, 0)
        .fromTo('.study-ease__block', { xPercent: 0 }, { xPercent: 100, duration: 2.6, ease: 'power3.inOut' }, 0)
      // II. Rhythm: one gesture, passed along the row
      const rhythm = gsap.timeline({ repeat: -1, repeatDelay: 0.5 })
      rhythm
        .fromTo('.study-rhythm i', { scaleY: 0.12 }, { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: { each: 0.09, from: 'start' } }, 0)
        .to('.study-rhythm i', { scaleY: 0.12, duration: 1.3, ease: 'expo.inOut', stagger: { each: 0.09, from: 'start' } }, 1.25)
      // III. Restraint: mostly stillness. One ring, once in a while.
      const restraint = gsap.timeline({ repeat: -1, repeatDelay: 2.2 })
      restraint.fromTo('.study-restraint__ring', { scale: 0.2, opacity: 0.9 }, { scale: 1, opacity: 0, duration: 2.8, ease: 'expo.out' }, 0)
      loops.add(ease, 0).add(rhythm, 0).add(restraint, 0)

      // ── entrance ──
      const intro = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .fromTo('.pri__title .mask > span', { yPercent: 118 }, { yPercent: 0, duration: 1.8, stagger: 0.12 }, 0.1)
        .fromTo('.pri__panel', { autoAlpha: 0, yPercent: 26, rotateX: -32, z: -520 }, { autoAlpha: 1, yPercent: 0, rotateX: 0, z: 0, duration: 2.6, stagger: 0.16 }, 0.35)
        .fromTo('.pri__face > *', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.6, stagger: 0.05 }, 1.0)

      if (reduced || SKIP_INTRO) intro.progress(1)
      if (reduced) loops.progress(0.4)
      onSceneShown(
        el,
        () => {
          if (!reduced) loops.play()
          if (!reduced && !SKIP_INTRO) intro.play(0)
        },
        () => {
          loops.pause()
          if (!reduced && !SKIP_INTRO) intro.pause(0)
        },
      )
      const io = new IntersectionObserver(([e]) => !e.isIntersecting && loops.pause())
      io.observe(el)
      cleanups.push(() => io.disconnect())

      // ── narrow screens: the dwell scroll pans along the row instead ──
      const mm = gsap.matchMedia()
      mm.add('(max-width: 900px)', () => {
        const row = el.querySelector<HTMLElement>('.pri__row')!
        gsap.fromTo(row, { x: 0 }, { x: () => -(row.scrollWidth - window.innerWidth), ease: 'none', scrollTrigger: dwellTrigger(el) })
      })

      // ── pointer tilt, fine pointers only ──
      if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        gsap.utils.toArray<HTMLElement>('.pri__panel', el).forEach((panel) => {
          const face = panel.querySelector<HTMLElement>('.pri__face')!
          const to = {
            rx: gsap.quickTo(face, 'rotateX', { duration: 1.1, ease: 'power3.out' }),
            ry: gsap.quickTo(face, 'rotateY', { duration: 1.1, ease: 'power3.out' }),
            z: gsap.quickTo(face, 'z', { duration: 1.1, ease: 'power3.out' }),
          }
          const move = (e: PointerEvent) => {
            const r = panel.getBoundingClientRect()
            to.ry(((e.clientX - r.left) / r.width - 0.5) * 16)
            to.rx(-((e.clientY - r.top) / r.height - 0.5) * 12)
            to.z(70)
          }
          const leave = () => {
            to.rx(0)
            to.ry(0)
            to.z(0)
          }
          panel.addEventListener('pointermove', move)
          panel.addEventListener('pointerleave', leave)
          cleanups.push(() => {
            panel.removeEventListener('pointermove', move)
            panel.removeEventListener('pointerleave', leave)
          })
        })
      }
    }, el)

    return () => {
      cleanups.forEach((c) => c())
      ctx.revert()
    }
  }, [])

  return (
    <section className="pri" ref={root} aria-label="Principles">
      <h2 className="pri__title serif">
        <span className="mask">
          <span>Three rules</span>
        </span>
        <span className="mask">
          <span>
            I don’t <em>break.</em>
          </span>
        </span>
      </h2>

      <div className="pri__room">
        <div className="pri__row">
          {RULES.map((r, i) => (
            <div className="pri__slot" key={r.n} style={{ '--turn': `${(1 - i) * 28}deg`, '--hinge': `${(2 - i) * 50}%` } as CSSProperties}>
              <article className="pri__panel" data-cursor="Tilt">
                <div className="pri__face">
                  <p className="pri__n serif">{r.n}</p>

                  <div className="pri__study" aria-hidden>
                    {i === 0 && (
                      <div className="study-ease">
                        <div className="study-ease__plot">
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d={CURVE} />
                          </svg>
                          <div className="study-ease__x">
                            <div className="study-ease__y">
                              <span className="study-ease__dot" />
                            </div>
                          </div>
                        </div>
                        <div className="study-ease__track">
                          <span className="study-ease__block" />
                        </div>
                      </div>
                    )}
                    {i === 1 && (
                      <div className="study-rhythm">
                        {Array.from({ length: 13 }, (_, k) => (
                          <i key={k} />
                        ))}
                      </div>
                    )}
                    {i === 2 && (
                      <div className="study-restraint">
                        <span className="study-restraint__ring" />
                        <span className="study-restraint__dot" />
                      </div>
                    )}
                  </div>

                  <h3 className="pri__name serif">{r.name}</h3>
                  <p className="pri__text">{r.text}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>

      <p className="scene-tag caps">N° 06 — Principles</p>
    </section>
  )
}
