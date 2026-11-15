import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { dwellTrigger, sceneOf } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'
import { getTheme } from '@/lib/theme'

/**
 * 08 — Spiral. Scroll-driven. Eight glass cards stand on a helix around a trunk of live cabling,
 * like the treads of a spiral stair. Scroll turns the stair and lifts it, so each card in turn
 * comes round to the front at eye level while the others wait above and below.
 *
 * The cards are CSS 3D: each is rotateY(angle) translateZ(radius) at its own height inside one
 * preserve-3d group, and scroll animates that group's rotateY and y. A page-coloured veil on the
 * axis fades the far side.
 *
 * The trunk is a 2D canvas: fifteen cables twisted round a common axis. Each is drawn in short
 * segments sorted by depth, so cables pass over and under each other properly, and pulses of
 * light run along them. The bundle is tied with clamps and climbs with the stair.
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

/* ── the cable trunk ── */
const TRUNK_W = 520
const STEP = 26 // px per drawn segment
const PALETTE = {
  dark: { neon: ['#27e4ff', '#ff2fd0', '#ffb648', '#7d62ff'], body: '#07080d', sheath: '#1a1c27', clamp: '#0d0e15', additive: true },
  light: { neon: ['#0090ae', '#c8169e', '#cf7d10', '#4a36cc'], body: '#211f24', sheath: '#4a4750', clamp: '#2a282e', additive: false },
}
type Cable = { amp: number; twist: number; phase: number; drift: number; width: number; hue: number; live: boolean; pulse: number; speed: number }
function makeCables(): Cable[] {
  // deterministic pseudo-random, so the bundle is the same on every visit
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 15 }, (_, i) => ({
    amp: 26 + rnd() * 120,
    twist: 0.0034 + rnd() * 0.0042,
    phase: rnd() * Math.PI * 2,
    drift: (rnd() - 0.5) * 0.5,
    width: 3 + rnd() * 6,
    hue: i % 4,
    live: i % 3 !== 2, // two in three carry light; the rest are dark sheathed cable
    pulse: rnd(),
    speed: 0.1 + rnd() * 0.16,
  }))
}

export default function Spiral() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const cards = gsap.utils.toArray<HTMLElement>('.spi__card', el)
    const items = gsap.utils.toArray<HTMLElement>('.spi__item', el)
    const glows = gsap.utils.toArray<HTMLElement>('.spi__glow', el)
    const count = el.querySelector<HTMLElement>('.spi__count b')!
    const helix = el.querySelector<HTMLElement>('.spi__helix')!
    const cv = canvas.current!
    const g = cv.getContext('2d')!
    const s = sceneOf(el)
    const reduced = reducedMotion()
    const cables = makeCables()
    let active = -1
    let climb = 0 // px the stair has risen: the cables travel with it
    let time = 0
    let running = false
    let H = 0
    let dpr = 1

    const focus = (i: number) => {
      if (i === active) return
      active = i
      cards.forEach((c, n) => {
        c.classList.toggle('is-active', n === i)
        // only the front card refracts what is behind it; the rest use a plain frosted face
        c.classList.toggle('is-near', n === i)
      })
      items.forEach((c, n) => c.classList.toggle('is-active', n === i))
      glows.forEach((c, n) => c.classList.toggle('is-active', n === i))
      count.textContent = String(i + 1).padStart(2, '0')
    }
    focus(0)

    const size = () => {
      dpr = 1 // the trunk sits behind frosted glass and a veil; extra pixels would not show
      H = Math.round(window.innerHeight * 1.5)
      cv.width = Math.round(TRUNK_W * dpr)
      cv.height = Math.round(H * dpr)
      cv.style.height = `${H}px`
    }

    // scratch buffers, reused every frame: x and depth of every cable at every row
    let xs = new Float32Array(0)
    let zs = new Float32Array(0)
    const order = cables.map((_, i) => i)

    const draw = () => {
      const pal = PALETTE[getTheme()]
      const cx = TRUNK_W / 2
      const rows = Math.ceil(H / STEP) + 2
      const n = cables.length
      if (xs.length !== rows * n) {
        xs = new Float32Array(rows * n)
        zs = new Float32Array(rows * n)
      }
      // where each cable sits at each height: computed once, then only read
      for (let i = 0; i < n; i++) {
        const c = cables[i]
        const base = c.phase + time * c.drift + c.twist * climb
        for (let r = 0; r < rows; r++) {
          const ang = base + c.twist * r * STEP
          xs[r * n + i] = cx + Math.sin(ang) * c.amp
          zs[r * n + i] = Math.cos(ang)
        }
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, TRUNK_W, H)
      g.lineCap = 'round'
      g.globalCompositeOperation = 'source-over'

      for (let r = 0; r < rows - 1; r++) {
        const y0 = r * STEP
        const y1 = y0 + STEP
        const row = r * n
        // back to front within this slice, so cables cross over and under one another
        order.sort((p, q) => zs[row + p] - zs[row + q])
        for (const i of order) {
          const c = cables[i]
          const depth = (zs[row + i] + 1) / 2 // 0 far → 1 near
          const w = c.width * (0.7 + 0.5 * depth)
          g.beginPath()
          g.moveTo(xs[row + i], y0)
          g.lineTo(xs[row + n + i], y1 + 0.5)
          // the cable: a dark edge so neighbours separate, then its sheath
          g.globalAlpha = 1
          g.strokeStyle = pal.body
          g.lineWidth = w + 3
          g.stroke()
          g.strokeStyle = c.live ? pal.neon[c.hue] : pal.sheath
          g.globalAlpha = c.live ? 0.2 + 0.4 * depth : 0.4 + 0.5 * depth
          g.lineWidth = c.live ? Math.max(1.2, w * 0.42) : w
          g.stroke()
          if (!c.live) continue
          // the pulse: a short run of light travelling up the cable
          const head = ((c.pulse + time * c.speed) % 1) * (H + 400) - 200
          const d = Math.abs(H - y0 - head)
          if (d < 150) {
            const k = 1 - d / 150
            if (pal.additive) g.globalCompositeOperation = 'lighter'
            g.globalAlpha = k * 0.3 * (0.4 + 0.6 * depth)
            g.lineWidth = w * 3.2
            g.stroke()
            g.globalAlpha = k * (0.5 + 0.5 * depth)
            g.lineWidth = Math.max(1.4, w * 0.55)
            g.stroke()
            g.globalCompositeOperation = 'source-over'
          }
        }
      }

      // clamps: bands that tie the bundle, fixed to the cables so they climb with them
      const gap = 430
      const first = -(((climb % gap) + gap) % gap)
      for (let y = first; y < H + gap; y += gap) {
        g.globalAlpha = 1
        g.fillStyle = pal.clamp
        g.beginPath()
        g.roundRect(cx - 104, y, 208, 26, 6)
        g.fill()
        g.fillStyle = pal.neon[0]
        g.globalAlpha = 0.9
        g.fillRect(cx - 92, y + 12, 46, 2)
        g.fillStyle = pal.neon[1]
        g.fillRect(cx + 70, y + 9, 8, 8)
        g.globalAlpha = 0.35
        g.fillStyle = pal.neon[2]
        g.fillRect(cx - 36, y + 12, 96, 2)
      }
      g.globalAlpha = 1
    }

    // the cables are redrawn at 30fps: they move slowly, and it halves the cost
    let skip = false
    const tick = (_t: number, deltaMs: number) => {
      time += Math.min(deltaMs, 64) / 1000
      skip = !skip
      if (!skip) draw()
    }
    const run = (on: boolean) => {
      if (on === running) return
      running = on
      if (on && !reduced) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
      if (on && reduced) draw()
    }

    size()
    draw()
    const onResize = () => {
      size()
      draw()
    }
    window.addEventListener('resize', onResize)
    // redraw in the other palette when the theme flips (covers reduced motion, where nothing ticks)
    const mo = new MutationObserver(draw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const ctx = gsap.context(() => {
      // vertical distance between treads, read from CSS so it follows the breakpoint
      const rise = () => parseFloat(getComputedStyle(el).getPropertyValue('--rise')) || 150
      ScrollTrigger.create({
        trigger: s.track,
        start: 'top top',
        end: () => `+=${(s.tin + s.dwell + s.tout) * s.unit()}`,
        onToggle: (self) => run(self.isActive),
      })
      gsap.fromTo(
        helix,
        { rotateY: 34, y: 0 },
        {
          rotateY: 34 - (N - 1) * ANGLE,
          y: () => -(N - 1) * rise(),
          ease: 'none',
          scrollTrigger: {
            ...dwellTrigger(el),
            onUpdate: (self) => {
              focus(Math.round(self.progress * (N - 1)))
              climb = self.progress * (N - 1) * rise()
              if (reduced) draw()
            },
          },
        },
      )
    }, el)

    return () => {
      run(false)
      mo.disconnect()
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [])

  return (
    <section className="spi" ref={root} aria-label="Spiral">
      <div className="spi__copy">
        <h2 className="serif spi__title">
          Eight things
          <br />I <em>bring.</em>
        </h2>
      </div>

      {/* index, bottom left: where you are on the stair */}
      <div className="spi__index" aria-hidden>
        <p className="caps spi__index-head">What are you looking for</p>
        <ul>
          {CARDS.map((c) => (
            <li className="spi__item caps" key={c.name}>
              <span>→</span>
              {c.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="spi__stage">
        <div className="spi__tilt">
          <div className="spi__veil" aria-hidden />

          <div className="spi__core" aria-hidden>
            <span className="spi__halo spi__halo--a" />
            <span className="spi__halo spi__halo--b" />
            <canvas className="spi__trunk" ref={canvas} style={{ width: TRUNK_W }} />
          </div>

          <ol className="spi__helix">
            {CARDS.map((c, i) => (
              <li className="spi__tread" key={c.name} style={{ '--i': i, '--a': `${i * ANGLE}deg` } as CSSProperties}>
                <span className="spi__glow" aria-hidden />
                <article className="spi__card">
                  <span className="spi__ghost serif" aria-hidden>
                    {i + 1}
                  </span>
                  <p className="caps spi__n">
                    <i aria-hidden />
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

      <p className="spi__count caps" aria-hidden>
        <b>01</b> / 08
      </p>
    </section>
  )
}
