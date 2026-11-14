import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

/**
 * 07 — Reel. A fourteen-second motion-design film, built in code, that plays on a loop by
 * itself. Scroll has no say in it: it starts when the scene arrives and keeps going.
 *
 * Five shots, cut together with hard wipes like a title sequence:
 *   1 FORM    a word assembles over a drawing grid          (page palette)
 *   2 MOTION  three rows of type cross at different speeds  (inverted palette)
 *   3 TIMING  a dial counts to sixty                        (brass)
 *   4 DEPTH   a deck of planes fans out in 3D               (page palette)
 *   5 END     the signature
 * The last wipe uncovers shot 1 in its empty starting state, so the loop has no seam.
 */
const FPS = 24
const Chars = ({ text, className }: { text: string; className: string }) => (
  <>
    {text.split('').map((c, i) => (
      <span className={className} key={i}>
        <span>{c === ' ' ? ' ' : c}</span>
      </span>
    ))}
  </>
)
const ROW = 'IN MOTION — IN MOTION — IN MOTION — IN MOTION — '

export default function Reel() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const reduced = reducedMotion()
    const code = el.querySelector<HTMLElement>('.reel__code')!
    const bar = el.querySelector<HTMLElement>('.reel__progress > span')!
    const count = el.querySelector<HTMLElement>('.reel__count')!
    const counter = { v: 0 }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        repeat: -1,
        defaults: { ease: 'expo.out' },
        onUpdate: () => {
          const t = tl.time()
          const f = Math.floor((t % 1) * FPS)
          code.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(f).padStart(2, '0')}`
          bar.style.transform = `scaleX(${(t / tl.duration()).toFixed(4)})`
        },
      })

      // every shot but the first starts closed; shot 1 is the floor the loop lands back on
      tl.set('.reel__shot:not(.reel__shot--1)', { autoAlpha: 0 }, 0)

      /* ── 1 · FORM ─────────────────────────────── 0.0 → 3.0 */
      tl.fromTo('.s1__line', { scaleY: 0 }, { scaleY: 1, duration: 1.4, stagger: { each: 0.05, from: 'center' } }, 0.05)
        .fromTo('.s1__disc', { scale: 0 }, { scale: 1, duration: 1.8 }, 0.25)
        .fromTo('.s1__char > span', { yPercent: 112 }, { yPercent: 0, duration: 1.5, stagger: 0.07 }, 0.4)
        .fromTo('.s1__tag', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 0.9)
        .to('.s1__disc', { scale: 1.12, duration: 1.4, ease: 'sine.inOut' }, 1.4)
        .to('.s1__char > span', { yPercent: -112, duration: 0.9, ease: 'expo.in', stagger: 0.04 }, 2.05)
        .to('.s1__line', { scaleY: 0, duration: 0.8, ease: 'expo.in', stagger: { each: 0.03, from: 'edges' } }, 2.15)
        .to('.s1__disc', { scale: 0, duration: 0.8, ease: 'expo.in' }, 2.2)
        .to('.s1__tag', { autoAlpha: 0, duration: 0.4 }, 2.5)

      /* ── 2 · MOTION ───────────────────────────── 3.0 → 6.1 */
      tl.set('.reel__shot--2', { autoAlpha: 1 }, 2.85)
        .fromTo('.reel__shot--2', { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' }, 2.85)
        .fromTo('.s2__row--a', { xPercent: -8 }, { xPercent: -42, duration: 3.4, ease: 'power2.inOut' }, 2.85)
        .fromTo('.s2__row--b', { xPercent: -46 }, { xPercent: -6, duration: 3.4, ease: 'power3.inOut' }, 2.85)
        .fromTo('.s2__row--c', { xPercent: -4 }, { xPercent: -30, duration: 3.4, ease: 'power1.inOut' }, 2.85)
        .fromTo('.s2__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.6, stagger: 0.12 }, 3.2)
        .fromTo('.s2__tag', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 3.5)

      /* ── 3 · TIMING ───────────────────────────── 6.1 → 9.3 */
      tl.set('.reel__shot--3', { autoAlpha: 1 }, 5.95)
        .fromTo('.reel__shot--3', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.0, ease: 'expo.inOut' }, 5.95)
        .set('.reel__shot--2', { autoAlpha: 0 }, 7.0)
        .fromTo('.s3__dial', { rotate: -90, scale: 0.7 }, { rotate: 0, scale: 1, duration: 2.2 }, 6.1)
        .fromTo('.s3__tick', { opacity: 0.18 }, { opacity: 1, duration: 0.2, ease: 'none', stagger: { each: 2.2 / 60 } }, 6.5)
        .fromTo('.s3__hand', { rotate: 0 }, { rotate: 360, duration: 2.4, ease: 'expo.inOut' }, 6.45)
        .fromTo(counter, { v: 0 }, { v: 60, duration: 2.4, ease: 'expo.inOut', onUpdate: () => (count.textContent = String(Math.round(counter.v)).padStart(2, '0')) }, 6.45)
        .fromTo('.s3__word > span', { yPercent: 112 }, { yPercent: 0, duration: 1.2 }, 6.7)
        .fromTo('.s3__tag', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 6.9)

      /* ── 4 · DEPTH ────────────────────────────── 9.3 → 12.3 */
      tl.set('.reel__shot--4', { autoAlpha: 1 }, 9.1)
        .fromTo('.reel__shot--4', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' }, 9.1)
        .set('.reel__shot--3', { autoAlpha: 0 }, 10.05)
        .fromTo('.s4__world', { rotateY: -34, rotateX: 10 }, { rotateY: 30, rotateX: -4, duration: 3.4, ease: 'sine.inOut' }, 9.1)
        .fromTo(
          '.s4__plane',
          { x: 0, z: 0, rotateY: 0, opacity: 0 },
          { x: (i: number) => `${(i - 3) * 11}vmin`, z: (i: number) => -Math.abs(i - 3) * 90, rotateY: (i: number) => (i - 3) * -13, opacity: 1, duration: 1.8, stagger: { each: 0.05, from: 'center' } },
          9.5,
        )
        .fromTo('.s4__char > span', { yPercent: 112 }, { yPercent: 0, duration: 1.3, stagger: 0.06 }, 9.7)
        .fromTo('.s4__char', { z: (i: number) => (i % 2 ? 260 : -260) }, { z: 0, duration: 2.2, ease: 'expo.out', stagger: 0.05 }, 9.7)
        .fromTo('.s4__tag', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 10.0)
        .to('.s4__plane', { x: 0, z: 0, rotateY: 0, duration: 0.9, ease: 'expo.in', stagger: { each: 0.03, from: 'edges' } }, 11.3)

      /* ── 5 · END ──────────────────────────────── 12.3 → 14.6 */
      tl.set('.reel__shot--5', { autoAlpha: 1 }, 12.1)
        .fromTo('.reel__shot--5', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' }, 12.1)
        .set('.reel__shot--4', { autoAlpha: 0 }, 13.05)
        .fromTo('.s5__mark > span', { yPercent: 112 }, { yPercent: 0, duration: 1.3, stagger: 0.09 }, 12.45)
        .fromTo('.s5__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.3 }, 12.7)
        .fromTo('.s5__line > span', { yPercent: 112 }, { yPercent: 0, duration: 1.2, stagger: 0.1 }, 12.85)
        // the closing wipe uncovers shot 1, already back in its empty starting state
        .to('.reel__shot--5', { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.inOut' }, 13.8)
        .set({}, {}, 14.6)

      if (reduced) {
        tl.time(1.4) // hold on a composed frame instead of playing
        return
      }
      onSceneShown(el, () => tl.play(), () => tl.pause(), 0.4)
      // nothing off screen should cost a frame
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.progress() > 0 && tl.play() : tl.pause()))
      io.observe(el)
      return () => io.disconnect()
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="reel" ref={root} aria-label="Reel: a short motion film that plays on its own">
      <div className="reel__screen" aria-hidden>
        {/* 1 · FORM */}
        <div className="reel__shot reel__shot--1">
          <div className="s1__grid">
            {Array.from({ length: 13 }, (_, i) => (
              <i className="s1__line" key={i} />
            ))}
          </div>
          <span className="s1__disc" />
          <p className="reel__big s1__word">
            <Chars text="DESIGN" className="s1__char" />
          </p>
          <p className="reel__tag s1__tag caps">01 — Form</p>
        </div>

        {/* 2 · MOTION */}
        <div className="reel__shot reel__shot--2">
          <div className="s2__rows">
            <i className="s2__rule" />
            <p className="s2__row s2__row--a">{ROW}</p>
            <i className="s2__rule" />
            <p className="s2__row s2__row--b">{ROW}</p>
            <i className="s2__rule" />
            <p className="s2__row s2__row--c">{ROW}</p>
            <i className="s2__rule" />
          </div>
          <p className="reel__tag s2__tag caps">02 — Motion</p>
        </div>

        {/* 3 · TIMING */}
        <div className="reel__shot reel__shot--3">
          <div className="s3__dial">
            {Array.from({ length: 60 }, (_, i) => (
              <i className={`s3__tick${i % 5 ? '' : ' is-major'}`} key={i} style={{ '--a': `${i * 6}deg` } as CSSProperties} />
            ))}
            <span className="s3__hand" />
          </div>
          <p className="s3__count reel__count">00</p>
          <p className="s3__word">
            <span>TIMING</span>
          </p>
          <p className="reel__tag s3__tag caps">03 — Timing</p>
        </div>

        {/* 4 · DEPTH */}
        <div className="reel__shot reel__shot--4">
          <div className="s4__stage">
            <div className="s4__world">
              {Array.from({ length: 7 }, (_, i) => (
                <span className="s4__plane" key={i} />
              ))}
              <p className="reel__big s4__word">
                <Chars text="DEPTH" className="s4__char" />
              </p>
            </div>
          </div>
          <p className="reel__tag s4__tag caps">04 — Depth</p>
        </div>

        {/* 5 · END */}
        <div className="reel__shot reel__shot--5">
          <p className="s5__mark">
            <span>K</span>
            <span className="s5__dash">—</span>
            <span>S</span>
          </p>
          <i className="s5__rule" />
          <p className="s5__line">
            <span>Kanishq Surendran</span>
          </p>
          <p className="s5__line s5__line--small caps">
            <span>Design, in motion</span>
          </p>
        </div>
      </div>

      <div className="reel__hud caps" aria-hidden>
        <span className="reel__rec">
          <i /> Film 02 — Reel
        </span>
        <span className="reel__progress">
          <span />
        </span>
        <span className="reel__code">00:00:00</span>
      </div>
      <p className="scene-tag caps">N° 07 — Reel</p>
    </section>
  )
}
