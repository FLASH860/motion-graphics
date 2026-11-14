// Outro portrait pipeline: assets/me/me-away.webp (read-only) → assets/processed/
//   me-away-plate.webp   the set WITHOUT the figure: he is painted out by diffusing the
//                        surrounding haze into his silhouette, so the layers can part cleanly
//   me-away-figure.webp  the figure alone (local cutout), for the near parallax layer
// Both are cropped above the generator watermark and graded the same way.
// Usage: npm run assets:outro   (add --fresh to redo the cutout)
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'assets/me/me-away.webp')
const cut = path.join(root, 'scripts/.cache/me-away-cutout.png')
const outDir = path.join(root, 'assets/processed')

if (!existsSync(cut) || process.argv.includes('--fresh')) {
  execFileSync(process.execPath, [path.join(root, 'scripts/cutout.mjs'), src, cut], { stdio: 'inherit' })
}

const CROP = { left: 0, top: 0, width: 576, height: 880 } // the watermark sits below y≈900
const SCALE = 1.6
const grade = (img) =>
  img
    .resize({ width: Math.round(CROP.width * SCALE), kernel: 'lanczos3' })
    .modulate({ saturation: 0.9, brightness: 1.02 })
    .linear(1.06, -5)
    .sharpen({ sigma: 0.7 })

// ── figure: the cutout, minus a piece of the halo arc the matte kept beside the head ──
const { data: fig, info } = await sharp(cut).extract(CROP).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
for (let y = 0; y < 225; y++) for (let x = 385; x < W; x++) fig[(y * W + x) * 4 + 3] = 0

// ── plate: paint the figure out ──
const plate = await sharp(src).extract(CROP).removeAlpha().raw().toBuffer()
// hole = the silhouette, grown generously so no dark fringe of him survives
const S = 4 // work at quarter size: the fill is smooth haze, it needs no detail
const w = Math.ceil(W / S)
const h = Math.ceil(H / S)
const hole = new Uint8Array(w * h)
const GROW = 4
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    if (fig[(y * W + x) * 4 + 3] > 10) {
      const cx = Math.floor(x / S)
      const cy = Math.floor(y / S)
      for (let dy = -GROW; dy <= GROW; dy++)
        for (let dx = -GROW; dx <= GROW; dx++) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) hole[ny * w + nx] = 1
        }
    }
const small = await sharp(plate, { raw: { width: W, height: H, channels: 3 } }).resize(w, h, { fit: 'fill' }).raw().toBuffer()
const col = new Float32Array(w * h * 3)
const known = new Uint8Array(w * h)
for (let i = 0; i < w * h; i++) {
  if (!hole[i]) {
    known[i] = 1
    col[i * 3] = small[i * 3]
    col[i * 3 + 1] = small[i * 3 + 1]
    col[i * 3 + 2] = small[i * 3 + 2]
  }
}
// grow inward from the edge of the hole, then relax: each unknown pixel becomes the mean of its
// neighbours, which carries the haze on either side across the gap
let frontier = true
while (frontier) {
  frontier = false
  const add = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (known[i]) continue
      let n = 0, r = 0, g = 0, b = 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = ny * w + nx
        if (known[j]) { n++; r += col[j * 3]; g += col[j * 3 + 1]; b += col[j * 3 + 2] }
      }
      if (n) add.push([i, r / n, g / n, b / n])
    }
  for (const [i, r, g, b] of add) { known[i] = 1; col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b; frontier = true }
}
for (let pass = 0; pass < 220; pass++)
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!hole[i]) continue
      for (let c = 0; c < 3; c++)
        col[i * 3 + c] = (col[(i - 1) * 3 + c] + col[(i + 1) * 3 + c] + col[(i - w) * 3 + c] + col[(i + w) * 3 + c]) / 4
    }
const fillSmall = Buffer.from(Uint8Array.from(col, (v) => Math.max(0, Math.min(255, Math.round(v)))))
const fill = await sharp(fillSmall, { raw: { width: w, height: h, channels: 3 } }).resize(W, H, { fit: 'fill', kernel: 'cubic' }).blur(3).raw().toBuffer()
const maskSmall = Buffer.from(hole.map((v) => v * 255))
const mask = await sharp(maskSmall, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { fit: 'fill', kernel: 'cubic' }).blur(5).extractChannel(0).raw().toBuffer()
for (let i = 0; i < W * H; i++) {
  const a = mask[i] / 255
  for (let c = 0; c < 3; c++) plate[i * 3 + c] = Math.round(plate[i * 3 + c] * (1 - a) + fill[i * 3 + c] * a)
}

await mkdir(outDir, { recursive: true })
await grade(sharp(plate, { raw: { width: W, height: H, channels: 3 } })).webp({ quality: 86, effort: 6 }).toFile(path.join(outDir, 'me-away-plate.webp'))
await grade(sharp(fig, { raw: { width: W, height: H, channels: 4 } })).webp({ quality: 88, alphaQuality: 92, effort: 6 }).toFile(path.join(outDir, 'me-away-figure.webp'))
for (const f of ['me-away-plate.webp', 'me-away-figure.webp']) {
  const m = await sharp(path.join(outDir, f)).metadata()
  console.log('→', f, `${m.width}x${m.height}`)
}
