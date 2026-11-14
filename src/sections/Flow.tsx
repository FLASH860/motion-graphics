import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'
import { getTheme } from '@/lib/theme'

/**
 * 05 — Flow. A self-playing film, fifteen seconds on a loop, nothing tied to scroll.
 * The picture is a sheet of silk that never stops moving: a small fragment shader
 * (domain-warped noise, shaded as folds of satin) drawn at half resolution, which is why it
 * costs almost nothing. Over it, three lines pull into focus and leave, one every five seconds.
 *
 * (WebGL was originally reserved for the ink transition; it was opened up for this page.)
 */
const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uT;
uniform vec3 uShadow; uniform vec3 uMid; uniform vec3 uSheen; uniform vec3 uPool;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*noise(p); p = p*2.02 + 11.3; a *= 0.5; } return v; }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 p = uv * 1.25;
  float t = uT * 0.07;
  // warp the plane twice so the cloth billows instead of sliding
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t * 1.3)));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.45));
  float h = fbm(p + 3.0 * r);
  // folds: bands that follow the warped surface, lit from one side
  float folds = sin((p.x * 1.3 + p.y * 0.55 + h * 4.6 + r.x * 2.2) * 2.9);
  float shade = smoothstep(-1.0, 1.0, folds);
  float sheen = pow(0.5 + 0.5 * folds, 5.0);
  vec3 col = mix(uShadow, uMid, shade);
  col = mix(col, uSheen, sheen * 0.8);
  col *= 0.8 + 0.4 * h;
  // a calmer pool in the middle, so the type always has something quiet behind it
  float pool = smoothstep(0.05, 0.95, length(uv * vec2(0.75, 1.25)));
  col = mix(mix(col, uPool, 0.62), col, pool);
  gl_FragColor = vec4(col, 1.0);
}`

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
const SILK = {
  dark: { shadow: hex('#040302'), mid: hex('#3b2a16'), sheen: hex('#e6c38d'), pool: hex('#0b0a09') },
  light: { shadow: hex('#b9a783'), mid: hex('#eadfc8'), sheen: hex('#fffdf7'), pool: hex('#f1ebde') },
}
const LINES = [
  ['Slow is', 'smooth.'],
  ['Smooth is', 'fast.'],
  ['Nothing here', 'is rushed.'],
]
const BEAT = 5

export default function Flow() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const reduced = reducedMotion()
    const code = el.querySelector<HTMLElement>('.flow__code')!
    const bar = el.querySelector<HTMLElement>('.flow__progress > span')!

    // ── silk ──
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    let frame = () => {}
    let resize = () => {}
    if (gl) {
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        return s
      }
      const prog = gl.createProgram()!
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }'))
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
      gl.bindAttribLocation(prog, 0, 'p')
      gl.linkProgram(prog)
      gl.useProgram(prog)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      const u = (n: string) => gl.getUniformLocation(prog, n)
      const loc = { res: u('uRes'), t: u('uT'), shadow: u('uShadow'), mid: u('uMid'), sheen: u('uSheen'), pool: u('uPool') }
      resize = () => {
        // half resolution, capped: silk has no fine detail to lose
        const scale = Math.min(0.5, 900 / Math.max(1, el.clientWidth))
        cv.width = Math.max(2, Math.round(el.clientWidth * scale))
        cv.height = Math.max(2, Math.round(el.clientHeight * scale))
        gl.viewport(0, 0, cv.width, cv.height)
      }
      frame = () => {
        const c = SILK[getTheme()]
        gl.uniform2f(loc.res, cv.width, cv.height)
        gl.uniform1f(loc.t, clock.t)
        gl.uniform3fv(loc.shadow, c.shadow)
        gl.uniform3fv(loc.mid, c.mid)
        gl.uniform3fv(loc.sheen, c.sheen)
        gl.uniform3fv(loc.pool, c.pool)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
    } else {
      el.classList.add('is-flat') // no WebGL: a still gradient stands in
    }
    const clock = { t: 12 }
    let running = false
    const tick = (_t: number, deltaMs: number) => {
      clock.t += Math.min(deltaMs, 64) / 1000
      frame()
    }
    const run = (on: boolean) => {
      if (on === running || reduced) return
      running = on
      if (on) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    }
    resize()
    frame()
    const onResize = () => {
      resize()
      frame()
    }
    window.addEventListener('resize', onResize)
    const mo = new MutationObserver(() => frame())
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // ── type ──
    const ctx = gsap.context(() => {
      const cycle = gsap.timeline({
        paused: true,
        repeat: -1,
        onUpdate: () => {
          const t = cycle.time()
          code.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 24)).padStart(2, '0')}`
          bar.style.transform = `scaleX(${(t / (LINES.length * BEAT)).toFixed(4)})`
        },
      })
      gsap.utils.toArray<HTMLElement>('.flow__line', el).forEach((line, i) => {
        const t = i * BEAT
        const words = line.querySelectorAll('.flow__w')
        cycle
          .set(line, { autoAlpha: 1 }, t)
          // each word racks into focus from soft and low, then leaves upward the same way
          .fromTo(words, { opacity: 0, yPercent: 46, filter: 'blur(16px)' }, { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: 1.9, ease: 'expo.out', stagger: 0.16 }, t + 0.2)
          .fromTo(line.querySelector('.flow__rule'), { scaleX: 0 }, { scaleX: 1, duration: 2.2, ease: 'expo.out' }, t + 0.5)
          .to(words, { opacity: 0, yPercent: -46, filter: 'blur(16px)', duration: 1.0, ease: 'power3.in', stagger: 0.08 }, t + BEAT - 1.15)
          .to(line.querySelector('.flow__rule'), { scaleX: 0, duration: 0.8, ease: 'power3.in' }, t + BEAT - 1.0)
          .set(line, { autoAlpha: 0 }, t + BEAT)
      })

      if (reduced) {
        cycle.time(2.4)
        return
      }
      const play = () => {
        run(true)
        cycle.play()
      }
      const pause = () => {
        run(false)
        cycle.pause()
      }
      onSceneShown(el, play, pause, 0.35)
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? cycle.progress() > 0 && play() : pause()))
      io.observe(el)
      return () => io.disconnect()
    }, el)

    return () => {
      run(false)
      mo.disconnect()
      window.removeEventListener('resize', onResize)
      ctx.revert()
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <section className="flow" ref={root} aria-label="Flow: a short film of moving silk">
      <canvas className="flow__silk" ref={canvas} aria-hidden />

      <div className="flow__lines serif">
        {LINES.map(([a, b], i) => (
          <p className="flow__line" key={i} aria-hidden={i > 0}>
            <span className="flow__row">
              {a.split(' ').map((w, k) => (
                <span className="flow__w" key={k}>
                  {w}
                </span>
              ))}
            </span>
            <span className="flow__rule" aria-hidden />
            <span className="flow__row flow__row--em">
              {b.split(' ').map((w, k) => (
                <span className="flow__w" key={k}>
                  {w}
                </span>
              ))}
            </span>
          </p>
        ))}
      </div>

      <div className="flow__hud caps" aria-hidden>
        <span>Film 01 — Flow</span>
        <span className="flow__progress">
          <span />
        </span>
        <span className="flow__code">00:00:00</span>
      </div>
      <p className="scene-tag caps">N° 05 — Flow</p>
    </section>
  )
}
