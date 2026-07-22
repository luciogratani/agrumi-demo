// Preprocessing degli asset di carta del booking.
//
// Non sono layer del diorama: stanno nel DOM sopra il canvas, perché il booking
// è un form e testo, campi e focus devono restare HTML (`docs/interfaccia.md`).
// Hanno però la stessa forma degli export della scena — tela piena, un livello
// per pezzo — e quella tela porta un'informazione che non va buttata: card,
// righe e barra d'azione sono **già impaginate** in Photoshop. Qui il ritaglio
// conserva quelle posizioni convertendole in frazioni della card, così il
// layout in CSS è quello composto a mano e non una riedizione a occhio.
//
// Gira da solo (`node tools/prep-booking.mjs`): è separato da `prep-layers.mjs`
// perché ritoccare un bottone non deve costare la riconversione dei 29 sprite.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = '/Users/lucio/Desktop/agrumi/scena 3d/booking/assets'
const OUT = path.resolve(process.cwd(), 'public/ui/booking')

// I nomi degli export sono gli indici di Photoshop, che non dicono niente e
// cambiano a ogni sessione: la corrispondenza con i pezzi la si fissa qui, una
// volta. `w` è la larghezza in uscita, scelta sul posto che il pezzo occupa
// davvero a schermo: la card sta sotto i 460 px CSS e il devicePixelRatio è
// limitato a 2, quindi 1024 è il massimo che qualcuno possa vedere.
//
// Le tre righe del PSD sono lo stesso disegno duplicato (verificato: differenza
// media 1,4%), quindi ne esce **un solo file** riusato tre volte — un terzo del
// peso, e una texture sola da decodificare.
const PEZZI = [
  { slug: 'card', file: 'booking_0000s_0000_Card.png', w: 1024, ruolo: 'cornice' },
  { slug: 'riga', file: 'booking_0000s_0000s_0002_Layer-1-copy-14.png', w: 768, ruolo: 'riga' },
  { slug: 'azione', file: 'booking_0000s_0000s_0003_Layer-1-copy-15.png', w: 512, ruolo: 'azione' },
]

// Pezzi che **non** vengono dalla tela della card: sono generati a parte, ognuno
// nella sua immagine quadrata e centrato. Non hanno una posizione da conservare
// — quella la decide il CSS — quindi qui si ritagliano e si riducono, e basta.
const SCIOLTI = [
  {
    slug: 'bottoncino',
    // La versione ingrandita, non l'export diretto: quello è **appiattito**,
    // con la scacchiera della trasparenza dipinta nei pixel invece che nel
    // canale alpha. Prima di aggiungere un pezzo qui vale la pena controllare
    // che l'alpha ci sia davvero.
    file: '../gen/topaz-ChatGPT Image 22 lug 2026, 15_58_46-art-cg-4x-cgi-4x.png',
    // Sta sotto i 50 px CSS: 192 copre il DPR 2 con margine per farlo crescere.
    w: 192,
  },
]

// Gli altri due livelli non diventano file, ma le loro posizioni servono: sono
// la seconda e la terza riga, ed è da lì che si leggono passo e allineamento.
const RIGHE = [
  { nome: 'alto', file: 'booking_0000s_0000s_0002_Layer-1-copy-14.png' },
  { nome: 'mezzo', file: 'booking_0000s_0000s_0001_Layer-1-copy-13.png' },
  { nome: 'basso', file: 'booking_0000s_0000s_0000_Layer-1-copy-12.png' },
]

// Bounding box dei pixel con alpha sopra soglia. Stessa soglia di
// `prep-layers.mjs`: sotto 8 è bordo sfumato, non disegno.
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
  if (maxX < 0) throw new Error(`${path.basename(file)}: livello vuoto`)
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, canvasW: width, canvasH: height }
}

await mkdir(OUT, { recursive: true })

const box = {}
for (const { file } of [...PEZZI, ...RIGHE]) {
  if (!box[file]) box[file] = await alphaBBox(path.join(SRC, file))
}

// La card è il sistema di riferimento: tutto il resto è una frazione di lei,
// non della tela. Così il CSS posiziona in % dentro `.bk-card` e l'impaginato
// regge a qualunque larghezza, senza un solo numero trascritto a mano.
const carta = box[PEZZI[0].file]
const rel = (b) => ({
  x: (b.left - carta.left) / carta.width,
  y: (b.top - carta.top) / carta.height,
  w: b.width / carta.width,
  h: b.height / carta.height,
})

const file = {}
for (const { slug, file: f, w } of [...PEZZI, ...SCIOLTI]) {
  const b = box[f] ?? (await alphaBBox(path.join(SRC, f)))
  const outW = w
  const outH = Math.max(1, Math.round((b.height / b.width) * outW))
  const info = await sharp(path.join(SRC, f))
    .extract({ left: b.left, top: b.top, width: b.width, height: b.height })
    .resize(outW, outH)
    .webp({ quality: 82, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, `${slug}.webp`))

  file[slug] = { src: `ui/booking/${slug}.webp`, px: { w: outW, h: outH } }
  console.log(`  ${slug.padEnd(11)} ${outW}x${outH}  ${(info.size / 1024).toFixed(0)} kB`)
}

const righe = RIGHE.map(({ nome, file: f }) => ({ nome, ...rel(box[f]) }))
const azione = rel(box[PEZZI[2].file])

await writeFile(
  path.resolve(process.cwd(), 'src/diorama/booking-ui.json'),
  JSON.stringify(
    {
      // Proporzioni della card: è ciò che tiene il foglio in scala mentre la
      // finestra cambia, senza deformare gli angoli disegnati a mano.
      card: { aspect: carta.width / carta.height, px: { w: carta.width, h: carta.height } },
      file,
      // Riquadri in frazioni della card (0..1), nell'ordine in cui si leggono.
      righe,
      azione,
    },
    null,
    2,
  ),
)

const pct = (v) => `${(v * 100).toFixed(2)}%`
console.log(`\n  card ${carta.width}x${carta.height} — rapporto ${(carta.width / carta.height).toFixed(4)}`)
for (const r of righe) console.log(`  riga ${r.nome.padEnd(6)} x ${pct(r.x)}  y ${pct(r.y)}  w ${pct(r.w)}  h ${pct(r.h)}`)
console.log(`  azione       x ${pct(azione.x)}  y ${pct(azione.y)}  w ${pct(azione.w)}  h ${pct(azione.h)}`)
