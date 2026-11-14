// Hero portrait pipeline: assets/me/me-front.jpg (read-only) → assets/processed/me-front-hero.webp
//   1. local background removal (cached in scripts/.cache)
//   2. remove leftover set dressing the matte kept (crown doodle, chess piece, halo arcs)
//   3. crop above the two foreground heads, trim the sides
//   4. grade: slightly desaturated, a touch more contrast, warm highlights kept
// Usage: npm run assets:hero   (add --fresh to redo the cutout)
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'assets/me/me-front.jpg')
const cut = path.join(root, 'scripts/.cache/me-front-cutout.png')
const out = path.join(root, 'assets/processed/me-front-hero.webp')

if (!existsSync(cut) || process.argv.includes('--fresh')) {
  execFileSync(process.execPath, [path.join(root, 'scripts/cutout.mjs'), src, cut], { stdio: 'inherit' })
}

const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info

// Regions (source pixels) where everything the matte kept is set dressing, not the subject.
// Each is erased with a soft inner feather so no hard edge is left behind.
const erase = [
  { x0: 0, y0: 0, x1: 332, y1: 496 }, // halo arc, left
  { x0: 646, y0: 0, x1: 820, y1: 90 }, // crown doodle
  { x0: 892, y0: 0, x1: W, y1: 478 }, // halo arc + chess king, right
  { x0: 1040, y0: 0, x1: W, y1: 505 },
]
const FEATHER = 8
for (const r of erase) {
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0; x < r.x1; x++) {
      // distance to the nearest edge of the rect that faces the picture (not the image border)
      let d = Infinity
      if (r.x0 > 0) d = Math.min(d, x - r.x0)
      if (r.x1 < W) d = Math.min(d, r.x1 - 1 - x)
      if (r.y1 < H) d = Math.min(d, r.y1 - 1 - y)
      const keep = d >= FEATHER ? 0 : 1 - d / FEATHER
      const i = (y * W + x) * 4 + 3
      data[i] = Math.round(data[i] * keep)
    }
  }
}

const CROP = { left: 96, top: 40, width: 1150, height: 712 } // stops above the foreground heads
await mkdir(path.dirname(out), { recursive: true })
await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .extract(CROP)
  .resize({ width: Math.round(CROP.width * 1.5), kernel: 'lanczos3' })
  .modulate({ saturation: 0.88, brightness: 1.03 })
  .linear(1.07, -6)
  .sharpen({ sigma: 0.8 })
  .webp({ quality: 88, alphaQuality: 92, effort: 6 })
  .toFile(out)
const m = await sharp(out).metadata()
console.log('→', path.relative(root, out), `${m.width}x${m.height}`)
