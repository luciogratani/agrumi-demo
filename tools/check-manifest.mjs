import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = '/Users/lucio/Desktop/agrumi/sito'
const OUT = '/private/tmp/claude-501/-Users-lucio-Desktop-agrumi-sito/26ccfbfe-4971-48b6-b012-c14e6e35aed5/scratchpad'
const m = JSON.parse(readFileSync(path.join(ROOT, 'src/diorama/manifest.json')))

const W = 1440
const H = Math.round(W / m.canvas.aspect)

// Ricompone gli sprite croppati usando SOLO gli offset del manifest.
const composites = []
for (const l of m.layers) {
  composites.push({
    input: path.join(ROOT, 'public', l.src),
    left: Math.round(l.x * W),
    top: Math.round(l.y * H),
  })
}

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(composites)
  .png()
  .toFile(path.join(OUT, 'ricomposto.png'))

console.log(`ricomposto ${W}x${H} da ${composites.length} sprite`)
