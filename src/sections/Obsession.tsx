import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { onSceneShown, SKIP_INTRO } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'

/**
 * 03 — Obsession. Self-playing. A ring of type turns in real 3D around a short statement:
 * each letter is its own plane on a cylinder, so the near side passes in front of the words and
 * the far side behind them. A veil the colour of the page sits on the ring's axis, which is
 * what dims the far side (no per-letter work, no extra elements).
 * It spins up fast, settles to a slow cruise, and leans into the speed of your scroll.
 */
const RING = 'DESIGN — MOTION — RHYTHM — DETAIL — '
const STEP = 360 / RING.length
const CRUISE = 7 // degrees per second

export default function Obsession() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const spin = el.querySelector<HTMLElement>('.obs__spin')!
    const reduced = reducedMotion()
    const state = { angle: 0, boost: 0, burst: 0, lastY: window.scrollY, running: false }

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 64) / 1000
      // scroll speed leans on the ring, then lets go
      const y = window.scrollY
      state.boost += ((y - state.lastY) * 0.9 - state.boost) * Math.min(1, dt * 5)
      state.lastY = y
      state.angle = (state.angle - (CRUISE + state.burst + state.boost) * dt) % 360
      spin.style.transform = `rotateY(${state.angle.toFixed(2)}deg)`
    }
    const run = (on: boolean) => {
      if (on === state.running || reduced) return
      state.running = on
      state.lastY = window.scrollY
      if (on) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    }

    const ctx = gsap.context(() => {
      const intro = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .fromTo('.obs__tilt', { rotateX: -62, rotateZ: -22, scale: 0.7 }, { rotateX: -21, rotateZ: -7, scale: 1, duration: 3.4 }, 0)
        .fromTo('.obs__char', { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out', stagger: { each: 0.035, from: 'random' } }, 0.1)
        .fromTo(state, { burst: 190 }, { burst: 0, duration: 3.6, ease: 'expo.out' }, 0)
        .fromTo('.obs__copy .mask > span', { yPercent: 118 }, { yPercent: 0, duration: 1.9, stagger: 0.13 }, 0.9)
        .fromTo('.obs__note', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.6 }, 2.1)

      if (reduced || SKIP_INTRO) intro.progress(1)
      onSceneShown(
        el,
        () => {
          run(true)
          if (!reduced && !SKIP_INTRO) intro.play(0)
        },
        () => {
          run(false)
          if (!reduced && !SKIP_INTRO) intro.pause(0)
        },
      )
    }, el)

    // stop turning once the scene is covered: nothing off-screen should cost a frame
    const io = new IntersectionObserver(([entry]) => !entry.isIntersecting && run(false))
    io.observe(el)

    return () => {
      run(false)
      io.disconnect()
      ctx.revert()
    }
  }, [])

  return (
    <section className="obs" ref={root} aria-label="Obsession">
      <div className="obs__stage" aria-hidden>
        <div className="obs__tilt">
          <div className="obs__veil" />
          <div className="obs__spin">
            {RING.split('').map((c, i) => (
              <span className="obs__char" key={i} style={{ '--a': `${i * STEP}deg` } as CSSProperties}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="obs__copy">
        <p className="serif obs__lines">
          <span className="mask">
            <span>Obsessed with</span>
          </span>
          <span className="mask">
            <span>
              the <em>half-second</em>
            </span>
          </span>
          <span className="mask">
            <span>nobody notices.</span>
          </span>
        </p>
        <p className="caps obs__note">Until it’s missing.</p>
      </div>

      <p className="scene-tag caps">N° 03 — Obsession</p>
    </section>
  )
}
