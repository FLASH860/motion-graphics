// Strands pipeline: assets/video/strands.mp4 (read-only) → public/strands/0001.webp … 0240.webp
// at the film's native 1920x1080. An image sequence drawn to a canvas scrubs cleanly both ways.
//
// The source carries TWO generator watermarks (a four-point sparkle, semi-transparent grey):
//   1. a fixed one, bottom right, on every frame;
//   2. a second copy that starts on top of the first and drifts ~400px upward through the
//      strands over the first ~60 frames, fading as it goes.
// Both are removed here, per frame:
//   fixed    it is an alpha overlay, so it is un-blended rather than covered. The per-pixel
//            minimum over the whole film is what the mark looks like over black (alpha × grey);
//            from that, each frame's true pixel is (seen − mark) / (1 − alpha). Strands and dust
//            passing behind the mark survive.
//   moving   everything real in this film is warm (orange strands, amber dust) on near-black.
//            A large patch of neutral grey in the drift corridor can only be the mark, so it is
//            found by colour and size, then filled in from the pixels around it.
// Usage: npm run assets:strands   (needs ffmpeg on PATH)
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'assets/video/strands.mp4')
const out = path.join(root, 'public/strands')
mkdirSync(out, { recursive: true })

const W = 1920
const H = 1080
const FRAME = W * H * 3
const FIXED = { x0: 1676, y0: 812, x1: 1828, y1: 964 } // generous box round the fixed mark
const DRIFT = { x0: 1540, y0: 360, x1: 1900, y1: 990, until: 84 } // where and when the second one travels
const GREY = 215 // the mark's own brightness (it is drawn at roughly half opacity)

/** run ffmpeg and hand each decoded RGB frame to `onFrame(buffer, index)`, one at a time */
function frames(onFrame) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { stdio: ['ignore', 'pipe', 'inherit'] })
    let pending = Buffer.alloc(0)
    let index = 0
    let chain = Promise.resolve()
    ff.stdout.on('data', (chunk) => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
      while (pending.length >= FRAME) {
        const frame = Buffer.from(pending.subarray(0, FRAME))
        pending = pending.subarray(FRAME)
        const i = index++
        ff.stdout.pause()
        chain = chain.then(() => onFrame(frame, i)).then(() => ff.stdout.resume())
      }
    })
    ff.on('error', reject)
    ff.on('close', (code) => chain.then(() => (code ? reject(new Error('ffmpeg exited ' + code)) : resolve(index)), reject))
  })
}

// ── pass 1: what the fixed mark looks like over black = the per-pixel minimum across the film ──
const bw = FIXED.x1 - FIXED.x0
const bh = FIXED.y1 - FIXED.y0
const mark = new Uint8Array(bw * bh * 3).fill(255)
await frames((f) => {
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const s = ((FIXED.y0 + y) * W + FIXED.x0 + x) * 3
      const d = (y * bw + x) * 3
      if (f[s] < mark[d]) mark[d] = f[s]
      if (f[s + 1] < mark[d + 1]) mark[d + 1] = f[s + 1]
      if (f[s + 2] < mark[d + 2]) mark[d + 2] = f[s + 2]
    }
})
// the background's own floor (taken from the rim of the box) is not part of the mark
const floor = [0, 1, 2].map((c) => {
  const rim = []
  for (let x = 0; x < bw; x++) rim.push(mark[x * 3 + c], mark[((bh - 1) * bw + x) * 3 + c])
  for (let y = 0; y < bh; y++) rim.push(mark[y * bw * 3 + c], mark[(y * bw + bw - 1) * 3 + c])
  rim.sort((a, b) => a - b)
  return rim[Math.floor(rim.length * 0.5)]
})
const alpha = new Float32Array(bw * bh)
for (let i = 0; i < bw * bh; i++) {
  const m = Math.max(mark[i * 3] - floor[0], mark[i * 3 + 1] - floor[1], mark[i * 3 + 2] - floor[2]) - 2
  alpha[i] = m > 0 ? Math.min(0.85, m / GREY) : 0
}
console.log('fixed mark: peak opacity', Math.max(...alpha).toFixed(2))
// The mark's anti-aliased edge never un-blends exactly and would leave a hairline outline, so a
// thin band along the edge is re-filled from its neighbours after un-blending.
const edgeBand = []
{
  const peak = Math.max(...alpha)
  const inside = (x, y) => x >= 0 && y >= 0 && x < bw && y < bh && alpha[y * bw + x] > peak * 0.5
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      let a = false, b = false
      for (let dy = -3; dy <= 3 && !(a && b); dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (inside(x + dx, y + dy)) a = true
          else b = true
        }
      if (a && b) edgeBand.push(y * bw + x)
    }
}
const isEdge = new Uint8Array(bw * bh)
for (const i of edgeBand) isEdge[i] = 1

// ── pass 2: clean every frame and write it ──
const edgeFill = new Float32Array(bw * bh * 3)
const cw = DRIFT.x1 - DRIFT.x0
const ch = DRIFT.y1 - DRIFT.y0
// last known centre of the drifting mark, in corridor coordinates (it starts on the fixed one)
const track = { x: 1752 - DRIFT.x0, y: 888 - DRIFT.y0 }
const flag = new Uint8Array(cw * ch)
const label = new Int32Array(cw * ch)
let cleaned = 0

function unblendFixed(f) {
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const a = alpha[y * bw + x]
      if (!a) continue
      const s = ((FIXED.y0 + y) * W + FIXED.x0 + x) * 3
      for (let c = 0; c < 3; c++) {
        const v = (f[s + c] - a * GREY) / (1 - a)
        f[s + c] = v < 0 ? 0 : v > 255 ? 255 : v
      }
    }
  // re-fill the edge band: each band pixel becomes the mean of the nearest non-band pixels
  // across the band (looking outward in eight directions)
  for (const i of edgeBand) {
    const x = i % bw, y = (i - x) / bw
    let n = 0, r = 0, g = 0, b = 0
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      for (let k = 1; k <= 9; k++) {
        const nx = x + dx * k, ny = y + dy * k
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) break
        if (isEdge[ny * bw + nx]) continue
        const s = ((FIXED.y0 + ny) * W + FIXED.x0 + nx) * 3
        n++; r += f[s]; g += f[s + 1]; b += f[s + 2]
        break
      }
    }
    if (n) {
      const s = ((FIXED.y0 + y) * W + FIXED.x0 + x) * 3
      edgeFill[i * 3] = r / n; edgeFill[i * 3 + 1] = g / n; edgeFill[i * 3 + 2] = b / n
      void s
    }
  }
  for (const i of edgeBand) {
    const x = i % bw, y = (i - x) / bw
    const s = ((FIXED.y0 + y) * W + FIXED.x0 + x) * 3
    f[s] = edgeFill[i * 3]; f[s + 1] = edgeFill[i * 3 + 1]; f[s + 2] = edgeFill[i * 3 + 2]
  }
}

function removeDrifting(f) {
  // 1. neutral grey, clearly brighter than the background, inside the corridor
  flag.fill(0)
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const s = ((DRIFT.y0 + y) * W + DRIFT.x0 + x) * 3
      const r = f[s], g = f[s + 1], b = f[s + 2]
      const hi = Math.max(r, g, b), lo = Math.min(r, g, b)
      if (hi > 19 && hi < 190 && hi - lo < 22 && r - b < 12) flag[y * cw + x] = 1
    }
  // 2. keep only patches the size of the mark (dust and stray pixels are far smaller)
  label.fill(0)
  const found = []
  let next = 0
  const keep = new Set()
  const stack = []
  for (let i = 0; i < cw * ch; i++) {
    if (!flag[i] || label[i]) continue
    next++
    let area = 0
    let sx = 0
    let sy = 0
    stack.push(i)
    label[i] = next
    while (stack.length) {
      const p = stack.pop()
      area++
      const px = p % cw, py = (p - px) / cw
      sx += px
      sy += py
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue
        const q = ny * cw + nx
        if (flag[q] && !label[q]) { label[q] = next; stack.push(q) }
      }
    }
    // a full-size patch anywhere, or a fragment close to where the mark was last seen
    // (when it crosses strands it shows only as small pieces between them)
    const cx = sx / area, cy = sy / area
    const near = Math.hypot(cx - track.x, cy - track.y) < 120
    if (area > 320 || (near && area > 28)) {
      keep.add(next)
      found.push([cx, cy, area])
    }
  }
  if (!keep.size) return false
  // follow it: the mark only ever moves a few pixels a frame
  let wa = 0, wx = 0, wy = 0
  for (const [cx, cy, area] of found) if (Math.hypot(cx - track.x, cy - track.y) < 160 || area > 320) { wa += area; wx += cx * area; wy += cy * area }
  if (wa) { track.x = wx / wa; track.y = wy / wa }
  // 3. grow the kept patches a little (the mark's soft edge), then fill them from outside in
  const hole = new Uint8Array(cw * ch)
  const R = 7
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++)
      if (keep.has(label[y * cw + x]))
        for (let dy = -R; dy <= R; dy++)
          for (let dx = -R; dx <= R; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && ny >= 0 && nx < cw && ny < ch) hole[ny * cw + nx] = 1
          }
  const known = new Uint8Array(cw * ch)
  for (let i = 0; i < cw * ch; i++) known[i] = hole[i] ? 0 : 1
  const at = (x, y) => ((DRIFT.y0 + y) * W + DRIFT.x0 + x) * 3
  let grew = true
  while (grew) {
    grew = false
    const add = []
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        if (known[y * cw + x]) continue
        let n = 0, r = 0, g = 0, b = 0
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || !known[ny * cw + nx]) continue
          const s = at(nx, ny)
          n++; r += f[s]; g += f[s + 1]; b += f[s + 2]
        }
        if (n) add.push([x, y, r / n, g / n, b / n])
      }
    for (const [x, y, r, g, b] of add) {
      const s = at(x, y)
      f[s] = r; f[s + 1] = g; f[s + 2] = b
      known[y * cw + x] = 1
      grew = true
    }
  }
  return true
}

const total = await frames(async (f, i) => {
  unblendFixed(f)
  if (i < DRIFT.until && removeDrifting(f)) cleaned++
  await sharp(f, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 66, effort: 6 })
    .toFile(path.join(out, String(i + 1).padStart(4, '0') + '.webp'))
  if (i % 40 === 0) console.log('frame', i + 1)
})
console.log(`→ public/strands: ${readdirSync(out).length} frames (${total} decoded), drifting mark removed from ${cleaned}`)
