import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { onSceneShown } from '@/lib/scene'
import { reducedMotion } from '@/lib/scroll'
import { getTheme } from '@/lib/theme'

/**
 * 11 — Tempo. The sister film to Flow, with the energy turned up. Twenty seconds, looping,
 * nothing tied to scroll.
 *
 * Picture: five ribbons of light crossing the frame (a fragment shader, half resolution). On
 * every beat the picture itself changes: a ripple runs out from the centre and the ribbons
 * shift colour, so the background cuts with the type instead of sitting behind it.
 *
 * Type: five beats of four seconds. Each one uses the whole screen and is built a different way:
 *   1 WALL     five rows of one line fill the screen, alternate rows running opposite ways
 *   2 CORNERS  four words driven in from the four edges to the four corners
 *   3 REELS    three full-height columns spin like a fruit machine and stop on one line
 *   4 SPREAD   one word, its letters set edge to edge, then stillness
 *   5 FRAME    the line runs round all four edges of the screen, the mark in the middle
 * and each leaves its own way (off the sides, back out the edges, dropping, dissolving, through
 * the camera).
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
const WALL = 'MAKE IT MOVE — MAKE IT MOVE — MAKE IT MOVE — MAKE IT MOVE — '
const BORDER = 'KANISHQ SURENDRAN — MOTION, BY DESIGN — '.repeat(6)
// three reels: each spins through its column and stops on the word at STOP_AT,
// with a couple more below it so the column reads as a drum, not a list that ran out
const REELS = [
  ['FADE', 'SLIDE', 'SCALE', 'TURN', 'HOLD', 'WAIT', 'EASE', 'DRIFT', 'SETTLE'],
  ['IN', 'OUT', 'UP', 'ON', 'BY', 'TO', 'WITH', 'FROM', 'THROUGH'],
  ['linear', 'sine', 'quad', 'cubic', 'quart', 'back', 'expo.out', 'circ', 'power4'],
]
const REEL_LEN = REELS[0].length
const STOP_AT = 6

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
      const out = (i: number) => at(i) + BEAT - 0.95 // every beat spends its last second leaving
      const show = (i: number) => tl.set(`.tempo__b${i + 1}`, { autoAlpha: 1 }, at(i))
      const hide = (i: number) => tl.set(`.tempo__b${i + 1}`, { autoAlpha: 0 }, at(i) + BEAT)
      // every beat kicks the picture: a ripple, and the ribbons move one step round the palette
      for (let i = 0; i < BEATS; i++) {
        tl.fromTo(state, { kick: 1 }, { kick: 0, duration: 1.8, ease: 'power2.out' }, at(i))
        tl.to(state, { hue: (i + 1) / BEATS, duration: 1.6, ease: 'power2.inOut' }, at(i))
      }

      /* 1 ─ WALL. Five rows of the same line fill the screen top to bottom, alternate rows
             running opposite ways, solid then outlined. Leaves: each row off its own side. */
      show(0)
      gsap.utils.toArray<HTMLElement>('.t1__row', el).forEach((row, i) => {
        const dir = i % 2 ? 1 : -1
        tl.fromTo(row, { xPercent: dir > 0 ? -58 : -4, opacity: 0 }, { xPercent: dir > 0 ? -34 : -28, opacity: 1, duration: BEAT - 0.95, ease: 'power2.out' }, at(0) + i * 0.07)
          .to(row, { xPercent: dir > 0 ? 40 : -110, duration: 0.95, ease: 'power3.in' }, out(0))
      })
      hide(0)

      /* 2 ─ CORNERS. Four words, one driven in from each edge to its own corner, with a cross of
             hairlines drawn through the middle. Leaves: every word back out the way it came. */
      show(1)
      const corners: [string, gsap.TweenVars][] = [
        ['.t2__w--tl', { xPercent: -130 }],
        ['.t2__w--tr', { yPercent: -150 }],
        ['.t2__w--bl', { yPercent: 150 }],
        ['.t2__w--br', { xPercent: 130 }],
      ]
      corners.forEach(([sel, from], i) => {
        tl.fromTo(sel, { xPercent: 0, yPercent: 0, ...from }, { xPercent: 0, yPercent: 0, duration: 1.5, ease: 'expo.out' }, at(1) + 0.08 + i * 0.12)
          .to(sel, { ...from, duration: 0.9, ease: 'power3.in' }, out(1) + i * 0.03)
      })
      tl.fromTo('.t2__h', { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'expo.inOut' }, at(1) + 0.3)
        .fromTo('.t2__v', { scaleY: 0 }, { scaleY: 1, duration: 1.6, ease: 'expo.inOut' }, at(1) + 0.45)
        .fromTo('.t2__note', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1, ease: 'expo.out' }, at(1) + 1.1)
        .to('.t2__h', { scaleX: 0, duration: 0.7, ease: 'power3.in' }, out(1))
        .to('.t2__v', { scaleY: 0, duration: 0.7, ease: 'power3.in' }, out(1))
        .to('.t2__note', { opacity: 0, duration: 0.4 }, out(1))
      hide(1)

      /* 3 ─ REELS. Three full-height columns spin like a fruit machine and stop, one after the
             other, on a line across the middle. Leaves: the reels run on and drop away. */
      show(2)
      gsap.utils.toArray<HTMLElement>('.t3__reel', el).forEach((reel, i) => {
        const stop = -(100 * STOP_AT) / REEL_LEN
        tl.fromTo(reel, { yPercent: 0, opacity: 1 }, { yPercent: stop, duration: 1.9 + i * 0.35, ease: 'expo.inOut' }, at(2) + 0.05)
          .to(reel, { yPercent: stop - 16, opacity: 0, duration: 0.8, ease: 'power3.in' }, out(2) + i * 0.05)
      })
      tl.fromTo('.t3__band', { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.8, ease: 'expo.inOut' }, at(2) + 0.2)
        .to('.t3__band', { opacity: 0, duration: 0.5 }, out(2))
      hide(2)

      /* 4 ─ SPREAD. One word, four letters, set edge to edge across the whole width; each rises
             on its own, then nothing moves. Leaves: the letters drift apart and dissolve. */
      show(3)
      tl.set('.t4__l', { x: 0, opacity: 1, filter: 'blur(0px)' }, at(3))
        .fromTo('.t4__l > span', { yPercent: 118 }, { yPercent: 0, duration: 1.7, ease: 'expo.out', stagger: 0.2 }, at(3) + 0.1)
        .fromTo('.t4__lead > span', { yPercent: 118 }, { yPercent: 0, duration: 1.2, ease: 'expo.out' }, at(3) + 0.2)
        .fromTo('.t4__base', { scaleX: 0 }, { scaleX: 1, duration: 2.2, ease: 'expo.out' }, at(3) + 0.3)
        .to('.t4__l', { x: (i: number) => (i - 1.5) * 90, opacity: 0, filter: 'blur(14px)', duration: 0.9, ease: 'power2.in', stagger: 0.04 }, out(3))
        .to('.t4__lead > span', { yPercent: -118, duration: 0.7, ease: 'power3.in' }, out(3))
        .to('.t4__base', { scaleX: 0, duration: 0.7, ease: 'power3.in' }, out(3))
      hide(3)

      /* 5 ─ FRAME. The line runs round all four edges of the screen like a border in motion,
             with the mark in the middle. Leaves: the mark flies through the camera. */
      show(4)
      tl.set('.t5__core', { scale: 1, opacity: 1, filter: 'blur(0px)' }, at(4))
        .fromTo('.t5__run', { xPercent: (i: number) => (i === 2 ? -25 : 0) }, { xPercent: (i: number) => (i === 2 ? 0 : -25), duration: BEAT, ease: 'none' }, at(4))
        .fromTo('.t5__strip > div', { yPercent: 110 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1 }, at(4) + 0.05)
        .fromTo('.t5__mark > span', { yPercent: 115 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09 }, at(4) + 0.25)
        .fromTo('.t5__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: 'expo.out' }, at(4) + 0.55)
        .fromTo('.t5__small > span', { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: 'expo.out' }, at(4) + 0.75)
        .to('.t5__core', { scale: 7, opacity: 0, filter: 'blur(18px)', duration: 0.95, ease: 'power3.in' }, out(4))
        .to('.t5__strip > div', { yPercent: 110, duration: 0.7, ease: 'power3.in', stagger: 0.04 }, out(4))
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
        {/* 1 · wall */}
        <div className="tempo__beatbox tempo__b1">
          {[0, 1, 2, 3, 4].map((i) => (
            <p className={`t1__row${i % 2 ? ' t1__row--line' : ''}${i === 2 ? ' tempo__em' : ''}`} key={i}>
              {WALL}
            </p>
          ))}
        </div>

        {/* 2 · corners */}
        <div className="tempo__beatbox tempo__b2">
          <i className="t2__h" />
          <i className="t2__v" />
          <p className="t2__w t2__w--tl">MAKE</p>
          <p className="t2__w t2__w--tr">IT</p>
          <p className="t2__w t2__w--bl">MEAN</p>
          <p className="t2__w t2__w--br tempo__em">something.</p>
          <p className="t2__note caps">Movement is not the point</p>
        </div>

        {/* 3 · reels */}
        <div className="tempo__beatbox tempo__b3">
          <i className="t3__band" />
          <div className="t3__reels">
            {REELS.map((words, i) => (
              <div className="t3__col" key={i}>
                <div className={`t3__reel${i === 2 ? ' tempo__em' : ''}`}>
                  {words.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 · spread */}
        <div className="tempo__beatbox tempo__b4">
          <p className="t4__lead">
            <span>Then let it</span>
          </p>
          <p className="t4__word tempo__em">
            {'rest'.split('').map((c, i) => (
              <span className="t4__l" key={i}>
                <span>{c}</span>
              </span>
            ))}
          </p>
          <i className="t4__base" />
        </div>

        {/* 5 · frame */}
        <div className="tempo__beatbox tempo__b5">
          {(['t', 'r', 'b', 'l'] as const).map((side) => (
            <div className={`t5__strip t5__strip--${side}`} key={side}>
              <div>
                <p className="t5__run">{BORDER}</p>
              </div>
            </div>
          ))}
          <div className="t5__core">
            <p className="t5__mark">
              <span>K</span>
              <span className="t5__dash">—</span>
              <span>S</span>
            </p>
            <i className="t5__rule" />
            <p className="t5__small">
              <span>Motion, by design</span>
            </p>
          </div>
        </div>
      </div>

      <p className="sr-only">Make it move. Make it mean something. Ease with expo.out. Then let it rest.</p>

      <div className="tempo__hud caps" aria-hidden>
        <span>Film 03 — Tempo</span>
        <span className="tempo__beats">
          {Array.from({ length: BEATS }, (_, i) => (
            <i className="tempo__beat" key={i} />
          ))}
        </span>
        <span className="tempo__code">00:00:00</span>
      </div>
      <p className="scene-tag caps">N° 11 — Tempo</p>
    </section>
  )
}
