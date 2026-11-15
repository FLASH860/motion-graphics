// Watch pipeline: assets/video/watch.mp4 (read-only) → public/watch/0001.webp … 0240.webp
// An image sequence drawn to a canvas scrubs smoother than seeking a video, in both directions.
// The source is 1280x720. It is upscaled to 1920x1080 here (Lanczos, then a light unsharp mask)
// so it holds up on large screens; that is resampling, not recovered detail.
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
   '-vf', 'drawbox=x=1126:y=566:w=70:h=68:color=black:t=fill,scale=1920:1080:flags=lanczos,unsharp=5:5:0.7:5:5:0.0',
   '-c:v', 'libwebp', '-quality', '70', '-compression_level', '5', path.join(out, '%04d.webp')],
  { stdio: 'inherit' },
)
console.log('→ public/watch:', readdirSync(out).length, 'frames')
