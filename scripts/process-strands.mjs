// Strands pipeline: assets/video/strands.mp4 (read-only) → public/strands/0001.webp … 0240.webp
// Same approach as the watch: an image sequence drawn to a canvas scrubs cleanly both ways.
// `delogo` heals the generator watermark from its surroundings (strands pass behind it, so a
// plain black box would leave a notch).
// Usage: npm run assets:strands   (needs ffmpeg on PATH)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/strands')
mkdirSync(out, { recursive: true })
execFileSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-i', path.join(root, 'assets/video/strands.mp4'),
   '-vf', 'scale=1280:720:flags=lanczos,delogo=x=1126:y=566:w=70:h=68',
   '-c:v', 'libwebp', '-quality', '64', '-compression_level', '6', path.join(out, '%04d.webp')],
  { stdio: 'inherit' },
)
console.log('→ public/strands:', readdirSync(out).length, 'frames')
