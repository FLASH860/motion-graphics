// Watch pipeline: assets/video/watch.mp4 (read-only) → public/watch/0001.webp … 0240.webp
// An image sequence drawn to a canvas scrubs smoother than seeking a video, in both directions.
// The drawbox paints over the generator watermark, which sits on pure black.
// Usage: npm run assets:watch   (needs ffmpeg on PATH)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/watch')
mkdirSync(out, { recursive: true })
execFileSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-i', path.join(root, 'assets/video/watch.mp4'),
   '-vf', 'drawbox=x=1126:y=566:w=70:h=68:color=black:t=fill',
   '-c:v', 'libwebp', '-quality', '72', '-compression_level', '6', path.join(out, '%04d.webp')],
  { stdio: 'inherit' },
)
console.log('→ public/watch:', readdirSync(out).length, 'frames')
