import { flushSync } from 'react-dom'
import { getTheme, setTheme, type Theme } from './theme'
import { reducedMotion } from './scroll'

/**
 * Ink-bleed theme transition (adapted from github.com/FLASH860/holygrail).
 *
 * A WebGL noise shader renders an expanding ink blot (thresholded fractal noise, centred on the
 * toggle) into a sprite sheet of FRAMES steps. The View Transitions API snapshots the old theme,
 * and the live new theme is revealed through that sheet used as a CSS mask, stepped frame by
 * frame, so real DOM changes theme along an organic, soaking edge that spreads from the button.
 * Browsers without View Transitions (and reduced-motion users) get an instant switch.
 */
const COLS = 8
const ROWS = 8
const FRAMES = COLS * ROWS
const FW = 480
const FH = 270
const DURATION = 2100

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uGrid; uniform vec2 uOrigin; uniform float uAspect; uniform float uSeed;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<6;i++){ v += a*noise(p); p = p*2.03 + 17.1; a *= 0.5; } return v; }
void main(){
  vec2 g = vUv * uGrid;
  vec2 cell = floor(g);
  vec2 uv = fract(g);
  uv.y = 1.0 - uv.y;                                  // frame-local, top-left origin like CSS
  float frame = cell.x + (uGrid.y - 1.0 - cell.y) * uGrid.x;
  float t = frame / (uGrid.x * uGrid.y - 1.0);
  vec2 p = (uv - uOrigin) * vec2(uAspect, 1.0);
  float d = length(p);
  float ang = atan(p.y, p.x);
  // paper fibre: coarse blotches, fine feathering and radial runs, static in space so the
  // front soaks into it rather than sliding over it
  float n = fbm(p * 2.6 + uSeed) * 0.60 + fbm(p * 9.0 - uSeed) * 0.26 + fbm(vec2(ang * 2.5, d * 1.5) + uSeed) * 0.22;
  float reach = length(vec2(max(uOrigin.x, 1.0 - uOrigin.x) * uAspect, max(uOrigin.y, 1.0 - uOrigin.y)));
  float eased = t * t * (3.0 - 2.0 * t);
  float radius = eased * (reach + 0.8);
  // capillary fingers: thin filaments that run outward ahead of the main front
  float fil = 1.0 - abs(fbm(vec2(ang * 6.0, d * 1.6) - uSeed) * 2.0 - 1.0);
  float fine = 1.0 - abs(fbm(p * 10.0 + uSeed * 0.7) * 2.0 - 1.0);
  float fingers = pow(fil, 5.0) * 0.20 + pow(fine, 6.0) * 0.10;
  float edge = d + (n - 0.5) * (0.2 + 0.75 * eased) - fingers * (0.25 + eased);
  float a = smoothstep(radius, radius - 0.024, edge);
  if (t <= 0.0) a = 0.0;
  if (t >= 1.0) a = 1.0;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`

let sheetUrl: string | null = null
let building: Promise<void> | null = null
let origin = { x: 0.95, y: 0.05 }

function render(): Promise<string | null> {
  const c = document.createElement('canvas')
  c.width = COLS * FW
  c.height = ROWS * FH
  const gl = c.getContext('webgl', { premultipliedAlpha: false, alpha: true, preserveDrawingBuffer: true })
  if (!gl) return Promise.resolve(null)
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }'))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.bindAttribLocation(prog, 0, 'p')
  gl.linkProgram(prog)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(gl.getUniformLocation(prog, 'uGrid'), COLS, ROWS)
  gl.uniform2f(gl.getUniformLocation(prog, 'uOrigin'), origin.x, origin.y)
  gl.uniform1f(gl.getUniformLocation(prog, 'uAspect'), window.innerWidth / window.innerHeight)
  gl.uniform1f(gl.getUniformLocation(prog, 'uSeed'), Math.random() * 40)
  gl.viewport(0, 0, c.width, c.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  return new Promise((resolve) =>
    c.toBlob((blob) => {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      resolve(blob ? URL.createObjectURL(blob) : null)
    }, 'image/png'),
  )
}

/** Pre-render the sheet for the toggle's current screen position (call on idle + resize). */
export function prepareInk(button?: HTMLElement | null) {
  if (button) {
    const r = button.getBoundingClientRect()
    origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
  }
  building = render().then(async (url) => {
    if (!url) return
    const img = new Image()
    img.src = url
    await img.decode().catch(() => {})
    if (sheetUrl) URL.revokeObjectURL(sheetUrl)
    sheetUrl = url
    document.documentElement.style.setProperty('--ink-sheet', `url(${url})`)
    keepWarm(url)
  })
  return building
}

// An off-screen element using the sheet keeps it decoded so the first mask frame never flashes.
let warm: HTMLDivElement | null = null
function keepWarm(url: string) {
  if (!warm) {
    warm = document.createElement('div')
    warm.setAttribute('aria-hidden', 'true')
    warm.style.cssText =
      'position:fixed;left:-10px;top:-10px;width:4px;height:4px;pointer-events:none;opacity:.01;background-size:100% 100%'
    document.body.appendChild(warm)
  }
  warm.style.backgroundImage = `url(${url})`
}

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

/**
 * Layers captured on their own for the transition.
 *
 * The root snapshot the browser takes for a View Transition comes out blank once the document is
 * scrolled past roughly 16,000 px (a texture-size limit), so on the later scenes the old theme
 * had nothing to show: the page changed colour at once and the ink only revealed content.
 * Elements with their own `view-transition-name` are captured in their own space and do not hit
 * that limit. So, just before the transition, every scene currently on screen gets a name
 * (at most three overlap), and the nav and switch carry permanent ones. Each is viewport-sized
 * and pinned to the viewport, so the one mask lines up on all of them.
 */
const STAGE = ['vt-stage-0', 'vt-stage-1', 'vt-stage-2', 'vt-stage-3']
const LAYERS = [...STAGE, 'vt-nav', 'vt-switch']
let tagged: HTMLElement[] = []
function tagStage() {
  tagged = []
  document.querySelectorAll<HTMLElement>('.scene__pin:not(.is-idle)').forEach((pin) => {
    const r = pin.getBoundingClientRect()
    if (r.bottom <= 1 || r.top >= window.innerHeight - 1 || tagged.length >= STAGE.length) return
    pin.style.setProperty('view-transition-name', STAGE[tagged.length])
    tagged.push(pin)
  })
}
function untagStage() {
  tagged.forEach((pin) => pin.style.removeProperty('view-transition-name'))
  tagged = []
}

let running = false
export async function toggleTheme(button?: HTMLElement | null) {
  if (running) return
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  const doc = document as VTDocument
  if (!doc.startViewTransition || reducedMotion()) {
    setTheme(next)
    return
  }
  running = true
  try {
    if (!sheetUrl) await prepareInk(button)
    else await building
    if (!sheetUrl) throw new Error('no ink sheet')
    document.documentElement.classList.add('ink-transition')
    tagStage()
    const vt = doc.startViewTransition(() => flushSync(() => setTheme(next)))
    await vt.ready
    const frames: Keyframe[] = []
    for (let i = 0; i < FRAMES; i++) {
      const pos = `${((i % COLS) / (COLS - 1)) * 100}% ${(Math.floor(i / COLS) / (ROWS - 1)) * 100}%`
      frames.push({ maskPosition: pos, webkitMaskPosition: pos, easing: 'step-end', offset: i / (FRAMES - 1) })
    }
    // the same blot, in step, on every layer that was captured
    for (const name of ['root', ...LAYERS]) {
      document.documentElement.animate(frames, {
        duration: DURATION,
        easing: 'linear',
        fill: 'both',
        pseudoElement: `::view-transition-new(${name})`,
      })
    }
    await vt.finished
  } catch {
    if (getTheme() !== next) setTheme(next)
  } finally {
    document.documentElement.classList.remove('ink-transition')
    untagStage()
    running = false
    prepareInk(button) // fresh blot shape next time
  }
}
