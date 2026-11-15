import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createSequence } from '@/lib/frames'
import { dwellTrigger, sceneOf } from '@/lib/scene'

/**
 * 09 — Imprint. Scroll-driven, like the watch, but told a different way.
 * The film: strands of light fall, tangle, and weave themselves into a fingerprint (240 frames
 * on a canvas, scrubbed and eased exactly as in Movement).
 *
 * Nothing here is a card. The copy does what the strands do:
 *   - the words of one sentence start scattered across the whole screen, turned and out of
 *     scale, and are drawn in along curved paths until they lock into a set line, word by word,
 *     as the print forms;
 *   - a scanner then closes on the finished print: corner brackets tighten, a line sweeps down
 *     it, and a match figure counts to 100.
 * A three-step marker (Threads / Weave / Mark) tracks which act of the film you are in.
 */
const FRAMES = 240
const W = 1280
const H = 720
const sequence = createSequence(FRAMES, (i) => `/strands/${String(i + 1).padStart(4, '0')}.webp`)
export const preloadStrands = () => sequence.start()

// where the finished fingerprint sits in the frame (measured from the last frame)
const PRINT_X = 0.757

const LINES: { text: string; em?: boolean }[][] = [
  [{ text: 'A' }, { text: 'thousand' }, { text: 'loose' }, { text: 'threads,' }],
  [{ text: 'pulled' }, { text: 'into' }, { text: 'one' }],
  [{ text: 'signature.', em: true }],
]
const STAGES = ['Threads', 'Weave', 'Mark']

export default function Imprint() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const ctx2d = canvas.current!.getContext('2d', { alpha: false })!
    const s = sceneOf(el)
    const film = el.querySelector<HTMLElement>('.imp__film')!
    const match = el.querySelector<HTMLElement>('.imp__match b')!
    const stages = gsap.utils.toArray<HTMLElement>('.imp__stage', el)
    const fill = el.querySelector<HTMLElement>('.imp__track > span')!
    let target = 0
    let current = 0
    let drawn = -1
    let running = false
    let onScreen = false
    let stage = -1
    let shownMatch = -1

    ctx2d.fillStyle = '#000'
    ctx2d.fillRect(0, 0, W, H)

    const draw = (force = false) => {
      const want = Math.round(current)
      const have = sequence.nearest(want)
      if (have < 0 || (have === drawn && !force)) return
      ctx2d.drawImage(sequence.source(have)!, 0, 0, W, H)
      drawn = have
    }
    const tick = (_t: number, deltaMs: number) => {
      const d = target - current
      if (Math.abs(d) < 0.01) current = target
      else current += d * Math.min(1, (Math.min(deltaMs, 64) / 1000) * 13)
      draw()
      sequence.window(Math.round(current), d >= 0 ? 1 : -1)
      if (!onScreen && current === target) run(false)
    }
    const run = (on: boolean) => {
      if (on === running) return
      running = on
      if (on) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    }
    const off = sequence.onFrame((i) => {
      if (Math.abs(i - current) < Math.abs(drawn - current) || drawn < 0) draw(true)
    })
    draw(true)

    // deterministic scatter, so the words always start from the same places
    let seed = 11
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const words = gsap.utils.toArray<HTMLElement>('.imp__w', el).map((node) => ({
      node,
      fx: rnd() * 2 - 1, // -1..1 across the screen
      fy: rnd() * 2 - 1,
      rot: (rnd() * 2 - 1) * 34,
      scale: 0.45 + rnd() * 1.35,
    }))

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: s.track,
        start: 'top top',
        end: () => `+=${(s.tin + s.dwell + s.tout) * s.unit()}`,
        onToggle: (self) => {
          onScreen = self.isActive
          if (onScreen) run(true)
        },
      })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          ...dwellTrigger(el),
          onUpdate: (self) => {
            const p = self.progress
            target = p * (FRAMES - 1)
            const st = p < 0.3 ? 0 : p < 0.66 ? 1 : 2
            if (st !== stage) {
              stage = st
              stages.forEach((node, i) => node.classList.toggle('is-on', i === st))
            }
            fill.style.transform = `scaleX(${p.toFixed(4)})`
            const m = Math.round(gsap.utils.clamp(0, 1, (p - 0.6) / 0.36) * 100)
            if (m !== shownMatch) {
              shownMatch = m
              match.textContent = String(m).padStart(2, '0')
            }
          },
        },
      })

      // on narrow screens the frame is wider than the screen: follow the strands to the print
      tl.fromTo(
        film,
        { x: 0 },
        {
          x: () => {
            const w = film.offsetWidth
            return -Math.min((PRINT_X - 0.5) * w, Math.max(0, (w - window.innerWidth) / 2))
          },
          duration: 0.45,
          ease: 'power2.inOut',
        },
        0.33,
      )
      tl.to('.imp__title', { autoAlpha: 0, yPercent: -30, duration: 0.1 }, 0.14)

      // the sentence: each word travels in from its own corner of the screen. x and y use
      // different easings, so the path bends instead of running straight.
      words.forEach((w, i) => {
        const at = 0.28 + i * 0.04
        const dur = 0.36
        tl.fromTo(w.node, { x: () => w.fx * window.innerWidth * 0.62 }, { x: 0, duration: dur, ease: 'power3.out' }, at)
          .fromTo(w.node, { y: () => w.fy * window.innerHeight * 0.6 }, { y: 0, duration: dur, ease: 'power2.inOut' }, at)
          .fromTo(w.node, { rotate: w.rot, scale: w.scale }, { rotate: 0, scale: 1, duration: dur, ease: 'power2.out' }, at)
          .fromTo(w.node, { opacity: 0 }, { opacity: 1, duration: dur * 0.5, ease: 'power1.out' }, at)
      })
      tl.fromTo('.imp__rule', { scaleX: 0 }, { scaleX: 1, duration: 0.12, ease: 'power2.out' }, 0.8)
        .fromTo('.imp__after', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.86)

      // the scanner closes on the finished print
      tl.fromTo('.imp__reticle', { autoAlpha: 0, scale: 1.28 }, { autoAlpha: 1, scale: 1, duration: 0.14, ease: 'power3.out' }, 0.68)
        .fromTo('.imp__scan', { yPercent: -100, opacity: 1 }, { yPercent: 0, duration: 0.15, ease: 'power1.inOut' }, 0.81)
        .to('.imp__scan', { opacity: 0, duration: 0.03 }, 0.96)
        .fromTo('.imp__readout > *', { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.06, stagger: 0.02, ease: 'power2.out' }, 0.74)
    }, el)

    return () => {
      run(false)
      off()
      ctx.revert()
    }
  }, [])

  // safety net: if the idle preload never ran, start loading when this nears the screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && sequence.start(), { rootMargin: '200% 0px' })
    io.observe(root.current!)
    return () => io.disconnect()
  }, [])

  return (
    <section className="imp" ref={root} aria-label="Imprint">
      <div className="imp__film">
        <canvas
          className="imp__canvas"
          ref={canvas}
          width={W}
          height={H}
          role="img"
          aria-label="Strands of light fall, tangle, and weave into a fingerprint as you scroll"
        />
        <div className="imp__reticle" aria-hidden>
          <i className="imp__corner imp__corner--tl" />
          <i className="imp__corner imp__corner--tr" />
          <i className="imp__corner imp__corner--bl" />
          <i className="imp__corner imp__corner--br" />
          <div className="imp__sweep">
            <span className="imp__scan" />
          </div>
          <div className="imp__readout caps">
            <span>ID — K.S.</span>
            <span className="imp__match">
              Match <b>00</b>%
            </span>
            <span>One of one</span>
          </div>
        </div>
      </div>

      <h2 className="imp__title serif">
        Follow the <em>thread.</em>
      </h2>

      <div className="imp__say">
        <p className="serif imp__lines">
          {LINES.map((line, i) => (
            <span className="imp__line" key={i}>
              {line.map((w) => (
                <span className={`imp__w${w.em ? ' imp__w--em' : ''}`} key={w.text}>
                  {w.text}
                </span>
              ))}
            </span>
          ))}
        </p>
        <span className="imp__rule" aria-hidden />
        <p className="imp__after">No two builds alike. Each one unmistakably mine.</p>
      </div>

      <div className="imp__stages caps" aria-hidden>
        {STAGES.map((name, i) => (
          <span className="imp__stage" key={name}>
            0{i + 1} {name}
          </span>
        ))}
        <span className="imp__track">
          <span />
        </span>
      </div>
      <p className="scene-tag caps">N° 09 — Imprint</p>
    </section>
  )
}
