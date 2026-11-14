// Cuts the subject out of a photo with a local model (no network services).
// Usage: node scripts/cutout.mjs <input> <output.png>
// Originals in assets/me are only ever read.
import { removeBackground } from '@imgly/background-removal-node'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('usage: node scripts/cutout.mjs <input> <output.png>')

// normalise to PNG first so the model always gets a format it decodes
const png = await sharp(await readFile(input)).png().toBuffer()
const res = await removeBackground(new Blob([png], { type: 'image/png' }), {
  model: 'medium',
  output: { format: 'image/png', quality: 1 },
})
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, Buffer.from(await res.arrayBuffer()))
console.log(input, '→', output)
