// Preprocessing dei layer esportati da Photoshop.
//
// Gli export sono tutti a tela piena (3584x4800) e quasi interamente vuoti:
// caricarli così significherebbe ~69 MB di VRAM per layer. Qui ognuno viene
// ritagliato al suo bounding box alpha, riscalato e salvato in WebP, con un
// manifest che conserva la posizione originale — così l'allineamento di
// Photoshop resta esatto senza portarsi dietro la tela vuota.

import { readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = '/Users/lucio/Desktop/agrumi/scena 3d/layer da gen 1 - 3'

// Livelli rimasti nel PSD ma sostituiti: il gatto intero ha lasciato il posto
// ai pezzi separati (corpo, testa, coda) del rig.
const SKIP = [/gatto-full/i]
const OUT = path.resolve(process.cwd(), 'public/layers')

// Tela di riferimento in uscita. 1440 di larghezza = retina su mobile.
const TARGET_W = 1440

// Trova il bounding box dei pixel con alpha sopra soglia.
async function alphaBBox(file) {
  const img = sharp(file)
  const { width, height } = await img.metadata()
  const alpha = await img.ensureAlpha().extractChannel('alpha').raw().toBuffer()

  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (alpha[row + x] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null // layer completamente vuoto
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, canvasW: width, canvasH: height }
}

const files = (await readdir(SRC)).filter((f) => f.endsWith('.png')).sort()
await mkdir(OUT, { recursive: true })

const layers = []
const seen = new Map()
let totalBytes = 0

for (const name of files) {
  const src = path.join(SRC, name)
  const box = await alphaBBox(src)
  if (!box) {
    console.warn(`  ${name}: vuoto, saltato`)
    continue
  }

  const scale = TARGET_W / box.canvasW
  const outW = Math.max(1, Math.round(box.width * scale))
  const outH = Math.max(1, Math.round(box.height * scale))

  // Il nome dell'export è `<prefisso qualunque>_<indici>_<numero PSD>-<nome>`.
  // Il prefisso iniziale lo decide Photoshop e cambia a ogni sessione, quindi
  // non ci si fa affidamento: si cerca la catena di indici, che è l'unica
  // parte con forma fissa.
  //
  // Il numero messo a mano nel PSD (0 sfondo, 1 albero, ... 5 foglie davanti,
  // e 3.1.0 ... 3.1.3 per i pezzi del gatto) è la fonte affidabile per
  // l'ordine Z; gli indici dell'exporter ordinano dentro lo stesso numero.
  const raw = name.replace(/\.png$/, '')
  const [, indices = '', label = raw] = raw.match(/_((?:\d+s?_)+)(.*)$/) ?? []
  // Gli indici restano una lista di numeri e non una cifra unica concatenata:
  // il prefisso di Photoshop può contenere numeri (`..._step_3_...`) e la
  // concatenazione supererebbe la precisione degli interi, mandando in
  // pattume l'ordinamento.
  const idx = indices.split('_').filter(Boolean).map((t) => parseInt(t, 10))
  const group = label.match(/^(\d+(?:\.\d+)*)-/)?.[1]

  if (!group) {
    console.warn(`  ${label}: senza numero di livello (nascosto o di servizio), saltato`)
    continue
  }

  if (SKIP.some((re) => re.test(label))) {
    console.warn(`  ${label}: sostituito da altri livelli, saltato`)
    continue
  }

  // Nome file: niente punti (scomodi in un nome file) e niente caratteri
  // fuori da [a-z0-9-]. Il numero resta in testa, così i file si leggono
  // nell'ordine in cui vengono disegnati.
  const base = label
    .replace(/\./g, '-')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  const n = (seen.get(base) ?? 0) + 1
  seen.set(base, n)
  const slug = n > 1 ? `${base}-${n}` : base

  const outFile = `${slug}.webp`
  const info = await sharp(src)
    .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
    .resize(outW, outH)
    .webp({ quality: 82, alphaQuality: 100, effort: 5 })
    .toFile(path.join(OUT, outFile))

  totalBytes += info.size

  layers.push({
    slug,
    group,
    // Il numero del PSD scomposto per l'ordinamento: `3.1.2` non è un numero
    // (parseFloat lo troncherebbe a 3.1, appiattendo i pezzi del gatto).
    sort: group.split('.').map(Number),
    idx,
    src: `layers/${outFile}`,
    // Posizione e dimensione normalizzate sulla tela originale (0..1).
    // Sono ciò che rimette ogni sprite esattamente dov'era in Photoshop.
    x: box.left / box.canvasW,
    y: box.top / box.canvasH,
    w: box.width / box.canvasW,
    h: box.height / box.canvasH,
    px: { w: outW, h: outH },
  })

  const pct = ((box.width * box.height) / (box.canvasW * box.canvasH)) * 100
  console.log(`  ${slug.padEnd(28)} ${outW}x${outH}  ${(info.size / 1024).toFixed(0)} kB  (${pct.toFixed(1)}% della tela)`)
}

// Muro di fondo: foglio di carta pulito, senza il diorama cotto dentro.
// Sostituisce `0-sfondo` (che è la composizione finale appiattita e quindi
// blocca la parallasse, avendo tutto già al suo posto).
const wallName = files.find((f) => /sfondo-nuovo/i.test(f))
if (!wallName) throw new Error('manca il livello `sfondo nuovo` fra gli export')
const WALL_SRC = path.join(SRC, wallName)
// Risoluzione più bassa degli sprite: è grana di carta uniforme, senza
// dettaglio da preservare, e il rumore fine è ciò che gonfia il WebP.
const wall = await sharp(WALL_SRC)
  .resize(900, null)
  .webp({ quality: 68, effort: 6 })
  .toFile(path.join(OUT, 'backdrop-muro.webp'))
console.log(`  backdrop-muro                da ${wallName.slice(0, 40)} — ${(wall.size / 1024).toFixed(0)} kB`)

// Ordine Z, dal fondo verso la camera: prima il numero del PSD confrontato
// componente per componente, poi l'indice dell'exporter al contrario (che
// numera dall'alto dello stack, quindi indice più alto = più indietro).
const compare = (x, y, sign) => {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = ((x[i] ?? 0) - (y[i] ?? 0)) * sign
    if (diff) return diff
  }
  return 0
}

layers.sort((a, b) => compare(a.sort, b.sort, 1) || compare(a.idx, b.idx, -1))

// Le immagini stanno in public/ (servite così come sono), il manifest in src/
// perché viene importato dal bundle: Vite avverte se si importa da public/.
const first = await sharp(path.join(SRC, files[0])).metadata()
await writeFile(
  path.resolve(process.cwd(), 'src/diorama/manifest.json'),
  JSON.stringify({ canvas: { w: first.width, h: first.height, aspect: first.width / first.height }, layers }, null, 2),
)

console.log(`\n${layers.length} layer — ${(totalBytes / 1024 / 1024).toFixed(1)} MB totali`)

// --- Asset di interfaccia --------------------------------------------------
//
// Non fanno parte del diorama: stanno nel DOM sopra il canvas. Il limone è lo
// sfondo del bottone di prenotazione, quindi è un elemento essenziale del sito
// e viene esportato anche in PNG: se per qualsiasi motivo il WebP non venisse
// servito, la CTA deve comparire lo stesso.
//
// Ritagliato al bounding box alpha perché il riquadro del bottone coincida con
// il limone e non con la tela trasparente attorno.
const UI_OUT = path.resolve(process.cwd(), 'public/ui')
await mkdir(UI_OUT, { recursive: true })

// Il limone della CTA viene ancora dagli elementi della prima scena: è l'unico
// pezzo di quel materiale che serve, e sta fuori da `public/` perché quei PNG
// non devono finire nella build.
const CTA_SRC = path.resolve(process.cwd(), 'asset-lavoro/scena-vecchia/el/limone.png')
const ctaBox = await alphaBBox(CTA_SRC)
// 512 px bastano: il bottone sta sotto i 200 px CSS, quindi copre anche i
// display a DPR 3 senza sprecare banda su grana di carta che nessuno vedrà.
const CTA_W = 512

const cta = sharp(CTA_SRC)
  .extract({ left: ctaBox.left, top: ctaBox.top, width: ctaBox.width, height: ctaBox.height })
  .resize(CTA_W)

const ctaWebp = await cta.clone().webp({ quality: 80, alphaQuality: 100, effort: 6 }).toFile(path.join(UI_OUT, 'cta-limone.webp'))
const ctaPng = await cta.clone()// Il PNG serve solo se il WebP non arriva: con la palette pesa un sesto e
// la perdita su una sagoma piatta è invisibile.
  .png({ compressionLevel: 9, palette: true, colours: 128 }).toFile(path.join(UI_OUT, 'cta-limone.png'))

console.log(
  `\nUI · cta-limone ${ctaWebp.width}x${ctaWebp.height} — ` +
    `webp ${(ctaWebp.size / 1024).toFixed(0)} kB, png ${(ctaPng.size / 1024).toFixed(0)} kB`,
)
