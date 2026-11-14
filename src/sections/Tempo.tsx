import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'
import { getTheme } from '@/lib/theme'

/**
 * 10 — Tempo. The sister film to Flow, with the energy turned up. Twenty seconds, looping,
 * nothing tied to scroll.
 *
 * Picture: five ribbons of light crossing the frame (a fragment shader, half resolution). On
 * every beat the picture itself changes: a ripple runs out from the centre and the ribbons
 * shift colour, so the background cuts with the type instead of sitting behind it.
 *
 * Type: five beats of four seconds, each arriving and leaving a different way:
 *   1 two rows slide in from opposite sides       → leave by flying through the camera
 *   2 arrives from deep in the frame              → rows part left and right
 *   3 a ticker of easing names spins and lands    → drops out
 *   4 letters rise one by one, then hold still    → dissolve
 *   5 the signature                               → flies through the camera, and it loops
 */
const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uKick; uniform float uHue;
uniform vec3 uBase; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uHot;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<3;i++){ v += a*noise(p); p = p*2.03 + 9.7; a *= 0.5; } return v; }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float d = length(uv);
  // the beat: a ring of displacement that runs outward and dies away
  float ring = sin(d * 16.0 - (1.0 - uKick) * 14.0) * exp(-abs(d - (1.0 - uKick) * 1.3) * 5.0);
  uv += normalize(uv + 1e-4) * ring * 0.06 * uKick;
  float t = uT * 0.16;
  vec3 col = uBase;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float y = uv.y + (fi - 2.0) * 0.17
      + 0.30 * sin(uv.x * (1.1 + fi * 0.33) + t * (1.0 + fi * 0.27) + fi * 1.7)
      + 0.20 * (fbm(vec2(uv.x * 1.4 + fi * 3.1, t * 0.7 + fi)) - 0.5);
    float body = exp(-pow(y * (4.6 + fi * 1.2), 2.0));
    float core = exp(-pow(y * (30.0 + fi * 7.0), 2.0));
    // each ribbon takes its colour from a three-stop ramp that the beat rotates
    float k = fract(fi / 5.0 + uHue);
    vec3 c = k < 0.5 ? mix(uA, uB, k * 2.0) : mix(uB, uC, (k - 0.5) * 2.0);
    col = mix(col, c, body * 0.72);
    col = mix(col, uHot, core * (0.55 + 0.45 * uKick));
  }
  // a quieter pool in the middle for the type
  float pool = smoothstep(0.0, 0.9, length(uv * vec2(0.7, 1.3)));
  col = mix(mix(col, uBase, 0.5), col, pool);
  gl_FragColor = vec4(col, 1.0);
}`

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
const RIBBON = {
  dark: { base: hex('#070605'), a: hex('#c9a26b'), b: hex('#a3342c'), c: hex('#2a6680'), hot: hex('#fff1d8') },
  light: { base: hex('#ece7dd'), a: hex('#cf9438'), b: hex('#c0503f'), c: hex('#4f8fae'), hot: hex('#ffffff') },
}
const BEAT = 4
const BEATS = 5
const EASINGS = ['linear', 'ease-in', 'sine.inOut', 'quart.out', 'back.out', 'expo.out']
const Chars = ({ text }: { text: string }) => (
  <>
    {text.split('').map((c, i) => (
      <span className="tempo__ch" key={i}>
        <span>{c === ' ' ? ' ' : c}</span>
      </span>
    ))}
  </>
)

export default function Tempo() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const reduced = reducedMotion()
    const code = el.querySelector<HTMLElement>('.tempo__code')!
    const dots = Array.from(el.querySelectorAll<HTMLElement>('.tempo__beat'))
    const state = { t: 3, kick: 0, hue: 0 }

    // ── picture ──
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
      const loc = { res: u('uRes'), t: u('uT'), kick: u('uKick'), hue: u('uHue'), base: u('uBase'), a: u('uA'), b: u('uB'), c: u('uC'), hot: u('uHot') }
      resize = () => {
        const scale = Math.min(0.5, 900 / Math.max(1, el.clientWidth))
        cv.width = Math.max(2, Math.round(el.clientWidth * scale))
        cv.height = Math.max(2, Math.round(el.clientHeight * scale))
        gl.viewport(0, 0, cv.width, cv.height)
      }
      frame = () => {
        const c = RIBBON[getTheme()]
        gl.uniform2f(loc.res, cv.width, cv.height)
        gl.uniform1f(loc.t, state.t)
        gl.uniform1f(loc.kick, state.kick)
        gl.uniform1f(loc.hue, state.hue)
        gl.uniform3fv(loc.base, c.base)
        gl.uniform3fv(loc.a, c.a)
        gl.uniform3fv(loc.b, c.b)
        gl.uniform3fv(loc.c, c.c)
        gl.uniform3fv(loc.hot, c.hot)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
    } else {
      el.classList.add('is-flat')
    }
    let running = false
    const tick = (_t: number, deltaMs: number) => {
      state.t += Math.min(deltaMs, 64) / 1000
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
      const tl = gsap.timeline({
        paused: true,
        repeat: -1,
        onUpdate: () => {
          const t = tl.time()
          code.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 24)).padStart(2, '0')}`
          const beat = Math.min(BEATS - 1, Math.floor(t / BEAT))
          dots.forEach((dot, i) => dot.classList.toggle('is-on', i === beat))
        },
      })
      const at = (i: number) => i * BEAT
      const show = (i: number) => tl.set(`.tempo__b${i + 1}`, { autoAlpha: 1 }, at(i))
      const hide = (i: number) => tl.set(`.tempo__b${i + 1}`, { autoAlpha: 0 }, at(i) + BEAT)
      // every beat kicks the picture: a ripple, and the ribbons move one step round the palette
      for (let i = 0; i < BEATS; i++) {
        tl.fromTo(state, { kick: 1 }, { kick: 0, duration: 1.8, ease: 'power2.out' }, at(i))
        tl.to(state, { hue: (i + 1) / BEATS, duration: 1.6, ease: 'power2.inOut' }, at(i))
      }
      const through = (sel: string, t: number) => tl.to(sel, { scale: 7, opacity: 0, filter: 'blur(18px)', duration: 0.95, ease: 'power3.in' }, t)
      const reset = (sel: string, t: number) => tl.set(sel, { scale: 1, opacity: 1, filter: 'blur(0px)', x: 0, xPercent: 0, yPercent: 0 }, t)

      /* 1 ─ rows from opposite sides, out through the camera */
      show(0)
      reset('.tempo__b1 .tempo__inner', at(0))
      tl.fromTo('.tempo__b1 .tempo__row--a', { xPercent: -130 }, { xPercent: 0, duration: 1.5, ease: 'expo.out' }, at(0) + 0.1)
        .fromTo('.tempo__b1 .tempo__row--b', { xPercent: 130 }, { xPercent: 0, duration: 1.5, ease: 'expo.out' }, at(0) + 0.22)
        .fromTo('.tempo__b1 .tempo__row--b', { skewX: -18 }, { skewX: 0, duration: 1.7, ease: 'expo.out' }, at(0) + 0.22)
      through('.tempo__b1 .tempo__inner', at(0) + BEAT - 0.95)
      hide(0)

      /* 2 ─ from deep in the frame, then the rows part */
      show(1)
      reset('.tempo__b2 .tempo__row', at(1))
      tl.fromTo('.tempo__b2 .tempo__inner', { scale: 0.25, opacity: 0, filter: 'blur(14px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.7, ease: 'expo.out' }, at(1) + 0.05)
        .to('.tempo__b2 .tempo__row--a', { xPercent: -140, duration: 0.95, ease: 'power3.in' }, at(1) + BEAT - 0.95)
        .to('.tempo__b2 .tempo__row--b', { xPercent: 140, duration: 0.95, ease: 'power3.in' }, at(1) + BEAT - 0.95)
      hide(1)

      /* 3 ─ a ticker of easings spins and lands on the right one */
      show(2)
      tl.fromTo('.tempo__b3 .tempo__inner', { yPercent: 0, opacity: 1 }, { yPercent: 0, opacity: 1, duration: 0.01 }, at(2))
        .fromTo('.tempo__b3 .tempo__row--a .tempo__ch > span', { yPercent: 115 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04 }, at(2) + 0.1)
        .fromTo('.tempo__reel', { yPercent: 0 }, { yPercent: -(100 * (EASINGS.length - 1)) / EASINGS.length, duration: 2.3, ease: 'expo.inOut' }, at(2) + 0.25)
        .to('.tempo__b3 .tempo__inner', { yPercent: 60, opacity: 0, duration: 0.8, ease: 'power3.in' }, at(2) + BEAT - 0.8)
      hide(2)

      /* 4 ─ letters rise one by one, hold, dissolve */
      show(3)
      reset('.tempo__b4 .tempo__inner', at(3))
      tl.fromTo('.tempo__b4 .tempo__ch > span', { yPercent: 115, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.045 }, at(3) + 0.1)
        .to('.tempo__b4 .tempo__ch > span', { opacity: 0, filter: 'blur(10px)', duration: 0.7, ease: 'power2.in', stagger: { each: 0.025, from: 'random' } }, at(3) + BEAT - 1.0)
        .set('.tempo__b4 .tempo__ch > span', { opacity: 1, filter: 'blur(0px)' }, at(3) + BEAT)
      hide(3)

      /* 5 ─ the signature, out through the camera, and round again */
      show(4)
      reset('.tempo__b5 .tempo__inner', at(4))
      tl.fromTo('.tempo__b5 .tempo__mark > span', { yPercent: 115 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09 }, at(4) + 0.1)
        .fromTo('.tempo__b5 .tempo__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: 'expo.out' }, at(4) + 0.4)
        .fromTo('.tempo__b5 .tempo__small > span', { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out' }, at(4) + 0.6)
      through('.tempo__b5 .tempo__inner', at(4) + BEAT - 0.95)
      hide(4)

      if (reduced) {
        tl.time(1.8)
        return
      }
      const play = () => {
        run(true)
        tl.play()
      }
      const pause = () => {
        run(false)
        tl.pause()
      }
      onSceneShown(el, play, pause, 0.35)
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.progress() > 0 && play() : pause()))
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
    <section className="tempo" ref={root} aria-label="Tempo: a short kinetic film">
      <canvas className="tempo__picture" ref={canvas} aria-hidden />

      <div className="tempo__stage serif" aria-hidden>
        <div className="tempo__beatbox tempo__b1">
          <div className="tempo__inner">
            <p className="tempo__row tempo__row--a">MAKE IT</p>
            <p className="tempo__row tempo__row--b tempo__em">move.</p>
          </div>
        </div>

        <div className="tempo__beatbox tempo__b2">
          <div className="tempo__inner">
            <p className="tempo__row tempo__row--a">MAKE IT</p>
            <p className="tempo__row tempo__row--b tempo__em">matter.</p>
          </div>
        </div>

        <div className="tempo__beatbox tempo__b3">
          <div className="tempo__inner">
            <p className="tempo__row tempo__row--a tempo__row--small">
              <Chars text="EASE WITH" />
            </p>
            <div className="tempo__window">
              <div className="tempo__reel tempo__em">
                {EASINGS.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="tempo__beatbox tempo__b4">
          <div className="tempo__inner">
            <p className="tempo__row tempo__row--a">
              <Chars text="THEN LET IT" />
            </p>
            <p className="tempo__row tempo__row--b tempo__em">
              <Chars text="rest." />
            </p>
          </div>
        </div>

        <div className="tempo__beatbox tempo__b5">
          <div className="tempo__inner">
            <p className="tempo__mark">
              <span>K</span>
              <span className="tempo__dash">—</span>
              <span>S</span>
            </p>
            <i className="tempo__rule" />
            <p className="tempo__small">
              <span>Motion, by design</span>
            </p>
          </div>
        </div>
      </div>

      <p className="sr-only">Make it move. Make it matter. Ease with expo.out. Then let it rest.</p>

      <div className="tempo__hud caps" aria-hidden>
        <span>Film 03 — Tempo</span>
        <span className="tempo__beats">
          {Array.from({ length: BEATS }, (_, i) => (
            <i className="tempo__beat" key={i} />
          ))}
        </span>
        <span className="tempo__code">00:00:00</span>
      </div>
      <p className="scene-tag caps">N° 10 — Tempo</p>
    </section>
  )
}
