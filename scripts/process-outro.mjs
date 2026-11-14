// Outro portrait pipeline: assets/me/me-away.webp (read-only) → assets/processed/
//   me-away-plate.webp   the full frame, cropped above the generator watermark, graded
//   me-away-figure.webp  the figure alone (local cutout), same crop, for a near parallax layer
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
    .extract(CROP)
    .resize({ width: Math.round(CROP.width * SCALE), kernel: 'lanczos3' })
    .modulate({ saturation: 0.9, brightness: 1.02 })
    .linear(1.06, -5)
    .sharpen({ sigma: 0.7 })

await mkdir(outDir, { recursive: true })
await grade(sharp(src)).webp({ quality: 86, effort: 6 }).toFile(path.join(outDir, 'me-away-plate.webp'))
// the matte kept a piece of the halo arc beside the head: clear it
const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let y = 0; y < 225; y++) for (let x = 385; x < info.width; x++) data[(y * info.width + x) * 4 + 3] = 0
const figure = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
await grade(figure).webp({ quality: 88, alphaQuality: 92, effort: 6 }).toFile(path.join(outDir, 'me-away-figure.webp'))
for (const f of ['me-away-plate.webp', 'me-away-figure.webp']) {
  const m = await sharp(path.join(outDir, f)).metadata()
  console.log('→', f, `${m.width}x${m.height}`)
}
await sharp(path.join(outDir, 'me-away-figure.webp')).flatten({ background: '#8a8a8a' }).resize(360).jpeg().toFile(path.join(root, 'scripts/.cache/away-figure-preview.jpg'))
